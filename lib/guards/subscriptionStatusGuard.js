/**
 * Subscription Status Guard
 *
 * Validates subscription status for operations that require active subscription:
 * - Campaign creation
 * - Campaign activation
 * - Campaign assignment
 * - Scratch allocation
 * - Additional store creation
 *
 * ALLOWS without subscription:
 * - Login
 * - Viewing data
 * - Settings updates
 * - First store creation
 * - Report viewing
 *
 * BLOCKS when subscription is expired:
 * - All operations listed above
 * - Shows: "Your subscription has expired. Renew your plan to continue."
 */

import { connectDB } from '@/lib/connectDB';
import Subscription from '@/models/subscriptionModel';
import Account from '@/models/accountModel';

class SubscriptionStatusGuard {
  /**
   * Check if subscription is active (not expired)
   * Returns: { isActive: boolean, subscription?: Subscription, message?: string }
   */
  async checkSubscriptionStatus(userId, userType = 'merchant') {
    try {
      await connectDB();

      // Find active subscription
      const subscription = await Subscription.findOne({
        ownerId: userId,
        ownerType: userType,
        status: { $in: ['active', 'trial'] },
      })
        .select('status currentPeriodEnd unlimitedScratches.validUntil')
        .lean();

      if (!subscription) {
        return {
          isActive: false,
          message: 'No active subscription found',
        };
      }

      // Check if subscription has expired
      const now = new Date();
      if (subscription.currentPeriodEnd < now) {
        return {
          isActive: false,
          subscription,
          message: 'Your subscription has expired. Renew your plan to continue running campaigns.',
          expiryDate: subscription.currentPeriodEnd,
          daysOverdue: Math.floor((now - subscription.currentPeriodEnd) / (1000 * 60 * 60 * 24)),
        };
      }

      // Check if scratch entitlement has expired
      if (
        subscription.unlimitedScratches &&
        subscription.unlimitedScratches.validUntil &&
        subscription.unlimitedScratches.validUntil < now
      ) {
        console.warn(
          `[SubscriptionStatusGuard] Scratch entitlement expired for user ${userId}`
        );
      }

      // Subscription is active
      return {
        isActive: true,
        subscription,
        daysRemaining: Math.ceil(
          (subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
        ),
      };
    } catch (error) {
      console.error('[SubscriptionStatusGuard] Error checking subscription status:', error);
      return {
        isActive: false,
        message: 'Failed to verify subscription status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Validate subscription before allowing operations
   * Throws error if subscription is not active
   *
   * Usage: await guard.validateForOperation(userId, 'campaign_creation')
   */
  async validateForOperation(userId, operationType, userType = 'merchant') {
    const status = await this.checkSubscriptionStatus(userId, userType);

    if (!status.isActive) {
      const error = new Error(status.message || 'Subscription validation failed');
      error.code = 'SUBSCRIPTION_INACTIVE';
      error.statusCode = 402; // Payment Required
      error.details = {
        operationType,
        expiryDate: status.expiryDate,
        daysOverdue: status.daysOverdue,
      };
      throw error;
    }

    return status;
  }

  /**
   * Get subscription warning message based on days remaining
   * Returns warning message for dashboard display
   */
  getExpiryWarning(daysRemaining) {
    if (!daysRemaining || daysRemaining <= 0) {
      return {
        type: 'critical',
        message: '⚠️ Your subscription has expired. Renew now to continue running campaigns.',
        action: 'Renew Plan',
      };
    }

    if (daysRemaining === 1) {
      return {
        type: 'critical',
        message: '🔴 Your subscription expires today. Renew immediately.',
        action: 'Renew Now',
      };
    }

    if (daysRemaining <= 3) {
      return {
        type: 'urgent',
        message: `⚠️ Your subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
        action: 'Renew Plan',
      };
    }

    if (daysRemaining <= 7) {
      return {
        type: 'warning',
        message: `📢 Your subscription expires in ${daysRemaining} days.`,
        action: 'Renew Plan',
      };
    }

    if (daysRemaining <= 15) {
      return {
        type: 'info',
        message: `ℹ️ Your subscription expires in ${daysRemaining} days.`,
        action: null,
      };
    }

    return null; // No warning needed
  }
}

export default new SubscriptionStatusGuard();
