const mongoose = require('mongoose');
const platformAccessService = require('@/lib/services/platformAccessService').default;
const Account = require('@/models/accountModel').default;
const Subscription = require('@/models/subscriptionModel').default;
const SubscriptionPlan = require('@/models/subscriptionPlanModel').default;
const Store = require('@/models/storeModel').default;

describe('PlatformAccessService', () => {
  let merchantId, distributorId, corePlanId, smartPlanId;

  beforeEach(async () => {
    merchantId = new mongoose.Types.ObjectId();
    distributorId = new mongoose.Types.ObjectId();

    // Create test plans
    const corePlan = await SubscriptionPlan.create({
      name: 'Core',
      displayName: 'Core Plan',
      description: 'Core plan for testing',
      tier: 1,
      price: {
        monthly: 499,
        annual: 4990,
        currency: 'INR'
      },
      limits: {
        maxStores: 1,
        maxCampaigns: 5,
        maxScratchCardsPerMonth: 1000,
        maxMonthlyScans: 10000,
      },
      features: {
        canCreateCampaign: true,
        canAddStore: true,
        canViewAnalytics: false,
      },
      isActive: true,
    });

    const smartPlan = await SubscriptionPlan.create({
      name: 'Smart',
      displayName: 'Smart Plan',
      description: 'Smart plan for testing',
      tier: 2,
      price: {
        monthly: 999,
        annual: 9990,
        currency: 'INR'
      },
      limits: {
        maxStores: 5,
        maxCampaigns: 20,
        maxScratchCardsPerMonth: 5000,
        maxMonthlyScans: 50000,
      },
      features: {
        canCreateCampaign: true,
        canAddStore: true,
        canViewAnalytics: true,
        canUseMultiStore: true,
      },
      isActive: true,
    });

    corePlanId = corePlan._id;
    smartPlanId = smartPlan._id;
  });

  describe('getAccessLevel', () => {
    it('should return NONE for account with no subscription', async () => {
      const accessLevel = await platformAccessService.getAccessLevel(merchantId);
      expect(accessLevel).toBe('NONE');
    });

    it('should return CORE for account with CORE plan subscription', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'active',
      });

      const accessLevel = await platformAccessService.getAccessLevel(merchantId);
      expect(accessLevel).toBe('CORE');
    });

    it('should return SMART for account with SMART plan subscription', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const accessLevel = await platformAccessService.getAccessLevel(merchantId);
      expect(accessLevel).toBe('SMART');
    });

    it('should support distributor ownerType', async () => {
      await Subscription.create({
        ownerId: distributorId,
        ownerType: 'distributor',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const accessLevel = await platformAccessService.getAccessLevel(distributorId);
      expect(accessLevel).toBe('SMART');
    });

    it('should return NONE for invalid account ID', async () => {
      const accessLevel = await platformAccessService.getAccessLevel('invalid-id');
      expect(accessLevel).toBe('NONE');
    });

    it('should only return active subscriptions', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'cancelled',
      });

      const accessLevel = await platformAccessService.getAccessLevel(merchantId);
      expect(accessLevel).toBe('NONE');
    });
  });

  describe('canCreateCampaign', () => {
    it('should fail when account has no plan', async () => {
      const result = await platformAccessService.canCreateCampaign(merchantId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No active plan');
    });

    it('should succeed when account has CORE plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'active',
      });

      const result = await platformAccessService.canCreateCampaign(merchantId);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should succeed when account has SMART plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const result = await platformAccessService.canCreateCampaign(merchantId);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });
  });

  describe('getMaxStoresForAccount', () => {
    it('should return 0 for NONE plan', async () => {
      const maxStores = await platformAccessService.getMaxStoresForAccount(merchantId);
      expect(maxStores).toBe(0);
    });

    it('should return 1 for CORE plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'active',
      });

      const maxStores = await platformAccessService.getMaxStoresForAccount(merchantId);
      expect(maxStores).toBe(1);
    });

    it('should return 5 for SMART plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const maxStores = await platformAccessService.getMaxStoresForAccount(merchantId);
      expect(maxStores).toBe(5);
    });
  });

  describe('canCreateStore', () => {
    const createTestStore = async (merchantIdVal, storeName) => {
      return Store.create({
        merchant_id: merchantIdVal,
        store_name: storeName,
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        contact_person: 'John Doe',
        contact_number: '9876543210',
        latitude: 19.0760,
        longitude: 72.8479,
        status: 'active',
      });
    };

    it('should allow first store creation without plan', async () => {
      const result = await platformAccessService.canCreateStore(merchantId);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('First store creation');
    });

    it('should deny additional store without plan', async () => {
      // Create first store
      await createTestStore(merchantId, 'Store 1');

      const result = await platformAccessService.canCreateStore(merchantId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot create additional stores without a plan');
    });

    it('should allow second store with SMART plan', async () => {
      // Create first store
      await createTestStore(merchantId, 'Store 1');

      // Add SMART plan
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const result = await platformAccessService.canCreateStore(merchantId);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should deny second store with CORE plan', async () => {
      // Create first store
      await createTestStore(merchantId, 'Store 1');

      // Add CORE plan (max 1 store)
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'active',
      });

      const result = await platformAccessService.canCreateStore(merchantId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('CORE plan allows up to 1 store');
    });

    it('should deny 6th store with SMART plan', async () => {
      // Create 5 stores
      for (let i = 0; i < 5; i++) {
        await createTestStore(merchantId, `Store ${i + 1}`);
      }

      // Add SMART plan (max 5 stores)
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const result = await platformAccessService.canCreateStore(merchantId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('SMART plan allows up to 5 store');
    });

    it('should return error for invalid account ID', async () => {
      const result = await platformAccessService.canCreateStore('invalid-id');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid account ID');
    });
  });

  describe('getStoreCount', () => {
    const createTestStore = async (merchantIdVal, storeName, storeStatus = 'active') => {
      return Store.create({
        merchant_id: merchantIdVal,
        store_name: storeName,
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        contact_person: 'John Doe',
        contact_number: '9876543210',
        latitude: 19.0760,
        longitude: 72.8479,
        status: storeStatus,
      });
    };

    it('should return 0 for account with no stores', async () => {
      const count = await platformAccessService.getStoreCount(merchantId);
      expect(count).toBe(0);
    });

    it('should return 3 for account with 3 active stores', async () => {
      for (let i = 0; i < 3; i++) {
        await createTestStore(merchantId, `Store ${i + 1}`);
      }

      const count = await platformAccessService.getStoreCount(merchantId);
      expect(count).toBe(3);
    });

    it('should only count active stores', async () => {
      // Create 2 active stores
      await createTestStore(merchantId, 'Active Store 1', 'active');

      await createTestStore(merchantId, 'Active Store 2', 'active');

      // Create 1 inactive store
      await createTestStore(merchantId, 'Inactive Store', 'inactive');

      const count = await platformAccessService.getStoreCount(merchantId);
      expect(count).toBe(2);
    });

    it('should return 0 for invalid account ID', async () => {
      const count = await platformAccessService.getStoreCount('invalid-id');
      expect(count).toBe(0);
    });
  });

  describe('getPlanDetails', () => {
    it('should return null for account with no plan', async () => {
      const details = await platformAccessService.getPlanDetails(merchantId);
      expect(details).toBeNull();
    });

    it('should return plan details for account with CORE plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: corePlanId,
        planType: 'CORE',
        status: 'active',
      });

      const details = await platformAccessService.getPlanDetails(merchantId);
      expect(details).not.toBeNull();
      expect(details.name).toBe('Core');
      expect(details.price).toBeDefined();
      expect(details.features).toBeDefined();
      expect(details.limits).toBeDefined();
      expect(details.limits.maxStores).toBe(1);
    });

    it('should return plan details for account with SMART plan', async () => {
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const details = await platformAccessService.getPlanDetails(merchantId);
      expect(details).not.toBeNull();
      expect(details.name).toBe('Smart');
      expect(details.limits.maxStores).toBe(5);
      expect(details.features.canUseMultiStore).toBe(true);
    });

    it('should return null for invalid account ID', async () => {
      const details = await platformAccessService.getPlanDetails('invalid-id');
      expect(details).toBeNull();
    });

    it('should support distributor subscriptions', async () => {
      await Subscription.create({
        ownerId: distributorId,
        ownerType: 'distributor',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      const details = await platformAccessService.getPlanDetails(distributorId);
      expect(details).not.toBeNull();
      expect(details.name).toBe('Smart');
    });
  });

  describe('Integration scenarios', () => {
    it('should correctly handle merchant onboarding flow', async () => {
      const createTestStore = async (merchantIdVal, storeName) => {
        return Store.create({
          merchant_id: merchantIdVal,
          store_name: storeName,
          address: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          contact_person: 'John Doe',
          contact_number: '9876543210',
          latitude: 19.0760,
          longitude: 72.8479,
          status: 'active',
        });
      };

      // Step 1: New merchant starts - no plan
      let canCreate = await platformAccessService.canCreateCampaign(merchantId);
      expect(canCreate.allowed).toBe(false);

      let canAddStore = await platformAccessService.canCreateStore(merchantId);
      expect(canAddStore.allowed).toBe(true); // First store allowed

      // Step 2: Create first store
      await createTestStore(merchantId, 'Main Store');

      // Step 3: Try to add second store without plan
      canAddStore = await platformAccessService.canCreateStore(merchantId);
      expect(canAddStore.allowed).toBe(false);

      // Step 4: Purchase SMART plan
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlanId,
        planType: 'SMART',
        status: 'active',
      });

      // Step 5: Now can create campaigns and additional stores
      canCreate = await platformAccessService.canCreateCampaign(merchantId);
      expect(canCreate.allowed).toBe(true);

      canAddStore = await platformAccessService.canCreateStore(merchantId);
      expect(canAddStore.allowed).toBe(true);

      const planDetails = await platformAccessService.getPlanDetails(merchantId);
      expect(planDetails.name).toBe('Smart');
    });
  });
});
