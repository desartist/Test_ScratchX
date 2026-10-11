import crypto from 'crypto';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { CLAIM_EXPIRY_DAYS } from '@/lib/luckyDraw/constants';
import { createSeededRng, expandInDrawOrder, orderPrizesForDraw, selectWinners } from './winnerSelection';
import { generateClaimCode } from './claimCode';
import { nextDrawDateAfterRun } from './schedule';
import { notifyPendingWinners } from './winnerNotifications';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Runs a scheduled draw: claims it atomically, picks winners, creates the
 * next draw (recurring campaigns) or ends the campaign, then texts winners.
 * The atomic claim means cron and the owner clicking "Run Draw" at the same
 * moment cannot both run it.
 * Live reveal campaigns: the winners are stored hidden and nobody is texted yet;
 * the owner then reveals one prize at a time (see liveRevealService).
 */
export async function runDraw(drawId, { source, accountId = null, now = new Date(), seed = null } = {}) {
  requireObjectId(drawId, 'Draw not found');

  const draw = await LuckyDraw.findOneAndUpdate(
    { _id: drawId, status: 'scheduled' },
    { $set: { status: 'running', triggeredBy: { source, accountId } } },
    { new: true },
  );
  if (!draw) throw new ConflictError('This draw is not waiting to run. It may have already run.');

  let nextDraw = null;
  let winnerCount = 0;
  let live = false;
  try {
    const campaign = await LuckyDrawCampaign.findById(draw.campaignId).lean();
    if (!campaign) throw new NotFoundError('Lucky Draw not found');
    live = campaign.revealMode === 'live';

    const entries = await LuckyDrawEntry.find({ drawId: draw._id }).sort({ _id: 1 }).lean();
    const randomSeed = seed || crypto.randomBytes(8).toString('hex');
    const prizeMode = campaign.prizeMode || 'shared';
    const slots = expandInDrawOrder(orderPrizesForDraw(campaign.prizeTiers, prizeMode));
    const winners = selectWinners(entries, slots, createSeededRng(randomSeed), { ordered: true });

    const expiresAt = new Date(now.getTime() + CLAIM_EXPIRY_DAYS * DAY_MS);
    if (winners.length > 0) {
      const created = await LuckyDrawWinner.insertMany(
        winners.map((w) => ({
          drawId: draw._id,
          campaignId: campaign._id,
          merchantId: campaign.merchantId,
          rank: w.rank,
          entryId: w.entry._id,
          customerName: w.entry.customerName,
          customerPhone: w.entry.customerPhone,
          prizeDescription: w.prizeDescription,
          prizeValue: w.prizeValue,
          claimCode: generateClaimCode(),
          expiresAt,
          hiddenUntilReveal: live,
        })),
      );
      winnerCount = created.length;
    }

    const nextDate = nextDrawDateAfterRun(campaign, now);
    if (nextDate) {
      nextDraw = await LuckyDraw.create({
        campaignId: campaign._id,
        periodStart: now,
        drawDate: nextDate,
        status: 'scheduled',
      });
    }

    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $set: {
          status: 'completed',
          executedAt: now,
          randomSeed,
          prizeTiersSnapshot: campaign.prizeTiers,
          prizeMode,
          entryCount: entries.length,
          winnerCount,
          // Instant draws are shown in full as soon as they run; a live reveal starts with nothing shown.
          reveal: live
            ? { revealedCount: 0, startedAt: now }
            : { revealedCount: campaign.prizeTiers.length, startedAt: now, completedAt: now },
        },
      },
    );

    if (!nextDraw) {
      await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });
    }
  } catch (error) {
    // Put everything back so the draw can be run again cleanly.
    await LuckyDrawWinner.deleteMany({ drawId: draw._id });
    if (nextDraw) await LuckyDraw.deleteOne({ _id: nextDraw._id });
    await LuckyDraw.updateOne({ _id: draw._id }, { $set: { status: 'scheduled' }, $unset: { triggeredBy: 1 } });
    throw error;
  }

  let notified = { sent: 0, failed: 0 };
  try {
    // Hidden (live reveal) winners are skipped here; they are texted as their prize is revealed.
    notified = await notifyPendingWinners({ drawId: draw._id, now });
  } catch (error) {
    console.error('[LuckyDraw] winner notification pass failed', error.message);
  }

  const [completed, winnerDocs] = await Promise.all([
    LuckyDraw.findById(draw._id).lean(),
    LuckyDrawWinner.find({ drawId: draw._id }).sort({ rank: 1 }).lean(),
  ]);
  return { draw: completed, winners: winnerDocs, notified };
}
