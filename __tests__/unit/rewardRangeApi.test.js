/**
 * Range save API (/api/campaign_range) and the customer card endpoint
 * (/api/customer/campaign/[id]/coupons) — routes called directly with
 * connectDB / auth / plan-limit mocked, against the in-memory MongoDB.
 */
const mongoose = require('mongoose');

const mockAuth = { account: null };
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock('@/lib/connectDB.js', () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock('@/lib/auth.js', () => ({
  requireAuth: jest.fn(async () => ({ account: mockAuth.account, error: null })),
}));
jest.mock('@/lib/subscriptionGuard.js', () => ({ enforceFeatureLimit: jest.fn(async () => null) }));

const rangeApi = require('@/app/api/campaign_range/route');
const couponsApi = require('@/app/api/customer/campaign/[id]/coupons/route');
const RedemptionService = require('@/lib/redemptionService').default;
const { takeRewardStock } = require('@/lib/services/rewardInventoryService');
const Range = require('@/models/rangeModel').default;
const Campaign = require('@/models/campaignModel').default;
const ScratchCardRecord = require('@/models/scratchCardRecordModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;

const oid = () => new mongoose.Types.ObjectId();
const MIN = 60 * 1000;

async function makeCampaign({ merchantId = oid(), displayCoupons = 6, storeId = oid() } = {}) {
  const _id = oid();
  await Campaign.collection.insertOne({
    _id, merchantId, campaignName: 'C', status: 'active', displayCoupons,
    startDate: new Date(Date.now() - 60 * MIN), endDate: new Date(Date.now() + 60 * MIN),
    assignedStores: [{ storeId, storeName: 'S', status: 'active' }],
  });
  await mongoose.connection.collection('stores').insertOne({ _id: storeId, store_name: 'S' });
  return { campaignId: _id, merchantId, storeId };
}

const asMerchant = (merchantId) => {
  mockAuth.account = { _id: merchantId, role: 'Merchant' };
};

async function post(body) {
  const res = await rangeApi.POST({ json: async () => body });
  return { status: res.status, body: await res.json() };
}

const sixRewards = () => [
  { type: 'flat', value: 50, isActive: true },
  { type: 'gift', value: 'img', isActive: true, quantityEnabled: true, totalQuantity: 5 },
  { type: 'percentage', value: 10, isActive: false, quantityEnabled: true, totalQuantity: 10 },
  { type: 'flat', value: 20, isActive: true, quantityEnabled: true, totalQuantity: 2 },
  { type: 'gift', value: 'img2', isActive: false },
  { type: 'flat', value: 99, isActive: true },
];

describe('saving rewards', () => {
  test('creation persists status + stock for all reward types', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const { status, body } = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 499, rewards: sixRewards() });
    expect(status).toBe(201);
    const saved = (await Range.findById(body.range._id).lean()).rewards;
    expect(saved).toHaveLength(6);
    expect(saved.every((r) => /^[a-f0-9]{24}$/.test(r.rewardId))).toBe(true);
    expect(saved[1]).toMatchObject({ type: 'gift', quantityEnabled: true, totalQuantity: 5, remainingQuantity: 5, redeemedQuantity: 0 });
    expect(saved[2]).toMatchObject({ type: 'percentage', isActive: false, remainingQuantity: 10 });
    expect(saved[4]).toMatchObject({ isActive: false, quantityEnabled: false });
  });

  test("another merchant's campaign is refused (ownership)", async () => {
    const c = await makeCampaign();
    asMerchant(oid());
    const { status } = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9, rewards: [{ type: 'flat', value: 1 }] });
    expect(status).toBe(403);
    expect(await Range.countDocuments()).toBe(0);
  });

  test("a range from another campaign can't be edited through this one", async () => {
    const mine = await makeCampaign();
    const theirs = await makeCampaign();
    const foreign = await Range.create({ campaignId: theirs.campaignId, minAmount: 1, maxAmount: 9, rewards: [] });
    asMerchant(mine.merchantId);
    const { status } = await post({ campaignId: String(mine.campaignId), rangeId: String(foreign._id), minAmount: 1, maxAmount: 9, rewards: [] });
    expect(status).toBe(404);
  });

  test('invalid quantity → 400 with a clear message, nothing saved', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const { status, body } = await post({
      campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9,
      rewards: [{ type: 'flat', value: 1, quantityEnabled: true, totalQuantity: -3 }],
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/Coupon 1: .*whole number/);
  });

  test('activating a zero-stock coupon is refused until replenished', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const created = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9, rewards: [{ type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 1 }] });
    const rangeId = created.body.range._id;
    const id = created.body.range.rewards[0].rewardId;
    // simulate it being redeemed out: 1 redeemed, 0 left, auto-inactive
    await Range.collection.updateOne({ _id: new mongoose.Types.ObjectId(rangeId) }, {
      $set: { 'rewards.0.redeemedQuantity': 1, 'rewards.0.remainingQuantity': 0, 'rewards.0.isActive': false },
    });

    const refused = await post({ campaignId: String(c.campaignId), rangeId, minAmount: 1, maxAmount: 9,
      rewards: [{ rewardId: id, type: 'flat', value: 1, isActive: true, quantityEnabled: true, totalQuantity: 1 }] });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toContain('Please increase the available quantity before activating this coupon.');

    const ok = await post({ campaignId: String(c.campaignId), rangeId, minAmount: 1, maxAmount: 9,
      rewards: [{ rewardId: id, type: 'flat', value: 1, isActive: true, quantityEnabled: true, totalQuantity: 4 }] });
    expect(ok.status).toBe(200);
    expect(ok.body.range.rewards[0]).toMatchObject({ isActive: true, totalQuantity: 4, remainingQuantity: 3, redeemedQuantity: 1 });
  });

  test('Case 13 (deterministic) — a redemption landing between a save\'s read and write is not lost', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const created = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9,
      rewards: [{ type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 10 }] });
    const rangeId = created.body.range._id;
    const id = created.body.range.rewards[0].rewardId;

    // Force the worst interleaving: the save reads the range, THEN a
    // redemption takes a unit, THEN the save writes. Without the
    // rewardsVersion check the save would overwrite redeemedQuantity with
    // the stale value it read.
    const realFindById = Range.findById.bind(Range);
    const spy = jest.spyOn(Range, 'findById').mockImplementationOnce((...args) => {
      const q = realFindById(...args);
      return {
        lean: async () => {
          const staleDoc = await q.lean();
          await takeRewardStock({ rangeId, rewardId: id }); // a redemption lands here
          return staleDoc;
        },
      };
    });

    const res = await post({ campaignId: String(c.campaignId), rangeId, minAmount: 1, maxAmount: 9,
      rewards: [{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 12 }] });
    spy.mockRestore();

    expect(res.status).toBe(200);
    const r = (await Range.findById(rangeId).lean()).rewards[0];
    expect(r.redeemedQuantity).toBe(1);           // the redemption survived the save
    expect(r.totalQuantity).toBe(12);             // the merchant's edit applied too
    expect(r.remainingQuantity).toBe(11);         // invariant: total − redeemed
  });

  test('Case 13 — merchant saves racing redemptions never lose a redemption', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const created = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9,
      rewards: [{ type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 50 }] });
    const rangeId = created.body.range._id;
    const id = created.body.range.rewards[0].rewardId;

    // 8 issued cards, redeemed concurrently with 8 merchant saves that each
    // send STALE counters (as an open editor would).
    const cards = [];
    for (let i = 0; i < 8; i++) {
      const pid = oid(); const cid = oid();
      await CustomerParticipation.collection.insertOne({ _id: pid, campaign_id: c.campaignId, store_id: c.storeId, status: 'revealed' });
      await ScratchCardRecord.collection.insertOne({
        _id: cid, campaign_id: c.campaignId, merchant_id: c.merchantId, store_id: c.storeId,
        range_id: new mongoose.Types.ObjectId(rangeId), reward_id: id, customer_participation_id: pid,
        status: 'revealed', expires_at: new Date(Date.now() + 5 * MIN), redeemed_at: null,
      });
      cards.push(cid);
    }
    const saves = Array.from({ length: 8 }, (_, i) =>
      post({ campaignId: String(c.campaignId), rangeId, minAmount: 1, maxAmount: 9,
        rewards: [{ rewardId: id, type: 'flat', value: 1, quantityEnabled: true, totalQuantity: 60 + i, redeemedQuantity: 0, remainingQuantity: 999 }] }));
    const redemptions = cards.map((cid) =>
      RedemptionService.redeemScratchCard(c.merchantId, null, c.storeId, String(cid), oid()));

    const [saveResults, redeemResults] = await Promise.all([Promise.allSettled(saves), Promise.allSettled(redemptions)]);
    expect(redeemResults.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(saveResults.every((r) => r.status === 'fulfilled')).toBe(true);

    const r = (await Range.findById(rangeId).lean()).rewards[0];
    expect(r.redeemedQuantity).toBe(8); // no redemption lost to a stale save
    expect(r.remainingQuantity).toBe(r.totalQuantity - r.redeemedQuantity); // invariant holds
  });
});

