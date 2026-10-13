jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { markWinnerClaimed } from '@/lib/services/luckyDraw/claimService';
import { getPublicReveal } from '@/lib/services/luckyDraw/revealService';
import { startLiveReveal, revealNextCategory } from '@/lib/services/luckyDraw/liveRevealService';
import { runDraw } from '@/lib/services/luckyDraw/drawService';
import { NotFoundError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, nextPhone, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

const CLOSE = new Date('2026-10-01T18:29:00.000Z');
const LATER = new Date(CLOSE.getTime() + DAY);
const image = 'data:image/jpeg;base64,AAAA';
const categories = [
  { rank: 1, prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1, imageUrl: image },
  { rank: 2, prizeDescription: 'Second prize', prizeValue: 5000, quantity: 2 },
  { rank: 3, prizeDescription: 'Third prize', prizeValue: 3000, quantity: 3 },
];

async function liveDraw() {
  const campaign = await createCampaign({
    drawType: 'live_online',
    prizeTiers: categories,
    startDate: new Date(CLOSE.getTime() - 10 * DAY),
    endDate: CLOSE,
    revealDate: CLOSE,
  });
  const draw = await createOpenDraw(campaign, { drawDate: CLOSE });
  for (let i = 0; i < 8; i += 1) await createEntry(campaign, draw, { customerName: 'Priya Shah', customerPhone: nextPhone() });
  const merchantId = String(campaign.merchantId);
  const started = await startLiveReveal(merchantId, String(draw._id), { now: LATER });
  return { campaign, draw, merchantId, winners: started.winners };
}

async function instantDraw() {
  const campaign = await createCampaign({ prizeTiers: categories });
  const draw = await createOpenDraw(campaign);
  for (let i = 0; i < 8; i += 1) await createEntry(campaign, draw, { customerPhone: nextPhone() });
  const { winners } = await runDraw(draw._id, { source: 'manual', now: LATER });
  return { campaign, merchantId: String(campaign.merchantId), winners };
}

describe('markWinnerClaimed', () => {
  it('marks a winner as claimed and keeps the customer the QR entry recorded', async () => {
    const { merchantId, winners } = await instantDraw();
    const account = { _id: newId(), role: 'Merchant' };

    const claimed = await markWinnerClaimed(merchantId, String(winners[0]._id), { account, now: LATER });

    expect(claimed).toMatchObject({ status: 'redeemed', customerName: winners[0].customerName, customerPhone: winners[0].customerPhone });
    expect(claimed.redeemedAt.toISOString()).toBe(LATER.toISOString());
  });

  it('refuses twice, after expiry, before a live prize is revealed, and other merchants’ winners', async () => {
    const { merchantId, winners } = await instantDraw();
    const account = { _id: newId(), role: 'Merchant' };
    await markWinnerClaimed(merchantId, String(winners[0]._id), { account, now: LATER });
    await expect(markWinnerClaimed(merchantId, String(winners[0]._id), { account, now: LATER })).rejects.toThrow(/already/i);
    await expect(
      markWinnerClaimed(merchantId, String(winners[1]._id), { account, now: new Date(LATER.getTime() + 60 * DAY) }),
    ).rejects.toThrow(/expired/i);
    await expect(markWinnerClaimed(String(newId()), String(winners[2]._id), { account })).rejects.toThrow(NotFoundError);

    const live = await liveDraw();
    await expect(markWinnerClaimed(live.merchantId, String(live.winners[0]._id), { account, now: LATER })).rejects.toThrow(NotFoundError);
  });
});

describe('getPublicReveal', () => {
  it('shows prizes in reveal order and hides winners until their category is revealed', async () => {
    const { campaign, draw, merchantId } = await liveDraw();

    let view = await getPublicReveal(String(campaign._id));
    expect(view.status).toBe('live');
    expect(view.categories.map((c) => c.name)).toEqual(['Third prize', 'Second prize', 'Grand prize']);
    expect(view.categories.map((c) => c.level)).toEqual(['3rd prize', '2nd prize', 'Grand prize']);
    expect(view.categories[2]).toMatchObject({ value: 20000, quantity: 1, imageUrl: image, revealed: false, winners: [] });
    expect(JSON.stringify(view)).not.toMatch(/claimCode|customerPhone/);

    await revealNextCategory(merchantId, String(draw._id), { now: LATER });
    view = await getPublicReveal(String(campaign._id));
    expect(view.categories[0].revealed).toBe(true);
    expect(view.categories[0].winners).toHaveLength(3);
    expect(view.categories[0].winners[0]).toMatchObject({ label: 'Priya S.', sub: expect.stringMatching(/^Phone ending \d{4}$/) });
    expect(view.categories[1].winners).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/claimCode|customerPhone/);
  });

  it('says the reveal has not started before the draw', async () => {
    const campaign = await createCampaign({ prizeTiers: categories, revealDate: new Date(Date.now() + 40 * DAY) });
    await createOpenDraw(campaign);
    const view = await getPublicReveal(String(campaign._id));
    expect(view.status).toBe('not_started');
    expect(view.categories.every((c) => !c.revealed && c.winners.length === 0)).toBe(true);
  });

  it('shows online winners by masked name once the draw has run', async () => {
    const campaign = await createCampaign({ prizeTiers: categories });
    const draw = await createOpenDraw(campaign);
    for (let i = 0; i < 8; i += 1) {
      await createEntry(campaign, draw, { customerName: 'Priya Shah', customerPhone: nextPhone() });
    }
    await runDraw(draw._id, { source: 'manual' });

    const view = await getPublicReveal(String(campaign._id));
    expect(view.status).toBe('done');
    const grand = view.categories.find((c) => c.name === 'Grand prize');
    expect(grand.winners[0].label).toMatch(/^Priya S\.$/);
    expect(grand.winners[0].sub).toMatch(/^Phone ending \d{4}$/);
    expect(await LuckyDrawWinner.countDocuments({ campaignId: campaign._id })).toBe(6);
  });

  it('rejects an unknown campaign', async () => {
    await expect(getPublicReveal(String(newId()))).rejects.toThrow(NotFoundError);
  });
});
