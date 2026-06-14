/**
 * Cron Job: Check Subscription Expiry
 *
 * Runs periodically to:
 * 1. Find expired subscriptions (currentPeriodEnd < now)
 * 2. Set their status to 'expired'
 * 3. Log the expiry event
 *
 * Should be triggered by: node-cron or a scheduled task runner
 * Recommended frequency: Daily at 00:00 UTC
 */

import { connectDB } from '@/lib/connectDB';
import Subscription from '@/models/subscriptionModel';
import Account from '@/models/accountModel';

class SubscriptionExpiryChecker {
  /**
   * Check and update expired subscriptions
   */
  async checkAndExpireSubscriptions() {
    try {
      await connectDB();

      const now = new Date();

      // Find all subscriptions that have expired
      const expiredSubscriptions = await Subscription.find({
        status: { $in: ['active', 'trial'] }, // Only check active/trial subscriptions
        currentPeriodEnd: { $lt: now }, // Expiry date is in the past
      }).lean();

      if (expiredSubscriptions.length === 0) {
        console.log('[SubscriptionExpiryChecker] No subscriptions to expire');
        return { checked: 0, expired: 0 };
      }

      console.log(`[SubscriptionExpiryChecker] Found ${expiredSubscriptions.length} expired subscriptions to process`);

      // Update all expired subscriptions
      const result = await Subscription.updateMany(
        {
          status: { $in: ['active', 'trial'] },
          currentPeriodEnd: { $lt: now },
        },
        {
          $set: {
            status: 'expired',
            expiredAt: now,
          },
        }
      );

      console.log(`[SubscriptionExpiryChecker] Expired ${result.modifiedCount} subscriptions`);

      // For each expired subscription, create a notification or log
      // (Optional: Send email notifications, update user dashboard, etc.)
      for (const subscription of expiredSubscriptions) {
        console.log(`[SubscriptionExpiryChecker] Subscription expired:`, {
          subscriptionId: subscription._id,
          ownerId: subscription.ownerId,
          ownerType: subscription.ownerType,
          planId: subscription.planId,
          expiredAt: now,
        });

        // Optional: Update account to reflect subscription expiry
        // This helps dashboard queries without needing to join Subscription
        if (subscription.ownerId) {
          try {
            await Account.updateOne(
              { _id: subscription.ownerId },
              {
                $set: {
                  'subscription.status': 'expired',
                  'subscription.expiredAt': now,
                }
              }
            );
          } catch (error) {
            console.warn('[SubscriptionExpiryChecker] Failed to update account:', error.message);
          }
        }
      }

      return {
        checked: expiredSubscriptions.length,
        expired: result.modifiedCount,
      };
    } catch (error) {
      console.error('[SubscriptionExpiryChecker] Error:', error);
      throw error;
    }
  }

  /**
   * Check scratch card entitlement expiry
   * Scratches expire 90 days after subscription purchase
   */
  async checkAndExpireScratchEntitlements() {
    try {
      await connectDB();

      const now = new Date();

      // Find subscriptions with expired scratch entitlements
      const expiredScratchSubscriptions = await Subscription.find({
        'unlimitedScratches.isActive': true,
        'unlimitedScratches.validUntil': { $lt: now },
      }).lean();

      if (expiredScratchSubscriptions.length === 0) {
        console.log('[SubscriptionExpiryChecker] No scratch entitlements to expire');
        return { checked: 0, expired: 0 };
      }

      console.log(
        `[SubscriptionExpiryChecker] Found ${expiredScratchSubscriptions.length} expired scratch entitlements`
      );

      // Update scratch entitlements to inactive
      const result = await Subscription.updateMany(
        {
          'unlimitedScratches.isActive': true,
          'unlimitedScratches.validUntil': { $lt: now },
        },
        {
          $set: {
            'unlimitedScratches.isActive': false,
            'unlimitedScratches.expiredAt': now,
          },
        }
      );

      console.log(`[SubscriptionExpiryChecker] Expired ${result.modifiedCount} scratch entitlements`);

      return {
        checked: expiredScratchSubscriptions.length,
        expired: result.modifiedCount,
      };
    } catch (error) {
      console.error('[SubscriptionExpiryChecker] Scratch entitlement check error:', error);
      throw error;
    }
  }

  /**
   * Run all expiry checks (called by cron job)
   */
  async run() {
    console.log('[SubscriptionExpiryChecker] Starting scheduled check...');

    try {
      const [subscriptionsResult, scratchResult] = await Promise.all([
        this.checkAndExpireSubscriptions(),
        this.checkAndExpireScratchEntitlements(),
      ]);

      console.log('[SubscriptionExpiryChecker] Check complete:', {
        subscriptions: subscriptionsResult,
        scratches: scratchResult,
      });

      return {
        success: true,
        subscriptions: subscriptionsResult,
        scratches: scratchResult,
      };
    } catch (error) {
      console.error('[SubscriptionExpiryChecker] Fatal error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new SubscriptionExpiryChecker();
