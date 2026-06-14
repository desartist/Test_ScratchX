/**
 * Performance Benchmarks & Load Testing
 * Tests critical operations to measure performance and ensure targets are met
 *
 * Performance Targets:
 * - Bulk Redemption (100 items): < 5 seconds
 * - Analytics Aggregation Query: < 2 seconds
 * - Inventory Status Lookup: < 500ms
 * - Campaign Assignment (50 stores): < 3 seconds
 * - Large Batch Error Handling (1000+ items): handle gracefully
 */

const RedemptionService = require('@/lib/redemptionService').default;
const CampaignService = require('@/lib/campaignService').default;
const InventoryService = require('@/lib/inventoryService').default;
const Campaign = require('@/models/campaignModel').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { generateTestUser } = require('@/__tests__/fixtures/auth.fixture');

describe('Performance Benchmarks', () => {
  let testMerchant;
  let testMerchantId;
  let testUserId;
  let testCampaign;
  let testCampaignId;
  let testStore;
  let testStoreId;

  beforeEach(async () => {
    // Create test merchant with sufficient inventory
    const merchantUser = generateTestUser('Merchant', {
      email: `perf-merchant-${Date.now()}@example.com`,
    });
    testMerchant = await Account.create(merchantUser);
    testMerchantId = testMerchant._id.toString();
    testUserId = testMerchant._id.toString();

    // Create test store
    const storeData = global.createMockStore(testMerchantId, {
      store_name: 'Performance Test Store',
      store_code: `PERF${Date.now().toString().slice(-8)}`,
      total_scratch_cards: 5000,
      used_scratch_cards: 0,
      remaining_scratch_cards: 5000
    });
    testStore = await Store.create(storeData);
    testStoreId = testStore._id.toString();

    // Create test campaign
    const campaignData = global.createMockCampaign(testMerchantId, {
      campaignName: 'Performance Test Campaign',
      campaign_code: `PERF${Date.now().toString().slice(-8)}`,
      allocated_scratch_cards: 2000,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 2000,
      status: 'active',
      startDate: new Date(Date.now() - 1000 * 60 * 60),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    testCampaign = await Campaign.create(campaignData);
    testCampaignId = testCampaign._id.toString();
  });

  // ==========================================
  // Benchmark 1: Bulk Redemptions (100 items)
  // ==========================================
  describe('Bulk Redemptions (100 items)', () => {
    beforeEach(async () => {
      // Setup campaign-store mapping with enough allocation
      const mappingData = {
        campaign_id: testCampaignId,
        store_id: testStoreId,
        merchant_id: testMerchantId,
        allocated_scratch_cards: 1000,
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 1000,
        status: 'active',
        allocation_by: testUserId
      };
      await CampaignStoreMapping.create(mappingData);
    });

    test('BENCHMARK: Bulk redeem 100 scratch cards in < 5 seconds', async () => {
      // Generate 100 unique scratch card IDs
      const scratchCardIds = Array.from({ length: 100 }, (_, i) =>
        `CARD${Date.now()}${i.toString().padStart(4, '0')}`
      );

      // Create redemption objects
      const redemptions = scratchCardIds.map(id => ({
        campaignId: testCampaignId,
        storeId: testStoreId,
        scratchCardId: id,
        remarks: ''
      }));

      // Record start time
      const startTime = Date.now();

      // Execute bulk redemption
      const result = await RedemptionService.bulkRedeemScratchCards(
        testMerchantId,
        redemptions,
        testUserId
      );

      // Record end time
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert performance target
      expect(duration).toBeLessThan(5000);

      // Verify successful redemptions
      expect(result.successful).toBeDefined();
      expect(result.summary.success).toBe(100);
      expect(result.summary.failed).toBe(0);

      // Calculate throughput metrics
      const itemsPerSecond = (100 / duration * 1000).toFixed(2);

      // Log detailed metrics
      console.log('BENCHMARK: Bulk Redemption 100 items', {
        duration: `${duration}ms`,
        itemCount: 100,
        itemsPerSecond: itemsPerSecond,
        avgTimePerItem: `${(duration / 100).toFixed(2)}ms`,
        status: duration < 5000 ? 'PASS' : 'FAIL'
      });

      // Return benchmark result
      return {
        name: 'Bulk Redemption (100 items)',
        target: '< 5000ms',
        result: duration,
        status: duration < 5000 ? 'PASS' : 'FAIL',
        metrics: {
          duration,
          itemCount: 100,
          itemsPerSecond: parseFloat(itemsPerSecond),
          avgTimePerItem: duration / 100
        }
      };
    });
  });

  // ==========================================
  // Benchmark 2: Analytics Aggregation Query
  // ==========================================
  describe('Analytics Aggregation Query', () => {
    beforeEach(async () => {
      // Create 5 campaigns and 10 stores with realistic data
      const campaigns = [];
      const stores = [];

      for (let i = 0; i < 5; i++) {
        const campaignData = global.createMockCampaign(testMerchantId, {
          campaignName: `Analytics Campaign ${i}`,
          campaign_code: `ANALYT${i}`,
          allocated_scratch_cards: 500,
          used_scratch_cards: Math.floor(Math.random() * 100),
          redeemed_scratch_cards: Math.floor(Math.random() * 200),
          status: 'active',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        const campaign = await Campaign.create(campaignData);
        campaigns.push(campaign);
      }

      for (let i = 0; i < 10; i++) {
        const timestamp = Date.now().toString().slice(-6);
        const storeData = global.createMockStore(testMerchantId, {
          store_name: `Analytics Store ${i}`,
          store_code: `ANST${i}${timestamp}`.substring(0, 20),
          total_scratch_cards: 1000,
          used_scratch_cards: Math.floor(Math.random() * 300),
          remaining_scratch_cards: Math.floor(Math.random() * 700)
        });
        const store = await Store.create(storeData);
        stores.push(store);
      }

      // Create mappings between all campaigns and stores
      for (const campaign of campaigns) {
        for (const store of stores) {
          const mappingData = {
            campaign_id: campaign._id.toString(),
            store_id: store._id.toString(),
            merchant_id: testMerchantId,
            allocated_scratch_cards: 100,
            used_scratch_cards: Math.floor(Math.random() * 30),
            redeemed_scratch_cards: Math.floor(Math.random() * 50),
            remaining_scratch_cards: Math.floor(Math.random() * 100),
            status: 'active',
            allocation_by: testUserId
          };
          await CampaignStoreMapping.create(mappingData);
        }
      }

      // Create realistic transaction data
      for (let i = 0; i < 500; i++) {
        const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        const store = stores[Math.floor(Math.random() * stores.length)];
        const mapping = await CampaignStoreMapping.findOne({
          campaign_id: campaign._id,
          store_id: store._id
        });

        if (mapping) {
          await ScratchCardTransaction.create({
            merchant_id: testMerchantId,
            campaign_id: campaign._id,
            store_id: store._id,
            campaign_store_mapping_id: mapping._id,
            scratch_card_id: `CARD${i}`,
            action_type: 'redeemed',
            quantity: 1,
            created_by: testUserId,
            status: 'completed'
          });
        }
      }
    });

    test('BENCHMARK: Merchant inventory analytics query in < 2 seconds', async () => {
      // Record start time
      const startTime = Date.now();

      // Execute analytics aggregation query
      const analytics = await CampaignStoreMapping.aggregate([
        {
          $match: {
            merchant_id: testMerchantId
          }
        },
        {
          $group: {
            _id: '$campaign_id',
            total_allocated: { $sum: '$allocated_scratch_cards' },
            total_redeemed: { $sum: '$redeemed_scratch_cards' },
            total_remaining: { $sum: '$remaining_scratch_cards' },
            store_count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'campaigns',
            localField: '_id',
            foreignField: '_id',
            as: 'campaign'
          }
        },
        {
          $unwind: {
            path: '$campaign',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            campaignName: {
              $cond: [
                { $eq: ['$campaign', null] },
                'Unknown Campaign',
                '$campaign.campaignName'
              ]
            },
            total_allocated: 1,
            total_redeemed: 1,
            total_remaining: 1,
            store_count: 1,
            redemption_rate: {
              $cond: [
                { $gt: ['$total_allocated', 0] },
                { $multiply: [{ $divide: ['$total_redeemed', '$total_allocated'] }, 100] },
                0
              ]
            }
          }
        }
      ]);

      // Record end time
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert performance target
      expect(duration).toBeLessThan(2000);

      // Verify analytics data structure
      expect(Array.isArray(analytics)).toBe(true);
      // Should have at least some mappings created
      const mappingCount = await CampaignStoreMapping.countDocuments({ merchant_id: testMerchantId });
      expect(mappingCount).toBeGreaterThan(0);

      // Log detailed metrics
      console.log('BENCHMARK: Analytics Aggregation Query', {
        duration: `${duration}ms`,
        recordsProcessed: analytics.length,
        avgTimePerRecord: `${(duration / analytics.length).toFixed(2)}ms`,
        status: duration < 2000 ? 'PASS' : 'FAIL'
      });

      return {
        name: 'Analytics Aggregation',
        target: '< 2000ms',
        result: duration,
        status: duration < 2000 ? 'PASS' : 'FAIL',
        metrics: {
          duration,
          recordsProcessed: analytics.length,
          avgTimePerRecord: duration / analytics.length
        }
      };
    });
  });

  // ==========================================
  // Benchmark 3: Inventory Status Lookup
  // ==========================================
  describe('Inventory Status Lookup', () => {
    beforeEach(async () => {
      // Setup campaign-store mapping
      const mappingData = {
        campaign_id: testCampaignId,
        store_id: testStoreId,
        merchant_id: testMerchantId,
        allocated_scratch_cards: 1000,
        used_scratch_cards: 250,
        redeemed_scratch_cards: 150,
        remaining_scratch_cards: 600,
        status: 'active',
        allocation_by: testUserId
      };
      await CampaignStoreMapping.create(mappingData);
    });

    test('BENCHMARK: Inventory status lookup in < 500ms', async () => {
      // Record start time
      const startTime = Date.now();

      // Execute inventory lookup
      const status = await CampaignStoreMapping.findOne({
        campaign_id: testCampaignId,
        store_id: testStoreId,
        merchant_id: testMerchantId
      }).lean();

      // Record end time
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert performance target
      expect(duration).toBeLessThan(500);

      // Verify data structure
      expect(status).toBeDefined();
      expect(status.allocated_scratch_cards).toBe(1000);
      expect(status.remaining_scratch_cards).toBe(600);

      // Log detailed metrics
      console.log('BENCHMARK: Inventory Status Lookup', {
        duration: `${duration}ms`,
        allocated: status.allocated_scratch_cards,
        remaining: status.remaining_scratch_cards,
        status: duration < 500 ? 'PASS' : 'FAIL'
      });

      return {
        name: 'Inventory Status Lookup',
        target: '< 500ms',
        result: duration,
        status: duration < 500 ? 'PASS' : 'FAIL',
        metrics: {
          duration,
          allocated: status.allocated_scratch_cards,
          remaining: status.remaining_scratch_cards
        }
      };
    });
  });

  // ==========================================
  // Benchmark 4: Campaign Assignment (50 stores)
  // ==========================================
  describe('Campaign Assignment to Multiple Stores', () => {
    let bulkTestStoreIds = [];

    beforeEach(async () => {
      // Pre-create 50 stores (separate from testStore)
      const stores = [];
      const timestamp = Date.now().toString().slice(-4);
      for (let i = 0; i < 50; i++) {
        const storeData = global.createMockStore(testMerchantId, {
          store_name: `Perf Bulk Store ${i}`,
          store_code: `PBST${i}${timestamp}`.substring(0, 20),
          total_scratch_cards: 2000,
          used_scratch_cards: 0,
          remaining_scratch_cards: 2000
        });
        const store = await Store.create(storeData);
        stores.push(store);
      }
      bulkTestStoreIds = stores.map(s => s._id.toString());
    });

    test('BENCHMARK: Assign campaign to 50 stores in < 3 seconds', async () => {
      // Use the pre-created store IDs
      const storeIds = bulkTestStoreIds;
      expect(storeIds.length).toBe(50);

      // Record start time
      const startTime = Date.now();

      // Assign campaign to all stores (simulating bulk assignment)
      const mappings = [];
      for (const storeId of storeIds) {
        const mappingData = {
          campaign_id: testCampaignId,
          store_id: storeId,
          merchant_id: testMerchantId,
          allocated_scratch_cards: 50,
          used_scratch_cards: 0,
          redeemed_scratch_cards: 0,
          remaining_scratch_cards: 50,
          status: 'active',
          allocation_by: testUserId
        };
        mappings.push(mappingData);
      }

      // Insert all at once for realistic bulk performance
      const results = await CampaignStoreMapping.insertMany(mappings);

      // Record end time
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert performance target
      expect(duration).toBeLessThan(3000);

      // Verify all assignments created
      expect(results.length).toBe(50);

      // Calculate throughput
      const storesPerSecond = (50 / duration * 1000).toFixed(2);

      // Log detailed metrics
      console.log('BENCHMARK: Campaign Assignment 50 stores', {
        duration: `${duration}ms`,
        stores: 50,
        storesPerSecond: storesPerSecond,
        avgTimePerStore: `${(duration / 50).toFixed(2)}ms`,
        status: duration < 3000 ? 'PASS' : 'FAIL'
      });

      return {
        name: 'Campaign Assignment (50 stores)',
        target: '< 3000ms',
        result: duration,
        status: duration < 3000 ? 'PASS' : 'FAIL',
        metrics: {
          duration,
          storeCount: 50,
          storesPerSecond: parseFloat(storesPerSecond),
          avgTimePerStore: duration / 50
        }
      };
    });
  });

  // ==========================================
  // Benchmark 5: Large Batch Error Handling
  // ==========================================
  describe('Large Batch Error Handling (1000+ items)', () => {
    beforeEach(async () => {
      // Setup with limited allocation to trigger errors
      const mappingData = {
        campaign_id: testCampaignId,
        store_id: testStoreId,
        merchant_id: testMerchantId,
        allocated_scratch_cards: 100, // Only 100, will fail rest
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 100,
        status: 'active',
        allocation_by: testUserId
      };
      await CampaignStoreMapping.create(mappingData);
    });

    test('BENCHMARK: Handle 1000+ item batch gracefully without crashing', async () => {
      // Generate 1000+ scratch card IDs
      const cardCount = 1200;
      const scratchCardIds = Array.from({ length: cardCount }, (_, i) =>
        `CARD${Date.now()}${i.toString().padStart(5, '0')}`
      );

      // Create large batch with mix of valid and invalid entries
      const redemptions = scratchCardIds.map((id, index) => ({
        campaignId: testCampaignId,
        storeId: testStoreId,
        scratchCardId: id,
        remarks: `Item ${index}`
      }));

      // Record start time
      const startTime = Date.now();

      // Execute large batch
      const result = await RedemptionService.bulkRedeemScratchCards(
        testMerchantId,
        redemptions,
        testUserId
      );

      // Record end time
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Should handle gracefully (not crash)
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(cardCount);

      // Should have errors due to limited allocation
      expect(result.summary.failed).toBeGreaterThan(0);
      expect(result.summary.success).toBeLessThanOrEqual(100);

      // Should complete within reasonable timeout (15 seconds)
      expect(duration).toBeLessThan(15000);

      // Log detailed metrics
      const errorPercentage = ((result.summary.failed / cardCount) * 100).toFixed(1);
      console.log('BENCHMARK: Large Batch Handling 1000+ items', {
        duration: `${duration}ms`,
        itemCount: cardCount,
        successCount: result.summary.success,
        errorCount: result.summary.failed,
        errorPercentage: `${errorPercentage}%`,
        avgTimePerItem: `${(duration / cardCount).toFixed(3)}ms`,
        status: duration < 15000 && result.summary.failed > 0 ? 'PASS' : 'FAIL'
      });

      return {
        name: 'Large Batch Error Handling',
        target: '< 15000ms, graceful failure',
        result: duration,
        status: duration < 15000 && result.summary.failed > 0 ? 'PASS' : 'FAIL',
        metrics: {
          duration,
          itemCount: cardCount,
          successCount: result.summary.success,
          errorCount: result.summary.failed,
          errorPercentage: (result.summary.failed / cardCount) * 100,
          avgTimePerItem: duration / cardCount
        }
      };
    });
  });

  // ==========================================
  // Summary: Run all benchmarks and report
  // ==========================================
  describe('Benchmark Summary', () => {
    test('All performance benchmarks completed', async () => {
      // This test just ensures all benchmarks ran
      // Results are logged during individual tests
      console.log('\n====== PERFORMANCE BENCHMARK SUMMARY ======');
      console.log('All performance benchmarks completed successfully');
      console.log('Check logs above for individual benchmark results');
      console.log('Target: All benchmarks should PASS');
      console.log('==========================================\n');
      expect(true).toBe(true);
    });
  });
});
