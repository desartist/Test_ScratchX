import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError } from '@/lib/errors';
import { revealOrder } from '@/lib/luckyDraw/prizeCategories';
import { assertDrawOwner } from './openDraw';
import { runDraw } from './drawService';
import { notifyPendingWinners } from './winnerNotifications';

async function ownedLiveDraw(merchantId, drawId) {
  const { draw, campaign } = await assertDrawOwner(drawId, merchantId);
  if (campaign.revealMode !== 'live') {
    throw new ConflictError('This draw shows its winners at once. Use Run draw instead.');
  }
  return { draw, campaign };
}

/**
 * The owner starts the live reveal: ScratchX picks every winner from the QR entries now and stores them,
 * but nothing is public (or texted) until the owner reveals each prize.
 */
export async function startLiveReveal(merchantId, drawId, { now = new Date(), seed = null } = {}) {
  const { draw, campaign } = await ownedLiveDraw(merchantId, drawId);
  if (draw.status !== 'scheduled') throw new ConflictError('The live reveal has already started');
  if (now < new Date(campaign.endDate)) {
    throw new ConflictError('Entries are still open. You can start the reveal once entries close.');
  }
  return runDraw(drawId, { source: 'manual', accountId: merchantId, now, seed });
}

/** Makes the next prize public (smallest prize first) and texts its winners. */
export async function revealNextCategory(merchantId, drawId, { now = new Date() } = {}) {
  const { draw, campaign } = await ownedLiveDraw(merchantId, drawId);
  if (!draw.reveal?.startedAt) throw new ConflictError('Start the live reveal first');

  const order = revealOrder(draw.prizeTiersSnapshot?.length ? draw.prizeTiersSnapshot : campaign.prizeTiers);
  const current = draw.reveal.revealedCount || 0;
  if (current >= order.length) throw new ConflictError('Every prize has already been revealed');

  const revealedCount = current + 1;
  const set = { 'reveal.revealedCount': revealedCount };
  if (revealedCount === order.length) set['reveal.completedAt'] = now;

  // Matching on the current count stops a double click from skipping a prize.
  const updated = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, 'reveal.revealedCount': current },
    { $set: set },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError('That prize was just revealed. Refresh to see the latest.');

  const rank = order[current];
  await LuckyDrawWinner.updateMany({ drawId: draw._id, rank, hiddenUntilReveal: true }, { $set: { hiddenUntilReveal: false } });
  let notified = { sent: 0, failed: 0 };
  try {
    notified = await notifyPendingWinners({ drawId: draw._id, now });
  } catch (error) {
    // The cron retries anyone who was not texted; the reveal itself has happened.
    console.error('[LuckyDraw] live reveal SMS pass failed', error.message);
  }

  return { ...updated, revealedRank: rank, nextRank: order[revealedCount] ?? null, notified };
}
