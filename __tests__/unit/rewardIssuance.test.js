/**
 * Reward issuance through the real customer routes:
 *   POST /api/customer/participate              (reward is picked here)
 *   POST /api/customer/participate/[id]/reveal  (customer scratches)
 *
 * Proves: only eligible rewards are issued; issuing never touches stock;
 * scratching takes exactly one unit (no cashier yet — the reveal is the
 * redemption, see lib/featureFlags.js); and when nothing is eligible the
 * request is refused BEFORE any participation, scratch card or campaign
 * inventory is consumed.
 */
const mongoose = require('mongoose');

jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));
// Only the staff redemption route authenticates; the customer routes are public.
const mockStaff = { account: null };
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(async () => ({ account: mockStaff.account, error: null })),
}));

const participate = require('@/app/api/customer/participate/route');
const reveal = require('@/app/api/customer/participate/[participationId]/reveal/route');
const storeRedemptions = require('@/app/api/store-redemptions/route');
const RedemptionService = require('@/lib/redemptionService').default;
const { CASHIER_REDEMPTION_ENABLED } = require('@/lib/featureFlags');
const Range = require('@/models/rangeModel').default;
const Campaign = require('@/models/campaignModel').default;
const Store = require('@/models/storeModel').default;
const ScratchCardRecord = require('@/models/scratchCardRecordModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;

const LAT = 19.076;
const LNG = 72.8479;

async function makeWorld(rewards) {
  const merchantId = new mongoose.Types.ObjectId();
  // consumeInventory checks the merchant's Account exists.
  await mongoose.connection.collection('accounts').insertOne({
    _id: merchantId, role: 'Merchant', status: 'active', email: `m${merchantId}@example.com`,
  });
  const store = await Store.create(global.createMockStore(merchantId, { latitude: LAT, longitude: LNG }));
  const campaign = await Campaign.create({
    merchantId,
    campaignName: 'Festival',
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
    status: 'active',
    displayCoupons: 6,
    allocated_scratch_cards: 100,
    used_scratch_cards: 0,
    remaining_scratch_cards: 100,
    assignedStores: [{
      storeId: store._id, storeName: store.store_name, storeCode: store.store_code,
      address: '1 Main St', city: 'Mumbai', state: 'MH', pincode: '400001',
      contactPerson: 'Asha', contactNumber: '9876543210', latitude: LAT, longitude: LNG,
      allocated_scratch_cards: 100, assignedBy: merchantId, status: 'active',
    }],
  });
  const range = await Range.create({ campaignId: campaign._id, minAmount: 1, maxAmount: 499, rewards });
  return { campaign, store, range };
}

let mobileSeq = 9000000000;
async function submit({ campaign, store, range }) {
  const res = await participate.POST({
    json: async () => ({
      campaignId: String(campaign._id),
      rangeId: String(range._id),
      customerName: 'Riya',
      customerMobile: String(mobileSeq++),
      billAmount: 0,
      customerLatitude: LAT,
      customerLongitude: LNG,
      customerConsent: true,
      verifiedStore: { storeId: String(store._id), storeName: store.store_name, latitude: LAT, longitude: LNG },
    }),
    headers: { get: () => null },
  });
  return { status: res.status, body: await res.json() };
}

const rewardsNow = async (rangeId) => (await Range.collection.findOne({ _id: rangeId })).rewards;

const R = (rewardId, extra = {}) => ({
  rewardId, type: 'flat', value: 50, isActive: true,
  quantityEnabled: false, totalQuantity: null, remainingQuantity: null, redeemedQuantity: 0, ...extra,
});

test('Case 7 — every reward inactive: refused, and nothing is consumed', async () => {
  const w = await makeWorld([R('a', { isActive: false }), R('b', { isActive: false })]);
  const { status, body } = await submit(w);

  expect(status).toBe(409);
  expect(body.error).toBe('No rewards are currently available for this billing range.');
  expect(await CustomerParticipation.countDocuments()).toBe(0);
  expect(await ScratchCardRecord.countDocuments()).toBe(0);
  const c = await Campaign.collection.findOne({ _id: w.campaign._id });
  expect(c.used_scratch_cards).toBe(0); // scratch allocation untouched
});

test('exhausted limited rewards count as unavailable too', async () => {
  const w = await makeWorld([R('a', { quantityEnabled: true, totalQuantity: 2, remainingQuantity: 0, redeemedQuantity: 2, isActive: false })]);
  expect((await submit(w)).status).toBe(409);
});

test('Case 6 / 12 — only the eligible reward is ever issued; issuing never moves stock', async () => {
  const w = await makeWorld([
    R('off1', { isActive: false }),
    R('empty', { quantityEnabled: true, totalQuantity: 3, remainingQuantity: 0, redeemedQuantity: 3, isActive: false }),
    R('live', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5 }),
    R('off2', { isActive: false }),
  ]);
  for (let i = 0; i < 6; i++) {
    const { status } = await submit(w);
    expect(status).toBe(201);
  }
  const cards = await ScratchCardRecord.find().lean();
  expect(cards).toHaveLength(6);
  expect(cards.every((card) => card.reward_id === 'live')).toBe(true);
  // Six customers received it; none redeemed → stock unchanged.
  const live = (await rewardsNow(w.range._id)).find((r) => r.rewardId === 'live');
  expect(live).toMatchObject({ remainingQuantity: 5, redeemedQuantity: 0 });
});

