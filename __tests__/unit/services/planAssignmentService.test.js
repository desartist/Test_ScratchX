const mongoose = require('mongoose');
const {
  assignPlanToOwner,
  getPlanForOwner,
  getOwnerSubscriptionHistory
} = require('@/lib/services/planAssignmentService');
const Subscription = require('@/models/subscriptionModel').default;
const SubscriptionPlan = require('@/models/subscriptionPlanModel').default;
const SubscriptionUsage = require('@/models/subscriptionUsageModel').default;
const DistributorBalance = require('@/models/distributorBalanceModel').default;

describe('Plan Assignment Service', () => {
  let merchantId, distributorId;

  beforeEach(async () => {
    merchantId = new mongoose.Types.ObjectId();
    distributorId = new mongoose.Types.ObjectId();
  });

  describe('assignPlanToOwner', () => {
    it('should assign plan to merchant', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription.ownerType).toBe('merchant');
      expect(result.subscription.ownerId.toString()).toEqual(merchantId.toString());
      expect(result.subscription.planId.toString()).toEqual(testPlan._id.toString());
      expect(result.subscription.status).toBe('active');
      expect(result.plan).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    it('should assign plan to distributor and create balance', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      expect(result.success).toBe(true);
      expect(result.subscription.ownerType).toBe('distributor');
      expect(result.subscription.ownerId.toString()).toEqual(distributorId.toString());
      expect(result.balance).toBeDefined();
      expect(result.balance.distributorId.toString()).toEqual(distributorId.toString());
      expect(result.balance.totalAllocated).toBe(testPlan.limits.maxScratchCardsPerMonth);
    });

    it('should create subscription with correct timestamps', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const beforeAssign = new Date();
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });
      const afterAssign = new Date();

      expect(result.success).toBe(true);
      const subscription = result.subscription;

      // Verify timestamps are set
      expect(subscription.currentPeriodStart).toBeDefined();
      expect(subscription.currentPeriodEnd).toBeDefined();

      // Verify startDate is recent
      expect(new Date(subscription.currentPeriodStart).getTime()).toBeGreaterThanOrEqual(beforeAssign.getTime());
      expect(new Date(subscription.currentPeriodStart).getTime()).toBeLessThanOrEqual(afterAssign.getTime());

      // Verify endDate is calculated correctly (14 days for this plan)
      const expectedEndTime = new Date(subscription.currentPeriodStart).getTime() + (14 * 24 * 60 * 60 * 1000);
      const actualEndTime = new Date(subscription.currentPeriodEnd).getTime();
      // Allow 1 second tolerance for timing
      expect(Math.abs(actualEndTime - expectedEndTime)).toBeLessThan(1000);
    });

    it('should initialize subscription usage with all metrics', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      expect(result.usage).toBeDefined();
      expect(result.usage.metrics).toBeDefined();
      expect(result.usage.metrics.totalStoresCreated).toBe(0);
      expect(result.usage.metrics.activeCampaigns).toBe(0);
      expect(result.usage.metrics.totalCampaignsCreated).toBe(0);
      expect(result.usage.metrics.scratchCardsGenerated).toBe(0);
      expect(result.usage.metrics.totalScans).toBe(0);
      expect(result.usage.metrics.totalParticipations).toBe(0);
    });

    it('should cancel previous active subscription when assigning new plan', async () => {
      const plan1 = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign first plan
      const result1 = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan1._id,
        planCode: plan1.name,
      });

      expect(result1.success).toBe(true);
      const firstSubscriptionId = result1.subscription._id;

      // Create another plan
      const plan2 = await SubscriptionPlan.create({
        name: 'Professional',
        displayName: 'Professional',
        description: 'Professional plan',
        tier: 3,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 50,
          maxCampaigns: 100,
          maxScratchCardsPerMonth: 50000,
          maxMonthlyScans: 250000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign second plan to same merchant
      const result2 = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan2._id,
        planCode: plan2.name,
      });

      expect(result2.success).toBe(true);

      // Verify first subscription is now cancelled
      const firstSubscription = await Subscription.findById(firstSubscriptionId);
      expect(firstSubscription.status).toBe('cancelled');

      // Verify new subscription is active
      const secondSubscription = result2.subscription;
      expect(secondSubscription.status).toBe('active');

      // Verify only one active subscription for merchant
      const activeSubscriptions = await Subscription.find({
        ownerType: 'merchant',
        ownerId: merchantId,
        status: 'active'
      });
      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0]._id.toString()).toEqual(secondSubscription._id.toString());
    });

    it('should throw error if planId is missing', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planCode: 'Growth',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error if planCode does not match plan', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: 'WrongCode',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error if ownerType is missing', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error if ownerId is missing', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPlanForOwner', () => {
    it('should retrieve current active plan for owner', async () => {
      const testPlan = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign plan first
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: testPlan._id,
        planCode: testPlan.name,
      });

      // Retrieve plan
      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeDefined();
      expect(result.subscription.planId.toString()).toEqual(testPlan._id.toString());
      expect(result.plan).toBeDefined();
      expect(result.plan.name).toBe(testPlan.name);
      expect(result.usage).toBeDefined();
    });

    it('should return null if no active plan exists', async () => {
      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeNull();
      expect(result.plan).toBeNull();
      expect(result.usage).toBeNull();
    });

    it('should only return active subscriptions', async () => {
      const plan1 = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign a plan
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan1._id,
        planCode: plan1.name,
      });

      // Create another plan
      const plan2 = await SubscriptionPlan.create({
        name: 'Starter',
        displayName: 'Starter',
        description: 'Starter plan',
        tier: 1,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 5,
          maxCampaigns: 10,
          maxScratchCardsPerMonth: 5000,
          maxMonthlyScans: 25000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: false,
          canUseMultiStore: false,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Cancel it by assigning another plan (which cancels previous)
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan2._id,
        planCode: plan2.name,
      });

      // Get current plan
      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeDefined();
      expect(result.subscription.status).toBe('active');
      expect(result.plan.name).toBe('Starter');
    });
  });

  describe('getOwnerSubscriptionHistory', () => {
    it('should return empty array if no subscriptions exist', async () => {
      const result = await getOwnerSubscriptionHistory('merchant', merchantId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should return all subscriptions sorted by startDate descending', async () => {
      const plan1 = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      const plan2 = await SubscriptionPlan.create({
        name: 'Starter',
        displayName: 'Starter',
        description: 'Starter plan',
        tier: 1,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 5,
          maxCampaigns: 10,
          maxScratchCardsPerMonth: 5000,
          maxMonthlyScans: 25000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: false,
          canUseMultiStore: false,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign first plan
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan1._id,
        planCode: plan1.name,
      });

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assign second plan (cancels first)
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan2._id,
        planCode: plan2.name,
      });

      // Get history
      const result = await getOwnerSubscriptionHistory('merchant', merchantId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Verify sorted by startDate descending
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].currentPeriodStart).getTime())
          .toBeGreaterThanOrEqual(new Date(result[i + 1].currentPeriodStart).getTime());
      }
    });

    it('should include all statuses in history', async () => {
      const plan1 = await SubscriptionPlan.create({
        name: 'Growth',
        displayName: 'Growth',
        description: 'Growth plan for testing',
        tier: 2,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 10,
          maxCampaigns: 25,
          maxScratchCardsPerMonth: 10000,
          maxMonthlyScans: 50000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      // Assign plan 1
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan1._id,
        planCode: plan1.name,
      });

      // Create another plan and assign (cancels first)
      const plan2 = await SubscriptionPlan.create({
        name: 'Professional',
        displayName: 'Professional',
        description: 'Professional plan',
        tier: 3,
        price: {
          monthly: 0,
          annual: 0,
          currency: 'INR'
        },
        limits: {
          maxStores: 50,
          maxCampaigns: 100,
          maxScratchCardsPerMonth: 50000,
          maxMonthlyScans: 250000,
        },
        features: {
          canCreateCampaign: true,
          canViewAnalytics: true,
          canUseMultiStore: true,
        },
        isActive: true,
        trialDurationDays: 14,
      });

      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: plan2._id,
        planCode: plan2.name,
      });

      const history = await getOwnerSubscriptionHistory('merchant', merchantId);

      // Should have both subscriptions
      expect(history).toHaveLength(2);
      // First (older) should be cancelled
      expect(history[1].status).toBe('cancelled');
      // Second (newer) should be active
      expect(history[0].status).toBe('active');
    });
  });
});