describe('customer card count (Feature 4)', () => {
  async function cardsFor(campaignId) {
    const res = await couponsApi.GET({}, { params: Promise.resolve({ id: String(campaignId) }) });
    return (await res.json()).data.coupons;
  }

  test('6 configured, 2 inactive, 1 exhausted → still 6 cards', async () => {
    const c = await makeCampaign({ displayCoupons: 6 });
    asMerchant(c.merchantId);
    const r = sixRewards();
    r[3].totalQuantity = 1; // will be exhausted below
    const created = await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9, rewards: r });
    await Range.collection.updateOne({ _id: new mongoose.Types.ObjectId(created.body.range._id) }, {
      $set: { 'rewards.3.remainingQuantity': 0, 'rewards.3.isActive': false },
    });
    expect(await cardsFor(c.campaignId)).toHaveLength(6);
  });

  test('every reward inactive → still the configured count', async () => {
    const c = await makeCampaign({ displayCoupons: 8 });
    asMerchant(c.merchantId);
    await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9,
      rewards: sixRewards().map((x) => ({ ...x, isActive: false })) });
    expect(await cardsFor(c.campaignId)).toHaveLength(8);
  });

  test('cards reveal nothing about the rewards before scratching', async () => {
    const c = await makeCampaign({ displayCoupons: 4 });
    asMerchant(c.merchantId);
    await post({ campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9, rewards: sixRewards() });
    const cards = await cardsFor(c.campaignId);
    for (const card of cards) {
      expect(Object.keys(card).sort()).toEqual(['id', 'rangeId']);
    }
  });
});

