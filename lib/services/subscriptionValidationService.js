import mongoose from 'mongoose';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import Account from '@/models/accountModel';

const HARDCODED_PLANS = {
  plan_core: {
    _id: 'plan_core', name: 'Core', displayName: 'ScratchX Core', planType: 'CORE',
    limits: { maxCampaigns: -1, maxStores: 1, maxScratchesPerCampaign: -1 },
  },
  plan_smart: {
    _id: 'plan_smart', name: 'Smart', displayName: 'ScratchX Smart', planType: 'SMART',
    limits: { maxCampaigns: -1, maxStores: 5, maxScratchesPerCampaign: -1 },
  },
};

function resolvePlan(subscription) {
  if (subscription?.planId && subscription.planId.limits) return subscription.planId;
  const key = subscription?.planType?.toLowerCase();
  if (key && HARDCODED_PLANS[`plan_${key}`]) return HARDCODED_PLANS[`plan_${key}`];
  return null;
}

/**
 * SubscriptionValidationService
 * Global validation helpers for subscription-based restrictions
 * Checks if users can perform actions based on their active subscription plan
 */
class SubscriptionValidationService {
  /**
   * Fetch active subscription with plan details
   * @private
   */
  async #getActiveSubscription(userId, userType = 'merchant') {
    try {
      return await Subscription.findOne({
        ownerId: userId,
        ownerType: userType,
        status: { $in: ['trial', 'active', 'past_due'] },
      }).populate('planId');
    } catch (error) {
      console.error('[SubscriptionValidationService] Error fetching subscription:', error);
      return null;
    }
  }

  /**
   * Check if user can create a campaign
   * Returns: { allowed: boolean, message?: string, limit?: number, current?: number }
   */
  async canCreateCampaign(userId, userType = 'merchant') {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { allowed: false, message: 'Invalid user ID format' };
      }

      const subscription = await this.#getActiveSubscription(userId, userType);

      if (!subscription) {
        return {
          allowed: false,
          message: 'No active subscription found. Please purchase a plan.',
        };
      }

      const plan = resolvePlan(subscription);
      if (!plan || !plan.limits) {
        return { allowed: false, message: 'Plan configuration invalid' };
      }

      // Check if maxCampaigns is unlimited (-1) or check count
      if (plan.limits.maxCampaigns === -1) {
        return { allowed: true };
      }

      // Count active campaigns
      const activeCampaigns = await Campaign.countDocuments({
        merchantId: userId,
        status: 'active',
      });

      if (activeCampaigns >= plan.limits.maxCampaigns) {
        return {
          allowed: false,
          message: `Campaign limit reached (${activeCampaigns}/${plan.limits.maxCampaigns}). Upgrade your plan.`,
          limit: plan.limits.maxCampaigns,
          current: activeCampaigns,
        };
      }

      return { allowed: true, limit: plan.limits.maxCampaigns, current: activeCampaigns };
    } catch (error) {
      console.error('[SubscriptionValidationService] canCreateCampaign error:', error);
      return {
        allowed: false,
        message: 'Validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check if user can create a store
   * BUSINESS RULE: First store allowed WITHOUT subscription
   * Subsequent stores require active plan
   * Returns: { allowed: boolean, message?: string, limit?: number, current?: number, isFirstStore?: boolean }
   */
  async canCreateStore(userId, userType = 'merchant') {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { allowed: false, message: 'Invalid user ID format' };
      }

      // Count existing stores
      const existingStores = await Store.countDocuments({
        merchant_id: userId,
        isDeleted: { $ne: true }
      });

      // FIRST STORE: Always allowed (even without subscription)
      if (existingStores === 0) {
        return {
          allowed: true,
          isFirstStore: true,
          message: 'First store creation allowed (onboarding)',
        };
      }

      // SUBSEQUENT STORES: Require active subscription
      const subscription = await this.#getActiveSubscription(userId, userType);

      if (!subscription) {
        return {
          allowed: false,
          message: 'Upgrade your plan to create additional stores. Maximum 1 store without subscription.',
          limit: 1,
          current: existingStores,
        };
      }

      const plan = resolvePlan(subscription);
      if (!plan || !plan.limits) {
        return { allowed: false, message: 'Plan configuration invalid' };
      }

      // ✅ FIX #3: Enforce SMART plan's "1 main + 4 extra" structure
      const planName = plan.name ? plan.name.toLowerCase() : '';
      const isCOREPlan = planName.includes('core');
      const isSMARTPlan = planName.includes('smart');

      // Count existing stores (all statuses, to check limit)
      const allStores = await Store.countDocuments({
        merchant_id: userId,
        isDeleted: { $ne: true }
      });

      // CORE Plan: Max 1 store only
      if (isCOREPlan && allStores >= 1) {
        return {
          allowed: false,
          message: `Core plan limited to 1 store. Upgrade to Smart plan for multiple stores.`,
          limit: 1,
          current: allStores,
          plan: 'Core',
        };
      }

      // SMART Plan: 1 main + up to 4 extra (max 5 total)
      if (isSMARTPlan && allStores >= 5) {
        return {
          allowed: false,
          message: `Smart plan limited to 5 stores (1 main + 4 extra). Upgrade for more.`,
          limit: 5,
          current: allStores,
          plan: 'Smart',
        };
      }

      // Determine if this would be an extra store (for SMART plan)
      const isExtraStore = isSMARTPlan && allStores >= 1; // Any store after the first is extra
      const extraStoreFee = isExtraStore ? 199 : 0; // ₹199 per extra store in SMART plan

      return {
        allowed: true,
        limit: isSMARTPlan ? 5 : (isCOREPlan ? 1 : plan.limits.maxStores),
        current: allStores,
        isExtraStore,
        extraStoreFee,
        plan: isSMARTPlan ? 'Smart' : (isCOREPlan ? 'Core' : 'Other'),
      };
    } catch (error) {
      console.error('[SubscriptionValidationService] canCreateStore error:', error);
      return {
        allowed: false,
        message: 'Validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check if user can allocate scratch cards
   * Returns: { allowed: boolean, message?: string, limit?: number, available?: number }
   */
  async canAllocateScratchCards(userId, requestedAmount, userType = 'merchant') {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { allowed: false, message: 'Invalid user ID format' };
      }
      if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
        return { allowed: false, message: 'Requested amount must be a positive integer' };
      }

      const subscription = await this.#getActiveSubscription(userId, userType);

      if (!subscription) {
        return {
          allowed: false,
          message: 'No active subscription found. Please purchase a plan.',
        };
      }

      const plan = resolvePlan(subscription);
      if (!plan || !plan.limits) {
        return { allowed: false, message: 'Plan configuration invalid' };
      }

      // Check if limit is unlimited (-1)
      if (plan.limits.maxScratchCardsPerMonth === -1) {
        return { allowed: true, available: -1 };
      }

      // For now, use monthly limit as total available
      // In production, implement monthly reset via scheduled job
      const monthlyLimit = plan.limits.maxScratchCardsPerMonth;

      if (requestedAmount > monthlyLimit) {
        return {
          allowed: false,
          message: `Requested amount (${requestedAmount}) exceeds monthly limit (${monthlyLimit})`,
          limit: monthlyLimit,
          available: monthlyLimit,
        };
      }

      return { allowed: true, limit: monthlyLimit, available: monthlyLimit };
    } catch (error) {
      console.error('[SubscriptionValidationService] canAllocateScratchCards error:', error);
      return {
        allowed: false,
        message: 'Validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get subscription summary for dashboard/settings
   * Returns: { planName, status, startDate, endDate, usage: { campaigns, stores, scratchCards } }
   */
  async getSubscriptionSummary(userId, userType = 'merchant') {
    try {
      const subscription = await this.#getActiveSubscription(userId, userType);

      if (!subscription) {
        return null;
      }

      const plan = resolvePlan(subscription);
      if (!plan || !plan.limits) {
        return null;
      }

      // Get current usage counts
      const [campaignCount, storeCount] = await Promise.all([
        Campaign.countDocuments({ merchantId: userId, status: 'active' }),
        Store.countDocuments({ merchantId: userId, isActive: true }),
      ]);

      return {
        planName: plan.name,
        status: subscription.status,
        startDate: subscription.currentPeriodStart,
        endDate: subscription.currentPeriodEnd,
        usage: {
          campaigns: {
            current: campaignCount,
            limit: plan.limits.maxCampaigns === -1 ? 'Unlimited' : plan.limits.maxCampaigns,
          },
          stores: {
            current: storeCount,
            limit: plan.limits.maxStores === -1 ? 'Unlimited' : plan.limits.maxStores,
          },
          scratchCards: {
            current: 0, // TODO: Implement tracking via ScratchCardRecord model
            limit: plan.limits.maxScratchCardsPerMonth === -1 ? 'Unlimited' : plan.limits.maxScratchCardsPerMonth,
          },
        },
      };
    } catch (error) {
      console.error('[SubscriptionValidationService] getSubscriptionSummary error:', error);
      return null;
    }
  }
}

export default new SubscriptionValidationService();
