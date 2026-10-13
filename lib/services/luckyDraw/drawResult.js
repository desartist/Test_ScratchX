import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError } from '@/lib/errors';
import { CLAIM_EXPIRY_DAYS } from '@/lib/luckyDraw/constants';
import { generateClaimCode } from './claimCode';
import { notifyPendingWinners } from './winnerNotifications';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Claims a scheduled draw atomically (so two clicks, or cron and the owner at once, cannot both
 * finish it), lets the caller pick the winners, then saves them, completes the draw, ends the
 * campaign and texts the winners. Rolls everything back if saving the winners fails partway.
 *
 * Shared by drawService.runDraw (random digital/live draws) and pickService.saveWinnerPicks
 * (hand-picked Physical draws) — the only two places a draw is actually finished.
 *
 * `build(claimedDraw)` is called only after the claim succeeds, and must return:
 *   - campaign: the LuckyDrawCampaign (lean) the draw belongs to
 *   - winners: [{ rank, entry, prizeDescription, prizeValue, hiddenUntilReveal? }]
 *       entry is the LuckyDrawEntry (lean) that won; hiddenUntilReveal defaults to false
 *   - entryCount: how many entries the draw had
 *   - reveal: the draw's `reveal` field to set
 *   - randomSeed: optional; set on the draw only when given (picked draws have none)
 * Throwing inside `build` rolls the claim back and rethrows.
 */
export async function claimAndFinishDraw(
  drawId,
  { triggeredBy, alreadyClaimedMessage, now = new Date(), winnerSort = { rank: 1 }, logLabel = '[LuckyDraw] winner notification pass failed', build },
) {
  const claimed = await LuckyDraw.findOneAndUpdate(
    { _id: drawId, status: 'scheduled' },
    { $set: { status: 'running', triggeredBy } },
    { new: true },
  );
  if (!claimed) throw new ConflictError(alreadyClaimedMessage);

  try {
    const { campaign, winners, entryCount, reveal, randomSeed } = await build(claimed);

    const expiresAt = new Date(now.getTime() + CLAIM_EXPIRY_DAYS * DAY_MS);
    let winnerCount = 0;
    if (winners.length > 0) {
      const created = await LuckyDrawWinner.insertMany(
        winners.map((w) => ({
          drawId: claimed._id,
          campaignId: campaign._id,
          merchantId: campaign.merchantId,
          rank: w.rank,
          entryId: w.entry._id,
          customerName: w.entry.customerName,
          customerPhone: w.entry.customerPhone,
          prizeDescription: w.prizeDescription,
          prizeValue: w.prizeValue || 0,
          claimCode: generateClaimCode(),
          expiresAt,
          hiddenUntilReveal: !!w.hiddenUntilReveal,
        })),
      );
      winnerCount = created.length;
    }

    const set = {
      status: 'completed',
      executedAt: now,
      prizeTiersSnapshot: campaign.prizeTiers,
      entryCount,
      winnerCount,
      reveal,
    };
    if (randomSeed) set.randomSeed = randomSeed;

    await LuckyDraw.updateOne({ _id: claimed._id }, { $set: set });
    // A campaign has exactly one draw, so finishing it finishes the lucky draw.
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });
  } catch (error) {
    // Put everything back so the draw can be finished again cleanly.
    await LuckyDrawWinner.deleteMany({ drawId: claimed._id });
    await LuckyDraw.updateOne({ _id: claimed._id }, { $set: { status: 'scheduled' }, $unset: { triggeredBy: 1 } });
    throw error;
  }

  let notified = { sent: 0, failed: 0 };
  try {
    // Hidden (live reveal) winners are skipped here; they are texted as their prize is revealed.
    notified = await notifyPendingWinners({ drawId: claimed._id, now });
  } catch (error) {
    console.error(logLabel, error.message);
  }

  const [completed, winnerDocs] = await Promise.all([
    LuckyDraw.findById(claimed._id).lean(),
    LuckyDrawWinner.find({ drawId: claimed._id }).sort(winnerSort).lean(),
  ]);
  return { draw: completed, winners: winnerDocs, notified };
}
