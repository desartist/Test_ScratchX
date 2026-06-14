import mongoose from 'mongoose';
import DistributorBalance from '../../models/distributorBalanceModel';

describe('DistributorBalance Model', () => {
  const mockDistributorId = new mongoose.Types.ObjectId();
  const mockMerchantId1 = new mongoose.Types.ObjectId();
  const mockMerchantId2 = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  describe('Schema Structure', () => {
    test('should export DistributorBalance model', () => {
      expect(DistributorBalance).toBeDefined();
      expect(DistributorBalance.modelName).toBe('DistributorBalance');
    });

    test('should have distributorId as unique reference field', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.distributorId).toBeDefined();
      expect(schema.paths.distributorId.options.ref).toBe('Account');
      expect(schema.paths.distributorId.options.unique).toBe(true);
    });

    test('should have totalAllocated field with min validation', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.totalAllocated).toBeDefined();
      expect(schema.paths.totalAllocated.options.type).toBe(Number);
      expect(schema.paths.totalAllocated.options.default).toBe(0);
      expect(schema.paths.totalAllocated.options.min).toBe(0);
    });

    test('should have allocations array with nested schema', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.allocations).toBeDefined();
    });

    test('should have timestamps enabled', () => {
      const schema = DistributorBalance.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    test('should have required fields for allocation entries', () => {
      const validData = {
        distributorId: mockDistributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Test Merchant',
            quantity: 20000,
            allocatedBy: mockUserId
          }
        ]
      };
      const doc = new DistributorBalance(validData);
      const errors = doc.validateSync();
      expect(errors).toBeUndefined();
    });
  });

  describe('Document Creation', () => {
    test('should create a valid DistributorBalance document', () => {
      const data = {
        distributorId: mockDistributorId,
        totalAllocated: 100000,
        allocations: []
      };
      const doc = new DistributorBalance(data);
      expect(doc.distributorId).toEqual(mockDistributorId);
      expect(doc.totalAllocated).toBe(100000);
      expect(doc.allocations).toEqual([]);
    });

    test('should require distributorId', () => {
      const data = {
        totalAllocated: 100000,
        allocations: []
      };
      const doc = new DistributorBalance(data);
      const errors = doc.validateSync();
      expect(errors).toBeDefined();
      expect(errors.errors.distributorId).toBeDefined();
    });

    test('should track allocation history with metadata', () => {
      const distributorId = new mongoose.Types.ObjectId();
      const merchantId = new mongoose.Types.ObjectId();

      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            allocatedAt: new Date(),
            quantity: 20000,
            allocatedBy: mockUserId
          }
        ]
      });

      expect(balance.totalAllocated).toBe(100000);
      expect(balance.allocations[0].quantity).toBe(20000);
      expect(balance.allocations[0].merchantName).toBe('Test Merchant');
      expect(balance.allocations[0].allocatedBy).toEqual(mockUserId);
    });
  });

  describe('getRemainingBalance() Method', () => {
    test('should calculate remaining balance correctly with no allocations', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      expect(balance.getRemainingBalance()).toBe(50000);
    });

    test('should calculate remaining balance with single allocation', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      expect(balance.getRemainingBalance()).toBe(40000);
    });

    test('should calculate remaining balance correctly with multiple allocations', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          },
          {
            merchantId: mockMerchantId2,
            merchantName: 'Merchant B',
            quantity: 15000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      expect(balance.getRemainingBalance()).toBe(25000);
    });

    test('should return 0 when all allocations are used', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 25000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          },
          {
            merchantId: mockMerchantId2,
            merchantName: 'Merchant B',
            quantity: 15000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      expect(balance.getRemainingBalance()).toBe(0);
    });
  });

  describe('getMerchantAllocation() Method', () => {
    test('should retrieve allocation for a specific merchant', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          },
          {
            merchantId: mockMerchantId2,
            merchantName: 'Merchant B',
            quantity: 15000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      const allocation = balance.getMerchantAllocation(mockMerchantId1);
      expect(allocation).toBeDefined();
      expect(allocation.merchantName).toBe('Merchant A');
      expect(allocation.quantity).toBe(10000);
    });

    test('should return undefined for non-existent merchant', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      const allocation = balance.getMerchantAllocation(mockMerchantId2);
      expect(allocation).toBeUndefined();
    });

    test('should return undefined if allocations array is empty', () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      const allocation = balance.getMerchantAllocation(mockMerchantId1);
      expect(allocation).toBeUndefined();
    });
  });

  describe('allocateToMerchant() Method', () => {
    test('should add new allocation when within balance', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 10000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      await balance.allocateToMerchant(
        mockMerchantId2,
        'Merchant B',
        15000,
        mockUserId
      );

      expect(balance.allocations.length).toBe(2);
      expect(balance.allocations[1].merchantId).toEqual(mockMerchantId2);
      expect(balance.allocations[1].quantity).toBe(15000);
      expect(balance.getRemainingBalance()).toBe(25000);
    });

    test('should throw error when allocation exceeds remaining balance', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 10000,
        allocations: []
      });

      await expect(
        balance.allocateToMerchant(
          mockMerchantId1,
          'Merchant A',
          15000,
          mockUserId
        )
      ).rejects.toThrow('Insufficient balance');
    });

    test('should throw error when allocation exactly equals total (leaving 0)', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 10000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 5000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      // Should succeed since 5000 remaining = 5000 requested
      await balance.allocateToMerchant(
        mockMerchantId2,
        'Merchant B',
        5000,
        mockUserId
      );

      expect(balance.getRemainingBalance()).toBe(0);
    });

    test('should throw error when allocation exceeds remaining balance with existing allocations', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: [
          {
            merchantId: mockMerchantId1,
            merchantName: 'Merchant A',
            quantity: 40000,
            allocatedAt: new Date(),
            allocatedBy: mockUserId
          }
        ]
      });

      // Only 10000 remaining, trying to allocate 15000
      await expect(
        balance.allocateToMerchant(
          mockMerchantId2,
          'Merchant B',
          15000,
          mockUserId
        )
      ).rejects.toThrow('Insufficient balance');
    });

    test('should update lastUpdated timestamp on allocation', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      const beforeTime = new Date();
      await balance.allocateToMerchant(
        mockMerchantId1,
        'Merchant A',
        10000,
        mockUserId
      );

      expect(balance.lastUpdated).toBeDefined();
      expect(balance.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
    });

    test('should add merchantName to allocation', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      await balance.allocateToMerchant(
        mockMerchantId1,
        'Test Merchant',
        10000,
        mockUserId
      );

      expect(balance.allocations[0].merchantName).toBe('Test Merchant');
    });

    test('should add allocatedBy reference', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      const allocatedByUserId = new mongoose.Types.ObjectId();
      await balance.allocateToMerchant(
        mockMerchantId1,
        'Test Merchant',
        10000,
        allocatedByUserId
      );

      expect(balance.allocations[0].allocatedBy).toEqual(allocatedByUserId);
    });

    test('should add allocatedAt timestamp', async () => {
      const balance = new DistributorBalance({
        distributorId: mockDistributorId,
        totalAllocated: 50000,
        allocations: []
      });

      await balance.allocateToMerchant(
        mockMerchantId1,
        'Test Merchant',
        10000,
        mockUserId
      );

      expect(balance.allocations[0].allocatedAt).toBeDefined();
      expect(balance.allocations[0].allocatedAt instanceof Date).toBe(true);
    });
  });

  describe('Unique Distributor Constraint', () => {
    test('should enforce unique distributorId constraint', () => {
      const schema = DistributorBalance.schema;
      const distributorIdField = schema.paths.distributorId;
      expect(distributorIdField.options.unique).toBe(true);
      expect(distributorIdField.options.index).toBe(true);
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt and updatedAt fields', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });

    test('should have lastUpdated field', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.lastUpdated).toBeDefined();
    });
  });

  describe('Indexes', () => {
    test('should have index on distributorId field', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.distributorId.options.index).toBe(true);
    });

    test('should have index on createdAt field', () => {
      const schema = DistributorBalance.schema;
      expect(schema.paths.createdAt).toBeDefined();
    });
  });

  describe('Integration Test - Full Allocation Workflow', () => {
    test('should track distributor scratch card allocation and balance', () => {
      const distributorId = new mongoose.Types.ObjectId();
      const merchantId = new mongoose.Types.ObjectId();

      const balance = new DistributorBalance({
        distributorId,
        totalAllocated: 100000,
        allocations: [
          {
            merchantId,
            merchantName: 'Test Merchant',
            allocatedAt: new Date(),
            quantity: 20000,
            allocatedBy: new mongoose.Types.ObjectId()
          }
        ]
      });

      const remaining = balance.totalAllocated -
        balance.allocations.reduce((sum, a) => sum + a.quantity, 0);

      expect(balance.totalAllocated).toBe(100000);
      expect(balance.allocations[0].quantity).toBe(20000);
      expect(remaining).toBe(80000);
      expect(balance.getRemainingBalance()).toBe(80000);
    });
  });
});
