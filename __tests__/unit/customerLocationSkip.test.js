/**
 * Customer scan: the "is the customer at the store?" check is switched off
 * (CUSTOMER_LOCATION_VALIDATION_ENABLED = false) — location is still
 * REQUIRED and recorded, but distance never turns anyone away.
 */
const mongoose = require('mongoose');
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));

const participate = require('@/app/api/customer/participate/route');
const { CUSTOMER_LOCATION_VALIDATION_ENABLED } = require('@/lib/featureFlags');
const { findNearestStore } = require('@/lib/utils/distanceCalculator');
const Campaign = require('@/models/campaignModel').default;
const Range = require('@/models/rangeModel').default;
const Store = require('@/models/storeModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;

const STORE = { lat: 19.076, lng: 72.8479 };          // Mumbai
const FAR = { lat: 19.121, lng: 72.8479 };            // ~5 km north

async function makeWorld() {
  const merchantId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('accounts').insertOne({
    _id: merchantId, role: 'Merchant', status: 'active', email: `m${merchantId}@example.com`, profile: { businessModel: 'Retail' },
  });
  const store = await Store.create(global.createMockStore(merchantId, { latitude: STORE.lat, longitude: STORE.lng }));
  const campaign = await Campaign.create({
    merchantId, campaignName: 'Festival', status: 'active', displayCoupons: 6,
    startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000),
    allocated_scratch_cards: 100, used_scratch_cards: 0, remaining_scratch_cards: 100,
    assignedStores: [{
      storeId: store._id, storeName: store.store_name, storeCode: store.store_code,
      address: '1 Main St', city: 'Mumbai', state: 'MH', pincode: '400001',
      contactPerson: 'Asha', contactNumber: '9876543210', latitude: STORE.lat, longitude: STORE.lng,
      allocated_scratch_cards: 100, assignedBy: merchantId, status: 'active',
    }],
  });
  const range = await Range.create({ campaignId: campaign._id, minAmount: 1, maxAmount: 499, rewards: [{ type: 'flat', value: 50 }] });
  return { campaign, store, range };
}

let mobile = 9100000000;
async function submit({ campaign, store, range }, at) {
  const body = {
    campaignId: String(campaign._id), rangeId: String(range._id),
    customerName: 'Riya', customerMobile: String(mobile++), billAmount: 0, customerConsent: true,
    verifiedStore: { storeId: String(store._id), storeName: store.store_name, latitude: STORE.lat, longitude: STORE.lng },
    ...(at ? { customerLatitude: at.lat, customerLongitude: at.lng, customerAccuracy: 20 } : {}),
  };
  const res = await participate.POST({ json: async () => body, headers: { get: () => null } });
  return { status: res.status, body: await res.json() };
}

test('the store-distance check is switched off', () => {
  expect(CUSTOMER_LOCATION_VALIDATION_ENABLED).toBe(false);
});

test('a customer ~5 km from the store still gets their coupons; location + distance recorded', async () => {
  const w = await makeWorld();
  const { status, body } = await submit(w, FAR);
  expect(status).toBe(201);
  const p = await CustomerParticipation.findById(body.data.participationId).lean();
  expect(p.customer_latitude).toBeCloseTo(FAR.lat, 5);
  expect(p.customer_longitude).toBeCloseTo(FAR.lng, 5);
  expect(p.distance_from_store).toBeGreaterThan(4500);
});

test('location is still required — no coordinates, no coupon', async () => {
  const w = await makeWorld();
  const { status, body } = await submit(w, null);
  expect(status).toBe(400);
  expect(body.error).toMatch(/customerLatitude is required/);
  expect(await CustomerParticipation.countDocuments()).toBe(0);
});

test('the visit is credited to the nearest assigned store', () => {
  const stores = [
    { storeId: 'far', latitude: 19.2, longitude: 72.9 },
    { storeId: 'near', latitude: 19.08, longitude: 72.85 },
  ];
  expect(findNearestStore(19.076, 72.8479, stores).store.storeId).toBe('near');
  expect(findNearestStore(19.076, 72.8479, [{ storeId: 'x' }])).toBeNull(); // page falls back to the first store
});
