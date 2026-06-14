import mongoose from 'mongoose';
import Account from '@/models/accountModel';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';

// Mock requireAuth
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

// Mock connectDB
jest.mock('@/lib/connectDB', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

describe('GET /api/subscription/status', () => {
  let merchantId;
  let distributorId;
  let managerId;
  let planId;
  let mockMerchantAccount;
  let mockDistributorAccount;
  let mockManagerAccount;

  beforeEach(async () => {
    await Account.deleteMany({});
    await Subscription.deleteMany({});
    await SubscriptionPlan.deleteMany({});

    // Create test accounts
    merchantId = new mongoose.Types.ObjectId();
    distributorId = new mongoose.Types.ObjectId();
    managerId = new mongoose.Types.ObjectId();

    mockMerchantAccount = {
      _id: merchantId,
      name: 'Test Merchant',
      email: 'merchant@test.com',
      role: 'Merchant',
      status: 'active',
    };

    mockDistributorAccount = {
      _id: distributorId,
      name: 'Test Distributor',
      email: 'distributor@test.com',
      role: 'Distributor',
      status: 'active',
    };

    mockManagerAccount = {
      _id: managerId,
      name: 'Test Manager',
      email: 'manager@test.com',
      role: 'Manager',
      parentId: merchantId,
      status: 'active',
    };

    // Create test plans
    const planData = await SubscriptionPlan.create({
      name: 'Core',
      description: 'Core Plan',
      price: {
        monthly: 999,
        annual: 9990,
      },
      features: {
        canCreateCampaign: true,
      },
      limits: {
        maxCampaigns: 10,
        maxStores: 1,
      },
    });
    planId = planData._id;
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: null,
        error: new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header',
          }),
          { status: 401 }
        ),
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('No Active Subscription', () => {
    it('should return hasActivePlan: false when user has no subscription', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(false);
      expect(data.plan).toBeNull();
      expect(data.platformAccess).toBeNull();
      expect(data.unlimitedScratches).toBe(false);
      expect(data.remainingDays).toBeNull();
      expect(data.unlimitedScratchesExpiryDate).toBeNull();
      expect(data.scratchRemaining).toBe(0);
      expect(data.scratchPurchased).toBe(0);
      expect(data.scratchConsumed).toBe(0);
    });
  });

  describe('CORE Plan with Active Unlimited Scratches', () => {
    it('should return hasActivePlan: true with CORE plan and unlimited scratches', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 30,
        },
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.plan).toBe('Core');
      expect(data.platformAccess).toBe('LIFETIME');
      expect(data.unlimitedScratches).toBe(true);
      expect(data.remainingDays).toBeGreaterThan(0);
      expect(data.scratchRemaining).toBe('UNLIMITED');
      expect(data.unlimitedScratchesExpiryDate).toBeDefined();
      expect(data.scratchPurchased).toBe(0);
      expect(data.scratchConsumed).toBe(0);
    });

    it('should calculate remainingDays correctly', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 5,
        },
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.remainingDays).toBeGreaterThanOrEqual(4);
      expect(data.remainingDays).toBeLessThanOrEqual(5);
    });
  });

  describe('SMART Plan with Active Unlimited Scratches', () => {
    it('should return hasActivePlan: true with SMART plan', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      // Create SMART plan
      const smartPlan = await SubscriptionPlan.create({
        name: 'Smart',
        description: 'Smart Plan',
        price: {
          monthly: 1999,
          annual: 19990,
        },
        features: {
          canCreateCampaign: true,
        },
        limits: {
          maxCampaigns: -1, // unlimited
          maxStores: -1,
        },
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId: smartPlan._id,
        planType: 'SMART',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 45,
        },
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.plan).toBe('Smart');
      expect(data.platformAccess).toBe('LIFETIME');
      expect(data.unlimitedScratches).toBe(true);
    });
  });

  describe('Expired Unlimited Scratches with Purchased Scratches', () => {
    it('should return scratchRemaining from purchased packs when unlimited scratches expire', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();
      const expiredDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          validUntil: expiredDate,
          scratchValidityType: 'quarterly',
          daysRemaining: 0,
        },
        scratchPacks: [
          {
            packId: new mongoose.Types.ObjectId(),
            quantity: 5000,
            consumed: 1000,
            remaining: 4000,
            purchasedAt: now,
          },
        ],
        totalScratchesConsumed: 1000,
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.unlimitedScratches).toBe(false);
      expect(data.scratchRemaining).toBe(4000);
      expect(data.scratchPurchased).toBe(5000);
      expect(data.scratchConsumed).toBe(1000);
    });

    it('should sum scratches from multiple scratch packs', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: false,
        },
        scratchPacks: [
          {
            packId: new mongoose.Types.ObjectId(),
            quantity: 5000,
            consumed: 1000,
            remaining: 4000,
            purchasedAt: now,
          },
          {
            packId: new mongoose.Types.ObjectId(),
            quantity: 10000,
            consumed: 2000,
            remaining: 8000,
            purchasedAt: now,
          },
        ],
        totalScratchesConsumed: 3000,
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasActivePlan).toBe(true);
      expect(data.scratchRemaining).toBe(12000); // 4000 + 8000
      expect(data.scratchPurchased).toBe(15000); // 5000 + 10000
      expect(data.scratchConsumed).toBe(3000);
    });
  });

  describe('No Unlimited Scratches - Only Purchased', () => {
    it('should return hasActivePlan: true with purchased scratches only', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: false,
        },
        scratchPacks: [
          {
            packId: new mongoose.Types.ObjectId(),
            quantity: 5000,
            consumed: 500,
            remaining: 4500,
            purchasedAt: now,
          },
        ],
        totalScratchesConsumed: 500,
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.plan).toBe('Core');
      expect(data.platformAccess).toBe('LIFETIME');
      expect(data.unlimitedScratches).toBe(false);
      expect(data.remainingDays).toBeNull();
      expect(data.scratchRemaining).toBe(4500);
      expect(data.scratchPurchased).toBe(5000);
      expect(data.scratchConsumed).toBe(500);
    });
  });

  describe('No Scratches Available', () => {
    it('should return 0 scratches when all packs are consumed', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockMerchantAccount,
        error: null,
      });

      const now = new Date();

      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: false,
        },
        scratchPacks: [
          {
            packId: new mongoose.Types.ObjectId(),
            quantity: 5000,
            consumed: 5000,
            remaining: 0,
            purchasedAt: now,
          },
        ],
        totalScratchesConsumed: 5000,
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasActivePlan).toBe(true);
      expect(data.scratchRemaining).toBe(0);
      expect(data.scratchPurchased).toBe(5000);
      expect(data.scratchConsumed).toBe(5000);
    });
  });

  describe('Distributor Account', () => {
    it('should return status for distributor with ownerType: distributor', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockDistributorAccount,
        error: null,
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await Subscription.create({
        ownerId: distributorId,
        ownerType: 'distributor',
        planId,
        planType: 'SMART',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 30,
        },
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.unlimitedScratches).toBe(true);
    });
  });

  describe('Manager Account - Inherits Parent Subscription', () => {
    it('should return parent merchant subscription for manager account', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockResolvedValue({
        account: mockManagerAccount,
        error: null,
      });

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Create subscription for parent merchant
      await Subscription.create({
        ownerId: merchantId,
        ownerType: 'merchant',
        planId,
        planType: 'CORE',
        status: 'active',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 30,
        },
      });

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasActivePlan).toBe(true);
      expect(data.plan).toBe('Core');
      expect(data.unlimitedScratches).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected error', async () => {
      const { requireAuth } = require('@/lib/auth');
      requireAuth.mockRejectedValue(new Error('Unexpected error'));

      const { GET } = await import('@/app/api/subscription/status/route.js');
      const request = new Request('http://localhost:3000/api/subscription/status');

      const response = await GET(request);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error fetching subscription status');
    });
  });
});
