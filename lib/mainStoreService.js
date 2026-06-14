/**
 * Main Store Service
 * Handles main store (primary store) logic for onboarding and account management
 */

import Account from '@/models/accountModel';
import Store from '@/models/storeModel';

class MainStoreService {
  /**
   * Set store as main store for an account
   * Handles all related updates:
   * 1. Mark store as main
   * 2. Update account mainStoreId
   * 3. Mark onboarding as complete
   */
  async setAsMainStore(storeId, accountId) {
    try {
      if (!storeId || !accountId) {
        throw new Error('Store ID and Account ID are required');
      }

      // 1. Update store with main store indicators
      const store = await Store.findByIdAndUpdate(
        storeId,
        {
          is_main_store: true,
          isMainStore: true,
          isDefaultStore: true,
          storeType: 'MAIN',
        },
        { new: true }
      );

      if (!store) {
        throw new Error('Store not found');
      }

      // 2. Update account
      const account = await Account.findByIdAndUpdate(
        accountId,
        {
          mainStoreId: storeId,
          'onboarding.hasCompletedStoreCreation': true,
          'onboarding.firstStoreCreatedAt': new Date(),
        },
        { new: true }
      );

      if (!account) {
        throw new Error('Account not found');
      }

      console.log(`[MainStoreService] Main store set for account ${accountId}: ${store.store_name}`);

      return {
        success: true,
        store,
        account,
        message: 'Main store created successfully',
      };
    } catch (error) {
      console.error('[MainStoreService] Error setting main store:', error);
      throw error;
    }
  }

  /**
   * Check if this is the account's main store
   */
  async isMainStore(storeId, accountId) {
    try {
      const account = await Account.findById(accountId).select('mainStoreId');
      if (!account) {
        return false;
      }

      return account.mainStoreId?.toString() === storeId?.toString();
    } catch (error) {
      console.error('[MainStoreService] Error checking main store:', error);
      return false;
    }
  }

  /**
   * Prevent deletion of main store
   */
  async canDeleteStore(storeId, accountId) {
    try {
      const isMainStore = await this.isMainStore(storeId, accountId);

      if (isMainStore) {
        return {
          allowed: false,
          message: 'This is your Main Store. A Main Store cannot be deleted. Create another store and transfer ownership before deleting this store.',
          isMainStore: true,
        };
      }

      return {
        allowed: true,
        isMainStore: false,
      };
    } catch (error) {
      console.error('[MainStoreService] Error checking delete permission:', error);
      return {
        allowed: false,
        message: 'Validation failed',
        error: error.message,
      };
    }
  }

  /**
   * Get main store for account
   */
  async getMainStore(accountId) {
    try {
      const account = await Account.findById(accountId).select('mainStoreId');
      if (!account || !account.mainStoreId) {
        return null;
      }

      const store = await Store.findById(account.mainStoreId);
      return store;
    } catch (error) {
      console.error('[MainStoreService] Error getting main store:', error);
      return null;
    }
  }

  /**
   * Check if account has completed store onboarding
   */
  async hasCompletedStoreOnboarding(accountId) {
    try {
      const account = await Account.findById(accountId).select('onboarding.hasCompletedStoreCreation');
      return account?.onboarding?.hasCompletedStoreCreation ?? false;
    } catch (error) {
      console.error('[MainStoreService] Error checking onboarding:', error);
      return false;
    }
  }

  /**
   * Get onboarding status for account
   */
  async getOnboardingStatus(accountId) {
    try {
      const account = await Account.findById(accountId).select(
        'mainStoreId onboarding'
      );

      if (!account) {
        return null;
      }

      return {
        hasCompletedStoreCreation: account.onboarding?.hasCompletedStoreCreation ?? false,
        firstStoreCreatedAt: account.onboarding?.firstStoreCreatedAt,
        hasCompletedProfileSetup: account.onboarding?.hasCompletedProfileSetup ?? false,
        hasCompletedSubscriptionSetup: account.onboarding?.hasCompletedSubscriptionSetup ?? false,
        onboardingCompletedAt: account.onboarding?.onboardingCompletedAt,
        mainStoreId: account.mainStoreId,
      };
    } catch (error) {
      console.error('[MainStoreService] Error getting onboarding status:', error);
      return null;
    }
  }
}

export default new MainStoreService();
