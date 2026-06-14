const Subscription = require('@/models/subscriptionModel').default;
const SubscriptionPlan = require('@/models/subscriptionPlanModel').default;
const DistributorBalance = require('@/models/distributorBalanceModel').default;
const Account = require('@/models/accountModel').default;

let getDistributorBalance;
let validateDistributorAllocation;
let checkSubscriptionAccess;
let checkPlanAccess;
let checkQuotaLimit;
let getSubscriptionDetails;
const SubscriptionUsage = require('@/models/subscriptionUsageModel').default;

describe('subscriptionAccessGuard - Generic Ownership Methods', () => {
  let distributorId;
  let merchantId;
  let planId;
  let userId;
  let planData;
  let distributorData;
  let merchantData;

  beforeAll(() => {
    // Import the functions after setup.js has initialized the environment
    const module = require('@/lib/subscriptionAccessGuard');
    getDistributorBalance = module.getDistributorBalance;
    validateDistributorAllocation = module.validateDistributorAllocation;
    checkSubscriptionAccess = module.checkSubscriptionAccess;
    checkPlanAccess = module.checkPlanAccess;
    checkQuotaLimit = module.checkQuotaLimit;
    getSubscriptionDetails = module.getSubscriptionDetails;
  });

  beforeEach(() => {
    distributorId = global.generateTestId();
    merchantId = global.generateTestId();
    planId = global.generateTestId();
    userId = global.generateTestId();

    planData = {
      _id: planId,
      name: 'Professional',
      displayName: 'Professional Plan',
      description: 'Professional plan for distributors',
      price: {
        monthly: 5000,
        annual: 50000,
        currency: 'INR'
      },
      features: {
        canCreateCampaign: true,
        canAssignMerchants: true,
        canViewAnalytics: true,
      },
      limits: {
        maxCampaigns: 50,
        maxStores: 100,
        maxScratchCardsPerMonth: 100000,
        maxMonthlyScans: 500000,
        maxManagersPerAccount: 10,
      },
      status: 'active',
    };

    distributorData = {
      _id: distributorId,
      email: `distributor-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Distributor',
      lastName: 'User',
      role: 'Distributor',
      status: 'active',
    };

    merchantData = {
      _id: merchantId,
      email: `merchant-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Merchant',
      lastName: 'User',
      role: 'Merchant',
      status: 'active',
    };
  });

  describe('getDistributorBalance', () => {
    test('getDistributorBalance: active subscription with balance → returns balance', async () => {
      // Setup: Create plan, distributor, subscription, and balance
      const plan = await SubscriptionPlan.create(planData);
      const distributor = await Account.create(distributorData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const balance = await DistributorBalance.create({
        distributorId: distributorId,
        totalAllocated: 10000,
        allocations: [
          {
            merchantId: merchantId,
            merchantName: 'Test Merchant',
            quantity: 2000,
            allocatedBy: userId,
          },
        ],
      });

      // Execute
      const result = await getDistributorBalance(distributorId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.balance).toBeDefined();
      expect(result.balance.total).toBe(10000);
      expect(result.balance.remaining).toBe(8000); // 10000 - 2000
      expect(result.balance.allocations).toHaveLength(1);
      expect(result.balance.allocations[0].merchantId.toString()).toBe(merchantId.toString());
    });

    test('getDistributorBalance: no active subscription → returns error', async () => {
      // Execute: Try to get balance without subscription
      const result = await getDistributorBalance(distributorId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('No active subscription found');
    });

    test('getDistributorBalance: subscription exists but no balance record → returns error', async () => {
      // Setup: Create only subscription without balance
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await getDistributorBalance(distributorId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('No balance record found');
    });

    test('getDistributorBalance: cancelled subscription → returns error', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'cancelled',
      });

      // Execute
      const result = await getDistributorBalance(distributorId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('No active subscription');
    });
  });

  describe('validateDistributorAllocation', () => {
    test('validateDistributorAllocation: valid quantity within balance → returns allowed', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const balance = await DistributorBalance.create({
        distributorId: distributorId,
        totalAllocated: 10000,
        allocations: [],
      });

      // Execute
      const result = await validateDistributorAllocation(distributorId, merchantId, 5000);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remainingBalance).toBe(5000); // 10000 - 5000
    });

    test('validateDistributorAllocation: invalid quantity (zero) → returns error', async () => {
      // Execute
      const result = await validateDistributorAllocation(distributorId, merchantId, 0);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Quantity must be greater than 0');
    });

    test('validateDistributorAllocation: invalid quantity (negative) → returns error', async () => {
      // Execute
      const result = await validateDistributorAllocation(distributorId, merchantId, -100);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Quantity must be greater than 0');
    });

    test('validateDistributorAllocation: quantity exceeds remaining balance → returns error', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const balance = await DistributorBalance.create({
        distributorId: distributorId,
        totalAllocated: 10000,
        allocations: [
          {
            merchantId: merchantId,
            merchantName: 'Test Merchant',
            quantity: 8000,
            allocatedBy: userId,
          },
        ],
      });

      // Execute: Try to allocate more than remaining
      const result = await validateDistributorAllocation(distributorId, merchantId, 3000);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      expect(result.error).toContain('Available: 2000');
      expect(result.error).toContain('Requested: 3000');
      expect(result.remainingBalance).toBe(2000);
    });

    test('validateDistributorAllocation: no subscription → returns error', async () => {
      // Execute: Try to validate without subscription
      const result = await validateDistributorAllocation(distributorId, merchantId, 1000);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('No active subscription');
    });

    test('validateDistributorAllocation: exact remaining balance allocation → returns allowed', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const balance = await DistributorBalance.create({
        distributorId: distributorId,
        totalAllocated: 10000,
        allocations: [
          {
            merchantId: merchantId,
            merchantName: 'Test Merchant',
            quantity: 7500,
            allocatedBy: userId,
          },
        ],
      });

      // Execute: Allocate exactly remaining (2500)
      const result = await validateDistributorAllocation(distributorId, merchantId, 2500);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remainingBalance).toBe(0);
    });
  });

  describe('checkSubscriptionAccess', () => {
    test('checkSubscriptionAccess: merchant with active subscription → returns allowed with plan', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkSubscriptionAccess('merchant', merchantId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription.ownerType).toBe('merchant');
      expect(result.subscription.ownerId.toString()).toBe(merchantId.toString());
      expect(result.plan).toBeDefined();
      expect(result.plan.name).toBe('Professional Plan');
      expect(result.plan._id.toString()).toBe(planId.toString());
    });

    test('checkSubscriptionAccess: distributor with active subscription → returns allowed with plan', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkSubscriptionAccess('distributor', distributorId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription.ownerType).toBe('distributor');
      expect(result.subscription.ownerId.toString()).toBe(distributorId.toString());
      expect(result.plan).toBeDefined();
      expect(result.plan.type).toBe('distributor');
    });

    test('checkSubscriptionAccess: no active subscription → returns error', async () => {
      // Execute: Try to check access without subscription
      const result = await checkSubscriptionAccess('merchant', merchantId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('No active subscription found');
      expect(result.error).toContain('merchant');
    });

    test('checkSubscriptionAccess: cancelled subscription → returns error', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'cancelled',
      });

      // Execute
      const result = await checkSubscriptionAccess('merchant', merchantId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('No active subscription');
    });

    test('checkSubscriptionAccess: trial status subscription → returns error (only active)', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'trial',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkSubscriptionAccess('merchant', merchantId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('No active subscription');
    });

    test('checkSubscriptionAccess: multiple subscriptions (wrong owner) → returns error', async () => {
      // Setup: Create subscriptions for different merchants
      const plan = await SubscriptionPlan.create(planData);
      const otherMerchantId = global.generateTestId();

      const subscription1 = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const subscription2 = await Subscription.create({
        ownerType: 'merchant',
        ownerId: otherMerchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute: Check access for different merchant
      const result = await checkSubscriptionAccess('merchant', otherMerchantId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.subscription.ownerId.toString()).toBe(otherMerchantId.toString());
    });

    test('checkSubscriptionAccess: plan details populated correctly', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkSubscriptionAccess('distributor', distributorId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan.features).toBeDefined();
      expect(result.plan.features.canCreateCampaign).toBe(true);
      expect(result.plan.features.canAssignMerchants).toBe(true);
      expect(result.plan.limits).toBeDefined();
      expect(result.plan.limits.maxCampaigns).toBe(50);
      expect(result.plan.limits.maxScratchCardsPerMonth).toBe(100000);
    });
  });

  describe('checkPlanAccess - Generic Ownership', () => {
    test('checkPlanAccess: merchant with feature enabled → returns allowed', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canCreateCampaign');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan.features.canCreateCampaign).toBe(true);
      expect(result.plan.name).toBe('Professional Plan');
    });

    test('checkPlanAccess: merchant with feature disabled → returns error', async () => {
      // Setup
      const limitedPlanData = {
        ...planData,
        features: {
          canCreateCampaign: false,
          canAssignMerchants: false,
          canViewAnalytics: false,
        },
      };
      const plan = await SubscriptionPlan.create(limitedPlanData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canCreateCampaign');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.reason).toContain('not available');
    });

    test('checkPlanAccess: distributor with feature enabled → returns allowed', async () => {
      // Setup
      const distributorPlanData = {
        ...planData,
        type: 'distributor',
      };
      const plan = await SubscriptionPlan.create(distributorPlanData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkPlanAccess({ ownerType: 'distributor', ownerId: distributorId }, 'canCreateCampaign');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.plan.features.canCreateCampaign).toBe(true);
    });

    test('checkPlanAccess: no subscription → returns error', async () => {
      // Execute: Try to check without subscription
      const result = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canCreateCampaign');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No active subscription');
    });

    test('checkPlanAccess: non-existent feature → returns error', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute
      const result = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'nonExistentFeature');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    test('checkPlanAccess: backward compatible with merchantId string', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute with old signature (merchantId as string)
      const result = await checkPlanAccess(merchantId, 'canCreateCampaign');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.plan.features.canCreateCampaign).toBe(true);
    });
  });

  describe('checkQuotaLimit - Generic Ownership', () => {
    test('checkQuotaLimit: within limit → returns allowed', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 20,
        },
      });

      // Execute
      const result = await checkQuotaLimit({ ownerType: 'merchant', ownerId: merchantId }, 'maxCampaigns', 1);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(20);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(30);
    });

    test('checkQuotaLimit: exact limit → returns allowed', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 49,
        },
      });

      // Execute
      const result = await checkQuotaLimit({ ownerType: 'merchant', ownerId: merchantId }, 'maxCampaigns', 1);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(49);
      expect(result.remaining).toBe(1);
    });

    test('checkQuotaLimit: exceeds limit → returns denied', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 50,
        },
      });

      // Execute
      const result = await checkQuotaLimit({ ownerType: 'merchant', ownerId: merchantId }, 'maxCampaigns', 1);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(50);
      expect(result.wouldExceed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    test('checkQuotaLimit: unlimited limit (-1) → always allowed', async () => {
      // Setup
      const unlimitedPlanData = {
        ...planData,
        limits: {
          ...planData.limits,
          maxCampaigns: -1, // unlimited
        },
      };
      const plan = await SubscriptionPlan.create(unlimitedPlanData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Execute with very large request
      const result = await checkQuotaLimit({ ownerType: 'distributor', ownerId: distributorId }, 'maxCampaigns', 999999);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.unlimited).toBe(true);
      expect(result.limit).toBe(-1);
    });

    test('checkQuotaLimit: distributor with quota → returns correct values', async () => {
      // Setup
      const distributorPlanData = {
        ...planData,
        type: 'distributor',
      };
      const plan = await SubscriptionPlan.create(distributorPlanData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          maxStores: 75,
        },
      });

      // Execute
      const result = await checkQuotaLimit({ ownerType: 'distributor', ownerId: distributorId }, 'maxStores', 10);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.requestAmount).toBe(10);
    });

    test('checkQuotaLimit: no subscription → returns error', async () => {
      // Execute
      const result = await checkQuotaLimit({ ownerType: 'merchant', ownerId: merchantId }, 'maxCampaigns', 1);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No active subscription');
    });

    test('checkQuotaLimit: backward compatible with merchantId string', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 10,
        },
      });

      // Execute with old signature (merchantId as string)
      const result = await checkQuotaLimit(merchantId, 'maxCampaigns', 1);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(10);
    });
  });

  describe('getSubscriptionDetails - Generic Ownership', () => {
    test('getSubscriptionDetails: merchant with active subscription → returns full details', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 5,
          totalStoresCreated: 10,
        },
      });

      // Execute
      const result = await getSubscriptionDetails({ ownerType: 'merchant', ownerId: merchantId });

      // Assert
      expect(result.subscription).toBeDefined();
      expect(result.subscription.ownerType).toBe('merchant');
      expect(result.subscription.ownerId.toString()).toBe(merchantId.toString());
      expect(result.plan).toBeDefined();
      expect(result.plan.features).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.usage.metrics.activeCampaigns).toBe(5);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    test('getSubscriptionDetails: distributor with active subscription → returns full details', async () => {
      // Setup
      const distributorPlanData = {
        ...planData,
        type: 'distributor',
      };
      const plan = await SubscriptionPlan.create(distributorPlanData);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 15,
        },
      });

      // Execute
      const result = await getSubscriptionDetails({ ownerType: 'distributor', ownerId: distributorId });

      // Assert
      expect(result.subscription).toBeDefined();
      expect(result.subscription.ownerType).toBe('distributor');
      expect(result.plan).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.usage.metrics.activeCampaigns).toBe(15);
    });

    test('getSubscriptionDetails: no subscription → returns null values', async () => {
      // Execute
      const result = await getSubscriptionDetails({ ownerType: 'merchant', ownerId: merchantId });

      // Assert
      expect(result.subscription).toBeNull();
      expect(result.plan).toBeNull();
      expect(result.usage).toBeNull();
      expect(result.alerts).toEqual([]);
    });

    test('getSubscriptionDetails: generates usage alerts for high usage', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Create usage with 90% of maxCampaigns (critical threshold)
      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metrics: {
          activeCampaigns: 45, // 45/50 = 90%
          totalStoresCreated: 90, // 90/100 = 90%
        },
      });

      // Execute
      const result = await getSubscriptionDetails({ ownerType: 'merchant', ownerId: merchantId });

      // Assert - should generate alerts for high usage
      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    test('getSubscriptionDetails: backward compatible with merchantId string', async () => {
      // Setup
      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Execute with old signature (merchantId as string)
      const result = await getSubscriptionDetails(merchantId);

      // Assert
      expect(result.subscription).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    test('getSubscriptionDetails: correct daysRemaining calculation', async () => {
      // Setup: Set period to 60 days from now
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const plan = await SubscriptionPlan.create(planData);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan._id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      const usage = await SubscriptionUsage.create({
        subscriptionId: subscription._id,
        merchantId: merchantId,
        billingPeriod: {
          startDate: now,
          endDate: periodEnd,
        },
      });

      // Execute
      const result = await getSubscriptionDetails({ ownerType: 'merchant', ownerId: merchantId });

      // Assert - should be approximately 60 days (allowing 1 day margin for test execution)
      expect(result.daysRemaining).toBeGreaterThanOrEqual(59);
      expect(result.daysRemaining).toBeLessThanOrEqual(61);
    });
  });
});
