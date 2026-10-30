jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn() }));

import Store from '@/models/storeModel';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import { createCampaign, setCampaignStatus } from '@/lib/services/luckyDraw/campaignService';
import { AuthorizationError } from '@/lib/errors';
import { newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

// Distributor-assigned subscriptions (and paid ones when plans are not seeded) record planType with no linked plan.
const subscribe = (merchantId, planType, overrides = {}) =>
  Subscription.create({ ownerType: 'merchant', ownerId: merchantId, merchantId, planType, status: 'active', ...overrides });

let seq = 0;
async function seedStore(merchantId) {
  const store = global.createMockStore(merchantId, { store_code: `PA${++seq}` });
  await Store.collection.insertOne(store); // raw insert: skips unrelated Store validation
  return store;
}

const linkedPlan = (canUseLuckyDraw) =>
  SubscriptionPlan.create({
    name: 'Smart',
    displayName: 'ScratchX Smart',
    tier: 2,
    price: { monthly: 2999 },
    features: { canUseLuckyDraw },
    limits: { maxCampaigns: 50 },
  });

const input = () => ({
  drawType: 'digital',
  name: 'Diwali Lucky Draw',
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + 30 * DAY).toISOString(),
  minBillAmount: 1000,
  prizes: [
    { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1 },
    { rank: 2, prizeDescription: 'Mixer', prizeValue: 2000, quantity: 3 },
    { rank: 3, prizeDescription: 'Voucher', prizeValue: 500, quantity: 5 },
  ],
});

describe('checkPlanAccess', () => {
  it('reports a subscription with no linked plan instead of failing', async () => {
    const merchantId = newId();
    await subscribe(merchantId, 'SMART');

    const access = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canUseLuckyDraw');

    expect(access).toMatchObject({ allowed: false, plan: null, reason: 'No plan is linked to this subscription' });
    expect(access.subscription.planType).toBe('SMART');
  });
});

describe('Lucky Draw plan check', () => {
  it('lets a Smart merchant with no linked plan create and publish a draw', async () => {
    const merchantId = newId();
    await subscribe(merchantId, 'SMART');
    await seedStore(merchantId);

    const campaign = await createCampaign(String(merchantId), input());
    const published = await setCampaignStatus(String(merchantId), String(campaign._id), 'active');

    expect(published.status).toBe('active');
  });

  it('keeps Lucky Draw off for a Core merchant with no linked plan', async () => {
    const merchantId = newId();
    await subscribe(merchantId, 'CORE');
    await seedStore(merchantId);

    const attempt = createCampaign(String(merchantId), input());

    await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
    await expect(attempt).rejects.toThrow('Lucky Draw is not available on your plan');
  });

  it('follows the linked plan when there is one', async () => {
    const merchantId = newId();
    const plan = await linkedPlan(false);
    await subscribe(merchantId, 'SMART', { planId: plan._id });
    await seedStore(merchantId);

    await expect(createCampaign(String(merchantId), input())).rejects.toThrow(
      `This feature is not available in the ${plan.name} plan`,
    );
  });
});
