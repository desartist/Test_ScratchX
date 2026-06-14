const mongoose = require('mongoose');
const {
  allocateScratchCardsToMerchant,
  getDistributorBalance,
} = require('@/lib/services/distributorAllocationService');
const DistributorBalance = require('@/models/distributorBalanceModel').default;
const MerchantAllocation = require('@/models/merchantAllocationModel').default;

// Helper function to create mock request
function createMockRequest(method, url, body = null, headers = {}) {
  const request = {
    method,
    url,
    json: jest.fn(async () => body),
    headers: new Map(Object.entries(headers)),
  };

  request.headers.get = (key) => headers[key] || null;

  return request;
}

describe('Admin Scratch Card Allocation API - allocateScratchCardsToMerchant', () => {
  let distributorId, merchantId, adminId;

  beforeEach(async () => {
    distributorId = new mongoose.Types.ObjectId();
    merchantId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();
  });

  describe('Successful allocation', () => {
    it('should allocate scratch cards successfully', async () => {
      // Create distributor balance
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      // Call service
      const result = await allocateScratchCardsToMerchant({
        distributorId: distributorId.toString(),
        merchantId: merchantId.toString(),
        merchantName: 'Test Merchant',
        quantity: 5000,
        allocatedBy: adminId.toString(),
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.allocation).toBeDefined();
      expect(result.allocation.quantity).toBe(5000);
      expect(result.allocation.merchantId.toString()).toEqual(merchantId.toString());
      expect(result.remaining).toBe(95000);
      expect(result.transaction).toBeDefined();
      expect(result.transaction.transactionType).toBe('allocation');
      expect(result.transaction.status).toBe('completed');
    });
  });

  describe('Input validation', () => {
    it('should reject allocation with zero quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId: distributorId.toString(),
          merchantId: merchantId.toString(),
          merchantName: 'Test Merchant',
          quantity: 0,
          allocatedBy: adminId.toString(),
        })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should reject allocation with negative quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId: distributorId.toString(),
          merchantId: merchantId.toString(),
          merchantName: 'Test Merchant',
          quantity: -100,
          allocatedBy: adminId.toString(),
        })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should reject allocation with non-integer quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId: distributorId.toString(),
          merchantId: merchantId.toString(),
          merchantName: 'Test Merchant',
          quantity: 5000.5,
          allocatedBy: adminId.toString(),
        })
      ).rejects.toThrow('Quantity must be an integer');
    });
  });

  describe('Business logic validation', () => {
    it('should reject allocation exceeding distributor balance', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 1000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId: distributorId.toString(),
          merchantId: merchantId.toString(),
          merchantName: 'Test Merchant',
          quantity: 2000,
          allocatedBy: adminId.toString(),
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should reject if distributor balance not found', async () => {
      const nonExistentDistributorId = new mongoose.Types.ObjectId();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId: nonExistentDistributorId.toString(),
          merchantId: merchantId.toString(),
          merchantName: 'Test Merchant',
          quantity: 5000,
          allocatedBy: adminId.toString(),
        })
      ).rejects.toThrow('Distributor balance not found');
    });
  });

  describe('Audit trail', () => {
    it('should create transaction record for audit trail', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      const result = await allocateScratchCardsToMerchant({
        distributorId: distributorId.toString(),
        merchantId: merchantId.toString(),
        merchantName: 'Test Merchant',
        quantity: 5000,
        allocatedBy: adminId.toString(),
      });

      // Verify transaction was created
      const transaction = await MerchantAllocation.findOne({
        distributorId: new mongoose.Types.ObjectId(distributorId),
        merchantId: new mongoose.Types.ObjectId(merchantId),
      });

      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(5000);
      expect(transaction.transactionType).toBe('allocation');
      expect(transaction.status).toBe('completed');
      expect(transaction.allocatedBy.toString()).toEqual(adminId.toString());
    });
  });
});

describe('Admin Scratch Card Allocation API - getDistributorBalance', () => {
  let distributorId, merchantId, adminId;

  beforeEach(async () => {
    distributorId = new mongoose.Types.ObjectId();
    merchantId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();
  });

  describe('GET - Retrieve balance', () => {
    it('should retrieve distributor balance and allocations', async () => {
      // Create a distributor balance with allocations
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            quantity: 10000,
            allocatedBy: adminId,
          },
        ],
      });
      await balance.save();

      const result = await getDistributorBalance(distributorId.toString());

      expect(result).toBeDefined();
      expect(result.total).toBe(100000);
      expect(result.allocated).toBe(10000);
      expect(result.remaining).toBe(90000);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].merchantName).toBe('Test Merchant');
      expect(result.allocations[0].quantity).toBe(10000);
    });

    it('should return empty allocations when none exist', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 50000,
        allocations: [],
      });
      await balance.save();

      const result = await getDistributorBalance(distributorId.toString());

      expect(result.total).toBe(50000);
      expect(result.allocated).toBe(0);
      expect(result.remaining).toBe(50000);
      expect(result.allocations).toHaveLength(0);
    });
  });

  describe('GET - Error handling', () => {
    it('should throw error when distributor not found', async () => {
      const nonExistentDistributorId = new mongoose.Types.ObjectId();

      await expect(
        getDistributorBalance(nonExistentDistributorId.toString())
      ).rejects.toThrow('Distributor balance not found');
    });
  });
});
