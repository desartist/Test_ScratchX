/**
 * Email Reminders Cron Job
 *
 * Runs daily to send:
 * - Trial expiring reminders (3 days and 1 day before expiry)
 * - Quota warning emails (when usage >= 80%)
 */

import { connectDB } from '@/lib/connectDB';
import Subscription from '@/models/subscriptionModel';
import SubscriptionUsage from '@/models/subscriptionUsageModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import {
  sendTrialExpiringEmail,
  sendQuotaWarningEmail,
} from '@/lib/emailTriggers';

/**
 * Send trial expiring reminders
 */
async function sendTrialReminders() {
  try {
    const now = new Date();

    // Find trials expiring in 3 days or 1 day
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Get subscriptions expiring in next 3 days
    const expiringTrials = await Subscription.find({
      status: 'trial',
      trialEndsAt: { $lte: threeDaysLater, $gte: now },
    });

    let sent = 0;
    for (const subscription of expiringTrials) {
      try {
        await sendTrialExpiringEmail(subscription.merchantId);
        sent++;
      } catch (error) {
        console.error(
          `Failed to send trial reminder for merchant ${subscription.merchantId}:`,
          error
        );
      }
    }

    console.log(`✅ Sent ${sent} trial expiring reminder emails`);
    return sent;
  } catch (error) {
    console.error('Error in trial reminder cron:', error);
    throw error;
  }
}

/**
 * Send quota warning emails
 */
async function sendQuotaWarnings() {
  try {
    // Find all active subscriptions
    const subscriptions = await Subscription.find({ status: 'active' });

    let warnings = 0;

    for (const subscription of subscriptions) {
      try {
        // Get usage
        const usage = await SubscriptionUsage.findOne({
          merchantId: subscription.merchantId,
          isActive: true,
        });

        if (!usage) continue;

        // Get plan
        const plan = await SubscriptionPlan.findById(subscription.planId);
        if (!plan) continue;

        // Check each limit
        const limitsToCheck = [
          { key: 'maxStores', metric: 'totalStoresCreated', label: 'Stores' },
          { key: 'maxCampaigns', metric: 'activeCampaigns', label: 'Campaigns' },
          {
            key: 'maxScratchCardsPerMonth',
            metric: 'scratchCardsGenerated',
            label: 'Scratches',
          },
          { key: 'maxMonthlyScans', metric: 'totalScans', label: 'Scans' },
        ];

        for (const check of limitsToCheck) {
          const limit = plan.limits[check.key];
          if (limit === -1) continue; // Skip unlimited limits

          const current = usage.metrics[check.metric] || 0;
          const percentage = (current / limit) * 100;

          // Send email if usage >= 80%
          if (percentage >= 80) {
            // Check if we already sent warning (only send once at 80%, once at 95%)
            const lastWarning = usage.alerts?.find(
              (a) => a.metric === check.label && a.threshold === (percentage >= 95 ? 95 : 80)
            );

            if (!lastWarning || lastWarning.sentAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
              await sendQuotaWarningEmail(
                subscription.merchantId,
                check.label,
                Math.round(current),
                limit,
                Math.round(percentage)
              );

              warnings++;
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to send quota warning for merchant ${subscription.merchantId}:`,
          error
        );
      }
    }

    console.log(`✅ Sent ${warnings} quota warning emails`);
    return warnings;
  } catch (error) {
    console.error('Error in quota warning cron:', error);
    throw error;
  }
}

/**
 * Main cron job function
 */
export async function runEmailRemindersCron() {
  try {
    await connectDB();
    console.log('🔄 Running email reminders cron job...');

    const trialReminders = await sendTrialReminders();
    const quotaWarnings = await sendQuotaWarnings();

    console.log(
      `✅ Email reminders cron completed: ${trialReminders} trial reminders, ${quotaWarnings} quota warnings`
    );

    return {
      success: true,
      trialReminders,
      quotaWarnings,
      totalSent: trialReminders + quotaWarnings,
    };
  } catch (error) {
    console.error('❌ Email reminders cron failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  runEmailRemindersCron,
};
