const mongoose = require('mongoose');
const Campaign = require('../../models/campaignModel');

describe('Campaign Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Campaign.deleteMany({});
  });

  it('should create a campaign with required fields', async () => {
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Summer Sale Campaign',
      campaignType: 'discount',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      totalQRCodes: 1000,
      discountPercentage: 20
    };

    const campaign = await Campaign.create(campaignData);

    expect(campaign).toBeDefined();
    expect(campaign.merchantId.toString()).toBe(campaignData.merchantId.toString());
    expect(campaign.name).toBe('Summer Sale Campaign');
    expect(campaign.campaignType).toBe('discount');
    expect(campaign.status).toBe('draft');
    expect(campaign.generatedQRCodes).toBe(0);
    expect(campaign.tracking.qrCodesScanned).toBe(0);
  });

  it('should enforce required fields', async () => {
    try {
      await Campaign.create({});
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.errors.merchantId).toBeDefined();
      expect(error.errors.merchantId.message).toBe('Merchant ID is required');
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toBe('Campaign name is required');
      expect(error.errors.campaignType).toBeDefined();
      expect(error.errors.campaignType.message).toContain('Campaign type is required');
      expect(error.errors.totalQRCodes).toBeDefined();
      expect(error.errors.totalQRCodes.message).toContain('Total QR codes');
    }
  });

  it('should validate endDate is after startDate', async () => {
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Invalid Campaign',
      campaignType: 'discount',
      startDate: new Date('2026-06-30'),
      endDate: new Date('2026-06-01'),
      totalQRCodes: 100
    };

    try {
      await Campaign.create(campaignData);
      fail('Should have thrown validation error for invalid dates');
    } catch (error) {
      expect(error.errors.endDate).toBeDefined();
      expect(error.errors.endDate.message).toBe('End date must be after start date');
    }
  });

  it('should set default values correctly', async () => {
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Default Campaign',
      campaignType: 'seasonal',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
      totalQRCodes: 500
    };

    const campaign = await Campaign.create(campaignData);

    expect(campaign.status).toBe('draft');
    expect(campaign.generatedQRCodes).toBe(0);
    expect(campaign.tracking.qrCodesScanned).toBe(0);
    expect(campaign.tracking.uniqueCustomers).toBe(0);
    expect(campaign.tracking.conversionRate).toBe(0);
  });

  it('should reject invalid campaignType', async () => {
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Invalid Type Campaign',
      campaignType: 'invalidType',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      totalQRCodes: 100
    };

    try {
      await Campaign.create(campaignData);
      fail('Should have thrown validation error for invalid type');
    } catch (error) {
      expect(error.errors.campaignType).toBeDefined();
    }
  });

  it('should allow same-day campaigns (startDate === endDate)', async () => {
    const today = new Date('2026-07-15');
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Same Day Campaign',
      campaignType: 'discount',
      startDate: today,
      endDate: today,
      totalQRCodes: 100,
      discountPercentage: 50
    };

    const campaign = await Campaign.create(campaignData);
    expect(campaign).toBeDefined();
    expect(campaign.startDate.getTime()).toBe(campaign.endDate.getTime());
  });

  it('should validate discount boundaries (0%, 100%)', async () => {
    // Test 0%
    const campaign0 = await Campaign.create({
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Zero Discount Campaign',
      campaignType: 'discount',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-31'),
      totalQRCodes: 100,
      discountPercentage: 0
    });
    expect(campaign0.discountPercentage).toBe(0);

    // Test 100%
    const campaign100 = await Campaign.create({
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Full Discount Campaign',
      campaignType: 'discount',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-31'),
      totalQRCodes: 100,
      discountPercentage: 100
    });
    expect(campaign100.discountPercentage).toBe(100);
  });

  it('should validate tracking boundaries (conversionRate 0-100%)', async () => {
    const campaignData = {
      merchantId: new mongoose.Types.ObjectId(),
      name: 'Tracking Campaign',
      campaignType: 'discount',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      totalQRCodes: 500,
      tracking: {
        qrCodesScanned: 250,
        uniqueCustomers: 100,
        conversionRate: 40
      }
    };

    const campaign = await Campaign.create(campaignData);
    expect(campaign.tracking.conversionRate).toBe(40);

    // Test that 100% is allowed
    campaign.tracking.conversionRate = 100;
    await campaign.save();
    expect(campaign.tracking.conversionRate).toBe(100);
  });
});
