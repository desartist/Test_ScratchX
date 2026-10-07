jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { markWinnerClaimed } from '@/lib/services/luckyDraw/claimService';
import { getPublicReveal } from '@/lib/services/luckyDraw/revealService';
import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { startLiveReveal, revealNextCategory } from '@/lib/services/luckyDraw/slipDrawService';
import { runDraw } from '@/lib/services/luckyDraw/drawService';
import { NotFoundError, ValidationError } from '@/lib/errors';
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

async function liveSlipDraw() {
  const campaign = await createCampaign({
    distributionMode: 'manual_online_reveal',
    entryTiers: [],
    prizeTiers: categories,
    slipCount: 50,
    startDate: new Date(CLOSE.getTime() - 10 * DAY),
    endDate: CLOSE,
    revealDate: CLOSE,
    drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'manual' },
  });
  const draw = await createOpenDraw(campaign, { drawDate: CLOSE });
  const merchantId = String(campaign.merchantId);
  const started = await startLiveReveal(merchantId, String(draw._id), { now: LATER });
  return { campaign, draw, merchantId, winners: started.winners };
}

describe('markWinnerClaimed', () => {
  it('marks a slip winner as claimed and can record who collected it', async () => {
    const { merchantId, winners } = await liveSlipDraw();
    const account = { _id: newId(), role: 'Merchant' };

    const claimed = await markWinnerClaimed(merchantId, String(winners[0]._id), {
      account,
      customerName: 'Priya Shah',
      customerPhone: '9876543210',
      now: LATER,
    });

    expect(claimed).toMatchObject({ status: 'redeemed', customerName: 'Priya Shah', customerPhone: '9876543210' });
    expect(claimed.redeemedAt.toISOString()).toBe(LATER.toISOString());
  });

  it('refuses twice, after expiry, a bad phone and other merchants’ winners', async () => {
    const { merchantId, winners } = await liveSlipDraw();
    const account = { _id: newId(), role: 'Merchant' };
    await expect(markWinnerClaimed(merchantId, String(winners[0]._id), { account, customerPhone: '123' })).rejects.toThrow(
      ValidationError,
    );
    await markWinnerClaimed(merchantId, String(winners[0]._id), { account, now: LATER });
    await expect(markWinnerClaimed(merchantId, String(winners[0]._id), { account, now: LATER })).rejects.toThrow(/already/i);
    await expect(
      markWinnerClaimed(merchantId, String(winners[1]._id), { account, now: new Date(LATER.getTime() + 60 * DAY) }),
    ).rejects.toThrow(/expired/i);
    await expect(markWinnerClaimed(String(newId()), String(winners[2]._id), { account })).rejects.toThrow(NotFoundError);
  });
});

describe('notifyPendingWinners', () => {
  it('never texts slip winners, who have no phone number', async () => {
    await liveSlipDraw();
    const result = await notifyPendingWinners({ now: LATER });
    expect(sendSms).not.toHaveBeenCalled();
    expect(result.failed).toBe(0);
  });
});

describe('getPublicReveal', () => {
  it('shows prizes in reveal order and hides winners until their category is revealed', async () => {
    const { campaign, draw, merchantId, winners } = await liveSlipDraw();

    let view = await getPublicReveal(String(campaign._id));
    expect(view.status).toBe('live');
    expect(view.categories.map((c) => c.name)).toEqual(['Third prize', 'Second prize', 'Grand prize']);
    expect(view.categories[2]).toMatchObject({ value: 20000, quantity: 1, imageUrl: image, revealed: false, winners: [] });
    expect(JSON.stringify(view)).not.toMatch(/claimCode|customerPhone/);

    await revealNextCategory(merchantId, String(draw._id), { now: LATER });
    view = await getPublicReveal(String(campaign._id));
    expect(view.categories[0].revealed).toBe(true);
    expect(view.categories[0].winners).toHaveLength(3);
    expect(view.categories[0].winners[0].label).toMatch(/^Slip \d{4}$/);
    expect(view.categories[1].winners).toEqual([]);

    const thirdPrizeSlip = winners.find((w) => w.rank === 3).slipNumber;
    const grandSlip = winners.find((w) => w.rank === 1).slipNumber;
    expect((await getPublicReveal(String(campaign._id), { slipNumber: thirdPrizeSlip })).mySlip).toMatchObject({
      won: true,
      prize: 'Third prize',
    });
    // Not revealed yet, so the answer must not give the grand prize away.
    expect((await getPublicReveal(String(campaign._id), { slipNumber: grandSlip })).mySlip).toEqual({ won: false, pending: true });
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
