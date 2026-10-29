import { notifyPendingWinners } from '@/lib/services/luckyDraw/winnerNotifications';
import { expireStaleWinners } from '@/lib/services/luckyDraw/redemptionService';

/**
 * Called every few minutes by the external cron service. Draws never run by themselves (the owner
 * always starts them), so the job only:
 *  1. retries winner SMS that failed earlier
 *  2. expires claim codes past their window
 */
export async function runLuckyDrawJob(now = new Date()) {
  const { sent } = await notifyPendingWinners({ now });
  const expired = await expireStaleWinners(now);
  return { notified: sent, expired };
}
