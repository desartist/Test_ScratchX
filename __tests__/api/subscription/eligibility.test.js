import mongoose from 'mongoose';
import Account from '@/models/accountModel';
import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import jwtService from '@/lib/jwtService';

// Mock authMiddleware
jest.mock('@/lib/authMiddleware', () => ({
  authMiddleware: jest.fn(),
}));

// Mock connectDB
jest.mock('@/lib/connectDB', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

describe('GET /api/subscription/eligibility', () => {
  let merchantId;
  let planId;
  let testToken;
  let mockAccount;

  beforeEach(async () => {
    await Account.deleteMany({});
    await Subscription.deleteMany({});
    await SubscriptionPlan.deleteMany({});

    // Create test merchant account
    merchantId = new mongoose.Types.ObjectId();
    mockAccount = {
      _id: merchantId,
      name: 'Test Merchant',
      email: 'merchant@test.com',
      role: 'Merchant',
      status: 'active',
    };

    // Create test plan
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
    it('should return 401 if no authentication header provided', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
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

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('No Active Plan', () => {
    it('should return canCreateCampaign: false for user with no plan', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
        error: null,
      });

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.canCreateCampaign).toBe(false);
      expect(data.planRequired).toBe(true);
      expect(data.reason).toContain('plan');
    });
  });

  describe('Unlimited Scratches', () => {
    it('should return canCreateCampaign: true with UNLIMITED scratches type when valid', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
        error: null,
      });

      // Create subscription with active plan
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

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.canCreateCampaign).toBe(true);
      expect(data.scratchesType).toBe('UNLIMITED');
      expect(data.daysRemaining).toBeGreaterThan(0);
      expect(data.validUntil).toBeDefined();
    });

    it('should calculate daysRemaining correctly', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
        error: null,
      });

      // Create subscription with 5 days remaining
      const now = new Date();
      const validUntil = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

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

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.daysRemaining).toBeGreaterThanOrEqual(4);
      expect(data.daysRemaining).toBeLessThanOrEqual(5);
    });
  });

  describe('Purchased Scratches', () => {
    it('should return canCreateCampaign: true with PURCHASED scratches type', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
        error: null,
      });

      // Create subscription with scratch pack
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
        ],
      });

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.canCreateCampaign).toBe(true);
      expect(data.scratchesType).toBe('PURCHASED');
      expect(data.scratchRemaining).toBe(4000);
      expect(data.packs).toBeDefined();
      expect(data.packs.length).toBeGreaterThan(0);
    });

    it('should sum remaining scratches from multiple packs', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
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
      });

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scratchRemaining).toBe(12000);
      expect(data.packs.length).toBe(2);
    });
  });

  describe('No Scratches', () => {
    it('should return canCreateCampaign: false when unlimited scratches expired', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
        error: null,
      });

      // Create subscription with expired unlimited scratches
      const now = new Date();
      const validUntil = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

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
          validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 0,
        },
        scratchPacks: [],
      });

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.canCreateCampaign).toBe(false);
      expect(data.scratchesType).toBe('NONE');
      expect(data.ctaText).toBe('Purchase Scratches');
      expect(data.ctaUrl).toBe('/billing/scratch-packs');
    });

    it('should return canCreateCampaign: false when all scratch packs consumed', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      authMiddleware.mockResolvedValue({
        account: mockAccount,
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
      });

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.canCreateCampaign).toBe(false);
      expect(data.scratchesType).toBe('NONE');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected error', async () => {
      const { authMiddleware } = require('@/lib/authMiddleware');
      // Simulate authMiddleware throwing an error after returning
      authMiddleware.mockRejectedValue(new Error('Unexpected error'));

      const { GET } = await import('@/app/api/subscription/eligibility/route.js');
      const request = new Request('http://localhost:3000/api/subscription/eligibility');

      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });
});
