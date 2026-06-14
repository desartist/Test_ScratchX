import mongoose from 'mongoose';
import Subscription from '../../../../models/subscriptionModel';
import SubscriptionPlan from '../../../../models/subscriptionPlanModel';
import SubscriptionUsage from '../../../../models/subscriptionUsageModel';
import DistributorBalance from '../../../../models/distributorBalanceModel';
import { assignPlanToOwner, getPlanForOwner } from '../../../../lib/services/planAssignmentService';

describe('Admin Subscription Assignment API', () => {
  let merchantId;
  let distributorId;
  let planId;
  let planData;

  beforeEach(async () => {
    // Clean up
    await Subscription.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await SubscriptionUsage.deleteMany({});
    await DistributorBalance.deleteMany({});

    // Create test data
    merchantId = new mongoose.Types.ObjectId();
    distributorId = new mongoose.Types.ObjectId();

    // Create a test plan
    planData = await SubscriptionPlan.create({
      name: 'Growth',
      description: 'Growth subscription plan',
      trialDurationDays: 30,
      limits: {
        maxStores: 10,
        maxCampaigns: 50,
        maxScratchCardsPerMonth: 10000
      }
    });
    planId = planData._id;
  });

  describe('assignPlanToOwner Service', () => {
    it('should assign plan to merchant successfully', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.subscription.ownerType).toBe('merchant');
      expect(result.subscription.ownerId.toString()).toBe(merchantId.toString());
      expect(result.subscription.status).toBe('active');
      expect(result.plan.name).toBe('Growth');
    });

    it('should assign plan to distributor with balance', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(true);
      expect(result.subscription.ownerType).toBe('distributor');
      expect(result.balance).toBeDefined();
      expect(result.balance.distributorId.toString()).toBe(distributorId.toString());
      expect(result.balance.totalAllocated).toBe(planData.limits.maxScratchCardsPerMonth);
    });

    it('should validate ownerType is required', async () => {
      const result = await assignPlanToOwner({
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ownerType is required');
    });

    it('should validate ownerId is required', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ownerId is required');
    });

    it('should validate planId is required', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('planId is required');
    });

    it('should validate planCode is required', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('planCode is required');
    });

    it('should reject invalid ownerType', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'invalid',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ownerType');
    });

    it('should verify plan exists before assignment', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: fakeId,
        planCode: 'Growth'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Plan not found');
    });

    it('should verify plan code matches plan name', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'WrongCode'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Plan code mismatch');
    });

    it('should cancel existing active subscriptions before assigning new plan', async () => {
      // Create first subscription
      const firstResult = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      const firstSubscriptionId = firstResult.subscription._id;

      // Assign a second plan
      const secondResult = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      // Check that first subscription is cancelled
      const cancelledSub = await Subscription.findById(firstSubscriptionId);
      expect(cancelledSub.status).toBe('cancelled');
      expect(cancelledSub.cancelledAt).toBeDefined();

      // Check that new subscription is active
      const activeSub = await Subscription.findById(secondResult.subscription._id);
      expect(activeSub.status).toBe('active');
    });

    it('should create usage record with initial metrics', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      const usage = result.usage;
      expect(usage.subscriptionId.toString()).toBe(result.subscription._id.toString());
      expect(usage.merchantId.toString()).toBe(merchantId.toString());
      expect(usage.metrics.totalStoresCreated).toBe(0);
      expect(usage.metrics.activeCampaigns).toBe(0);
      expect(usage.metrics.apiCallsUsed).toBe(0);
      expect(usage.isActive).toBe(true);
    });

    it('should calculate correct end date based on trial duration', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      const subscription = result.subscription;
      const startDate = new Date(subscription.currentPeriodStart);
      const endDate = new Date(subscription.currentPeriodEnd);

      // Should be approximately 30 days (trialDurationDays)
      const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('should use default 365 days when no trial duration specified', async () => {
      // Create plan without trial duration
      const planNoTrial = await SubscriptionPlan.create({
        name: 'Starter',
        description: 'Starter plan without trial',
        trialDurationDays: 0,
        limits: {
          maxStores: 5
        }
      });

      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planNoTrial._id,
        planCode: 'Starter'
      });

      const subscription = result.subscription;
      const startDate = new Date(subscription.currentPeriodStart);
      const endDate = new Date(subscription.currentPeriodEnd);

      const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(365);
    });

    it('should create subscription with correct billing cycle', async () => {
      const result = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      expect(result.subscription.billingCycle).toBe('annual');
    });
  });

  describe('getPlanForOwner Service', () => {
    it('should retrieve current plan for merchant', async () => {
      // First assign a plan
      await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Growth'
      });

      // Then retrieve it
      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.subscription.ownerType).toBe('merchant');
      expect(result.plan.name).toBe('Growth');
    });

    it('should retrieve current plan for distributor', async () => {
      // First assign a plan
      await assignPlanToOwner({
        ownerType: 'distributor',
        ownerId: distributorId,
        planId: planId,
        planCode: 'Growth'
      });

      // Then retrieve it
      const result = await getPlanForOwner('distributor', distributorId);

      expect(result.subscription).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.subscription.ownerType).toBe('distributor');
    });

    it('should return null for owner with no plan', async () => {
      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeNull();
      expect(result.plan).toBeNull();
      expect(result.usage).toBeNull();
    });

    it('should only return active subscriptions', async () => {
      // Create a cancelled subscription directly
      await Subscription.create({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId,
        status: 'cancelled',
        billingCycle: 'annual',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });

      const result = await getPlanForOwner('merchant', merchantId);

      expect(result.subscription).toBeNull();
    });

    it('should handle missing owner gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await getPlanForOwner('merchant', fakeId);

      expect(result.subscription).toBeNull();
      expect(result.plan).toBeNull();
      expect(result.usage).toBeNull();
    });
  });
});