test('Case 22 — a reward switched off after the range was read is not issued from stale data', async () => {
  const w = await makeWorld([R('stale'), R('fresh')]);
  // Deactivate 'stale' between the route's read and its issue: the re-check
  // against the live document must reject it and re-pick.
  const realFindById = Range.findById.bind(Range);
  const spy = jest.spyOn(Range, 'findById').mockImplementationOnce(async (...args) => {
    const doc = await realFindById(...args);
    doc.rewards = doc.rewards.map((r) => (r.rewardId === 'fresh' ? { ...r, isActive: false } : r)); // route sees only 'stale' as eligible
    await Range.collection.updateOne({ _id: w.range._id }, { $set: { 'rewards.0.isActive': false } }); // ...which is switched off now
    return doc;
  });
  const { status } = await submit(w);
  spy.mockRestore();
  // 'stale' is off in the DB and 'fresh' looked off to the route, but the
  // fresh re-read finds 'fresh' active → issued; 'stale' never is.
  expect(status).toBe(201);
  const card = await ScratchCardRecord.findOne().lean();
  expect(card.reward_id).toBe('fresh');
});

async function revealOf(participationId, scratchCardId) {
  const res = await reveal.POST(
    { json: async () => ({ scratchCardId }), headers: { get: () => null } },
    { params: Promise.resolve({ participationId }) },
  );
  return { status: res.status, body: await res.json() };
}

test('the cashier flow is switched off for now', () => {
  expect(CASHIER_REDEMPTION_ENABLED).toBe(false);
});

test('Feature 3 — scratching (reveal) takes exactly one unit, even on a retry', async () => {
  const w = await makeWorld([R('g', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 4, remainingQuantity: 4 })]);
  const { body } = await submit(w);
  const { participationId, scratchCardId } = body.data;

  expect((await revealOf(participationId, scratchCardId)).status).toBe(200);
  expect((await CustomerParticipation.findById(participationId).lean()).status).toBe('revealed');
  const card = await ScratchCardRecord.findById(scratchCardId).lean();
  expect(card).toMatchObject({ status: 'revealed', stock_stage: 'reveal' });
  expect((await rewardsNow(w.range._id))[0]).toMatchObject({ remainingQuantity: 3, redeemedQuantity: 1, isActive: true });

  // Double tap / retry: refused, and no second unit taken.
  expect((await revealOf(participationId, scratchCardId)).status).toBe(400);
  expect((await rewardsNow(w.range._id))[0]).toMatchObject({ remainingQuantity: 3, redeemedQuantity: 1 });
});

test('a retry after a half-finished reveal never takes a second unit', async () => {
  const w = await makeWorld([R('g', { quantityEnabled: true, totalQuantity: 4, remainingQuantity: 4 })]);
  const { body } = await submit(w);
  const { participationId, scratchCardId } = body.data;
  // First attempt claimed the card + took stock, then failed before the
  // participation was saved.
  const spy = jest.spyOn(CustomerParticipation.prototype, 'save').mockRejectedValueOnce(new Error('network blip'));
  expect((await revealOf(participationId, scratchCardId)).status).toBe(500);
  spy.mockRestore();
  expect((await rewardsNow(w.range._id))[0]).toMatchObject({ remainingQuantity: 3, redeemedQuantity: 1 });

  expect((await revealOf(participationId, scratchCardId)).status).toBe(200);
  expect((await CustomerParticipation.findById(participationId).lean()).status).toBe('revealed');
  expect((await rewardsNow(w.range._id))[0]).toMatchObject({ remainingQuantity: 3, redeemedQuantity: 1 });
});

test('unlimited rewards are never touched by a reveal', async () => {
  const w = await makeWorld([R('u')]);
  const { body } = await submit(w);
  expect((await revealOf(body.data.participationId, body.data.scratchCardId)).status).toBe(200);
  expect((await rewardsNow(w.range._id))[0]).toMatchObject({ quantityEnabled: false, remainingQuantity: null, redeemedQuantity: 0 });
});

test('Case 14 — a legacy range (rewards without ids or flags) keeps working', async () => {
  const w = await makeWorld([{ type: 'flat', value: 30 }, { type: 'percentage', value: 5 }]);
  const { status } = await submit(w);
  expect(status).toBe(201);
  const card = await ScratchCardRecord.findOne().lean();
  expect(card.reward_id).toBeNull(); // unlimited, as before
});