/**
 * The coupon editor's quantity box edits how many are LEFT (available). The
 * server adds its own live redeemed count to get the total, so a scratch
 * landing while the merchant edits can't skew what they asked for.
 */
describe('editing the available quantity', () => {
  async function savedGift(remaining, redeemed) {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const created = await post({
      campaignId: String(c.campaignId), minAmount: 500, maxAmount: 4000,
      rewards: [{ type: 'gift', value: 'img', isActive: true, quantityEnabled: true, totalQuantity: remaining + redeemed }],
    });
    const rangeId = created.body.range._id;
    await Range.collection.updateOne({ _id: new mongoose.Types.ObjectId(rangeId) }, {
      $set: { 'rewards.0.redeemedQuantity': redeemed, 'rewards.0.remainingQuantity': remaining },
    });
    const reward = (await Range.findById(rangeId).lean()).rewards[0];
    const save = (fields) => post({
      campaignId: String(c.campaignId), rangeId, minAmount: 500, maxAmount: 4000,
      rewards: [{ type: 'gift', value: 'img', rewardId: reward.rewardId, quantityEnabled: true, ...fields }],
    });
    const now = async () => (await Range.findById(rangeId).lean()).rewards[0];
    return { rangeId, reward, save, now };
  }

  test('your screenshot: total 2, 1 won — box shows 1; lowering to 0 saves as inactive', async () => {
    const g = await savedGift(1, 1);
    const res = await g.save({ isActive: false, availableQuantity: 0 });
    expect(res.status).toBe(200);
    expect(await g.now()).toMatchObject({ totalQuantity: 1, remainingQuantity: 0, redeemedQuantity: 1, isActive: false });
  });

  test('raising available to 5 makes total = 5 + redeemed', async () => {
    const g = await savedGift(1, 1);
    expect((await g.save({ isActive: true, availableQuantity: 5 })).status).toBe(200);
    expect(await g.now()).toMatchObject({ totalQuantity: 6, remainingQuantity: 5, redeemedQuantity: 1, isActive: true });
  });

  test('available 0 while active is refused', async () => {
    const g = await savedGift(1, 1);
    const res = await g.save({ isActive: true, availableQuantity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/increase the available quantity/);
  });

  test('a scratch landing mid-edit does not skew the available figure', async () => {
    const g = await savedGift(3, 1);
    // Merchant opened the editor seeing 3 left; one more is won meanwhile.
    await takeRewardStock({ rangeId: g.rangeId, rewardId: g.reward.rewardId });
    expect((await g.save({ isActive: true, availableQuantity: 3 })).status).toBe(200);
    expect(await g.now()).toMatchObject({ remainingQuantity: 3, redeemedQuantity: 2, totalQuantity: 5 });
  });

  test('invalid available figures are refused; counters are never taken from the client', async () => {
    const g = await savedGift(2, 1);
    for (const bad of [-1, 1.5, 'abc', '']) {
      expect((await g.save({ isActive: true, availableQuantity: bad })).status).toBe(400);
    }
    expect((await g.save({ isActive: true, availableQuantity: 4, redeemedQuantity: 0, remainingQuantity: 99 })).status).toBe(200);
    const r = await g.now();
    expect(r).toMatchObject({ remainingQuantity: 4, redeemedQuantity: 1, totalQuantity: 5 });
    expect(r.availableQuantity).toBeUndefined(); // not stored
  });

  test('a brand-new limited reward needs at least 1 available', async () => {
    const c = await makeCampaign();
    asMerchant(c.merchantId);
    const res = await post({
      campaignId: String(c.campaignId), minAmount: 1, maxAmount: 9,
      rewards: [{ type: 'flat', value: 5, isActive: false, quantityEnabled: true, availableQuantity: 0 }],
    });
    expect(res.status).toBe(400);
  });
});
