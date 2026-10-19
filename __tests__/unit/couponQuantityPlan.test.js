/**
 * Fixed scratch allocation when every coupon has a set quantity:
 *   lib/couponQuantityPlan.js + POST /api/campaigns/[id]/allocate-scratch.
 */
const mongoose = require('mongoose');

const mockAuth = { account: null };
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(async () => ({ account: mockAuth.account, error: null })),
}));
jest.mock('@/lib/services/subscriptionValidationService', () => ({
  __esModule: true,
  default: { canAllocateScratchCards: jest.fn(async () => ({ allowed: true })) },
}));
jest.mock('@/lib/scratchEntitlementService', () => ({
  __esModule: true,
  default: { checkEntitlement: jest.fn(async () => ({ type: 'unlimited' })) },
}));

const { couponQuantityPlan, minimumAllocation, requiredAllocation } = require('@/lib/couponQuantityPlan');
const allocate = require('@/app/api/campaigns/[id]/allocate-scratch/route');
const Campaign = require('@/models/campaignModel').default;
const Range = require('@/models/rangeModel').default;

const limited = (n, extra = {}) => ({ type: 'flat', value: 10, isActive: true, quantityEnabled: true, totalQuantity: n, ...extra });
const unlimited = (extra = {}) => ({ type: 'flat', value: 10, isActive: true, quantityEnabled: false, totalQuantity: null, ...extra });

describe('couponQuantityPlan', () => {
  test('every coupon limited → fixed at the sum, across all ranges', () => {
    const plan = couponQuantityPlan([{ rewards: [limited(6), limited(3)] }, { rewards: [limited(5)] }]);
    expect(plan).toEqual({ limited: true, total: 14, reserved: 14, limitedCount: 3, couponCount: 3 });
  });

  test('one unlimited coupon anywhere → not fixed; the limited ones are reserved', () => {
    const plan = couponQuantityPlan([{ rewards: [limited(6), limited(4)] }, { rewards: [unlimited()] }]);
    expect(plan).toEqual({ limited: false, total: null, reserved: 10, limitedCount: 2, couponCount: 3 });
    expect(minimumAllocation(plan, 0)).toBe(10);
    expect(minimumAllocation(plan, 25)).toBe(25);
    expect(minimumAllocation(couponQuantityPlan([{ rewards: [unlimited()] }]), 0)).toBe(0);
  });

  test('inactive coupons still count — they can be switched back on', () => {
    expect(couponQuantityPlan([{ rewards: [limited(6), limited(4, { isActive: false })] }]).total).toBe(10);
  });

  test('no coupons yet / legacy coupons without the flag → not fixed', () => {
    expect(couponQuantityPlan([]).limited).toBe(false);
    expect(couponQuantityPlan([{ rewards: [] }]).limited).toBe(false);
    expect(couponQuantityPlan([{ rewards: [{ type: 'flat', value: 30 }] }]).limited).toBe(false);
  });

  test('never below what customers already used', () => {
    const plan = couponQuantityPlan([{ rewards: [limited(6)] }]);
    expect(requiredAllocation(plan, 2)).toBe(6);
    expect(requiredAllocation(plan, 9)).toBe(9);
    expect(requiredAllocation(couponQuantityPlan([{ rewards: [unlimited()] }]), 5)).toBeNull();
  });
});

describe('POST /api/campaigns/[id]/allocate-scratch', () => {
  async function campaignWith(rewardsPerRange, counters = {}) {
    const merchantId = new mongoose.Types.ObjectId();
    const _id = new mongoose.Types.ObjectId();
    await Campaign.collection.insertOne({
      _id, merchantId, campaignName: 'Festival', status: 'draft',
      startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000),
      allocated_scratch_cards: 0, used_scratch_cards: 0, redeemed_scratch_cards: 0, remaining_scratch_cards: 0,
      ...counters,
    });
    for (const rewards of rewardsPerRange) {
      await Range.collection.insertOne({ campaignId: _id, minAmount: 1, maxAmount: 99, rewards });
    }
    mockAuth.account = { _id: merchantId, role: 'Merchant' };
    return _id;
  }
  const post = async (id, body) => {
    const res = await allocate.POST({ json: async () => body }, { params: Promise.resolve({ id: String(id) }) });
    return { status: res.status, body: await res.json() };
  };
  const allocated = async (id) => (await Campaign.collection.findOne({ _id: id })).allocated_scratch_cards;

  test('your screenshot: coupons 3 + … all limited → only the total is accepted', async () => {
    const id = await campaignWith([[limited(6), limited(3)]]);
    const wrong = await post(id, { allocationAmount: 2000 }); // a quick-select chip
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe('FIXED_COUPON_QUANTITY');
    expect(wrong.body.details.required).toBe(9);
    expect(await allocated(id)).toBe(0);

    const ok = await post(id, { targetTotal: 9 }); // what both screens send
    expect(ok.status).toBe(200);
    expect(await allocated(id)).toBe(9);
  });

  test('a later quantity change re-fixes it to the new total', async () => {
    const id = await campaignWith([[limited(6), limited(3)]], { allocated_scratch_cards: 9, remaining_scratch_cards: 9 });
    await Range.collection.updateOne({ campaignId: id }, { $set: { 'rewards.0.totalQuantity': 10 } });
    expect((await post(id, { targetTotal: 9 })).status).toBe(400);
    expect((await post(id, { targetTotal: 13 })).status).toBe(200);
    expect(await allocated(id)).toBe(13);
  });

  test('design 05: mixed coupons → at least the reserved quantity', async () => {
    const id = await campaignWith([[limited(1200), unlimited()]]);
    const low = await post(id, { allocationAmount: 1000 });
    expect(low.status).toBe(400);
    expect(low.body.code).toBe('BELOW_RESERVED');
    expect(low.body.error).toMatch(/Set at least 1,200 scratches/);
    expect(await allocated(id)).toBe(0);
    expect((await post(id, { allocationAmount: 1200 })).status).toBe(200);
  });

  test('one unlimited coupon → any allocation, exactly as before', async () => {
    const id = await campaignWith([[limited(6), unlimited()]]);
    expect((await post(id, { allocationAmount: 2000 })).status).toBe(200);
    expect(await allocated(id)).toBe(2000);
  });

  test('already used more than the coupon total → the floor wins', async () => {
    const id = await campaignWith([[limited(4)]], { allocated_scratch_cards: 10, used_scratch_cards: 7, remaining_scratch_cards: 3 });
    expect((await post(id, { targetTotal: 4 })).status).toBe(400);
    expect((await post(id, { targetTotal: 7 })).status).toBe(200);
  });
});
