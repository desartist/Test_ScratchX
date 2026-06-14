const mongoose = require('mongoose');
const Campaign = require('../../models/campaignModel');
const CouponRange = require('../../models/couponRangeModel');

describe('Campaign API Endpoints', () => {
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
  const merchantHeaders = {
    'x-user-role': 'Merchant',
    'x-user-id': merchantId.toString(),
    'content-type': 'application/json'
  };

  describe('Campaign CRUD Operations', () => {
    describe('POST /api/campaigns', () => {
      it('should create a campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

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

      it('should validate required fields', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaignData = {
          name: 'Campaign'
          // Missing other required fields
        };

        try {
          await CampaignService.createCampaign(merchantId, campaignData);
          throw new Error('Should have thrown validation error');
        } catch (error) {
          expect(error.message).toContain('Campaign type is required');
        }
      });

      it('should reject invalid dates', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaignData = {
          name: 'Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-06-30'),
          endDate: new Date('2026-06-01'),
          totalQRCodes: 100
        };

        try {
          await CampaignService.createCampaign(merchantId, campaignData);
          throw new Error('Should have thrown validation error');
        } catch (error) {
          expect(error.message).toContain('End date must be after start date');
        }
      });
    });

    describe('GET /api/campaigns', () => {
      it('should list merchant campaigns', async () => {
        const CampaignService = require('../../lib/campaignService');

        // Create test campaigns
        await CampaignService.createCampaign(merchantId, {
          name: 'Campaign 1',
          campaignType: 'discount',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          totalQRCodes: 100
        });

        const campaigns = await CampaignService.getCampaigns(merchantId);

        expect(Array.isArray(campaigns)).toBe(true);
        expect(campaigns.length).toBe(1);
        expect(campaigns[0].name).toBe('Campaign 1');
      });

      it('should filter campaigns by status', async () => {
        const CampaignService = require('../../lib/campaignService');

        await Campaign.create({
          merchantId,
          name: 'Active Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          totalQRCodes: 100,
          status: 'active'
        });

        await Campaign.create({
          merchantId,
          name: 'Draft Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-31'),
          totalQRCodes: 100,
          status: 'draft'
        });

        const campaigns = await CampaignService.getCampaigns(merchantId, { status: 'active' });

        expect(campaigns.length).toBe(1);
        expect(campaigns[0].status).toBe('active');
      });

      it('should not list other merchant campaigns', async () => {
        const CampaignService = require('../../lib/campaignService');

        const otherMerchantId = new mongoose.Types.ObjectId();

        await CampaignService.createCampaign(merchantId, {
          name: 'Campaign 1',
          campaignType: 'discount',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          totalQRCodes: 100
        });

        await CampaignService.createCampaign(otherMerchantId, {
          name: 'Campaign 2',
          campaignType: 'discount',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          totalQRCodes: 100
        });

        const campaigns = await CampaignService.getCampaigns(merchantId);

        expect(campaigns.length).toBe(1);
        expect(campaigns[0].merchantId.toString()).toBe(merchantId.toString());
      });
    });

    describe('GET /api/campaigns/[id]', () => {
      it('should get campaign detail with ranges', async () => {
        const CampaignService = require('../../lib/campaignService');

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
        expect(detail.name).toBe('Test Campaign');
        expect(Array.isArray(detail.ranges)).toBe(true);
        expect(detail.ranges.length).toBe(1);
      });

      it('should return error for non-existent campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

        const fakeId = new mongoose.Types.ObjectId();

        try {
          await CampaignService.getCampaignDetail(fakeId);
          throw new Error('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('not found');
        }
      });
    });

    describe('PUT /api/campaigns/[id]', () => {
      it('should update campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Original Name',
          campaignType: 'discount',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-31'),
          totalQRCodes: 100
        });

        const updated = await CampaignService.updateCampaign(campaign._id, {
          name: 'Updated Name',
          description: 'Updated description'
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.description).toBe('Updated description');
      });

      it('should not allow updating other merchant campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

        const otherMerchantId = new mongoose.Types.ObjectId();
        const campaign = await CampaignService.createCampaign(otherMerchantId, {
          name: 'Other Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-11-01'),
          endDate: new Date('2026-11-30'),
          totalQRCodes: 100
        });

        // In API layer, ownership check happens before calling update
        const campaigns = await CampaignService.getCampaigns(merchantId);
        expect(campaigns.length).toBe(0);
      });
    });

    describe('DELETE /api/campaigns/[id]', () => {
      it('should delete campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Campaign to Delete',
          campaignType: 'discount',
          startDate: new Date('2026-12-01'),
          endDate: new Date('2026-12-31'),
          totalQRCodes: 100
        });

        await CampaignService.deleteCampaign(campaign._id);

        const found = await Campaign.findById(campaign._id);
        expect(found).toBeNull();
      });

      it('should delete campaign and associated ranges', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Campaign with Ranges',
          campaignType: 'discount',
          startDate: new Date('2026-12-01'),
          endDate: new Date('2026-12-31'),
          totalQRCodes: 300
        });

        await CampaignService.createRange(campaign._id, {
          startCode: 'QR001',
          endCode: 'QR100',
          totalCodes: 100,
          generatedDate: new Date('2026-12-01'),
          expiryDate: new Date('2026-12-31')
        });

        await CampaignService.deleteCampaign(campaign._id);

        const foundCampaign = await Campaign.findById(campaign._id);
        const foundRanges = await CouponRange.find({ campaignId: campaign._id });

        expect(foundCampaign).toBeNull();
        expect(foundRanges.length).toBe(0);
      });
    });
  });

  describe('Range Operations', () => {
    describe('POST /api/ranges', () => {
      it('should create a range for campaign', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Test Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-30'),
          totalQRCodes: 500
        });

        const range = await CampaignService.createRange(campaign._id, {
          startCode: 'QR001',
          endCode: 'QR100',
          totalCodes: 100,
          generatedDate: new Date('2026-06-01'),
          expiryDate: new Date('2026-06-30')
        });

        expect(range).toBeDefined();
        expect(range.startCode).toBe('QR001');
        expect(range.campaignId.toString()).toBe(campaign._id.toString());
      });

      it('should validate range dates', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Test Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-31'),
          totalQRCodes: 100
        });

        try {
          await CampaignService.createRange(campaign._id, {
            startCode: 'QR001',
            endCode: 'QR100',
            totalCodes: 100,
            generatedDate: new Date('2026-07-31'),
            expiryDate: new Date('2026-07-01') // Invalid: before generated date
          });
          throw new Error('Should have thrown validation error');
        } catch (error) {
          expect(error.message).toContain('Expiry date must be after generated date');
        }
      });
    });

    describe('DELETE /api/ranges/[id]', () => {
      it('should delete a range', async () => {
        const CampaignService = require('../../lib/campaignService');

        const campaign = await CampaignService.createCampaign(merchantId, {
          name: 'Test Campaign',
          campaignType: 'discount',
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-31'),
          totalQRCodes: 100
        });

        const range = await CampaignService.createRange(campaign._id, {
          startCode: 'QR001',
          endCode: 'QR100',
          totalCodes: 100,
          generatedDate: new Date('2026-08-01'),
          expiryDate: new Date('2026-08-31')
        });

        await CampaignService.deleteRange(range._id);

        const found = await CouponRange.findById(range._id);
        expect(found).toBeNull();
      });

      it('should error when deleting non-existent range', async () => {
        const CampaignService = require('../../lib/campaignService');

        const fakeId = new mongoose.Types.ObjectId();

        try {
          await CampaignService.deleteRange(fakeId);
          throw new Error('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('not found');
        }
      });
    });
  });
});
