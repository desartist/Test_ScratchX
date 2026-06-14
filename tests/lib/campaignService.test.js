const mongoose = require('mongoose');
const CampaignService = require('../../lib/campaignService');
const Campaign = require('../../models/campaignModel');
const CouponRange = require('../../models/couponRangeModel');

describe('Campaign Service', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Campaign.deleteMany({});
    await CouponRange.deleteMany({});
  });

  const merchantId = new mongoose.Types.ObjectId();

  describe('Campaign Operations', () => {
    it('should create a campaign', async () => {
      const campaignData = {
        name: 'Summer Sale',
        campaignType: 'discount',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        totalQRCodes: 1000,
        discountPercentage: 20
      };

      const campaign = await CampaignService.createCampaign(merchantId, campaignData);

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Summer Sale');
      expect(campaign.merchantId.toString()).toBe(merchantId.toString());
    });

    it('should throw error for invalid dates', async () => {
      const campaignData = {
        name: 'Invalid Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-06-30'),
        endDate: new Date('2026-06-01'),
        totalQRCodes: 100
      };

      try {
        await CampaignService.createCampaign(merchantId, campaignData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('End date must be after start date');
      }
    });

    it('should get campaigns for merchant', async () => {
      const campaign1 = await CampaignService.createCampaign(merchantId, {
        name: 'Campaign 1',
        campaignType: 'discount',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        totalQRCodes: 100
      });

      const campaign2 = await CampaignService.createCampaign(merchantId, {
        name: 'Campaign 2',
        campaignType: 'seasonal',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-31'),
        totalQRCodes: 200
      });

      const campaigns = await CampaignService.getCampaigns(merchantId);

      expect(campaigns.length).toBe(2);
      expect(campaigns[0].name).toBe('Campaign 2'); // Most recent first
    });

    it('should get campaign detail with ranges', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Test Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-31'),
        totalQRCodes: 300
      });

      await CampaignService.createRange(campaign._id, {
        startCode: 'QR001',
        endCode: 'QR100',
        totalCodes: 100,
        generatedDate: new Date('2026-08-01'),
        expiryDate: new Date('2026-08-31')
      });

      const detail = await CampaignService.getCampaignDetail(campaign._id);

      expect(detail).toBeDefined();
      expect(detail.ranges).toBeDefined();
      expect(detail.ranges.length).toBe(1);
    });

    it('should update campaign', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Original Name',
        campaignType: 'discount',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-30'),
        totalQRCodes: 100
      });

      const updated = await CampaignService.updateCampaign(campaign._id, {
        name: 'Updated Name',
        description: 'New description'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
    });

    it('should delete campaign and associated ranges', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Campaign to Delete',
        campaignType: 'discount',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
        totalQRCodes: 100
      });

      await CampaignService.createRange(campaign._id, {
        startCode: 'QR001',
        endCode: 'QR100',
        totalCodes: 100,
        generatedDate: new Date('2026-10-01'),
        expiryDate: new Date('2026-10-31')
      });

      await CampaignService.deleteCampaign(campaign._id);

      const campaigns = await Campaign.find({ _id: campaign._id });
      const ranges = await CouponRange.find({ campaignId: campaign._id });

      expect(campaigns.length).toBe(0);
      expect(ranges.length).toBe(0);
    });
  });

  describe('Range Operations', () => {
    it('should create a range for campaign', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Test Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-30'),
        totalQRCodes: 500
      });

      const rangeData = {
        startCode: 'QR001',
        endCode: 'QR100',
        totalCodes: 100,
        generatedDate: new Date('2026-11-01'),
        expiryDate: new Date('2026-11-30')
      };

      const range = await CampaignService.createRange(campaign._id, rangeData);

      expect(range).toBeDefined();
      expect(range.campaignId.toString()).toBe(campaign._id.toString());
      expect(range.startCode).toBe('QR001');
    });

    it('should get ranges for campaign', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Test Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-31'),
        totalQRCodes: 1000
      });

      await CampaignService.createRange(campaign._id, {
        startCode: 'QR001',
        endCode: 'QR100',
        totalCodes: 100,
        generatedDate: new Date('2026-12-01'),
        expiryDate: new Date('2026-12-31')
      });

      await CampaignService.createRange(campaign._id, {
        startCode: 'QR101',
        endCode: 'QR200',
        totalCodes: 100,
        generatedDate: new Date('2026-12-01'),
        expiryDate: new Date('2026-12-31')
      });

      const ranges = await CampaignService.getRanges(campaign._id);

      expect(ranges.length).toBe(2);
    });

    it('should delete a range', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Test Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        totalQRCodes: 100
      });

      const range = await CampaignService.createRange(campaign._id, {
        startCode: 'QR001',
        endCode: 'QR100',
        totalCodes: 100,
        generatedDate: new Date('2026-06-01'),
        expiryDate: new Date('2026-06-30')
      });

      await CampaignService.deleteRange(range._id);

      const found = await CouponRange.findById(range._id);
      expect(found).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('should validate campaign dates', () => {
      const validStart = new Date('2026-06-01');
      const validEnd = new Date('2026-06-30');
      const invalidEnd = new Date('2026-05-01');

      expect(CampaignService.validateCampaignDates(validStart, validEnd)).toBe(true);
      expect(CampaignService.validateCampaignDates(validStart, invalidEnd)).toBe(false);
    });

    it('should calculate range metrics', () => {
      const range = {
        totalCodes: 100,
        usedCodes: 30,
        tracking: {
          codesScanned: 25
        }
      };

      const metrics = CampaignService.calculateRangeMetrics(range);

      expect(metrics.totalCodes).toBe(100);
      expect(metrics.usedCodes).toBe(30);
      expect(metrics.usagePercentage).toBe(30);
      expect(metrics.codesScanned).toBe(25);
    });

    it('should check if campaign can generate QR codes', () => {
      const campaignCan = { totalQRCodes: 100, generatedQRCodes: 50 };
      const campaignCannot = { totalQRCodes: 100, generatedQRCodes: 100 };

      expect(CampaignService.canGenerateQRCodes(campaignCan)).toBe(true);
      expect(CampaignService.canGenerateQRCodes(campaignCannot)).toBe(false);
    });

    it('should allow same-day campaigns and ranges', () => {
      const sameDay = new Date('2026-06-15');
      expect(CampaignService.validateCampaignDates(sameDay, sameDay)).toBe(true);
    });

    it('should calculate metrics with missing tracking object', () => {
      const range = {
        totalCodes: 100,
        usedCodes: 25,
        tracking: null
      };

      const metrics = CampaignService.calculateRangeMetrics(range);
      expect(metrics.codesScanned).toBe(0);
      expect(metrics.usagePercentage).toBe(25);
    });

    it('should handle partial date update in updateCampaign', async () => {
      const campaign = await CampaignService.createCampaign(merchantId, {
        name: 'Test Campaign',
        campaignType: 'discount',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        totalQRCodes: 100
      });

      const updated = await CampaignService.updateCampaign(campaign._id, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.endDate.getTime()).toBe(campaign.endDate.getTime());
    });

    it('should throw error with context when campaign not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      try {
        await CampaignService.getCampaignDetail(fakeId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain(fakeId.toString());
        expect(error.message).toContain('not found');
      }
    });

    it('should return empty array for ranges of non-existent campaign', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ranges = await CampaignService.getRanges(fakeId);
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBe(0);
    });
  });
});
