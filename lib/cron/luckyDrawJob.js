import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { ConflictError } from '@/lib/errors';
import { runDraw } from '@/lib/services/luckyDraw/drawService';
import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { expireStaleWinners } from '@/lib/services/luckyDraw/redemptionService';

const MAX_DRAWS_PER_RUN = 50;

/**
 * Called every few minutes by the external cron service.
 *  1. runs due draws of ACTIVE campaigns in AUTOMATIC mode (manual mode is the owner's call)
 *  2. retries winner SMS that failed earlier
 *  3. expires claim codes past their window
 */
export async function runLuckyDrawJob(now = new Date()) {
  const automaticCampaignIds = await LuckyDrawCampaign.find({
    status: 'active',
    'drawConfig.triggerMode': 'automatic',
  }).distinct('_id');

  const dueDraws = await LuckyDraw.find({
    campaignId: { $in: automaticCampaignIds },
    status: 'scheduled',
    drawDate: { $lte: now },
  })
    .sort({ drawDate: 1 })
    .limit(MAX_DRAWS_PER_RUN)
    .lean();

  let ran = 0;
  let failed = 0;
  for (const draw of dueDraws) {
    try {
      await runDraw(draw._id, { source: 'cron', now });
      ran += 1;
    } catch (error) {
      if (error instanceof ConflictError) continue; // someone else already ran it
      failed += 1;
      console.error('[LuckyDraw cron] draw failed', String(draw._id), error.message);
    }
  }

  const { sent } = await notifyPendingWinners({ now });
  const expired = await expireStaleWinners(now);

  return { ran, failed, notified: sent, expired };
}
