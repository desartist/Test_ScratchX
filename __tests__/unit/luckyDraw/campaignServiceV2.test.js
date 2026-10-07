jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));

import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import Store from '@/models/storeModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { createCampaign, setCampaignStatus, listCampaigns } from '@/lib/services/luckyDraw/campaignService';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import * as fixtures from '../../helpers/luckyDrawFixtures';
import { ValidationError } from '@/lib/errors';
import { newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

let storeSeq = 0;
async function seedStore(merchantId, overrides = {}) {
  const store = global.createMockStore(merchantId, { store_code: `LV${++storeSeq}`, ...overrides });
  await Store.collection.insertOne(store);
  return store;
}

const image = 'data:image/jpeg;base64,' + 'A'.repeat(64);
const categories = [
  { prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1, imageUrl: image },
  { prizeDescription: 'Second prize', prizeValue: 5000, quantity: 5 },
  { prizeDescription: 'Third prize', prizeValue: 3000, quantity: 10 },
];

const onlineInput = (storeId, overrides = {}) => ({
  name: 'Diwali Dhamaka',
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + 26 * DAY).toISOString(),
  revealDate: new Date(Date.now() + 28 * DAY).toISOString(),
  storeIds: [String(storeId)],
  entryTiers: [{ minAmount: 2000, maxAmount: null, entriesGranted: 1 }],
  prizes: categories,
  scheduleType: 'end_of_campaign',
  ...overrides,
});

beforeEach(() => {
  checkPlanAccess.mockReset();
  checkPlanAccess.mockResolvedValue({ allowed: true, plan: { limits: { maxCampaigns: 5 } } });
});

describe('createCampaign (v2)', () => {
  it('stores prize categories with value, winners and image, plus the reveal date', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    const input = onlineInput(store._id);

    const campaign = await createCampaign(String(merchantId), input);

    expect(campaign.distributionMode).toBe('online');
    expect(new Date(campaign.revealDate).toISOString()).toBe(input.revealDate);
    expect(campaign.prizeTiers.map((p) => [p.rank, p.prizeDescription, p.prizeValue, p.quantity])).toEqual([
      [1, 'Grand prize', 20000, 1],
      [2, 'Second prize', 5000, 5],
      [3, 'Third prize', 3000, 10],
    ]);
    expect(campaign.prizeTiers[0].imageUrl).toBe(image);
    expect(campaign.prizeTiers[1].imageUrl).toBeNull();
  });

  it('reveals when entries close if no reveal date is given', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    const input = onlineInput(store._id, { revealDate: undefined });
    const campaign = await createCampaign(String(merchantId), input);
    expect(new Date(campaign.revealDate).toISOString()).toBe(input.endDate);
  });

  it('refuses a reveal date before entries close', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    await expect(
      createCampaign(String(merchantId), onlineInput(store._id, { revealDate: new Date(Date.now() + 2 * DAY).toISOString() })),
    ).rejects.toThrow(/reveal/i);
  });

  it('refuses prizes without a value and an unknown mode', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    await expect(
      createCampaign(String(merchantId), onlineInput(store._id, { prizes: [{ prizeDescription: 'TV', quantity: 1 }] })),
    ).rejects.toThrow(ValidationError);
    await expect(
      createCampaign(String(merchantId), onlineInput(store._id, { distributionMode: 'fax' })),
    ).rejects.toThrow(/how customers enter/i);
  });

  it.each(['manual_online_reveal', 'manual_offline_reveal'])(
    '%s: needs no bill ranges or store location, and the owner runs one draw on the reveal date',
    async (distributionMode) => {
      const merchantId = newId();
      const store = await seedStore(merchantId, { latitude: null, longitude: null });

      const campaign = await createCampaign(String(merchantId), {
        ...onlineInput(store._id),
        distributionMode,
        entryTiers: undefined,
        scheduleType: 'recurring',
        triggerMode: 'automatic',
        recurrence: { frequency: 'daily' },
        maxEntriesPerCustomerPerPeriod: 3,
        slipCount: 640,
      });

      expect(campaign.distributionMode).toBe(distributionMode);
      expect(campaign.entryTiers).toEqual([]);
      expect(campaign.prizeMode).toBe('shared');
      expect(campaign.maxEntriesPerCustomerPerPeriod).toBeNull();
      expect(campaign.drawConfig).toMatchObject({ scheduleType: 'end_of_campaign', triggerMode: 'manual' });
      expect(campaign.slipCount).toBe(640);
    },
  );

  it('refuses a negative or fractional slip count', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    await expect(
      createCampaign(String(merchantId), { ...onlineInput(store._id), distributionMode: 'manual_offline_reveal', slipCount: -1 }),
    ).rejects.toThrow(/slips/i);
  });

  it('schedules the first draw on the reveal date when activated', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    const input = onlineInput(store._id);
    const campaign = await createCampaign(String(merchantId), input);

    await setCampaignStatus(String(merchantId), String(campaign._id), 'active');

    const draw = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' }).lean();
    expect(draw.drawDate.toISOString()).toBe(input.revealDate);
  });
});

describe('listCampaigns (v2)', () => {
  it('adds entry counts for the open draw and unclaimed prizes', async () => {
    const campaign = await fixtures.createCampaign();
    const draw = await fixtures.createOpenDraw(campaign);
    await fixtures.createEntry(campaign, draw);
    await fixtures.createEntry(campaign, draw);
    const ended = await fixtures.createCampaign({ merchantId: campaign.merchantId, status: 'ended' });
    const base = {
      drawId: newId(),
      campaignId: ended._id,
      merchantId: campaign.merchantId,
      rank: 1,
      prizeDescription: 'TV',
      expiresAt: new Date(Date.now() + DAY),
    };
    await LuckyDrawWinner.create({ ...base, slipNumber: 1, claimCode: 'CLAIMV2A' });
    await LuckyDrawWinner.create({ ...base, slipNumber: 2, claimCode: 'CLAIMV2B', status: 'redeemed' });

    const list = await listCampaigns(String(campaign.merchantId));
    const open = list.find((c) => String(c._id) === String(campaign._id));
    const done = list.find((c) => String(c._id) === String(ended._id));
    expect(open.entryCount).toBe(2);
    expect(done.unclaimedCount).toBe(1);
  });
});
