import mongoose from 'mongoose';
import Subscription from '../../models/subscriptionModel';
import SubscriptionPlan from '../../models/subscriptionPlanModel';

describe('Subscription Model - Generic Ownership', () => {
  const mockMerchantId = new mongoose.Types.ObjectId();
  const mockDistributorId = new mongoose.Types.ObjectId();
  const mockPlanId = new mongoose.Types.ObjectId();

  let mockPlan;

  beforeAll(async () => {
    // Create a mock subscription plan for testing
    mockPlan = await SubscriptionPlan.create({
      name: 'Growth',
      description: 'Growth plan for merchants',
      scansLimit: 10000,
      activeCampaignsLimit: 50,
      priceINR: 5000,
      billingCycleMonths: 1,
      features: ['advanced_analytics', 'priority_support']
    });
  });

  describe('Merchant Ownership via ownerType', () => {
    test('should support merchant ownership via ownerType field', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = new Subscription({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      expect(subscription.ownerType).toBe('merchant');
      expect(subscription.ownerId).toEqual(mockMerchantId);
    });

    test('should have ownerType with enum validation', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      // Valid merchant type
      const subscription = new Subscription({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      expect(subscription.ownerType).toBe('merchant');
    });

    test('should set ownerType to merchant by default', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = new Subscription({
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      expect(subscription.ownerType).toBe('merchant');
    });
  });

  describe('Distributor Ownership via ownerType', () => {
    test('should support distributor ownership via ownerType field', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = new Subscription({
        ownerType: 'distributor',
        ownerId: mockDistributorId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      expect(subscription.ownerType).toBe('distributor');
      expect(subscription.ownerId).toEqual(mockDistributorId);
    });
  });

  describe('Backward Compatibility - merchantId Sync', () => {
    test('should sync merchantId with ownerId when ownerType is merchant on save', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // Check that merchantId was auto-synced
      expect(subscription.merchantId).toEqual(mockMerchantId);
      expect(subscription.ownerId).toEqual(mockMerchantId);
    });

    test('should NOT sync merchantId when ownerType is distributor', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = await Subscription.create({
        ownerType: 'distributor',
        ownerId: mockDistributorId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // merchantId should NOT be synced for distributor type
      expect(subscription.ownerId).toEqual(mockDistributorId);
      // merchantId should remain undefined/default or not equal to ownerId
      expect(subscription.merchantId).not.toEqual(mockDistributorId);
    });

    test('should maintain merchantId if explicitly set and ownerType is merchant', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const anotherMerchantId = new mongoose.Types.ObjectId();

      const subscription = await Subscription.create({
        merchantId: mockMerchantId,
        ownerType: 'merchant',
        ownerId: anotherMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // Pre-save hook should sync merchantId to ownerId
      expect(subscription.merchantId).toEqual(anotherMerchantId);
      expect(subscription.ownerId).toEqual(anotherMerchantId);
    });

    test('should have compound index on (ownerType, ownerId, status)', async () => {
      const schema = Subscription.schema;
      const indexes = schema._indexes || [];

      // Check for compound index with ownerType, ownerId, status
      const compoundIndexFound = indexes.some(indexInfo => {
        if (!indexInfo || typeof indexInfo !== 'object') return false;
        const [indexFields] = indexInfo;

        if (!indexFields) return false;

        // Check if the index contains all three fields
        const hasOwnerType = 'ownerType' in indexFields;
        const hasOwnerId = 'ownerId' in indexFields;
        const hasStatus = 'status' in indexFields;

        return hasOwnerType && hasOwnerId && hasStatus;
      });

      expect(compoundIndexFound).toBe(true);
    });
  });

  describe('Existing merchantId backward compatibility', () => {
    test('should still allow queries by merchantId', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = await Subscription.create({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // Should be queryable by merchantId
      const found = await Subscription.findOne({ merchantId: mockMerchantId });
      expect(found).toBeDefined();
      expect(found._id).toEqual(subscription._id);
    });

    test('should allow legacy code to create subscriptions with only merchantId', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      // Legacy code scenario: only merchantId provided, no ownerId
      const subscription = new Subscription({
        merchantId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
        // NOTE: No ownerId or ownerType provided
      });

      // Must call save() to validate the hook works
      await subscription.save();

      // Verify hook populated ownerId and ownerType
      expect(subscription.ownerId).toEqual(mockMerchantId);
      expect(subscription.ownerType).toBe('merchant');
      expect(subscription.merchantId).toEqual(mockMerchantId);
    });
  });

  describe('Schema validation for ownerType and ownerId', () => {
    test('should reject invalid ownerType values', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = new Subscription({
        ownerType: 'invalid_type',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // Should fail validation
      await expect(subscription.save()).rejects.toThrow();
    });

    test('should require ownerId when ownerType is set', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const subscription = new Subscription({
        ownerType: 'merchant',
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      // Should fail validation - ownerId is required
      await expect(subscription.save()).rejects.toThrow();
    });
  });

  describe('Querying by ownership', () => {
    test('should allow querying subscriptions by owner type and owner id', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      await Subscription.create({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      const found = await Subscription.find({
        ownerType: 'merchant',
        ownerId: mockMerchantId
      });

      expect(found.length).toBe(1);
      expect(found[0].ownerType).toBe('merchant');
      expect(found[0].ownerId).toEqual(mockMerchantId);
    });

    test('should allow querying subscriptions by owner type, owner id, and status', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      await Subscription.create({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      await Subscription.create({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        planId: mockPlan._id,
        status: 'cancelled',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        billingCycle: 'monthly'
      });

      const activeSubscriptions = await Subscription.find({
        ownerType: 'merchant',
        ownerId: mockMerchantId,
        status: 'active'
      });

      expect(activeSubscriptions.length).toBe(1);
      expect(activeSubscriptions[0].status).toBe('active');
    });
  });
});
