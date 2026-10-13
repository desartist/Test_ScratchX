jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { startLiveReveal, revealNextCategory } from '@/lib/services/luckyDraw/liveRevealService';
import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { getEntryStatus } from '@/lib/services/luckyDraw/entryService';
import { getCampaignDetail, listCampaigns } from '@/lib/services/luckyDraw/campaignService';
import { redeemClaimCode } from '@/lib/services/luckyDraw/redemptionService';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, nextPhone, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

const CLOSE = new Date('2026-10-01T18:29:00.000Z');
const AFTER_CLOSE = new Date(CLOSE.getTime() + 60 * 60 * 1000);
const BEFORE_CLOSE = new Date(CLOSE.getTime() - DAY);

// Navratri example: 6 x ₹500, 3 x ₹2,000 and 1 x ₹10,000, from QR entries.
const categories = [
  { rank: 1, prizeDescription: 'Gold coin', prizeValue: 10000, quantity: 1 },
  { rank: 2, prizeDescription: 'Silver coin', prizeValue: 2000, quantity: 3 },
  { rank: 3, prizeDescription: 'Gift voucher', prizeValue: 500, quantity: 6 },
];

async function seed({ drawType = 'live_online', entries = 14 } = {}) {
  const campaign = await createCampaign({
    drawType,
    prizeTiers: categories,
    startDate: new Date(CLOSE.getTime() - 10 * DAY),
    endDate: CLOSE,
    revealDate: CLOSE,
  });
  const draw = await createOpenDraw(campaign, { drawDate: CLOSE });
  for (let i = 0; i < entries; i += 1) await createEntry(campaign, draw, { customerPhone: nextPhone() });
  return { campaign, draw, merchantId: String(campaign.merchantId), drawId: String(draw._id) };
}

describe('startLiveReveal', () => {
  it('picks every winner from the QR entries, but reveals and texts nobody yet', async () => {
    const { campaign, drawId, merchantId } = await seed();

    const { draw, winners } = await startLiveReveal(merchantId, drawId, { now: AFTER_CLOSE });

    expect(winners).toHaveLength(10);
    expect(new Set(winners.map((w) => w.customerPhone)).size).toBe(10);
    expect(winners.every((w) => w.entryId && w.hiddenUntilReveal)).toBe(true);
    expect(draw.reveal).toMatchObject({ revealedCount: 0 });
    expect(draw.reveal.completedAt).toBeUndefined();
    expect(sendSms).not.toHaveBeenCalled();

    // Nothing gives the result away before the owner reveals it.
    await notifyPendingWinners({ now: AFTER_CLOSE });
    expect(sendSms).not.toHaveBeenCalled();
    expect((await getCampaignDetail(merchantId, String(campaign._id), AFTER_CLOSE)).winners).toEqual([]);
    const status = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: winners[0].customerPhone });
    expect(status.wins).toEqual([]);
    const account = { _id: campaign.merchantId, role: 'Merchant' };
    await expect(redeemClaimCode({ claimCode: winners[0].claimCode, account, now: AFTER_CLOSE })).rejects.toThrow(NotFoundError);
  });

  it('refuses before entries close, twice, for instant draws and for other merchants', async () => {
    const { drawId, merchantId } = await seed();
    await expect(startLiveReveal(merchantId, drawId, { now: BEFORE_CLOSE })).rejects.toThrow(/entries are still open/i);
    await expect(startLiveReveal(String(newId()), drawId, { now: AFTER_CLOSE })).rejects.toThrow(NotFoundError);
    await startLiveReveal(merchantId, drawId, { now: AFTER_CLOSE });
    await expect(startLiveReveal(merchantId, drawId, { now: AFTER_CLOSE })).rejects.toThrow(ConflictError);

    const instant = await seed({ drawType: 'digital' });
    await expect(startLiveReveal(instant.merchantId, instant.drawId, { now: AFTER_CLOSE })).rejects.toThrow(/at once/i);
  });
});

describe('revealNextCategory', () => {
  it('reveals one prize at a time, smallest first, texting only that prize’s winners', async () => {
    const { campaign, drawId, merchantId } = await seed();
    await startLiveReveal(merchantId, drawId, { now: AFTER_CLOSE });

    const first = await revealNextCategory(merchantId, drawId, { now: AFTER_CLOSE });
    expect(first.revealedRank).toBe(3);
    expect(first.notified.sent).toBe(6);
    const voucherPhones = (await LuckyDrawWinner.find({ drawId, rank: 3 }).lean()).map((w) => w.customerPhone).sort();
    expect(sendSms.mock.calls.map(([phone]) => phone).sort()).toEqual(voucherPhones);
    expect(await LuckyDrawWinner.countDocuments({ drawId, hiddenUntilReveal: true })).toBe(4);
    expect((await getCampaignDetail(merchantId, String(campaign._id), AFTER_CLOSE)).winners).toHaveLength(6);
    const [row] = await listCampaigns(merchantId);
    expect(row).toMatchObject({ revealInProgress: true, unclaimedCount: 6 });

    const second = await revealNextCategory(merchantId, drawId, { now: AFTER_CLOSE });
    expect(second.revealedRank).toBe(2);
    const last = await revealNextCategory(merchantId, drawId, { now: AFTER_CLOSE });
    expect(last.revealedRank).toBe(1);
    expect(last.reveal.completedAt).toBeTruthy();
    expect(sendSms).toHaveBeenCalledTimes(10);
    expect(await LuckyDrawWinner.countDocuments({ drawId, hiddenUntilReveal: true })).toBe(0);

    expect((await listCampaigns(merchantId))[0]).toMatchObject({ revealInProgress: false, unclaimedCount: 10 });
    await expect(revealNextCategory(merchantId, drawId, { now: AFTER_CLOSE })).rejects.toThrow(/already been revealed/i);
  });

  it('cannot reveal before the reveal has started', async () => {
    const { drawId, merchantId } = await seed();
    await expect(revealNextCategory(merchantId, drawId)).rejects.toThrow(/start the live reveal/i);
  });
});
