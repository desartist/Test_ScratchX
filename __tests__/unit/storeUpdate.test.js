/**
 * Store edit: PATCH /api/stores/[id] used to Object.assign the whole request
 * body onto the store. The edit page sends back the store as loaded —
 * including the campaign list derived from the campaigns (a draft campaign
 * → status 'draft', which the store schema rejects) — so saving a new
 * location failed with a 500. Also: assigning a store to a DRAFT campaign
 * wrote that invalid status into the store in the first place.
 */
const mongoose = require('mongoose');

const mockAuth = { account: null };
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(async () => ({ account: mockAuth.account, error: null })),
}));

const storeRoute = require('@/app/api/stores/[id]/route');
const CampaignService = require('@/lib/campaignService').default;
const Store = require('@/models/storeModel').default;
const Campaign = require('@/models/campaignModel').default;
const { storeCampaignStatus } = require('@/lib/storeCampaignStatus');

async function makeStore() {
  const merchantId = new mongoose.Types.ObjectId();
  const store = await Store.create(global.createMockStore(merchantId, { latitude: 19.076, longitude: 72.8479 }));
  mockAuth.account = { _id: merchantId, role: 'Merchant' };
  return { store, merchantId };
}
const patch = async (id, body) => {
  const res = await storeRoute.PATCH({ json: async () => body }, { params: Promise.resolve({ id: String(id) }) });
  return { status: res.status, body: await res.json() };
};

test('your screenshot: retake location + save with the full loaded store → 200, location updated', async () => {
  const { store, merchantId } = await makeStore();
  const loaded = (await Store.findById(store._id).lean());
  const body = {
    ...loaded,
    _id: String(loaded._id),
    merchant_id: String(merchantId),
    city: 'Gurgaon',
    state: 'Haryana',
    latitude: 28.4089,
    longitude: 77.0418,
    location_accuracy: 47,
    // What GET /api/stores/[id] derives from the campaign side — and the
    // form sends straight back:
    assignedCampaigns: [{ campaignId: String(new mongoose.Types.ObjectId()), campaignName: 'Test_campaign2', status: 'draft' }],
    active_campaigns: 1,
    total_scratch_cards: 999999,
  };
  const { status } = await patch(store._id, body);
  expect(status).toBe(200);

  const saved = await Store.findById(store._id).lean();
  expect(saved).toMatchObject({ city: 'Gurgaon', state: 'Haryana', latitude: 28.4089, longitude: 77.0418, location_accuracy: 47 });
  expect(saved.location.coordinates).toEqual([77.0418, 28.4089]); // the point the distance check uses
  expect(saved.assignedCampaigns).toHaveLength(0); // not overwritten by the derived list
  expect(saved.total_scratch_cards).toBe(loaded.total_scratch_cards); // counters untouched
});

test('a different owner or store code is refused; nothing changes', async () => {
  const { store } = await makeStore();
  const other = await patch(store._id, { merchant_id: String(new mongoose.Types.ObjectId()), store_name: 'Hijack' });
  expect(other.status).not.toBe(200);
  const code = await patch(store._id, { store_code: 'ZZZ999', store_name: 'Renamed' });
  expect(code.status).not.toBe(200);
  expect((await Store.findById(store._id).lean()).store_name).toBe(store.store_name);
});

test('assigning a store to a DRAFT campaign writes a valid status; the store stays saveable', async () => {
  const { store, merchantId } = await makeStore();
  const campaign = await Campaign.create({
    merchantId, campaignName: 'Draft one', status: 'draft',
    startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 9 * 86400000),
  });
  const result = await CampaignService.assignCampaignToStores(String(campaign._id), [String(store._id)], 1, merchantId);
  expect(result.summary.failed).toBe(0);

  const saved = await Store.findById(store._id);
  expect(saved.assignedCampaigns.map((c) => c.status)).toEqual(['inactive']);
  await expect(saved.validate()).resolves.toBeUndefined();
  expect((await patch(store._id, { city: 'Gurgaon' })).status).toBe(200);
});

test('storeCampaignStatus maps campaign statuses onto the store set', () => {
  expect(['active', 'ended', 'ending_soon', 'inactive'].map(storeCampaignStatus)).toEqual(['active', 'ended', 'ending_soon', 'inactive']);
  expect(['draft', 'paused', 'scheduled', undefined].map(storeCampaignStatus)).toEqual(['inactive', 'inactive', 'inactive', 'active']);
});
