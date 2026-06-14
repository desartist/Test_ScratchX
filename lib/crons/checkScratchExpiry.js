/**
 * Cron Job: Check Scratch Entitlement Expiry
 * Runs daily at 9 AM (configurable)
 * 
 * Tasks:
 * 1. Send warning emails at 15, 7, 3, 1 days before expiry
 * 2. Deactivate expired unlimited scratches
 * 3. Send expiry notification when scratches expire
 */

import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import notificationService from "@/lib/services/notificationService";

/**
 * Main cron job function
 */
export async function checkScratchExpiry() {
  try {
    await connectDB();
    console.log("[Cron] ⏰ Starting scratch expiry check...");

    const now = new Date();
    let processedCount = 0;
    let warningsSent = 0;
    let expiredCount = 0;

    // Find all subscriptions with active unlimited scratches
    const subscriptions = await Subscription.find({
      "unlimitedScratches.isActive": true,
      "unlimitedScratches.validUntil": { $exists: true },
    });

    console.log(`[Cron] Found ${subscriptions.length} subscriptions with active unlimited scratches`);

    for (const subscription of subscriptions) {
      try {
        const validUntil = new Date(subscription.unlimitedScratches.validUntil);
        const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));

        // Check if scratches have already expired
        if (daysRemaining <= 0) {
          console.log(
            `[Cron] Scratches expired for ${subscription.ownerId} (${daysRemaining} days)`
          );

          // Deactivate scratches
          await scratchEntitlementService.deactivateExpiredScratches(subscription._id);

          // Send expiry notification
          await notificationService.sendScratchExpiredNotification(
            subscription.ownerId,
            subscription.ownerType
          );

          expiredCount++;
          processedCount++;
          continue;
        }

        // Check if warning should be sent (15, 7, 3, 1 days)
        const warningDays = [15, 7, 3, 1];
        if (warningDays.includes(daysRemaining)) {
          console.log(
            `[Cron] Sending expiry warning for ${subscription.ownerId} (${daysRemaining} days remaining)`
          );

          // Check if warning was already sent today
          const lastWarningAt = subscription.unlimitedScratches.lastWarningAt;
          if (lastWarningAt) {
            const lastWarningDay = new Date(lastWarningAt).setHours(0, 0, 0, 0);
            const todayDay = now.setHours(0, 0, 0, 0);

            if (lastWarningDay === todayDay) {
              console.log(
                `[Cron] Warning already sent today for ${subscription.ownerId}, skipping...`
              );
              processedCount++;
              continue;
            }
          }

          // Send warning
          await notificationService.sendScratchExpiryWarning(
            subscription.ownerId,
            subscription.ownerType,
            daysRemaining
          );

          // Mark warning as sent
          await scratchEntitlementService.markWarningSent(
            subscription.ownerId,
            subscription.ownerType
          );

          warningsSent++;
          processedCount++;
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error(
          `[Cron] Error processing subscription ${subscription._id}:`,
          error
        );
        // Continue with next subscription even if one fails
      }
    }

    console.log(`[Cron] ✅ Scratch expiry check complete:`);
    console.log(`    - Processed: ${processedCount}`);
    console.log(`    - Warnings sent: ${warningsSent}`);
    console.log(`    - Expired & deactivated: ${expiredCount}`);

    return {
      success: true,
      processed: processedCount,
      warningsSent,
      expiredCount,
    };
  } catch (error) {
    console.error("[Cron] ❌ Error in scratch expiry check:", error);
    throw error;
  }
}

/**
 * Export for use in API route or scheduled task service
 */
export default checkScratchExpiry;
