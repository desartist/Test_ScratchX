import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { runLuckyDrawJob } from '@/lib/cron/luckyDrawJob';

/**
 * Cron endpoint: runs due automatic Lucky Draws, retries winner SMS, expires
 * stale claim codes. Same convention as app/api/cron/expiry/route.js:
 *   GET /api/cron/lucky-draw   Headers: { X-Cron-Secret: <CRON_SECRET> }
 * Point the external cron service at it every 5 minutes.
 */
export async function GET(request) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;

  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error('[Cron LuckyDraw] CRON_SECRET environment variable not set');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (request.headers.get('X-Cron-Secret') !== expectedSecret) {
    console.warn('[Cron LuckyDraw] Unauthorized cron request - invalid secret');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await runLuckyDrawJob();
    return Response.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('[Cron LuckyDraw] Unexpected error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
