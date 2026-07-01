import mongoose from 'mongoose';
import Account from '@/models/accountModel';
import Subscription from '@/models/subscriptionModel';
import '@/models/subscriptionPlanModel';
import Store from '@/models/storeModel';

/**
 * PlatformAccessService
 * Determines what features/actions are allowed based on user's subscription plan
 * Provides centralized access control for the platform
 */
class PlatformAccessService {
  /**
   * Get access level for an account
   * @param {string} accountId - The account ID to check
   * @returns {Promise<string>} "NONE" | "CORE" | "SMART"
   */
  async getAccessLevel(accountId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        console.warn('[PlatformAccessService] Invalid account ID format:', accountId);
        return 'NONE';
      }

      // Query Subscription model with ownerId + ownerType
      const subscription = await Subscription.findOne({
        ownerId: accountId,
        ownerType: { $in: ['merchant', 'distributor'] },
        status: { $in: ['trial', 'active', 'past_due'] },
      }).populate('planId');

      // No subscription at all
      if (!subscription) {
        return 'NONE';
      }

      // planId populated from DB takes priority; fall back to planType for hardcoded plans
      const planName = subscription.planId?.name || subscription.planType || 'NONE';
      return planName.toUpperCase();
    } catch (error) {
      console.error('[PlatformAccessService] Error in getAccessLevel:', error);
      return 'NONE';
    }
  }

  /**
   * Check if account can create a campaign
   * @param {string} accountId - The account ID to check
   * @returns {Promise<{allowed: boolean, reason: string|null}>}
   */
  async canCreateCampaign(accountId) {
    try {
      const accessLevel = await this.getAccessLevel(accountId);

      // If "NONE": return { allowed: false, reason: "No active plan..." }
      if (accessLevel === 'NONE') {
        return {
          allowed: false,
          reason: 'No active plan. Purchase a plan to start running campaigns.',
        };
      }

      // Otherwise: return { allowed: true, reason: null }
      return {
        allowed: true,
        reason: null,
      };
    } catch (error) {
      console.error('[PlatformAccessService] Error in canCreateCampaign:', error);
      return {
        allowed: false,
        reason: 'Error checking campaign creation eligibility',
      };
    }
  }

  /**
   * Get maximum stores allowed for an account based on plan
   * @param {string} accountId - The account ID to check
   * @returns {Promise<number>} 0, 1, or 5 (or more depending on plan)
   */
  async getMaxStoresForAccount(accountId) {
    try {
      const accessLevel = await this.getAccessLevel(accountId);

      // "CORE" plan: 1 store
      if (accessLevel === 'CORE') {
        return 1;
      }

      // "SMART" plan: 5 stores
      if (accessLevel === 'SMART') {
        return 5;
      }

      // "NONE" plan: 0 stores (except first store exception)
      return 0;
    } catch (error) {
      console.error('[PlatformAccessService] Error in getMaxStoresForAccount:', error);
      return 0;
    }
  }

  /**
   * Check if account can create a store
   * First store is always allowed (onboarding exception)
   * @param {string} accountId - The account ID to check
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  async canCreateStore(accountId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return {
          allowed: false,
          reason: 'Invalid account ID',
        };
      }

      // Get current store count
      const storeCount = await this.getStoreCount(accountId);

      // First store (no mainStoreId): Always allowed with reason "First store creation"
      if (storeCount === 0) {
        return {
          allowed: true,
          reason: 'First store creation',
        };
      }

      // Additional stores: Check plan and count
      const accessLevel = await this.getAccessLevel(accountId);
      const maxStores = await this.getMaxStoresForAccount(accountId);

      // If plan is "NONE": return { allowed: false, reason: "Cannot create additional stores..." }
      if (accessLevel === 'NONE') {
        return {
          allowed: false,
          reason: 'Cannot create additional stores without a plan. Please purchase a plan to add more stores.',
        };
      }

      // If count >= maxStores: return { allowed: false, reason: "Your {PLAN} plan allows..." }
      if (storeCount >= maxStores) {
        return {
          allowed: false,
          reason: `Your ${accessLevel} plan allows up to ${maxStores} store(s). Upgrade to create more stores.`,
        };
      }

      // Otherwise: return { allowed: true, reason: null }
      return {
        allowed: true,
        reason: null,
      };
    } catch (error) {
      console.error('[PlatformAccessService] Error in canCreateStore:', error);
      return {
        allowed: false,
        reason: 'Error checking store creation eligibility',
      };
    }
  }

  /**
   * Get count of active stores owned by account
   * @param {string} accountId - The account ID to check
   * @returns {Promise<number>} Count of active stores
   */
  async getStoreCount(accountId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return 0;
      }

      // Count active stores owned by account: Store.countDocuments({ merchant_id, status: 'active' })
      const count = await Store.countDocuments({
        merchant_id: accountId,
        status: 'active',
      });

      return count;
    } catch (error) {
      console.error('[PlatformAccessService] Error in getStoreCount:', error);
      return 0;
    }
  }

  /**
   * Get plan details for an account
   * @param {string} accountId - The account ID to check
   * @returns {Promise<{name, price, features, limits}|null>} Plan details or null if no plan
   */
  async getPlanDetails(accountId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return null;
      }

      // Query subscription with planId population
      const subscription = await Subscription.findOne({
        ownerId: accountId,
        ownerType: { $in: ['merchant', 'distributor'] },
        status: { $in: ['trial', 'active', 'past_due'] },
      }).populate('planId');

      if (!subscription || !subscription.planId) {
        return null;
      }

      const plan = subscription.planId;

      // Return plan details
      return {
        name: plan.name || null,
        price: plan.price || null,
        features: plan.features || null,
        limits: plan.limits || null,
      };
    } catch (error) {
      console.error('[PlatformAccessService] Error in getPlanDetails:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new PlatformAccessService();
