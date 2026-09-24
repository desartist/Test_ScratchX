jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { runDraw } from '@/lib/services/luckyDraw/drawService';
import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { createSeededRng, selectWinners, orderPrizesForDraw } from '@/lib/services/luckyDraw/winnerSelection';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, newId, nextPhone, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

async function seed({ customers = 3, campaign = {} } = {}) {
  const c = await createCampaign(campaign);
  const draw = await createOpenDraw(c);
  for (let i = 0; i < customers; i++) {
    await createEntry(c, draw, { customerPhone: nextPhone(), entriesGranted: (i % 3) + 1 });
  }
  return { campaign: c, draw };
}

describe('runDraw', () => {
  it('picks one winner per prize with unique claim codes and completes the draw', async () => {
    const { draw } = await seed({ customers: 5 });

    const result = await runDraw(draw._id, { source: 'manual', accountId: newId() });

    expect(result.draw.status).toBe('completed');
    expect(result.draw.entryCount).toBe(5);
    expect(result.draw.winnerCount).toBe(2);
    expect(result.draw.randomSeed).toMatch(/^[0-9a-f]{16}$/);
    expect(result.draw.prizeTiersSnapshot.map((p) => p.prizeDescription)).toEqual(['Smart TV', 'Mixer Grinder']);
    expect(result.winners.map((w) => w.rank)).toEqual([1, 2]);
    expect(new Set(result.winners.map((w) => w.claimCode)).size).toBe(2);
    expect(new Set(result.winners.map((w) => w.customerPhone)).size).toBe(2);
    const expectedExpiry = Date.now() + 30 * DAY;
    result.winners.forEach((w) => expect(Math.abs(new Date(w.expiresAt).getTime() - expectedExpiry)).toBeLessThan(60 * 1000));
  });

  it('can be replayed from the stored seed', async () => {
    const { campaign, draw } = await seed({ customers: 8 });
    const result = await runDraw(draw._id, { source: 'cron' });

    const entries = await LuckyDrawEntry.find({ drawId: draw._id }).sort({ _id: 1 }).lean();
    const replay = selectWinners(entries, campaign.prizeTiers, createSeededRng(result.draw.randomSeed));

    expect(replay.map((w) => String(w.entry._id))).toEqual(result.winners.map((w) => String(w.entryId)));
  });

  it('records who triggered the draw', async () => {
    const { draw } = await seed();
    const accountId = newId();
    const result = await runDraw(draw._id, { source: 'manual', accountId });
    expect(result.draw.triggeredBy.source).toBe('manual');
    expect(String(result.draw.triggeredBy.accountId)).toBe(String(accountId));
  });

  it('completes with no winners when there are no entries', async () => {
    const { draw } = await seed({ customers: 0 });
    const result = await runDraw(draw._id, { source: 'cron' });
    expect(result.draw.status).toBe('completed');
    expect(result.winners).toEqual([]);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('gives fewer winners than prizes when there are fewer customers', async () => {
    const { draw } = await seed({ customers: 1 });
    const result = await runDraw(draw._id, { source: 'cron' });
    expect(result.winners).toHaveLength(1);
  });

  it('runs only once when cron and the owner trigger it at the same time', async () => {
    const { draw } = await seed({ customers: 4 });

    const results = await Promise.allSettled([
      runDraw(draw._id, { source: 'cron' }),
      runDraw(draw._id, { source: 'manual', accountId: newId() }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected.reason).toBeInstanceOf(ConflictError);
    expect(await LuckyDrawWinner.countDocuments({ drawId: draw._id })).toBe(2);
  });

  it('refuses to run a draw that already completed', async () => {
    const { draw } = await seed();
    await runDraw(draw._id, { source: 'cron' });
    await expect(runDraw(draw._id, { source: 'cron' })).rejects.toThrow(ConflictError);
  });

  it('treats bad ids as not found', async () => {
    await expect(runDraw('nope', { source: 'cron' })).rejects.toThrow(NotFoundError);
  });

  it('ends an end_of_campaign campaign after its draw', async () => {
    const { campaign, draw } = await seed();
    await runDraw(draw._id, { source: 'cron' });
    expect((await LuckyDrawCampaign.findById(campaign._id)).status).toBe('ended');
    expect(await LuckyDraw.countDocuments({ campaignId: campaign._id, status: 'scheduled' })).toBe(0);
  });

  it('schedules the next draw for a recurring campaign, counted from when this one ran', async () => {
    const { campaign, draw } = await seed({
      campaign: {
        drawConfig: { scheduleType: 'recurring', triggerMode: 'automatic', recurrence: { frequency: 'daily', time: '18:00' } },
      },
    });
    const now = new Date();

    await runDraw(draw._id, { source: 'cron', now });

    const next = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' });
    expect(next).not.toBeNull();
    expect(next.periodStart).toEqual(now);
    expect(next.drawDate.getTime()).toBeGreaterThan(now.getTime());
    expect((await LuckyDrawCampaign.findById(campaign._id)).status).toBe('active');
  });

  it('ends a recurring campaign once its final draw has run', async () => {
    const { campaign, draw } = await seed({
      campaign: {
        drawConfig: { scheduleType: 'recurring', triggerMode: 'automatic', recurrence: { frequency: 'daily', time: '18:00' } },
      },
    });
    const afterEnd = new Date(campaign.endDate.getTime() + 1000);

    await runDraw(draw._id, { source: 'cron', now: afterEnd });

    expect(await LuckyDraw.countDocuments({ campaignId: campaign._id, status: 'scheduled' })).toBe(0);
    expect((await LuckyDrawCampaign.findById(campaign._id)).status).toBe('ended');
  });

  it('texts each winner and marks them notified', async () => {
    const { draw } = await seed({ customers: 4 });
    const result = await runDraw(draw._id, { source: 'cron' });
    expect(result.notified).toEqual({ sent: 2, failed: 0 });
    expect(sendSms).toHaveBeenCalledTimes(2);
    expect(sendSms.mock.calls[0][1]).toMatch(/Congratulations/);
    result.winners.forEach((w) => expect(['notified']).toContain((w.status)));
    const stored = await LuckyDrawWinner.find({ drawId: draw._id });
    stored.forEach((w) => {
      expect(w.status).toBe('notified');
      expect(w.notifiedAt).toBeInstanceOf(Date);
    });
  });

  it('still completes when the SMS provider is down, leaving winners pending for a retry', async () => {
    sendSms.mockRejectedValue(new Error('Twilio error: down'));
    const { draw } = await seed({ customers: 4 });

    const result = await runDraw(draw._id, { source: 'cron' });

    expect(result.draw.status).toBe('completed');
    expect(result.notified).toEqual({ sent: 0, failed: 2 });
    expect((await LuckyDrawWinner.find({ drawId: draw._id })).map((w) => w.status)).toEqual(['pending', 'pending']);

    sendSms.mockResolvedValue({ success: true });
    expect(await notifyPendingWinners()).toEqual({ sent: 2, failed: 0 });
    expect((await LuckyDrawWinner.find({ drawId: draw._id })).map((w) => w.status)).toEqual(['notified', 'notified']);
  });

  it('rolls back to scheduled, with no partial winners, if something fails mid-run', async () => {
    const { draw } = await seed({ customers: 4 });
    const spy = jest.spyOn(LuckyDrawWinner, 'insertMany').mockRejectedValueOnce(new Error('boom'));

    await expect(runDraw(draw._id, { source: 'cron' })).rejects.toThrow('boom');

    spy.mockRestore();
    expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
    expect(await LuckyDrawWinner.countDocuments({ drawId: draw._id })).toBe(0);
    await expect(runDraw(draw._id, { source: 'cron' })).resolves.toBeDefined();
  });
});

describe('runDraw with prizes tied to bill ranges', () => {
  const TV = (extra = {}) => ({ rank: 1, prizeDescription: 'Smart TV', prizeValue: 0, ...extra });
  const PHONE = (extra = {}) => ({ rank: 2, prizeDescription: 'Smart Phone', prizeValue: 0, ...extra });

  async function seedRanges({ prizeMode, prizes, high = 2, low = 3 }) {
    const campaign = await createCampaign({ prizeMode, prizeTiers: prizes });
    const draw = await createOpenDraw(campaign);
    const highPhones = []; const lowPhones = [];
    for (let i = 0; i < high; i++) { const phone = nextPhone(); highPhones.push(phone); await createEntry(campaign, draw, { customerPhone: phone, tierIndex: 1, entriesGranted: 3 }); }
    for (let i = 0; i < low; i++) { const phone = nextPhone(); lowPhones.push(phone); await createEntry(campaign, draw, { customerPhone: phone, tierIndex: 0, entriesGranted: 1 }); }
    return { campaign, draw, highPhones, lowPhones };
  }

  it('separate pools: each range only wins its own prizes', async () => {
    const { draw, highPhones, lowPhones } = await seedRanges({ prizeMode: 'pool_per_tier', prizes: [TV({ tierIndexes: [1] }), PHONE({ tierIndexes: [0] })] });
    const result = await runDraw(draw._id, { source: 'manual' });
    const byPrize = Object.fromEntries(result.winners.map((w) => [w.prizeDescription, w.customerPhone]));
    expect(highPhones).toContain(byPrize['Smart TV']);
    expect(lowPhones).toContain(byPrize['Smart Phone']);
    expect(result.draw.prizeMode).toBe('pool_per_tier');
    expect(result.draw.prizeTiersSnapshot.map((p) => p.tierIndexes)).toEqual([[1], [0]]);
  });

  it('separate pools: a customer with entries in both ranges wins only once, settled in the top range first', async () => {
    const campaign = await createCampaign({ prizeMode: 'pool_per_tier', prizeTiers: [PHONE({ rank: 1, tierIndexes: [0] }), TV({ rank: 2, tierIndexes: [1] })] });
    const draw = await createOpenDraw(campaign);
    await createEntry(campaign, draw, { customerPhone: '9500000001', tierIndex: 0, entriesGranted: 50 });
    await createEntry(campaign, draw, { customerPhone: '9500000001', tierIndex: 1, entriesGranted: 50 });
    await createEntry(campaign, draw, { customerPhone: '9500000002', tierIndex: 0, entriesGranted: 1 });
    const result = await runDraw(draw._id, { source: 'manual' });
    const byPrize = Object.fromEntries(result.winners.map((w) => [w.prizeDescription, w.customerPhone]));
    expect(new Set(result.winners.map((w) => w.customerPhone)).size).toBe(result.winners.length);
    if (byPrize['Smart TV'] === '9500000001') expect(byPrize['Smart Phone']).toBe('9500000002');
  });

  it('restricted: the restricted prize goes to an eligible range, the open prize to anyone left', async () => {
    const { draw, highPhones } = await seedRanges({ prizeMode: 'restricted', prizes: [TV({ tierIndexes: [1] }), PHONE()] });
    const result = await runDraw(draw._id, { source: 'manual' });
    expect(highPhones).toContain(result.winners.find((w) => w.prizeDescription === 'Smart TV').customerPhone);
    expect(result.winners).toHaveLength(2);
  });

  it('a prize whose range has no entries is left unawarded, the others are still drawn', async () => {
    const { draw } = await seedRanges({ prizeMode: 'pool_per_tier', prizes: [TV({ tierIndexes: [1] }), PHONE({ tierIndexes: [0] })], high: 0 });
    const result = await runDraw(draw._id, { source: 'manual' });
    expect(result.winners.map((w) => w.prizeDescription)).toEqual(['Smart Phone']);
    expect(result.draw.winnerCount).toBe(1);
  });

  it('shared prizes ignore ranges entirely (today\'s behaviour)', async () => {
    const { draw } = await seedRanges({ prizeMode: 'shared', prizes: [TV(), PHONE()] });
    const result = await runDraw(draw._id, { source: 'manual' });
    expect(result.winners).toHaveLength(2);
    expect(result.draw.prizeMode).toBe('shared');
  });

  it('can be replayed from the stored seed in the draw order for its mode', async () => {
    const { campaign, draw } = await seedRanges({ prizeMode: 'pool_per_tier', prizes: [TV({ tierIndexes: [1] }), PHONE({ tierIndexes: [0] })], high: 4, low: 6 });
    const result = await runDraw(draw._id, { source: 'cron' });
    const entries = await LuckyDrawEntry.find({ drawId: draw._id }).sort({ _id: 1 }).lean();
    const replay = selectWinners(entries, orderPrizesForDraw(campaign.prizeTiers.map((p) => p.toObject()), campaign.prizeMode), createSeededRng(result.draw.randomSeed), { ordered: true });
    expect(replay.map((w) => String(w.entry._id)).sort()).toEqual(result.winners.map((w) => String(w.entryId)).sort());
  });
});

describe('notifyPendingWinners', () => {
  it('skips winners whose claim window has already passed', async () => {
    const { campaign, draw } = await seed({ customers: 1 });
    await LuckyDrawWinner.create({
      drawId: draw._id,
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Late Winner',
      customerPhone: '9000000009',
      prizeDescription: 'Smart TV',
      claimCode: 'LATE2345',
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await notifyPendingWinners()).toEqual({ sent: 0, failed: 0 });
    expect(sendSms).not.toHaveBeenCalled();
  });
});
