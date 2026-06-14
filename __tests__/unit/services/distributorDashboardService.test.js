const mongoose = require('mongoose');
const dashboardService = require('@/lib/dashboardService').default;
const Account = require('@/models/accountModel').default;
const Subscription = require('@/models/subscriptionModel').default;
const SubscriptionPlan = require('@/models/subscriptionPlanModel').default;
const DistributorBalance = require('@/models/distributorBalanceModel').default;
const MerchantAllocation = require('@/models/merchantAllocationModel').default;

describe('DashboardService - getDistributorDashboard', () => {
  let distributorId;
  let merchantId;
  let planId;
  let distributor;
  let merchant;
  let plan;

  beforeEach(async () => {
    // Create a subscription plan
    plan = await SubscriptionPlan.create({
      name: 'Growth',
      displayName: 'Growth Plan',
      description: 'Test growth plan',
      tier: 2,
      price: {
        monthly: 5000,
        annual: 50000,
        currency: 'INR'
      },
      limits: {
        maxStores: 10,
        maxCampaigns: 5,
        maxMerchants: 20,
        maxScratchCardsPerMonth: 50000
      },
      features: {
        canCreateCampaign: true,
        canViewAnalytics: true,
        canAddStore: true
      }
    });

    // Create distributor account
    distributor = await Account.create({
      email: `distributor-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'Distributor',
      role: 'Distributor',
      status: 'active'
    });
    distributorId = distributor._id;

    // Create merchant account
    merchant = await Account.create({
      email: `merchant-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'Merchant',
      role: 'Merchant',
      status: 'active',
      profile: {
        storeName: 'Test Store'
      }
    });
    merchantId = merchant._id;
  });

  describe('getDistributorDashboard - success cases', () => {
    it('should return correct structure when subscription exists', async () => {
      // Create active subscription for distributor
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Create distributor balance
      const balance = await DistributorBalance.create({
        distributorId,
        totalAllocated: 10000
      });

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription.planName).toBe('Growth');
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.billingCycle).toBe('monthly');
      expect(result.balance).toBeDefined();
      expect(result.balance.totalAllocated).toBe(10000);
      expect(result.plan).toBeDefined();
      expect(result.plan.maxMerchants).toBe(20);
      expect(result.recentAllocations).toBeDefined();
      expect(Array.isArray(result.recentAllocations)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate remaining balance correctly', async () => {
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active'
      });

      const balance = await DistributorBalance.create({
        distributorId,
        totalAllocated: 1000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Store',
            quantity: 300,
            allocatedBy: distributorId,
            allocatedAt: new Date()
          }
        ]
      });

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.balance.usedBalance).toBe(300);
      expect(result.balance.remainingBalance).toBe(700);
    });

    it('should include recent allocations in response', async () => {
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active'
      });

      const balance = await DistributorBalance.create({
        distributorId,
        totalAllocated: 5000
      });

      // Create allocations
      for (let i = 0; i < 3; i++) {
        await MerchantAllocation.create({
          distributorId,
          merchantId,
          quantity: 500 * (i + 1),
          allocatedBy: distributorId,
          status: 'completed',
          transactionType: 'allocation'
        });
      }

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.recentAllocations).toBeDefined();
      expect(result.recentAllocations.length).toBeGreaterThan(0);
      expect(result.recentAllocations[0].merchantName).toBe('Test Store');
      expect(result.recentAllocations[0].quantity).toBeGreaterThan(0);
    });

    it('should handle missing balance gracefully', async () => {
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active'
      });

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.balance.totalAllocated).toBe(0);
      expect(result.balance.usedBalance).toBe(0);
      expect(result.balance.remainingBalance).toBe(0);
    });
  });

  describe('getDistributorDashboard - failure cases', () => {
    it('should return error when no active subscription exists', async () => {
      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No active subscription');
    });

    it('should handle non-existent distributor ID', async () => {
      const fakeDistributorId = new mongoose.Types.ObjectId();

      const result = await dashboardService.getDistributorDashboard(fakeDistributorId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Create subscription with null planId to cause potential error
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: new mongoose.Types.ObjectId(),
        status: 'active'
      });

      // This should handle gracefully
      const result = await dashboardService.getDistributorDashboard(distributorId);

      // Function should handle and return result
      expect(result).toBeDefined();
    });
  });

  describe('getDistributorDashboard - data accuracy', () => {
    it('should count merchants correctly', async () => {
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active'
      });

      const balance = await DistributorBalance.create({
        distributorId,
        totalAllocated: 5000
      });

      // Create allocations to same merchant
      await MerchantAllocation.create({
        distributorId,
        merchantId,
        quantity: 1000,
        allocatedBy: distributorId,
        status: 'completed',
        transactionType: 'allocation'
      });

      await MerchantAllocation.create({
        distributorId,
        merchantId,
        quantity: 500,
        allocatedBy: distributorId,
        status: 'completed',
        transactionType: 'allocation'
      });

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.merchantCount).toBeGreaterThan(0);
    });

    it('should limit recent allocations to 10', async () => {
      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: plan._id,
        status: 'active'
      });

      const balance = await DistributorBalance.create({
        distributorId,
        totalAllocated: 50000
      });

      // Create 15 allocations
      for (let i = 0; i < 15; i++) {
        await MerchantAllocation.create({
          distributorId,
          merchantId,
          quantity: 100,
          allocatedBy: distributorId,
          status: 'completed',
          transactionType: 'allocation'
        });
      }

      const result = await dashboardService.getDistributorDashboard(distributorId);

      expect(result.success).toBe(true);
      expect(result.recentAllocations.length).toBeLessThanOrEqual(10);
    });
  });
});
