/**
 * Customer scan: no "is the customer at the store?" check
 * (CUSTOMER_LOCATION_VALIDATION_ENABLED = false) and no GPS popup
 * (CUSTOMER_GPS_PROMPT_ENABLED = false). The location recorded is GPS when
 * the page sends one, otherwise an approximate one from the request's IP
 * (Vercel headers); nothing about location turns anyone away.
 */
const mongoose = require('mongoose');
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));

const participate = require('@/app/api/customer/participate/route');
const { CUSTOMER_LOCATION_VALIDATION_ENABLED, CUSTOMER_GPS_PROMPT_ENABLED, CUSTOMER_GPS_REQUIRED } = require('@/lib/featureFlags');
const { ipLocationFromRequest } = require('@/lib/ipGeolocation');
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
const VERCEL_GEO = {
  'x-vercel-ip-latitude': '28.4595', 'x-vercel-ip-longitude': '77.0266',
  'x-vercel-ip-city': 'Gurugram', 'x-vercel-ip-country-region': 'HR', 'x-vercel-ip-country': 'IN',
};
const headersOf = (h = {}) => ({ get: (k) => h[k.toLowerCase()] ?? null });

async function submit({ campaign, store, range }, at, headers = {}) {
  const body = {
    campaignId: String(campaign._id), rangeId: String(range._id),
    customerName: 'Riya', customerMobile: String(mobile++), billAmount: 0, customerConsent: true,
    verifiedStore: { storeId: String(store._id), storeName: store.store_name, latitude: STORE.lat, longitude: STORE.lng },
    ...(at ? { customerLatitude: at.lat, customerLongitude: at.lng, customerAccuracy: 20 } : {}),
  };
  const res = await participate.POST({ json: async () => body, headers: headersOf(headers) });
  return { status: res.status, body: await res.json() };
}

test('no distance check and no GPS popup', () => {
  expect(CUSTOMER_LOCATION_VALIDATION_ENABLED).toBe(false);
  expect(CUSTOMER_GPS_PROMPT_ENABLED).toBe(false);
  expect(CUSTOMER_GPS_REQUIRED).toBe(false);
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

test('no GPS (no popup) → coupon issued, approximate location from the IP recorded', async () => {
  const w = await makeWorld();
  const { status, body } = await submit(w, null, VERCEL_GEO);
  expect(status).toBe(201);
  const p = await CustomerParticipation.findById(body.data.participationId).lean();
  expect(p).toMatchObject({ location_source: 'ip', location_city: 'Gurugram, HR, IN' });
  expect(p.customer_latitude).toBeCloseTo(28.4595, 4);
  expect(p.customer_longitude).toBeCloseTo(77.0266, 4);
  expect(p.distance_from_store).toBeNull(); // no misleading IP-based distance
});

test('no GPS and no IP location (e.g. local dev) → still goes through, location empty', async () => {
  const w = await makeWorld();
  const { status, body } = await submit(w, null);
  expect(status).toBe(201);
  const p = await CustomerParticipation.findById(body.data.participationId).lean();
  expect(p).toMatchObject({ location_source: null, customer_latitude: null, customer_longitude: null });
});

test('GPS, when sent, is recorded as such', async () => {
  const w = await makeWorld();
  const { body } = await submit(w, FAR, VERCEL_GEO);
  const p = await CustomerParticipation.findById(body.data.participationId).lean();
  expect(p.location_source).toBe('gps');
  expect(p.customer_latitude).toBeCloseTo(FAR.lat, 5);
});

test('ipLocationFromRequest: decodes the city, rejects missing/garbage headers', () => {
  expect(ipLocationFromRequest({ headers: headersOf({ ...VERCEL_GEO, 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' }) }).city).toBe('São Paulo');
  expect(ipLocationFromRequest({ headers: headersOf({}) })).toBeNull();
  expect(ipLocationFromRequest({ headers: headersOf({ 'x-vercel-ip-latitude': 'abc', 'x-vercel-ip-longitude': '77' }) })).toBeNull();
});

test('the visit is credited to the nearest assigned store', () => {
  const stores = [
    { storeId: 'far', latitude: 19.2, longitude: 72.9 },
    { storeId: 'near', latitude: 19.08, longitude: 72.85 },
  ];
  expect(findNearestStore(19.076, 72.8479, stores).store.storeId).toBe('near');
  expect(findNearestStore(19.076, 72.8479, [{ storeId: 'x' }])).toBeNull(); // page falls back to the first store
});
