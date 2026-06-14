const mongoose = require('mongoose');
const CouponRange = require('../../models/couponRangeModel');

describe('CouponRange Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await CouponRange.deleteMany({});
  });

  it('should create a coupon range with required fields', async () => {
    const rangeData = {
      campaignId: new mongoose.Types.ObjectId(),
      startCode: 'QR001',
      endCode: 'QR100',
      totalCodes: 100,
      generatedDate: new Date('2026-06-01'),
      expiryDate: new Date('2026-06-30')
    };

    const range = await CouponRange.create(rangeData);

    expect(range).toBeDefined();
    expect(range.campaignId.toString()).toBe(rangeData.campaignId.toString());
    expect(range.startCode).toBe('QR001');
    expect(range.endCode).toBe('QR100');
    expect(range.totalCodes).toBe(100);
    expect(range.usedCodes).toBe(0);
    expect(range.status).toBe('active');
    expect(range.tracking.codesScanned).toBe(0);
    expect(range.tracking.uniqueScans).toBe(0);
  });

  it('should enforce required fields', async () => {
    try {
      await CouponRange.create({});
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.errors).toBeDefined();
    }
  });

  it('should validate expiryDate is after generatedDate', async () => {
    const rangeData = {
      campaignId: new mongoose.Types.ObjectId(),
      startCode: 'QR001',
      endCode: 'QR100',
      totalCodes: 100,
      generatedDate: new Date('2026-06-30'),
      expiryDate: new Date('2026-06-01')
    };

    try {
      await CouponRange.create(rangeData);
      fail('Should have thrown validation error for invalid dates');
    } catch (error) {
      expect(error.errors.expiryDate).toBeDefined();
    }
  });

  it('should set default values correctly', async () => {
    const rangeData = {
      campaignId: new mongoose.Types.ObjectId(),
      startCode: 'QR001',
      endCode: 'QR100',
      totalCodes: 100,
      generatedDate: new Date('2026-07-01'),
      expiryDate: new Date('2026-07-31')
    };

    const range = await CouponRange.create(rangeData);

    expect(range.usedCodes).toBe(0);
    expect(range.status).toBe('active');
    expect(range.tracking.codesScanned).toBe(0);
    expect(range.tracking.uniqueScans).toBe(0);
    expect(range.tracking.lastScannedDate).toBeNull();
  });

  it('should reject invalid status', async () => {
    const rangeData = {
      campaignId: new mongoose.Types.ObjectId(),
      startCode: 'QR001',
      endCode: 'QR100',
      totalCodes: 100,
      generatedDate: new Date('2026-08-01'),
      expiryDate: new Date('2026-08-31'),
      status: 'invalidStatus'
    };

    try {
      await CouponRange.create(rangeData);
      fail('Should have thrown validation error for invalid status');
    } catch (error) {
      expect(error.errors.status).toBeDefined();
    }
  });

  it('should validate usedCodes does not exceed totalCodes', async () => {
    const rangeData = {
      campaignId: new mongoose.Types.ObjectId(),
      startCode: 'QR001',
      endCode: 'QR100',
      totalCodes: 100,
      usedCodes: 150,
      generatedDate: new Date('2026-09-01'),
      expiryDate: new Date('2026-09-30')
    };

    try {
      await CouponRange.create(rangeData);
      fail('Should have thrown validation error for usedCodes > totalCodes');
    } catch (error) {
      expect(error.errors.usedCodes).toBeDefined();
    }
  });
});
