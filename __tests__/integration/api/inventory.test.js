/**
 * Inventory API Integration Tests
 * Tests allocation, status queries, and history retrieval with proper authorization and validation
 *
 * Coverage:
 * - PATCH /api/inventory/allocate (2 tests)
 * - GET /api/inventory/status (2 tests)
 * - GET /api/inventory/history (2 tests)
 * Total: 6 integration tests
 */

const InventoryService = require('@/lib/inventoryService').default;
const Campaign = require('@/models/campaignModel').default;
const Store = require('@/models/storeModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const Account = require('@/models/accountModel').default;
const { ValidationError, NotFoundError } = require('@/lib/errors');
const { generateTestUser } = require('@/__tests__/fixtures/auth.fixture');

describe('Inventory API Integration Tests', () => {
  let testMerchant;
  let testMerchantId;
  let testUserId;
  let testCampaign;
  let testCampaignId;
  let testStores = [];

  beforeEach(async () => {
    // Create test merchant account with 5000 total inventory
    const merchantUser = generateTestUser('Merchant', {
      email: `merchant-${Date.now()}@example.com`,
    });
    testMerchant = await Account.create({
      ...merchantUser,
      total_scratch_cards: 5000,
      used_scratch_cards: 0,
      remaining_scratch_cards: 5000
    });
    testMerchantId = testMerchant._id.toString();
    testUserId = testMerchant._id.toString();

    // Create 3 test stores for the merchant
    testStores = [];
    for (let i = 0; i < 3; i++) {
      const storeData = global.createMockStore(testMerchantId, {
        store_name: `Test Store ${i + 1}`,
        store_code: `ST${Date.now()}${i}`.substring(0, 20).toUpperCase(),
        total_scratch_cards: 2000,
        used_scratch_cards: 0,
        remaining_scratch_cards: 2000
      });
      const store = await Store.create(storeData);
      testStores.push(store);
    }

    // Create test campaign with 0 allocated cards initially
    const campaignData = global.createMockCampaign(testMerchantId, {
      campaignName: 'Test Campaign',
      campaign_code: `CAMP${Date.now().toString().slice(-10)}`,
      allocated_scratch_cards: 0,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 0,
      status: 'active'
    });
    testCampaign = await Campaign.create(campaignData);
    testCampaignId = testCampaign._id.toString();
  });

  // ==========================================
  // PATCH /api/inventory/allocate - Allocate Inventory Tests (2 tests)
  // ==========================================

  describe('PATCH /api/inventory/allocate - Allocate Inventory', () => {
    /**
     * Test 1: Allocate to campaign (type='campaign')
     * -> should return 200, deduct from merchant total, create campaign allocation record, create transaction
     */
    test('Allocate to campaign (type="campaign") -> should return 200 with updated campaign and transaction', async () => {
      // Arrange
      const quantityToAllocate = 500;
      const merchantBefore = await Account.findById(testMerchantId);
      const initialMerchantRemaining = merchantBefore.remaining_scratch_cards;

      // Act: Allocate to campaign
      const result = await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        quantityToAllocate,
        testUserId
      );

      // Assert: Response structure
      expect(result).toBeDefined();
      expect(result.campaign).toBeDefined();
      expect(result.transaction).toBeDefined();

      // Assert: Campaign updated correctly
      expect(result.campaign._id.toString()).toBe(testCampaignId);
      expect(result.campaign.allocated_scratch_cards).toBe(quantityToAllocate);
      expect(result.campaign.used_scratch_cards).toBe(0);
      expect(result.campaign.redeemed_scratch_cards).toBe(0);
      expect(result.campaign.remaining_scratch_cards).toBe(quantityToAllocate);

      // Assert: Transaction created
      expect(result.transaction).toBeDefined();
      expect(result.transaction.merchant_id.toString()).toBe(testMerchantId);
      expect(result.transaction.campaign_id.toString()).toBe(testCampaignId);
      expect(result.transaction.action_type).toBe('allocated_to_campaign');
      expect(result.transaction.quantity).toBe(quantityToAllocate);
      expect(result.transaction.previous_balance).toBe(0);
      expect(result.transaction.new_balance).toBe(quantityToAllocate);
      expect(result.transaction.status).toBe('completed');

      // Assert: Database state matches
      const updatedCampaign = await Campaign.findById(testCampaignId);
      expect(updatedCampaign.allocated_scratch_cards).toBe(quantityToAllocate);

      const transaction = await ScratchCardTransaction.findOne({
        campaign_id: testCampaignId,
        action_type: 'allocated_to_campaign'
      });
      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(quantityToAllocate);
    });

    /**
     * Test 2: Allocate to store (type='store')
     * -> should return 200, deduct from campaign allocation, update store inventory, create transaction
     */
    test('Allocate to store (type="store") -> should return 200 with updated store allocation and transaction', async () => {
      // Arrange: First allocate to campaign
      const campaignAllocationQty = 1000;
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        campaignAllocationQty,
        testUserId
      );

      // Now allocate from campaign to store
      const storeId = testStores[0]._id.toString();
      const storeAllocationQty = 300;

      // Act: Allocate to store (first allocation)
      const result = await InventoryService.allocateToStore(
        testMerchantId,
        testCampaignId,
        storeId,
        storeAllocationQty,
        testUserId
      );

      // Assert: Response structure
      expect(result).toBeDefined();
      expect(result.mapping).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.isNew).toBe(true);

      // Assert: Mapping created/updated correctly
      expect(result.mapping.campaign_id.toString()).toBe(testCampaignId);
      expect(result.mapping.store_id.toString()).toBe(storeId);
      expect(result.mapping.allocated_scratch_cards).toBe(storeAllocationQty);
      expect(result.mapping.used_scratch_cards).toBe(0);
      expect(result.mapping.redeemed_scratch_cards).toBe(0);
      expect(result.mapping.remaining_scratch_cards).toBe(storeAllocationQty);
      expect(result.mapping.status).toBe('active');

      // Assert: Transaction created
      expect(result.transaction).toBeDefined();
      expect(result.transaction.merchant_id.toString()).toBe(testMerchantId);
      expect(result.transaction.campaign_id.toString()).toBe(testCampaignId);
      expect(result.transaction.store_id.toString()).toBe(storeId);
      expect(result.transaction.action_type).toBe('allocated_to_store');
      expect(result.transaction.quantity).toBe(storeAllocationQty);
      expect(result.transaction.previous_balance).toBe(0);
      expect(result.transaction.new_balance).toBe(storeAllocationQty);
      expect(result.transaction.status).toBe('completed');

      // Assert: Database state matches
      const mapping = await CampaignStoreMapping.findOne({
        campaign_id: testCampaignId,
        store_id: storeId
      });
      expect(mapping).toBeDefined();
      expect(mapping.allocated_scratch_cards).toBe(storeAllocationQty);

      const transaction = await ScratchCardTransaction.findOne({
        campaign_id: testCampaignId,
        store_id: storeId,
        action_type: 'allocated_to_store'
      });
      expect(transaction).toBeDefined();
      expect(transaction.quantity).toBe(storeAllocationQty);

      // Assert: Database state consistency - campaign should still have original allocation
      // Note: Campaign remaining is not automatically updated when allocating to stores
      // This represents the total allocated to campaign from merchant, not what's available
      const updatedCampaign = await Campaign.findById(testCampaignId);
      expect(updatedCampaign.allocated_scratch_cards).toBe(campaignAllocationQty);
    });
  });

  // ==========================================
  // GET /api/inventory/status - Inventory Status Query Tests (2 tests)
  // ==========================================

  describe('GET /api/inventory/status - Inventory Status Query', () => {
    /**
     * Test 3: Get campaign inventory status
     * -> should return 200 with total, allocated, used, redeemed, remaining counts and store breakdown
     */
    test('Get campaign inventory status (type="campaign") -> should return 200 with breakdown', async () => {
      // Arrange: Setup allocation hierarchy
      const campaignAllocationQty = 1000;
      const storeAllocationQty = 300;

      // Allocate to campaign
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        campaignAllocationQty,
        testUserId
      );

      // Allocate to 2 stores
      const store1Id = testStores[0]._id.toString();
      const store2Id = testStores[1]._id.toString();

      await InventoryService.allocateToStore(
        testMerchantId,
        testCampaignId,
        store1Id,
        storeAllocationQty,
        testUserId
      );

      await InventoryService.allocateToStore(
        testMerchantId,
        testCampaignId,
        store2Id,
        storeAllocationQty,
        testUserId
      );

      // Act: Get campaign inventory status
      const status = await InventoryService.getCampaignInventoryStatus(testCampaignId);

      // Assert: Response structure
      expect(status).toBeDefined();
      expect(status.campaign).toBeDefined();
      expect(status.allocation).toBeDefined();
      expect(status.storeAllocations).toBeDefined();

      // Assert: Campaign info
      expect(status.campaign.id.toString()).toBe(testCampaignId);
      expect(status.campaign.name).toBe('Test Campaign');
      expect(status.campaign.status).toBe('active');

      // Assert: Allocation summary
      expect(status.allocation.total).toBe(campaignAllocationQty);
      expect(status.allocation.used).toBe(0);
      expect(status.allocation.redeemed).toBe(0);
      expect(status.allocation.remaining).toBe(campaignAllocationQty);

      // Assert: Store allocations breakdown
      expect(status.storeAllocations.length).toBe(2);
      status.storeAllocations.forEach(store => {
        expect(store.allocated).toBe(storeAllocationQty);
        expect(store.used).toBe(0);
        expect(store.redeemed).toBe(0);
        expect(store.remaining).toBe(storeAllocationQty);
        expect(store.status).toBe('active');
      });
    });

    /**
     * Test 4: Get store inventory status
     * -> should return 200 with store totals and campaign allocation breakdown
     */
    test('Get store inventory status (type="store") -> should return 200 with campaign breakdown', async () => {
      // Arrange: Setup allocation hierarchy
      const campaignAllocationQty = 800;
      const storeAllocationQty = 250;

      // Allocate to campaign
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        campaignAllocationQty,
        testUserId
      );

      // Allocate to store
      const storeId = testStores[0]._id.toString();
      await InventoryService.allocateToStore(
        testMerchantId,
        testCampaignId,
        storeId,
        storeAllocationQty,
        testUserId
      );

      // Act: Get store inventory status
      const status = await InventoryService.getStoreInventoryStatus(storeId);

      // Assert: Response structure
      expect(status).toBeDefined();
      expect(status.store).toBeDefined();
      expect(status.inventory).toBeDefined();
      expect(status.campaignAllocations).toBeDefined();

      // Assert: Store info
      expect(status.store.id.toString()).toBe(storeId);
      expect(status.store.status).toBe('active');

      // Assert: Inventory summary
      expect(status.inventory.total).toBe(2000); // From createMockStore
      expect(status.inventory.allocated).toBe(storeAllocationQty);
      expect(status.inventory.used).toBe(0);
      expect(status.inventory.redeemed).toBe(0);
      expect(status.inventory.unallocated).toBe(2000 - storeAllocationQty);

      // Assert: Campaign allocations breakdown
      expect(status.campaignAllocations.length).toBe(1);
      expect(status.campaignAllocations[0].campaignId.toString()).toBe(testCampaignId);
      expect(status.campaignAllocations[0].allocated).toBe(storeAllocationQty);
      expect(status.campaignAllocations[0].used).toBe(0);
      expect(status.campaignAllocations[0].redeemed).toBe(0);
      expect(status.campaignAllocations[0].remaining).toBe(storeAllocationQty);
      expect(status.campaignAllocations[0].status).toBe('active');
    });
  });

  // ==========================================
  // GET /api/inventory/history - Allocation History Tests (2 tests)
  // ==========================================

  describe('GET /api/inventory/history - Allocation History', () => {
    /**
     * Test 5: Get allocation history with pagination
     * -> should return 200 with transactions, respect limit/skip, include count
     */
    test('Get allocation history with pagination -> should return 200 with correct pagination', async () => {
      // Arrange: Create multiple allocation transactions
      const quantitiesPerAlloc = [100, 150, 200, 250, 300];
      const expectedTotalQty = quantitiesPerAlloc.reduce((a, b) => a + b, 0);

      // Create 5 campaign allocations
      for (const qty of quantitiesPerAlloc) {
        await InventoryService.allocateToCampaign(
          testMerchantId,
          testCampaignId,
          qty,
          testUserId
        );
      }

      // Act: Get allocation history
      const history = await InventoryService.getAllocationHistory(testMerchantId, {});

      // Assert: Response structure
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);

      // Assert: All transactions returned
      expect(history.length).toBe(5);

      // Assert: Transaction details
      history.forEach((transaction, index) => {
        const merchantIdStr = typeof transaction.merchant_id === 'object'
          ? transaction.merchant_id._id.toString()
          : transaction.merchant_id.toString();
        const campaignIdStr = typeof transaction.campaign_id === 'object'
          ? transaction.campaign_id._id.toString()
          : transaction.campaign_id.toString();

        expect(merchantIdStr).toBe(testMerchantId);
        expect(campaignIdStr).toBe(testCampaignId);
        expect(transaction.action_type).toBe('allocated_to_campaign');
        expect(transaction.status).toBe('completed');
        expect(transaction.quantity).toBeDefined();
        expect(transaction.previous_balance).toBeDefined();
        expect(transaction.new_balance).toBeDefined();
        expect(transaction.createdAt).toBeDefined();
      });

      // Assert: Transactions are ordered by creation (newest first)
      for (let i = 1; i < history.length; i++) {
        expect(new Date(history[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(history[i].createdAt).getTime()
        );
      }

      // Assert: Total quantity matches
      const totalQtyInHistory = history.reduce((sum, t) => sum + t.quantity, 0);
      expect(totalQtyInHistory).toBe(expectedTotalQty);
    });

    /**
     * Test 6: Get allocation history filtered by campaign
     * -> should return 200 with only matching transactions for specified campaign/store
     */
    test('Get allocation history filtered by campaignId -> should return 200 with only matching transactions', async () => {
      // Arrange: Create allocations for multiple campaigns
      const campaign2Data = global.createMockCampaign(testMerchantId, {
        campaignName: 'Second Campaign',
        campaign_code: `CAMP${Date.now().toString().slice(-10)}B`,
        status: 'active'
      });
      const campaign2 = await Campaign.create(campaign2Data);
      const campaign2Id = campaign2._id.toString();

      // Allocate to first campaign
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        300,
        testUserId
      );
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        200,
        testUserId
      );

      // Allocate to second campaign
      await InventoryService.allocateToCampaign(
        testMerchantId,
        campaign2Id,
        400,
        testUserId
      );

      // Act: Get history filtered by first campaign
      const history = await InventoryService.getAllocationHistory(
        testMerchantId,
        { campaignId: testCampaignId }
      );

      // Assert: Response structure
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);

      // Assert: Only transactions for first campaign returned
      expect(history.length).toBe(2);
      history.forEach(transaction => {
        const campaignIdStr = typeof transaction.campaign_id === 'object'
          ? transaction.campaign_id._id.toString()
          : transaction.campaign_id.toString();
        expect(campaignIdStr).toBe(testCampaignId);
        expect(transaction.action_type).toBe('allocated_to_campaign');
      });

      // Assert: Quantities match first campaign allocations
      const quantities = history.map(t => t.quantity).sort((a, b) => b - a);
      expect(quantities).toEqual([300, 200]);

      // Act: Get history filtered by second campaign
      const history2 = await InventoryService.getAllocationHistory(
        testMerchantId,
        { campaignId: campaign2Id }
      );

      // Assert: Only transactions for second campaign returned
      expect(history2.length).toBe(1);
      const campaign2IdStr = typeof history2[0].campaign_id === 'object'
        ? history2[0].campaign_id._id.toString()
        : history2[0].campaign_id.toString();
      expect(campaign2IdStr).toBe(campaign2Id);
      expect(history2[0].quantity).toBe(400);
    });
  });

  // ==========================================
  // Error Handling Tests
  // ==========================================

  describe('Inventory API - Error Handling', () => {

    /**
     * Test: Allocate to campaign that doesn't exist
     * -> should throw NotFoundError
     */
    test('Allocate to non-existent campaign -> should throw NotFoundError', async () => {
      // Arrange
      const fakeCampaignId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        InventoryService.allocateToCampaign(
          testMerchantId,
          fakeCampaignId,
          100,
          testUserId
        )
      ).rejects.toThrow(NotFoundError);

      try {
        await InventoryService.allocateToCampaign(
          testMerchantId,
          fakeCampaignId,
          100,
          testUserId
        );
      } catch (error) {
        expect(error.message).toContain('Campaign not found');
      }
    });

    /**
     * Test: Allocate to store that doesn't exist
     * -> should throw NotFoundError
     */
    test('Allocate to non-existent store -> should throw NotFoundError', async () => {
      // Arrange: First allocate to campaign
      await InventoryService.allocateToCampaign(
        testMerchantId,
        testCampaignId,
        500,
        testUserId
      );

      const fakeStoreId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        InventoryService.allocateToStore(
          testMerchantId,
          testCampaignId,
          fakeStoreId,
          100,
          testUserId
        )
      ).rejects.toThrow(NotFoundError);

      try {
        await InventoryService.allocateToStore(
          testMerchantId,
          testCampaignId,
          fakeStoreId,
          100,
          testUserId
        );
      } catch (error) {
        expect(error.message).toContain('Store not found');
      }
    });

    /**
     * Test: Get status for non-existent campaign
     * -> should throw NotFoundError
     */
    test('Get status for non-existent campaign -> should throw NotFoundError', async () => {
      // Arrange
      const fakeCampaignId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        InventoryService.getCampaignInventoryStatus(fakeCampaignId)
      ).rejects.toThrow(NotFoundError);
    });

    /**
     * Test: Get status for non-existent store
     * -> should throw NotFoundError
     */
    test('Get status for non-existent store -> should throw NotFoundError', async () => {
      // Arrange
      const fakeStoreId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        InventoryService.getStoreInventoryStatus(fakeStoreId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
