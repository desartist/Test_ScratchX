import { connectDB } from '@/lib/connectDB';
import { processExpiringCards } from '@/lib/services/expiryManagementService';

/**
 * Background job to automatically expire scratch cards
 * Called by external cron service every 60 seconds
 *
 * Process:
 * 1. Connect to database
 * 2. Find all expired cards (expires_at < now, status != 'expired')
 * 3. Mark them as expired
 * 4. Log results
 *
 * @returns {Promise<{success: boolean, processedCount?: number, failedCount?: number, totalChecked?: number, error?: string}>}
 */
export async function runExpiryJob() {
  const startTime = new Date();
  const timestamp = startTime.toISOString();

  try {
    console.log(`[Expiry Job] Started at ${timestamp}`);

    // Connect to database
    await connectDB();
    console.log('[Expiry Job] Database connected');

    // Process expiring cards
    const result = await processExpiringCards();

    if (result.success) {
      console.log(
        `[Expiry Job] Completed: Processed ${result.processedCount} cards, ` +
        `${result.failedCount} failed, ${result.totalChecked} total checked`
      );
    } else {
      console.error(`[Expiry Job] Failed to process cards: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error(`[Expiry Job] Error: ${error.message}`);
    return {
      success: false,
      processedCount: 0,
      failedCount: 0,
      totalChecked: 0,
      error: error.message
    };
  }
}
