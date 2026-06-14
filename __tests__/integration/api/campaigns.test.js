/**
 * Campaigns API Integration Tests
 * Tests campaign assignment to stores, inventory allocation, and campaign details retrieval
 *
 * This tests the service layer which is used by the API routes,
 * ensuring the business logic is correct for campaign operations.
 */

const CampaignService = require('@/lib/campaignService').default;
const Campaign = require('@/models/campaignModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError } = require('@/lib/errors');
const { generateTestUser } = require('@/__tests__/fixtures/auth.fixture');

describe('Campaigns API Integration Tests', () => {
  let testMerchant;
  let testMerchantId;
  let testUserId;
  let testCampaign;
  let testCampaignId;
  let testStores = [];

  beforeEach(async () => {
    // Create test merchant account
    const merchantUser = generateTestUser('Merchant', {
      email: `merchant-${Date.now()}@example.com`,
    });
    testMerchant = await Account.create(merchantUser);
    testMerchantId = testMerchant._id.toString();
    testUserId = testMerchant._id.toString();

    // Create 3 test stores for the merchant
    testStores = [];
    for (let i = 0; i < 3; i++) {
      const storeData = global.createMockStore(testMerchantId, {
        store_name: `Test Store ${i + 1}`,
        store_code: `ST${Date.now()}${i}`.substring(0, 20).toUpperCase()
      });
      const store = await Store.create(storeData);
      testStores.push(store);
    }

    // Create test campaign with 1000 allocated cards
    const campaignData = global.createMockCampaign(testMerchantId, {
      campaignName: 'Test Campaign',
      campaign_code: `CAMP${Date.now().toString().slice(-10)}`,
      allocated_scratch_cards: 1000,
      remaining_scratch_cards: 1000,
      status: 'active'
    });
    testCampaign = await Campaign.create(campaignData);
    testCampaignId = testCampaign._id.toString();
  });

  // ==========================================
  // POST /api/campaigns/:campaignId/assign - Assign Campaign to Stores Tests (5 tests)
  // ==========================================

  describe('POST /api/campaigns/:campaignId/assign - Assign Campaign to Stores', () => {
    /**
     * Test 1: Assign campaign to multiple stores
     * -> should return 200, create CampaignStoreMapping entries for each store, allocate inventory
     */
    test('Assign campaign to multiple stores -> should return 200 with mappings and allocations', async () => {
      // Arrange
      const storeIds = testStores.slice(0, 2).map(s => s._id.toString());
      const quantityPerStore = 100;

      // Act
      const result = await CampaignService.assignCampaignToStores(
        testCampaignId,
        storeIds,
        quantityPerStore,
        testUserId
      );

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(0);

      // Assert - CampaignStoreMapping created for each store
      for (const storeId of storeIds) {
        const mapping = await CampaignStoreMapping.findOne({
          campaign_id: testCampaignId,
          store_id: storeId
        });
        expect(mapping).toBeDefined();
        expect(mapping.allocated_scratch_cards).toBe(quantityPerStore);
        expect(mapping.used_scratch_cards).toBe(0);
        expect(mapping.redeemed_scratch_cards).toBe(0);
        expect(mapping.remaining_scratch_cards).toBe(quantityPerStore);
        expect(mapping.status).toBe('active');
        expect(mapping.merchant_id.toString()).toBe(testMerchantId);
      }

      // Assert - Transaction records created for allocations
      for (const storeId of storeIds) {
        const transaction = await ScratchCardTransaction.findOne({
          campaign_id: testCampaignId,
          store_id: storeId,
          action_type: 'allocated_to_store'
        });
        expect(transaction).toBeDefined();
        expect(transaction.quantity).toBe(quantityPerStore);
        expect(transaction.merchant_id.toString()).toBe(testMerchantId);
      }
    });

    /**
     * Test 2: Assign campaign that doesn't exist
     * -> should return 404 with "Campaign not found"
     */
    test('Assign campaign that doesn\'t exist -> should return 404 with "Campaign not found"', async () => {
      // Arrange
      const fakeCampaignId = global.generateTestId().toString();
      const storeIds = [testStores[0]._id.toString()];
      const quantityPerStore = 100;

      // Act & Assert
      await expect(
        CampaignService.assignCampaignToStores(
          fakeCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        )
      ).rejects.toThrow(NotFoundError);

      try {
        await CampaignService.assignCampaignToStores(
          fakeCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        );
      } catch (error) {
        expect(error.message).toContain('Campaign not found');
      }
    });

    /**
     * Test 3: Assign to stores not owned by merchant
     * -> should return 400 with "All stores must belong to campaign merchant"
     */
    test('Assign to stores not owned by merchant -> should return 400 with ownership error', async () => {
      // Arrange - Create another merchant and store
      const otherMerchantUser = generateTestUser('Merchant', {
        email: `merchant-other-${Date.now()}@example.com`,
      });
      const otherMerchant = await Account.create(otherMerchantUser);
      const otherStoreData = global.createMockStore(otherMerchant._id.toString());
      const otherStore = await Store.create(otherStoreData);

      const storeIds = [otherStore._id.toString()];
      const quantityPerStore = 100;

      // Act & Assert
      await expect(
        CampaignService.assignCampaignToStores(
          testCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        )
      ).rejects.toThrow(ValidationError);

      try {
        await CampaignService.assignCampaignToStores(
          testCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        );
      } catch (error) {
        expect(error.message).toContain('must belong to campaign merchant');
      }
    });

    /**
     * Test 4: Assign exceeds available inventory
     * -> should return 400 with "Insufficient inventory" and no partial assignment
     */
    test('Assign exceeds available inventory -> should return 400 with "Insufficient inventory"', async () => {
      // Arrange
      const storeIds = testStores.map(s => s._id.toString()); // 3 stores
      const quantityPerStore = 400; // 3 * 400 = 1200 > 1000 available
      const totalNeeded = storeIds.length * quantityPerStore;

      // Act & Assert
      await expect(
        CampaignService.assignCampaignToStores(
          testCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        )
      ).rejects.toThrow(ValidationError);

      try {
        await CampaignService.assignCampaignToStores(
          testCampaignId,
          storeIds,
          quantityPerStore,
          testUserId
        );
      } catch (error) {
        expect(error.message).toContain('insufficient allocation');
      }

      // Assert - Verify NO mappings were created (no partial assignment)
      const mappings = await CampaignStoreMapping.find({
        campaign_id: testCampaignId
      });
      expect(mappings.length).toBe(0);
    });

    /**
     * Test 5: Prevent duplicate assignment
     * -> assigning same campaign to same store twice should return 400 with "Campaign already assigned"
     */
    test('Prevent duplicate assignment -> assigning same campaign to same store twice should return 400', async () => {
      // Arrange
      const storeId = testStores[0]._id.toString();
      const quantityPerStore = 100;

      // Act - First assignment (should succeed)
      const firstResult = await CampaignService.assignCampaignToStores(
        testCampaignId,
        [storeId],
        quantityPerStore,
        testUserId
      );

      expect(firstResult.summary.success).toBe(1);
      expect(firstResult.summary.failed).toBe(0);

      // Verify mapping was created
      const mapping1 = await CampaignStoreMapping.findOne({
        campaign_id: testCampaignId,
        store_id: storeId
      });
      expect(mapping1).toBeDefined();

      // Act & Assert - Second assignment (should fail with duplicate error)
      const secondResult = await CampaignService.assignCampaignToStores(
        testCampaignId,
        [storeId],
        quantityPerStore,
        testUserId
      );

      // The result should indicate failure for the duplicate attempt
      expect(secondResult.summary.success).toBe(0);
      expect(secondResult.summary.failed).toBe(1);
      expect(secondResult.failed[0].error).toContain('already assigned');
    });
  });

  // ==========================================
  // GET /api/campaigns/:campaignId - Get Campaign Details Tests (3 tests)
  // ==========================================

  describe('GET /api/campaigns/:campaignId - Get Campaign Details', () => {
    /**
     * Test 6: Get existing campaign
     * -> should return 200 with campaign details, include allocation array with store breakdown
     */
    test('Get existing campaign -> should return 200 with campaign details and allocations', async () => {
      // Arrange - First assign campaign to stores
      const storeIds = testStores.slice(0, 2).map(s => s._id.toString());
      const quantityPerStore = 100;

      await CampaignService.assignCampaignToStores(
        testCampaignId,
        storeIds,
        quantityPerStore,
        testUserId
      );

      // Act
      const detail = await CampaignService.getCampaignDetail(testCampaignId);

      // Assert - Campaign details
      expect(detail).toBeDefined();
      expect(detail._id.toString()).toBe(testCampaignId);
      expect(detail.campaignName).toBe('Test Campaign');
      expect(detail.merchantId).toBeDefined();
      expect(detail.status).toBe('active');

      // Assert - Store allocations array
      expect(detail.storeAllocations).toBeDefined();
      expect(Array.isArray(detail.storeAllocations)).toBe(true);
      expect(detail.storeAllocations.length).toBe(2);

      // Assert - Each allocation has required fields
      detail.storeAllocations.forEach(allocation => {
        expect(allocation.allocated_scratch_cards).toBe(quantityPerStore);
        expect(allocation.used_scratch_cards).toBe(0);
        expect(allocation.redeemed_scratch_cards).toBe(0);
        expect(allocation.remaining_scratch_cards).toBe(quantityPerStore);
        expect(allocation.store_id).toBeDefined();
        expect(allocation.storeName).toBeDefined();
        expect(allocation.storeCode).toBeDefined();
      });
    });

    /**
     * Test 7: Get campaign with multiple store assignments
     * -> should return allocations showing each store's allocated amount
     */
    test('Get campaign with multiple store assignments -> should return allocations per store', async () => {
      // Arrange - Assign to all 3 stores with different quantities
      const quantities = [100, 200, 150]; // Different quantities per store

      for (let i = 0; i < testStores.length; i++) {
        await CampaignService.assignCampaignToStores(
          testCampaignId,
          [testStores[i]._id.toString()],
          quantities[i],
          testUserId
        );
      }

      // Act
      const detail = await CampaignService.getCampaignDetail(testCampaignId);

      // Assert
      expect(detail.storeAllocations.length).toBe(3);

      // Verify each store has correct allocation
      for (let i = 0; i < testStores.length; i++) {
        const allocation = detail.storeAllocations[i];
        expect(allocation.allocated_scratch_cards).toBe(quantities[i]);
        expect(allocation.remaining_scratch_cards).toBe(quantities[i]);
      }

      // Verify total allocated matches sum
      const totalAllocated = detail.storeAllocations.reduce(
        (sum, a) => sum + a.allocated_scratch_cards,
        0
      );
      expect(totalAllocated).toBe(quantities.reduce((a, b) => a + b));
    });

    /**
     * Test 8: Get non-existent campaign
     * -> should return 404 with "Campaign not found"
     */
    test('Get non-existent campaign -> should return 404 with "Campaign not found"', async () => {
      // Arrange
      const fakeCampaignId = global.generateTestId().toString();

      // Act & Assert
      await expect(
        CampaignService.getCampaignDetail(fakeCampaignId)
      ).rejects.toThrow(NotFoundError);

      try {
        await CampaignService.getCampaignDetail(fakeCampaignId);
      } catch (error) {
        expect(error.message).toContain('Campaign not found');
      }
    });
  });
});
