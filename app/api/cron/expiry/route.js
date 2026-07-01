import { runExpiryJob } from '@/lib/cron/expiry-job';

/**
 * Cron endpoint for expiring scratch cards
 * Called by external cron service (EasyCron, CloudScheduler, etc.)
 *
 * Requires:
 * - X-Cron-Secret header matching CRON_SECRET environment variable
 *
 * Expected request:
 * GET https://your-domain.com/api/cron/expiry
 * Headers: { X-Cron-Secret: your-secret-here }
 *
 * Called every 60 seconds to check for and mark expired scratch cards
 *
 * @param {Request} request - The HTTP request
 * @returns {Response} - JSON response with job results
 */
export async function GET(request) {
  // Validate cron secret
  const cronSecret = request.headers.get('X-Cron-Secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[Cron Expiry] CRON_SECRET environment variable not set');
    return Response.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (cronSecret !== expectedSecret) {
    console.warn('[Cron Expiry] Unauthorized cron request - invalid secret');
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[Cron Expiry] Request received');

    // Run the expiry job
    const result = await runExpiryJob();

    // Return response
    if (result.success) {
      return Response.json(
        {
          success: true,
          message: 'Expiry job completed successfully',
          result: {
            processedCount: result.processedCount,
            failedCount: result.failedCount,
            totalChecked: result.totalChecked
          }
        },
        { status: 200 }
      );
    } else {
      return Response.json(
        {
          success: false,
          error: result.error || 'Failed to process expiring cards',
          result: {
            processedCount: 0,
            failedCount: 0,
            totalChecked: 0
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Cron Expiry] Unexpected error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
