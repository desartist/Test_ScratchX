import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import {
  setSlipCount,
  saveManualPicks,
  publishManualWinners,
  startLiveReveal,
  revealNextCategory,
} from '@/lib/services/luckyDraw/slipDrawService';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { createCampaign, createOpenDraw, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

const CLOSE = new Date('2026-10-01T18:29:00.000Z');
const AFTER_CLOSE = new Date(CLOSE.getTime() + DAY);
const BEFORE_CLOSE = new Date(CLOSE.getTime() - DAY);

// Ganesh Utsav example: 6 x ₹1,000, 3 x ₹2,000 and 1 x ₹8,000, slips 1 to 640.
const categories = [
  { rank: 1, prizeDescription: 'Grand prize', prizeValue: 8000, quantity: 1 },
  { rank: 2, prizeDescription: 'Second prize', prizeValue: 2000, quantity: 3 },
  { rank: 3, prizeDescription: 'Third prize', prizeValue: 1000, quantity: 6 },
];

async function seed(distributionMode = 'manual_offline_reveal', overrides = {}) {
  const campaign = await createCampaign({
    distributionMode,
    entryTiers: [],
    prizeTiers: categories,
    slipCount: 640,
    startDate: new Date(CLOSE.getTime() - 20 * DAY),
    endDate: CLOSE,
    revealDate: CLOSE,
    drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'manual' },
    ...overrides,
  });
  const draw = await createOpenDraw(campaign, { drawDate: CLOSE });
  return { campaign, draw, merchantId: String(campaign.merchantId) };
}

const fullPicks = [
  { rank: 3, slipNumbers: [457, 112, 598, 31, 244, 389] },
  { rank: 2, slipNumbers: [76, 501, 13] },
  { rank: 1, slipNumbers: [205] },
];

describe('setSlipCount', () => {
  it('records more slips handed out', async () => {
    const { campaign, merchantId } = await seed();
    const updated = await setSlipCount(merchantId, String(campaign._id), 900);
    expect(updated.slipCount).toBe(900);
  });

  it('never goes down, and only applies to slip draws', async () => {
    const { campaign, merchantId } = await seed();
    await expect(setSlipCount(merchantId, String(campaign._id), 600)).rejects.toThrow(/fewer/i);
    await expect(setSlipCount(merchantId, String(campaign._id), 700.5)).rejects.toThrow(ValidationError);

    const online = await createCampaign();
    await expect(setSlipCount(String(online.merchantId), String(online._id), 10)).rejects.toThrow(ConflictError);
  });
});

describe('saveManualPicks', () => {
  it('saves a partial list as a draft', async () => {
    const { draw, merchantId } = await seed();
    const saved = await saveManualPicks(merchantId, String(draw._id), [{ rank: 3, slipNumbers: [457, 112] }]);
    expect(saved.manualPicks).toEqual([{ rank: 3, slipNumbers: [457, 112] }]);
  });

  it('names a slip that has already won', async () => {
    const { draw, merchantId } = await seed();
    await expect(
      saveManualPicks(merchantId, String(draw._id), [
        { rank: 3, slipNumbers: [457] },
        { rank: 2, slipNumbers: [457] },
      ]),
    ).rejects.toThrow('Slip 0457 already won Third prize. Draw another slip.');
  });

  it('refuses slips outside the range handed out and too many winners for a prize', async () => {
    const { draw, merchantId } = await seed();
    await expect(saveManualPicks(merchantId, String(draw._id), [{ rank: 3, slipNumbers: [900] }])).rejects.toThrow(
      /0001 to 0640/,
    );
    await expect(saveManualPicks(merchantId, String(draw._id), [{ rank: 1, slipNumbers: [1, 2] }])).rejects.toThrow(
      /1 winner/,
    );
    await expect(saveManualPicks(merchantId, String(draw._id), [{ rank: 9, slipNumbers: [1] }])).rejects.toThrow(
      ValidationError,
    );
  });

  it('is only for in-store reveals', async () => {
    const { draw, merchantId } = await seed('manual_online_reveal');
    await expect(saveManualPicks(merchantId, String(draw._id), [])).rejects.toThrow(ConflictError);
  });
});

