const mongoose = require('mongoose');
const {
  allocateScratchCardsToMerchant,
  getDistributorBalance,
  getMerchantAllocation,
  deallocateScratchCards
} = require('@/lib/services/distributorAllocationService');
const DistributorBalance = require('@/models/distributorBalanceModel').default;
const MerchantAllocation = require('@/models/merchantAllocationModel').default;

describe('Distributor Allocation Service', () => {
  let distributorId, merchantId, allocatedById;

  beforeEach(() => {
    distributorId = new mongoose.Types.ObjectId();
    merchantId = new mongoose.Types.ObjectId();
    allocatedById = new mongoose.Types.ObjectId();
  });

  describe('allocateScratchCardsToMerchant', () => {
    it('should allocate scratch cards from distributor to merchant', async () => {
      // Create distributor balance first
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      const result = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 20000,
        allocatedBy: allocatedById,
      });

      expect(result).toBeDefined();
      expect(result.allocation).toBeDefined();
      expect(result.allocation.quantity).toBe(20000);
      expect(result.allocation.merchantId.toString()).toEqual(merchantId.toString());
      expect(result.remaining).toBe(80000);
      expect(result.transaction).toBeDefined();
      expect(result.transaction.transactionType).toBe('allocation');
      expect(result.transaction.status).toBe('completed');
    });

    it('should prevent allocation exceeding balance', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 1000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId,
          merchantId,
          merchantName: 'Test Merchant',
          quantity: 2000,
          allocatedBy: allocatedById,
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should prevent allocation of zero quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 10000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId,
          merchantId,
          merchantName: 'Test Merchant',
          quantity: 0,
          allocatedBy: allocatedById,
        })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should prevent allocation of negative quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 10000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId,
          merchantId,
          merchantName: 'Test Merchant',
          quantity: -5000,
          allocatedBy: allocatedById,
        })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should prevent allocation of non-integer quantity', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 10000,
        allocations: [],
      });
      await balance.save();

      await expect(
        allocateScratchCardsToMerchant({
          distributorId,
          merchantId,
          merchantName: 'Test Merchant',
          quantity: 5000.5,
          allocatedBy: allocatedById,
        })
      ).rejects.toThrow('Quantity must be an integer');
    });

    it('should throw error if distributor balance not found', async () => {
      await expect(
        allocateScratchCardsToMerchant({
          distributorId,
          merchantId,
          merchantName: 'Test Merchant',
          quantity: 5000,
          allocatedBy: allocatedById,
        })
      ).rejects.toThrow('Distributor balance not found');
    });

    it('should update allocation if merchant already has one', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            quantity: 10000,
            allocatedBy: allocatedById,
          }
        ],
      });
      await balance.save();

      const result = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 20000,
        allocatedBy: allocatedById,
      });

      expect(result.allocation.quantity).toBe(20000);
      expect(result.remaining).toBe(80000);

      // Verify only one allocation record exists
      const updatedBalance = await DistributorBalance.findOne({ distributorId });
      expect(updatedBalance.allocations.length).toBe(1);
    });

    it('should create transaction record for audit', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      const result = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 20000,
        allocatedBy: allocatedById,
      });

      const transaction = await MerchantAllocation.findById(result.transaction._id);
      expect(transaction).toBeDefined();
      expect(transaction.distributorId.toString()).toEqual(distributorId.toString());
      expect(transaction.merchantId.toString()).toEqual(merchantId.toString());
      expect(transaction.quantity).toBe(20000);
      expect(transaction.transactionType).toBe('allocation');
      expect(transaction.allocatedBy.toString()).toEqual(allocatedById.toString());
    });
  });

  describe('getDistributorBalance', () => {
    it('should return balance with all calculations', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId: new mongoose.Types.ObjectId(),
            merchantName: 'Merchant 1',
            quantity: 20000,
            allocatedBy: allocatedById,
          },
          {
            merchantId: new mongoose.Types.ObjectId(),
            merchantName: 'Merchant 2',
            quantity: 30000,
            allocatedBy: allocatedById,
          }
        ],
      });
      await balance.save();

      const result = await getDistributorBalance(distributorId);

      expect(result).toBeDefined();
      expect(result.total).toBe(100000);
      expect(result.allocated).toBe(50000);
      expect(result.remaining).toBe(50000);
      expect(result.allocations).toHaveLength(2);
    });

    it('should return 0 allocated if no allocations', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      const result = await getDistributorBalance(distributorId);

      expect(result.total).toBe(100000);
      expect(result.allocated).toBe(0);
      expect(result.remaining).toBe(100000);
    });

    it('should throw error if balance not found', async () => {
      await expect(
        getDistributorBalance(distributorId)
      ).rejects.toThrow('Distributor balance not found');
    });
  });

  describe('getMerchantAllocation', () => {
    it('should return merchant allocation if exists', async () => {
      const merchant2Id = new mongoose.Types.ObjectId();
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            quantity: 20000,
            allocatedBy: allocatedById,
          },
          {
            merchantId: merchant2Id,
            merchantName: 'Merchant 2',
            quantity: 30000,
            allocatedBy: allocatedById,
          }
        ],
      });
      await balance.save();

      const result = await getMerchantAllocation(distributorId, merchantId);

      expect(result).toBeDefined();
      expect(result.quantity).toBe(20000);
      expect(result.merchantId.toString()).toEqual(merchantId.toString());
    });

    it('should return null if allocation does not exist', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      const result = await getMerchantAllocation(distributorId, merchantId);

      expect(result).toBeNull();
    });

    it('should throw error if balance not found', async () => {
      await expect(
        getMerchantAllocation(distributorId, merchantId)
      ).rejects.toThrow('Distributor balance not found');
    });
  });

  describe('deallocateScratchCards', () => {
    it('should deallocate scratch cards for a merchant', async () => {
      const merchant2Id = new mongoose.Types.ObjectId();
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            quantity: 20000,
            allocatedBy: allocatedById,
          },
          {
            merchantId: merchant2Id,
            merchantName: 'Merchant 2',
            quantity: 30000,
            allocatedBy: allocatedById,
          }
        ],
      });
      await balance.save();

      const result = await deallocateScratchCards(
        distributorId,
        merchantId,
        allocatedById
      );

      expect(result).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.transaction.transactionType).toBe('revocation');
      expect(result.transaction.status).toBe('completed');

      // Verify allocation removed from balance
      const updatedBalance = await DistributorBalance.findOne({ distributorId });
      expect(updatedBalance.allocations.length).toBe(1);
      expect(updatedBalance.allocations[0].merchantId.toString()).toEqual(merchant2Id.toString());
    });

    it('should throw error if allocation does not exist', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      await expect(
        deallocateScratchCards(distributorId, merchantId, allocatedById)
      ).rejects.toThrow('Allocation not found');
    });

    it('should throw error if balance not found', async () => {
      await expect(
        deallocateScratchCards(distributorId, merchantId, allocatedById)
      ).rejects.toThrow('Distributor balance not found');
    });

    it('should create revocation transaction record', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            quantity: 20000,
            allocatedBy: allocatedById,
          }
        ],
      });
      await balance.save();

      const result = await deallocateScratchCards(
        distributorId,
        merchantId,
        allocatedById
      );

      const transaction = await MerchantAllocation.findById(result.transaction._id);
      expect(transaction).toBeDefined();
      expect(transaction.transactionType).toBe('revocation');
      expect(transaction.quantity).toBe(20000);
      expect(transaction.allocatedBy.toString()).toEqual(allocatedById.toString());
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple allocations and deallocations', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      // First allocation
      const result1 = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 20000,
        allocatedBy: allocatedById,
      });

      expect(result1.remaining).toBe(80000);

      // Second allocation to different merchant
      const merchant2Id = new mongoose.Types.ObjectId();
      const result2 = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId: merchant2Id,
        merchantName: 'Merchant 2',
        quantity: 30000,
        allocatedBy: allocatedById,
      });

      expect(result2.remaining).toBe(50000);

      // Check balance
      const balanceCheck = await getDistributorBalance(distributorId);
      expect(balanceCheck.total).toBe(100000);
      expect(balanceCheck.allocated).toBe(50000);
      expect(balanceCheck.remaining).toBe(50000);

      // Deallocate first merchant
      await deallocateScratchCards(distributorId, merchantId, allocatedById);

      // Check updated balance
      const finalBalance = await getDistributorBalance(distributorId);
      expect(finalBalance.allocated).toBe(30000);
      expect(finalBalance.remaining).toBe(70000);
    });

    it('should allow re-allocation to same merchant', async () => {
      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [],
      });
      await balance.save();

      // First allocation
      await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 20000,
        allocatedBy: allocatedById,
      });

      // Re-allocate to same merchant with new quantity
      const result = await allocateScratchCardsToMerchant({
        distributorId,
        merchantId,
        merchantName: 'Test Merchant',
        quantity: 30000,
        allocatedBy: allocatedById,
      });

      expect(result.allocation.quantity).toBe(30000);
      expect(result.remaining).toBe(70000);

      // Verify only one allocation record
      const updatedBalance = await DistributorBalance.findOne({ distributorId });
      expect(updatedBalance.allocations.length).toBe(1);
    });
  });
});
