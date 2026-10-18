/**
 * Redemptions API Integration Tests
 * Tests single/bulk redemptions, history retrieval, statistics, and reversal operations
 *
 * This tests the RedemptionService which provides business logic for redemption operations
 */

const RedemptionService = require('@/lib/redemptionService').default;
const Campaign = require('@/models/campaignModel').default;
const Store = require('@/models/storeModel').default;
const Account = require('@/models/accountModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const { ValidationError, NotFoundError } = require('@/lib/errors');
const { generateTestUser } = require('@/__tests__/fixtures/auth.fixture');
const ScratchCardRecord = require('@/models/scratchCardRecordModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;

/**
 * Issue a real, revealed scratch card. Redemption now validates against the
 * issued card record — campaign, store and reward come from it — so these
 * tests can no longer redeem made-up ids like `CARD123` (which the old
 * counter-only implementation never checked existed).
 */
async function issueCard(campaignId, storeId, merchantId) {
  const mongoose = require('mongoose');
  const participationId = new mongoose.Types.ObjectId();
  const cardId = new mongoose.Types.ObjectId();
  await CustomerParticipation.collection.insertOne({
    _id: participationId, campaign_id: new mongoose.Types.ObjectId(String(campaignId)),
    store_id: new mongoose.Types.ObjectId(String(storeId)), customer_mobile: '9876543210', status: 'revealed',
  });
  await ScratchCardRecord.collection.insertOne({
    _id: cardId, campaign_id: new mongoose.Types.ObjectId(String(campaignId)),
    merchant_id: new mongoose.Types.ObjectId(String(merchantId)), store_id: new mongoose.Types.ObjectId(String(storeId)),
    range_id: new mongoose.Types.ObjectId(), customer_participation_id: participationId, reward_id: null,
    status: 'revealed', expires_at: new Date(Date.now() + 5 * 60 * 1000), redeemed_at: null,
  });
  return cardId.toString();
}

describe('Redemptions API Integration Tests', () => {
  let testMerchant;
  let testMerchantId;
  let testUserId;
  let testCampaign;
  let testCampaignId;
  let testStore;
  let testStoreId;
  let testMapping;

  beforeEach(async () => {
    // Create test merchant
    const merchantUser = generateTestUser('Merchant', {
      email: `merchant-${Date.now()}@example.com`,
    });
    testMerchant = await Account.create(merchantUser);
    testMerchantId = testMerchant._id.toString();
    testUserId = testMerchant._id.toString();

    // Create test store for the merchant
    const storeData = global.createMockStore(testMerchantId, {
      store_name: 'Test Redemption Store',
      store_code: `ST${Date.now()}${Math.random().toString(36).substring(7)}`.substring(0, 20).toUpperCase(),
      total_scratch_cards: 1000,
      used_scratch_cards: 0,
      remaining_scratch_cards: 1000
    });
    testStore = await Store.create(storeData);
    testStoreId = testStore._id.toString();

    // Create test campaign (with future endDate for normal tests)
    const campaignData = global.createMockCampaign(testMerchantId, {
      campaignName: 'Test Redemption Campaign',
      campaign_code: `CAMP${Date.now().toString().slice(-8)}`,
      allocated_scratch_cards: 500,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 500,
      status: 'active',
      startDate: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    testCampaign = await Campaign.create(campaignData);
    testCampaignId = testCampaign._id.toString();

    // Create and assign campaign to store
    const mappingData = {
      campaign_id: testCampaignId,
      store_id: testStoreId,
      merchant_id: testMerchantId,
      allocated_scratch_cards: 100,
      used_scratch_cards: 0,
      redeemed_scratch_cards: 0,
      remaining_scratch_cards: 100,
      status: 'active',
      allocation_by: testUserId
    };
    testMapping = await CampaignStoreMapping.create(mappingData);
  });

  // ==========================================
  // POST /api/redemptions - Single & Bulk Redemption Tests (6 tests)
  // ==========================================

  describe('POST /api/redemptions - Single & Bulk Redemption', () => {
    /**
     * Test 1: Redeem single scratch card
     * -> should return 200 with success, update inventory (redeemed_scratch_cards++), create Redemption record, create transaction
     */
    test('Redeem single scratch card -> should return 200 with success, update campaign and store inventory', async () => {
      // Arrange
      const scratchCardId = await issueCard(testCampaignId, testStoreId, testMerchantId);

      // Act
      const result = await RedemptionService.redeemScratchCard(
        testMerchantId,
        testCampaignId,
        testStoreId,
        scratchCardId,
        testUserId,
        'Test redemption'
      );

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.redemption).toBeDefined();
      expect(result.redemption.scratchCardId).toBe(scratchCardId);
      expect(result.redemption.campaignId.toString()).toBe(testCampaignId);
      expect(result.redemption.storeId.toString()).toBe(testStoreId);
      expect(result.redemption.redeemedAt).toBeDefined();
      expect(result.redemption.transactionId).toBeDefined();

      // Assert - Campaign-level counters are NOT changed by redemption: the
      // reveal step already counts the card there, so counting it again here
      // would double it (see RedemptionService.redeemScratchCard).
      const updatedCampaign = await Campaign.findById(testCampaignId);
      expect(updatedCampaign.redeemed_scratch_cards).toBe(0);
      expect(updatedCampaign.remaining_scratch_cards).toBe(500);

      // Assert - Store inventory updated
      const updatedStore = await Store.findById(testStoreId);
      expect(updatedStore.used_scratch_cards).toBe(1);
      expect(updatedStore.remaining_scratch_cards).toBe(999); // 1000 - 1

      // Assert - Mapping inventory updated
      const updatedMapping = await CampaignStoreMapping.findById(testMapping._id);
      expect(updatedMapping.redeemed_scratch_cards).toBe(1);
      expect(updatedMapping.remaining_scratch_cards).toBe(99); // 100 - 0 - 1

      // Assert - Transaction created
      const transaction = await ScratchCardTransaction.findById(result.redemption.transactionId);
      expect(transaction).toBeDefined();
      expect(transaction.action_type).toBe('redeemed');
      expect(transaction.scratch_card_id).toBe(scratchCardId);
      expect(transaction.status).toBe('completed');
    });

    /**
     * Test 2: Redeem multiple scratch cards in bulk
     * -> should return 200 with success count, handle multiple redemptions in single request
     */
    test('Bulk redeem multiple scratch cards -> should return 200 with success count and update inventory', async () => {
      // Arrange
      const bulkRedemptions = [];
      for (let i = 0; i < 3; i++) {
        bulkRedemptions.push({
          campaignId: testCampaignId,
          storeId: testStoreId,
          scratchCardId: await issueCard(testCampaignId, testStoreId, testMerchantId)
        });
      }

      // Act
      const result = await RedemptionService.bulkRedeemScratchCards(
        testMerchantId,
        bulkRedemptions,
        testUserId
      );

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(3);
      expect(result.summary.success).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.successful.length).toBe(3);
      expect(result.failed.length).toBe(0);

      // Assert - Store mapping counted all three (campaign-level counters are
      // the reveal step's job, not redemption's)
      const updatedMapping = await CampaignStoreMapping.findById(testMapping._id);
      expect(updatedMapping.redeemed_scratch_cards).toBe(3);
      expect(updatedMapping.remaining_scratch_cards).toBe(97);

      // Assert - Store inventory updated
      const updatedStore = await Store.findById(testStoreId);
      expect(updatedStore.used_scratch_cards).toBe(3);
      expect(updatedStore.remaining_scratch_cards).toBe(997); // 1000 - 3

      // Assert - Transactions created
      const transactions = await ScratchCardTransaction.find({ campaign_id: testCampaignId });
      expect(transactions.length).toBe(3);
      transactions.forEach(tx => {
        expect(tx.action_type).toBe('redeemed');
        expect(tx.status).toBe('completed');
      });
    });

    /**
     * Test 3: Bulk redemption with partial failures
     * -> should return 200 with success/error breakdown, only apply successful redemptions to database
     */
    test('Bulk redemption with partial failures -> should handle failures gracefully and apply only successful ones', async () => {
      // Arrange - Create an expired campaign for one of the redemptions
      const expiredCampaignData = {
        merchantId: testMerchantId,
        campaignName: 'Expired Campaign',
        campaign_code: 'EXPCAMP3',
        status: 'active',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
        allocated_scratch_cards: 100,
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 100
      };
      const expiredCampaign = await Campaign.create(expiredCampaignData);

      // Create a store not assigned to the expired campaign
      const unassignedStore = await Store.create(
        global.createMockStore(testMerchantId, {
          store_name: 'Unassigned Store',
          store_code: `UNST${Date.now()}`
        })
      );

      // Create mapping for expired campaign
      await CampaignStoreMapping.create({
        campaign_id: expiredCampaign._id,
        store_id: testStoreId,
        merchant_id: testMerchantId,
        allocated_scratch_cards: 50,
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 50,
        status: 'active',
        allocation_by: testUserId
      });

      const bulkRedemptions = [
        {
          campaignId: testCampaignId,
          storeId: testStoreId,
          scratchCardId: await issueCard(testCampaignId, testStoreId, testMerchantId)
        },
        {
          campaignId: expiredCampaign._id.toString(),
          storeId: testStoreId,
          // This will fail due to expired campaign
          scratchCardId: await issueCard(expiredCampaign._id, testStoreId, testMerchantId)
        },
        {
          campaignId: testCampaignId,
          storeId: unassignedStore._id.toString(),
          // This will fail due to campaign not assigned to that store
          scratchCardId: await issueCard(testCampaignId, unassignedStore._id, testMerchantId)
        },
        {
          campaignId: testCampaignId,
          storeId: testStoreId,
          scratchCardId: await issueCard(testCampaignId, testStoreId, testMerchantId)
        }
      ];

      // Act
      const result = await RedemptionService.bulkRedeemScratchCards(
        testMerchantId,
        bulkRedemptions,
        testUserId
      );

      // Assert - Response structure
      expect(result.summary.total).toBe(4);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(2);
      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(2);

      // Assert - Only successful redemptions updated the database
      const updatedMapping = await CampaignStoreMapping.findById(testMapping._id);
      expect(updatedMapping.redeemed_scratch_cards).toBe(2);
      expect(await ScratchCardRecord.countDocuments({ status: 'redeemed' })).toBe(2);

      // Assert - Failed items include error messages
      expect(result.failed[0]).toHaveProperty('error');
      expect(result.failed[1]).toHaveProperty('error');
    });

    /**
     * Test 4: Redeem from expired campaign
     * -> should return error with "Campaign has expired" message
     */
    test('Redeem from expired campaign -> should return 400 with "Campaign has ended" error', async () => {
      // Arrange - Create expired campaign
      const expiredCampaignData = {
        merchantId: testMerchantId,
        campaignName: 'Expired Campaign',
        campaign_code: 'EXPCAMP2',
        status: 'active',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
        allocated_scratch_cards: 100,
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 100
      };
      const expiredCampaign = await Campaign.create(expiredCampaignData);

      // Create and assign expired campaign to store
      await CampaignStoreMapping.create({
        campaign_id: expiredCampaign._id,
        store_id: testStoreId,
        merchant_id: testMerchantId,
        allocated_scratch_cards: 50,
        used_scratch_cards: 0,
        redeemed_scratch_cards: 0,
        remaining_scratch_cards: 50,
        status: 'active',
        allocation_by: testUserId
      });

      // Act & Assert
      await expect(
        RedemptionService.redeemScratchCard(
          testMerchantId,
          expiredCampaign._id.toString(),
          testStoreId,
          await issueCard(expiredCampaign._id, testStoreId, testMerchantId),
          testUserId
        )
      ).rejects.toThrow('Campaign has ended');
    });

    /**
     * Test 5: Redeem when campaign not allocated to store
     * -> should return 400 with error message
     */
    test('Redeem when campaign not allocated to store -> should return 400 with allocation error', async () => {
      // Arrange - Create a store not assigned to the campaign
      const unassignedStore = await Store.create(
        global.createMockStore(testMerchantId, {
          store_name: 'Unassigned Store',
          store_code: `UNST${Date.now()}`
        })
      );

      // Act & Assert
      await expect(
        RedemptionService.redeemScratchCard(
          testMerchantId,
          testCampaignId,
          unassignedStore._id.toString(),
          await issueCard(testCampaignId, unassignedStore._id, testMerchantId),
          testUserId
        )
      ).rejects.toThrow('Campaign not allocated to this store');
    });

    /**
     * Test 6: Prevent duplicate redemption
     * -> redeeming same scratch_card_id twice returns error
     */
    test('Prevent duplicate redemption -> redeeming same scratch_card_id twice returns error', async () => {
      // Arrange
      const scratchCardId = await issueCard(testCampaignId, testStoreId, testMerchantId);

      // First redemption should succeed
      const firstRedemption = await RedemptionService.redeemScratchCard(
        testMerchantId,
        testCampaignId,
        testStoreId,
        scratchCardId,
        testUserId
      );
      expect(firstRedemption.success).toBe(true);

      // Act & Assert - the second redemption of the same card is refused.
      // (This test previously asserted the opposite — that the duplicate
      // succeeded and inventory was decremented twice — documenting a bug:
      // the old implementation had no duplicate check at all.)
      await expect(
        RedemptionService.redeemScratchCard(
          testMerchantId,
          testCampaignId,
          testStoreId,
          scratchCardId,
          testUserId
        )
      ).rejects.toMatchObject({ code: 'ALREADY_REDEEMED' });

      // Only one transaction, inventory counted once
      const transactions = await ScratchCardTransaction.find({
        scratch_card_id: scratchCardId,
        action_type: 'redeemed'
      });
      expect(transactions.length).toBe(1);
      const mapping = await CampaignStoreMapping.findById(testMapping._id);
      expect(mapping.redeemed_scratch_cards).toBe(1);
    });
  });

  // ==========================================
  // GET /api/redemptions/history - Redemption History Tests (2 tests)
  // ==========================================

  describe('GET /api/redemptions/history - Redemption History', () => {
    /**
     * Test 7: Get redemption history for campaign
     * -> should return 200 with paginated list of redemptions with details
     */
    test('Get redemption history for campaign -> should return list with transaction details', async () => {
      // Arrange - Create multiple redemptions
      const redemptionCards = [
        await issueCard(testCampaignId, testStoreId, testMerchantId),
        await issueCard(testCampaignId, testStoreId, testMerchantId),
        await issueCard(testCampaignId, testStoreId, testMerchantId)
      ];

      for (const cardId of redemptionCards) {
        await RedemptionService.redeemScratchCard(
          testMerchantId,
          testCampaignId,
          testStoreId,
          cardId,
          testUserId,
          'History test redemption'
        );
      }

      // Act
      const result = await RedemptionService.getCampaignRedemptionHistory(testCampaignId, {
        limit: 50
      });

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(50);

      // Assert - Transaction details
      result.transactions.forEach(tx => {
        expect(tx.campaign_id).toEqual(testCampaign._id);
        expect(tx.action_type).toBe('redeemed');
        expect(tx.status).toBe('completed');
        expect(tx.createdAt).toBeDefined();
      });

      // Assert - Sort order (newest first)
      for (let i = 0; i < result.transactions.length - 1; i++) {
        expect(result.transactions[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.transactions[i + 1].createdAt.getTime()
        );
      }
    });

    /**
     * Test 8: Get history with pagination
     * -> respects limit, includes total count
     */
    test('Get redemption history with pagination -> respects limit and skip parameters', async () => {
      // Arrange - Create 10 redemptions
      const cards = [];
      for (let i = 0; i < 10; i++) cards.push(await issueCard(testCampaignId, testStoreId, testMerchantId));
      const redemptionPromises = cards.map((cardId) =>
        RedemptionService.redeemScratchCard(
          testMerchantId,
          testCampaignId,
          testStoreId,
          cardId,
          testUserId
        )
      );
      await Promise.all(redemptionPromises);

      // Act - Get first page (limit 5)
      const page1 = await RedemptionService.getCampaignRedemptionHistory(testCampaignId, {
        limit: 5
      });

      // Assert - First page
      expect(page1.transactions.length).toBe(5);
      expect(page1.total).toBe(10);
      expect(page1.limit).toBe(5);

      // Act - Get second page with different limit
      const page2 = await RedemptionService.getCampaignRedemptionHistory(testCampaignId, {
        limit: 3
      });

      // Assert - Second page
      expect(page2.transactions.length).toBe(3);
      expect(page2.total).toBe(10);
      expect(page2.limit).toBe(3);

      // Assert - Different transaction counts per page due to different limits
      // Both pages will still contain the same overall data set, just different page sizes
      expect(page1.transactions.length).not.toBe(page2.transactions.length);
    });
  });

  // ==========================================
  // GET /api/redemptions/stats - Redemption Statistics Tests (2 tests)
  // ==========================================

  describe('GET /api/redemptions/stats - Redemption Statistics', () => {
    /**
     * Test 9: Get redemption statistics for campaign
     * -> should return total_redemptions, redemption_rate (%), successful/failed counts
     */
    test('Get redemption statistics for campaign -> should return redemption metrics', async () => {
      // Arrange - Create redemptions
      const cardIds = [
        await issueCard(testCampaignId, testStoreId, testMerchantId),
        await issueCard(testCampaignId, testStoreId, testMerchantId),
        await issueCard(testCampaignId, testStoreId, testMerchantId)
      ];
      for (const cardId of cardIds) {
        await RedemptionService.redeemScratchCard(
          testMerchantId,
          testCampaignId,
          testStoreId,
          cardId,
          testUserId
        );
      }

      // Act
      const result = await RedemptionService.getCampaignRedemptionHistory(testCampaignId, {
        limit: 1000
      });

      // Assert - Statistics
      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.transactions.length).toBe(3);

      // Verify transactions are all redeemed
      result.transactions.forEach(tx => {
        expect(tx.action_type).toBe('redeemed');
      });
    });

    /**
     * Test 10: Get stats for specific store
     * -> should return statistics for that store only
     */
    test('Get store redemption statistics -> should return store-specific metrics', async () => {
      // Arrange - Redeem from main test store
      await RedemptionService.redeemScratchCard(
        testMerchantId,
        testCampaignId,
        testStoreId,
        await issueCard(testCampaignId, testStoreId, testMerchantId),
        testUserId
      );

      // Act - Get stats
      const storeStats = await RedemptionService.getStoreRedemptionStats(testStoreId);

      // Assert - Stats structure
      expect(storeStats).toBeDefined();
      expect(storeStats.store).toEqual(testStoreId);
      expect(typeof storeStats.totalRedemptions).toBe('number');
      expect(storeStats.totalRedemptions).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(storeStats.byCampaign)).toBe(true);
      expect(storeStats.period).toBeDefined();
      expect(storeStats.period.startDate).toBeDefined();
      expect(storeStats.period.endDate).toBeDefined();

      // Assert - Campaign stats are included if there are redemptions
      if (storeStats.totalRedemptions > 0) {
        expect(storeStats.byCampaign.length).toBeGreaterThan(0);
        const firstCampaignStat = storeStats.byCampaign[0];
        expect(firstCampaignStat).toHaveProperty('campaignId');
        expect(firstCampaignStat).toHaveProperty('campaignName');
        expect(firstCampaignStat).toHaveProperty('redemptionCount');
      }
    });
  });

  // ==========================================
  // POST /api/redemptions/reverse - Redemption Reversal Tests (2 tests)
  // ==========================================

  describe('POST /api/redemptions/reverse - Redemption Reversal', () => {
    /**
     * Test 11: Reverse completed redemption
     * -> should return 200, update status to 'reversed', decrement redeemed count, restore inventory
     */
    test('Reverse completed redemption -> should update status and restore inventory', async () => {
      // Arrange - Create redemption
      const scratchCardId = await issueCard(testCampaignId, testStoreId, testMerchantId);
      const redemption = await RedemptionService.redeemScratchCard(
        testMerchantId,
        testCampaignId,
        testStoreId,
        scratchCardId,
        testUserId
      );
      const transactionId = redemption.redemption.transactionId;

      // Verify initial state (campaign-level counters belong to the reveal
      // step, so redemption leaves them alone)
      let campaign = await Campaign.findById(testCampaignId);
      expect(campaign.redeemed_scratch_cards).toBe(0);
      expect((await ScratchCardRecord.findById(scratchCardId).lean()).status).toBe('redeemed');

      let store = await Store.findById(testStoreId);
      expect(store.used_scratch_cards).toBe(1);

      // Act
      const result = await RedemptionService.reverseRedemption(
        transactionId,
        testUserId,
        'Test reversal'
      );

      // Assert - Response structure
      expect(result).toBeDefined();
      expect(result.originalTransaction).toBeDefined();
      expect(result.reversalTransaction).toBeDefined();

      // Assert - Original transaction status updated
      expect(result.originalTransaction.status).toBe('reversed');

      // Assert - Reversal transaction created
      expect(result.reversalTransaction.action_type).toBe('reversed');
      expect(result.reversalTransaction.status).toBe('completed');

      // Assert - Campaign counters untouched throughout; the card is back to
      // 'revealed' (a reversal is a true undo)
      campaign = await Campaign.findById(testCampaignId);
      expect(campaign.redeemed_scratch_cards).toBe(0);
      expect(campaign.remaining_scratch_cards).toBe(500);
      expect((await ScratchCardRecord.findById(scratchCardId).lean()).status).toBe('revealed');

      // Assert - Store inventory restored
      store = await Store.findById(testStoreId);
      expect(store.used_scratch_cards).toBe(0);
      expect(store.remaining_scratch_cards).toBe(1000); // Restored to original

      // Assert - Mapping inventory restored
      const mapping = await CampaignStoreMapping.findById(testMapping._id);
      expect(mapping.redeemed_scratch_cards).toBe(0);
      expect(mapping.remaining_scratch_cards).toBe(100); // Restored

      // Assert - Original transaction marked as reversed in DB
      const dbTransaction = await ScratchCardTransaction.findById(transactionId);
      expect(dbTransaction.status).toBe('reversed');
    });

    /**
     * Test 12: Reverse non-existent redemption
     * -> should return 404 with "Transaction not found" error
     */
    test('Reverse non-existent redemption -> should return 404 error', async () => {
      // Arrange - Create a fake transaction ID
      const mongoose = require('mongoose');
      const fakeTransactionId = new mongoose.Types.ObjectId().toString();

      // Act & Assert
      await expect(
        RedemptionService.reverseRedemption(
          fakeTransactionId,
          testUserId,
          'Test reversal'
        )
      ).rejects.toThrow('Transaction not found');
    });
  });
});