describe('publishManualWinners', () => {
  it('creates a winner per slip, shows every category and ends the draw', async () => {
    const { campaign, draw, merchantId } = await seed();
    await saveManualPicks(merchantId, String(draw._id), fullPicks);

    const result = await publishManualWinners(merchantId, String(draw._id), { now: AFTER_CLOSE });

    expect(result.winners).toHaveLength(10);
    expect(result.winners.find((w) => w.slipNumber === 205)).toMatchObject({ rank: 1, prizeDescription: 'Grand prize', prizeValue: 8000 });
    expect(result.draw).toMatchObject({ status: 'completed', winnerCount: 10, entryCount: 640 });
    expect(result.draw.reveal.revealedCount).toBe(3);
    expect((await LuckyDrawCampaign.findById(campaign._id).lean()).status).toBe('ended');
  });

  it('needs every winner entered, and entries to have closed', async () => {
    const { draw, merchantId } = await seed();
    await saveManualPicks(merchantId, String(draw._id), [{ rank: 3, slipNumbers: [1] }]);
    await expect(publishManualWinners(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(/1 of 10/);

    await saveManualPicks(merchantId, String(draw._id), fullPicks);
    await expect(publishManualWinners(merchantId, String(draw._id), { now: BEFORE_CLOSE })).rejects.toThrow(/close/i);
  });

  it('cannot publish twice', async () => {
    const { draw, merchantId } = await seed();
    await saveManualPicks(merchantId, String(draw._id), fullPicks);
    await publishManualWinners(merchantId, String(draw._id), { now: AFTER_CLOSE });
    await expect(publishManualWinners(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(ConflictError);
    expect(await LuckyDrawWinner.countDocuments({ drawId: draw._id })).toBe(10);
  });
});

describe('live reveal of slips', () => {
  it('picks distinct random slips for every prize and reveals nothing yet', async () => {
    const { campaign, draw, merchantId } = await seed('manual_online_reveal');

    const result = await startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE, seed: 'abcdef1234567890' });

    expect(result.winners).toHaveLength(10);
    const slips = result.winners.map((w) => w.slipNumber);
    expect(new Set(slips).size).toBe(10);
    expect(slips.every((s) => s >= 1 && s <= 640)).toBe(true);
    expect(result.draw.reveal).toMatchObject({ revealedCount: 0 });
    expect(result.draw.reveal.startedAt).toBeTruthy();
    expect((await LuckyDrawCampaign.findById(campaign._id).lean()).status).toBe('ended');
  });

  it('is repeatable from the stored seed', async () => {
    const a = await seed('manual_online_reveal');
    const b = await seed('manual_online_reveal');
    const first = await startLiveReveal(a.merchantId, String(a.draw._id), { now: AFTER_CLOSE, seed: 'abcdef1234567890' });
    const second = await startLiveReveal(b.merchantId, String(b.draw._id), { now: AFTER_CLOSE, seed: 'abcdef1234567890' });
    expect(first.winners.map((w) => w.slipNumber)).toEqual(second.winners.map((w) => w.slipNumber));
    expect(first.draw.randomSeed).toBe('abcdef1234567890');
  });

  it('gives the top prizes first when there are fewer slips than prizes', async () => {
    const { campaign, draw, merchantId } = await seed('manual_online_reveal');
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { slipCount: 3 } });
    const result = await startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE });
    expect(result.winners.map((w) => w.rank).sort()).toEqual([1, 2, 2]);
  });

  it('refuses before entries close, without slips, or twice', async () => {
    const { campaign, draw, merchantId } = await seed('manual_online_reveal');
    await expect(startLiveReveal(merchantId, String(draw._id), { now: BEFORE_CLOSE })).rejects.toThrow(/close/i);
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { slipCount: 0 } });
    await expect(startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(/slips/i);
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { slipCount: 640 } });
    await startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE });
    await expect(startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(ConflictError);
  });

  it('reveals one category at a time, smallest prize first, until done', async () => {
    const { draw, merchantId } = await seed('manual_online_reveal');
    await startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE });

    const one = await revealNextCategory(merchantId, String(draw._id), { now: AFTER_CLOSE });
    expect(one.reveal.revealedCount).toBe(1);
    expect(one.reveal.completedAt).toBeUndefined();
    expect(one.nextRank).toBe(2);

    await revealNextCategory(merchantId, String(draw._id), { now: AFTER_CLOSE });
    const done = await revealNextCategory(merchantId, String(draw._id), { now: AFTER_CLOSE });
    expect(done.reveal.revealedCount).toBe(3);
    expect(done.reveal.completedAt).toBeTruthy();
    expect(done.nextRank).toBeNull();

    await expect(revealNextCategory(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(/every prize/i);
  });

  it('cannot reveal before starting, and hides other merchants’ draws', async () => {
    const { draw, merchantId } = await seed('manual_online_reveal');
    await expect(revealNextCategory(merchantId, String(draw._id))).rejects.toThrow(ConflictError);
    await expect(startLiveReveal(String(draw._id), String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(NotFoundError);
  });

  it('is only for online reveals', async () => {
    const { draw, merchantId } = await seed('manual_offline_reveal');
    await expect(startLiveReveal(merchantId, String(draw._id), { now: AFTER_CLOSE })).rejects.toThrow(ConflictError);
  });
});
