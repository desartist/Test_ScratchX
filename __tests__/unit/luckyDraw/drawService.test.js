jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { runDraw, runOwnerDraw } from '@/lib/services/luckyDraw/drawService';
import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { createSeededRng, selectWinners } from '@/lib/services/luckyDraw/winnerSelection';
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

  it('ends the lucky draw after its only draw', async () => {
    const { campaign, draw } = await seed();
    await runDraw(draw._id, { source: 'cron' });
    expect((await LuckyDrawCampaign.findById(campaign._id)).status).toBe('ended');
    expect(await LuckyDraw.countDocuments({ campaignId: campaign._id, status: 'scheduled' })).toBe(0);
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

describe('runOwnerDraw', () => {
  it('runs a digital draw for its owner', async () => {
    const { campaign, draw } = await seed();
    const result = await runOwnerDraw(String(campaign.merchantId), String(draw._id));
    expect(result.draw.status).toBe('completed');
    expect(result.draw.triggeredBy).toMatchObject({ source: 'manual' });
  });

  it('refuses physical and live online draws without picking anyone', async () => {
    for (const drawType of ['physical', 'live_online']) {
      const { campaign, draw } = await seed({ campaign: { drawType } });
      await expect(runOwnerDraw(String(campaign.merchantId), String(draw._id))).rejects.toThrow(ConflictError);
      expect(await LuckyDrawWinner.countDocuments({ drawId: draw._id })).toBe(0);
      expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
    }
  });

  it('treats another merchant as not found', async () => {
    const { draw } = await seed();
    await expect(runOwnerDraw(String(newId()), String(draw._id))).rejects.toThrow(NotFoundError);
  });

  it('refuses a digital draw before entries open, picking no winners', async () => {
    const { campaign, draw } = await seed({ campaign: { startDate: new Date(Date.now() + DAY) } });
    await expect(runOwnerDraw(String(campaign.merchantId), String(draw._id))).rejects.toThrow(ConflictError);
    expect(await LuckyDrawWinner.countDocuments({ drawId: draw._id })).toBe(0);
    expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
  });
});
