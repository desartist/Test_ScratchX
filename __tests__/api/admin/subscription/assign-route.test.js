import mongoose from 'mongoose';
import Subscription from '../../../../models/subscriptionModel';
import SubscriptionPlan from '../../../../models/subscriptionPlanModel';
import SubscriptionUsage from '../../../../models/subscriptionUsageModel';
import DistributorBalance from '../../../../models/distributorBalanceModel';

// Mock the auth module
jest.mock('../../../../lib/adminAuth', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ role: 'Super_Admin' })
}));

// Mock the connectDB module
jest.mock('../../../../lib/connectDB', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined)
}));

describe('POST /api/admin/subscription/assign', () => {
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
      name: 'Professional',
      description: 'Professional subscription plan',
      trialDurationDays: 30,
      limits: {
        maxStores: 20,
        maxCampaigns: 100,
        maxScratchCardsPerMonth: 50000
      }
    });
    planId = planData._id;
  });

  it('should validate required fields in request body', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    // Mock request with missing ownerType
    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerId: merchantId,
        planId: planId,
        planCode: 'Professional'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('ownerType');
  });

  it('should validate ownerType values', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'invalid',
        ownerId: merchantId,
        planId: planId,
        planCode: 'Professional'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid ownerType');
  });

  it('should require ownerId', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'merchant',
        planId: planId,
        planCode: 'Professional'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('ownerId');
  });

  it('should require planId', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'merchant',
        ownerId: merchantId,
        planCode: 'Professional'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('planId');
  });

  it('should require planCode', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: planId
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('planCode');
  });

  it('should return 400 for service-level errors', async () => {
    const { POST } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign', {
      method: 'POST',
      body: JSON.stringify({
        ownerType: 'merchant',
        ownerId: merchantId,
        planId: new mongoose.Types.ObjectId(),
        planCode: 'Professional'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Plan not found');
  });
});

describe('GET /api/admin/subscription/assign', () => {
  let merchantId;
  let planId;
  let planData;

  beforeEach(async () => {
    // Clean up
    await Subscription.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await SubscriptionUsage.deleteMany({});

    // Create test data
    merchantId = new mongoose.Types.ObjectId();

    // Create a test plan
    planData = await SubscriptionPlan.create({
      name: 'Enterprise',
      description: 'Enterprise subscription plan',
      trialDurationDays: 30,
      limits: {
        maxStores: -1,
        maxCampaigns: -1,
        maxScratchCardsPerMonth: -1
      }
    });
    planId = planData._id;
  });

  it('should require ownerType query parameter', async () => {
    const { GET } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign?ownerId=123');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('ownerType');
  });

  it('should require ownerId query parameter', async () => {
    const { GET } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign?ownerType=merchant');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('ownerId');
  });

  it('should validate ownerType query parameter', async () => {
    const { GET } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request('http://localhost:3000/api/admin/subscription/assign?ownerType=invalid&ownerId=123');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid ownerType');
  });

  it('should return null when no plan is assigned', async () => {
    const { GET } = await import('../../../../app/api/admin/subscription/assign/route.js');

    const request = new Request(`http://localhost:3000/api/admin/subscription/assign?ownerType=merchant&ownerId=${merchantId}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.subscription).toBeNull();
    expect(data.plan).toBeNull();
    expect(data.usage).toBeNull();
  });
});
