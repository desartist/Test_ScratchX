jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));

import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import Store from '@/models/storeModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { createCampaign, setCampaignStatus, listCampaigns, getCampaignDetail } from '@/lib/services/luckyDraw/campaignService';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import * as fixtures from '../../helpers/luckyDrawFixtures';
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

const onlineInput = (_storeId, overrides = {}) => ({ drawType: 'digital', name: 'Diwali Dhamaka', startDate: new Date(Date.now() - DAY).toISOString(), endDate: new Date(Date.now() + 26 * DAY).toISOString(), revealDate: new Date(Date.now() + 28 * DAY).toISOString(), minBillAmount: 2000, prizes: categories.map((c, i) => ({ ...c, rank: i + 1 })), ...overrides });

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

    expect(campaign.drawType).toBe('digital');
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
    const winner = (n) => ({ ...base, entryId: newId(), customerName: `Winner ${n}`, customerPhone: `900000000${n}` });
    await LuckyDrawWinner.create({ ...winner(1), claimCode: 'CLAIMV2A' });
    await LuckyDrawWinner.create({ ...winner(2), claimCode: 'CLAIMV2B', status: 'redeemed' });

    const list = await listCampaigns(String(campaign.merchantId));
    const open = list.find((c) => String(c._id) === String(campaign._id));
    const done = list.find((c) => String(c._id) === String(ended._id));
    expect(open.entryCount).toBe(2);
    expect(done.unclaimedCount).toBe(1);
  });
});

describe('list and detail payloads (v2)', () => {
  const picture = `data:image/png;base64,${'A'.repeat(400)}`;

  it('leaves prize pictures out of the list but keeps them on the draw page', async () => {
    const campaign = await fixtures.createCampaign({
      prizeTiers: [
        { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1, imageUrl: picture },
        { rank: 2, prizeDescription: 'Mixer', prizeValue: 2000, quantity: 1 },
      ],
    });

    const [row] = await listCampaigns(String(campaign.merchantId));
    expect(row.prizeTiers[0].prizeValue).toBe(30000);
    expect(row.prizeTiers[0].imageUrl).toBeUndefined();

    const detail = await getCampaignDetail(String(campaign.merchantId), String(campaign._id));
    expect(detail.campaign.prizeTiers[0].imageUrl).toBe(picture);
  });

  it('counts the customers of the latest finished draw', async () => {
    const campaign = await fixtures.createCampaign({ status: 'ended' });
    const draw = await fixtures.createOpenDraw(campaign, { status: 'completed', executedAt: new Date() });
    await fixtures.createEntry(campaign, draw, { customerPhone: '9000000001' });
    await fixtures.createEntry(campaign, draw, { customerPhone: '9000000001' });
    await fixtures.createEntry(campaign, draw, { customerPhone: '9000000002' });

    const detail = await getCampaignDetail(String(campaign.merchantId), String(campaign._id));
    expect(detail.openDraw).toBeNull();
    expect(detail.pastDraws[0].customerCount).toBe(2);
  });
});
