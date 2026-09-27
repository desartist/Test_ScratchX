/**
 * POST /api/campaigns/[id]/allocate-scratch — "set total" mode.
 *
 * The campaign page's Allocate Scratches popup now SETS the allocation
 * ({ targetTotal }) instead of adding to it. Every other caller still sends
 * { allocationAmount } and must keep the additive behaviour.
 *
 * connectDB / requireAuth / entitlement services are mocked, so this runs
 * purely against the in-memory MongoDB from __tests__/setup.js.
 */
const mongoose = require('mongoose');

// `mock` prefix: jest hoists jest.mock() above this line, and only
// mock*-named variables may be referenced from a factory.
const mockMerchantId = new mongoose.Types.ObjectId();
const merchantId = mockMerchantId;

jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(async () => ({
    account: { _id: mockMerchantId, role: 'Merchant' },
    error: null,
  })),
}));
jest.mock('@/lib/services/subscriptionValidationService', () => ({
  __esModule: true,
  default: { canAllocateScratchCards: jest.fn(async () => ({ allowed: true })) },
}));
jest.mock('@/lib/scratchEntitlementService', () => ({
  __esModule: true,
  default: { checkEntitlement: jest.fn(async () => ({ type: 'unlimited' })) },
}));

const { POST } = require('@/app/api/campaigns/[id]/allocate-scratch/route');
const Campaign = require('@/models/campaignModel').default;
const subscriptionValidationService = require('@/lib/services/subscriptionValidationService').default;
const scratchEntitlementService = require('@/lib/scratchEntitlementService').default;

async function makeCampaign({ allocated = 13100, used = 0 } = {}) {
  return Campaign.create({
    merchantId,
    campaignName: 'Test Campaign',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    allocated_scratch_cards: allocated,
    used_scratch_cards: used,
    remaining_scratch_cards: allocated - used,
  });
}

async function call(campaignId, body) {
  const res = await POST(
    { json: async () => body },
    { params: Promise.resolve({ id: String(campaignId) }) },
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  scratchEntitlementService.checkEntitlement.mockResolvedValue({ type: 'unlimited' });
  subscriptionValidationService.canAllocateScratchCards.mockResolvedValue({ allowed: true });
});

describe('set mode ({ targetTotal })', () => {
  test('raises the total to exactly the value chosen', async () => {
    const c = await makeCampaign({ allocated: 13100, used: 400 });
    const { status, body } = await call(c._id, { targetTotal: 15000 });
    expect(status).toBe(200);
    expect(body.data.allocated_scratch_cards).toBe(15000); // not 28,100
    expect(body.data.remaining_scratch_cards).toBe(14600);
    expect(body.data.added).toBe(1900);
    // Plan limit is checked against the increase, not the whole total.
    expect(subscriptionValidationService.canAllocateScratchCards).toHaveBeenCalledWith(
      String(merchantId), 1900, 'merchant',
    );
  });

  test('lowers the total (the reported case: 13,100 → 2,000)', async () => {
    const c = await makeCampaign({ allocated: 13100, used: 500 });
    const { status, body } = await call(c._id, { targetTotal: 2000 });
    expect(status).toBe(200);
    expect(body.data.allocated_scratch_cards).toBe(2000);
    expect(body.data.remaining_scratch_cards).toBe(1500);
    expect(body.data.added).toBe(-11100);
    const saved = await Campaign.findById(c._id).lean();
    expect(saved.allocated_scratch_cards).toBe(2000);
  });

  test('a reduction skips plan-limit and balance checks entirely', async () => {
    scratchEntitlementService.checkEntitlement.mockResolvedValue({ type: 'none' });
    const c = await makeCampaign({ allocated: 13100 });
    const { status } = await call(c._id, { targetTotal: 5000 });
    expect(status).toBe(200); // expired grant can still trim a campaign
    expect(scratchEntitlementService.checkEntitlement).not.toHaveBeenCalled();
    expect(subscriptionValidationService.canAllocateScratchCards).not.toHaveBeenCalled();
  });

  test('cannot go below scratches already used', async () => {
    const c = await makeCampaign({ allocated: 13100, used: 3000 });
    const { status, body } = await call(c._id, { targetTotal: 2000 });
    expect(status).toBe(400);
    expect(body.error).toMatch(/3,000/);
    const saved = await Campaign.findById(c._id).lean();
    expect(saved.allocated_scratch_cards).toBe(13100); // untouched
  });

  test('exactly the used count is allowed (remaining 0)', async () => {
    const c = await makeCampaign({ allocated: 13100, used: 3000 });
    const { status, body } = await call(c._id, { targetTotal: 3000 });
    expect(status).toBe(200);
    expect(body.data.remaining_scratch_cards).toBe(0);
  });

  test('same as current is a no-op', async () => {
    const c = await makeCampaign({ allocated: 13100 });
    const { status, body } = await call(c._id, { targetTotal: 13100 });
    expect(status).toBe(200);
    expect(body.data.added).toBe(0);
    expect(body.message).toBe('Allocation unchanged');
  });

  test('pack balance limits only the increase', async () => {
    scratchEntitlementService.checkEntitlement.mockResolvedValue({ type: 'pack', totalRemaining: 1000 });
    const c = await makeCampaign({ allocated: 13100 });
    // +900 fits in a 1,000 balance even though the total is 14,000
    expect((await call(c._id, { targetTotal: 14000 })).status).toBe(200);
    // +2,000 more on top of that does not
    const over = await call(c._id, { targetTotal: 16000 });
    expect(over.status).toBe(400);
    expect(over.body.details.requested).toBe(2000);
  });

  test.each([[0], [-5], ['2000'], [NaN]])('rejects invalid targetTotal %p', async (targetTotal) => {
    const c = await makeCampaign();
    const { status } = await call(c._id, { targetTotal });
    expect(status).toBe(400);
  });
});

describe('additive mode ({ allocationAmount }) — other callers, unchanged', () => {
  test('still adds on top of the existing allocation', async () => {
    const c = await makeCampaign({ allocated: 13100, used: 100 });
    const { status, body } = await call(c._id, { allocationAmount: 2000 });
    expect(status).toBe(200);
    expect(body.data.allocated_scratch_cards).toBe(15100);
    expect(body.data.remaining_scratch_cards).toBe(15000);
    expect(body.data.added).toBe(2000);
  });

  test('first allocation on an empty campaign', async () => {
    const c = await makeCampaign({ allocated: 0 });
    const { body } = await call(c._id, { allocationAmount: 2000 });
    expect(body.data.allocated_scratch_cards).toBe(2000);
  });

  test('pack balance still checked against the added amount', async () => {
    scratchEntitlementService.checkEntitlement.mockResolvedValue({ type: 'pack', totalRemaining: 1000 });
    const c = await makeCampaign({ allocated: 13100 });
    expect((await call(c._id, { allocationAmount: 1500 })).status).toBe(400);
  });

  test('rejects a missing amount', async () => {
    const c = await makeCampaign();
    expect((await call(c._id, {})).status).toBe(400);
  });
});

test('someone else\'s campaign is refused', async () => {
  const other = await Campaign.create({
    merchantId: new mongoose.Types.ObjectId(),
    campaignName: 'Not mine',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    allocated_scratch_cards: 100,
  });
  const { status } = await call(other._id, { targetTotal: 5 });
  expect(status).toBe(403);
});