/**
 * END-TO-END through the real routes — the path a real customer takes. With
 * no cashier, the reveal is the redemption: stock goes down when the
 * customer scratches, and the counter endpoint is switched off.
 */
describe('END-TO-END: participate → reveal (= redeemed)', () => {
  const stockOf = async (rangeId) => {
    const r = (await rewardsNow(rangeId))[0];
    return { remaining: r.remainingQuantity, redeemed: r.redeemedQuantity, active: r.isActive };
  };

  async function customerWinsAndReveals(w) {
    const { status, body } = await submit(w);
    expect(status).toBe(201);
    const { participationId, scratchCardId } = body.data;
    expect((await revealOf(participationId, scratchCardId)).status).toBe(200);
    return { participationId, scratchCardId };
  }

  test('a gift with quantity 2 (your screenshot): each scratch takes one; at 0 it switches off', async () => {
    const w = await makeWorld([
      R('gift2', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 2, remainingQuantity: 2 }),
    ]);

    // Received but not scratched yet — stock untouched (no reservation).
    const pending = await submit(w);
    expect(pending.status).toBe(201);
    expect(await stockOf(w.range._id)).toEqual({ remaining: 2, redeemed: 0, active: true });

    // Customer A scratches — "You Won!" → 1 left.
    await revealOf(pending.body.data.participationId, pending.body.data.scratchCardId);
    expect(await stockOf(w.range._id)).toEqual({ remaining: 1, redeemed: 1, active: true });

    // Customer B scratches → 0 left, coupon switches off.
    await customerWinsAndReveals(w);
    expect(await stockOf(w.range._id)).toEqual({ remaining: 0, redeemed: 2, active: false });

    // Nothing left to win in this range now.
    expect((await submit(w)).status).toBe(409);
  });

  test('the last unit: two customers hold it, only the first to scratch gets it', async () => {
    const w = await makeWorld([
      R('last', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 1, remainingQuantity: 1 }),
    ]);
    const a = await submit(w);
    const b = await submit(w); // both issued — stock is never reserved
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    expect((await revealOf(a.body.data.participationId, a.body.data.scratchCardId)).status).toBe(200);
    const late = await revealOf(b.body.data.participationId, b.body.data.scratchCardId);
    expect(late.status).toBe(410);
    expect(late.body.data.code).toBe('OUT_OF_STOCK');
    expect(late.body.error).toMatch(/no longer available/);

    // B's attempt is retired (a rescan starts fresh) and stock never goes negative.
    expect((await CustomerParticipation.findById(b.body.data.participationId).lean()).status).toBe('expired');
    expect((await ScratchCardRecord.findById(b.body.data.scratchCardId).lean()).status).toBe('expired');
    expect(await stockOf(w.range._id)).toEqual({ remaining: 0, redeemed: 1, active: false });
  });

  test('the cashier endpoint is switched off and changes nothing', async () => {
    const w = await makeWorld([
      R('g', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5 }),
    ]);
    const a = await customerWinsAndReveals(w);
    mockStaff.account = {
      _id: new mongoose.Types.ObjectId(), role: 'Store_Staff', storeId: w.store._id, parentId: w.campaign.merchantId,
    };
    const res = await storeRedemptions.POST({ json: async () => ({ scratchCardId: a.scratchCardId }) });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('CASHIER_REDEMPTION_DISABLED');
    expect((await ScratchCardRecord.findById(a.scratchCardId).lean()).status).toBe('revealed');
    expect(await stockOf(w.range._id)).toEqual({ remaining: 4, redeemed: 1, active: true });
  });

  test('turning the cashier back on later: a card that took stock at reveal never takes or returns a second unit', async () => {
    const w = await makeWorld([
      R('g', { type: 'gift', value: 'img', quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5 }),
    ]);
    const a = await customerWinsAndReveals(w);
    expect(await stockOf(w.range._id)).toEqual({ remaining: 4, redeemed: 1, active: true });

    // The service the counter would call (the route itself is switched off).
    const result = await RedemptionService.redeemScratchCard(
      w.campaign.merchantId, null, w.store._id, a.scratchCardId, new mongoose.Types.ObjectId(), 'later',
    );
    expect((await ScratchCardRecord.findById(a.scratchCardId).lean()).status).toBe('redeemed');
    expect(await stockOf(w.range._id)).toEqual({ remaining: 4, redeemed: 1, active: true });

    await RedemptionService.reverseRedemption(result.transaction._id, new mongoose.Types.ObjectId(), 'undo');
    expect((await ScratchCardRecord.findById(a.scratchCardId).lean()).status).toBe('revealed');
    expect(await stockOf(w.range._id)).toEqual({ remaining: 4, redeemed: 1, active: true });
  });
});
