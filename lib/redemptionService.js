import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';
import Account from '@/models/accountModel';
import { ValidationError, NotFoundError } from '@/lib/errors';

class RedemptionService {
  /**
   * Redeem a single scratch card at a store
   * @param {string} merchantId - The merchant ID
   * @param {string} campaignId - The campaign ID
   * @param {string} storeId - The store ID
   * @param {string} scratchCardId - The unique scratch card ID
   * @param {string} redeemedBy - User ID redeeming the card
   * @param {string} remarks - Optional remarks
   * @returns {Promise<Object>} - Redemption result and transaction
   */
  static async redeemScratchCard(
    merchantId,
    campaignId,
    storeId,
    scratchCardId,
    redeemedBy,
    remarks = ''
  ) {
    // Validate campaign-store mapping exists and is active
    const mapping = await CampaignStoreMapping.findOne({
      campaign_id: campaignId,
      store_id: storeId,
      merchant_id: merchantId
    });

    if (!mapping) {
      throw new NotFoundError('Campaign not allocated to this store');
    }

    if (mapping.status !== 'active') {
      throw new ValidationError(`Campaign-store allocation is ${mapping.status}, redemption not allowed`);
    }

    // Validate campaign is active
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'active') {
      throw new ValidationError(`Campaign is ${campaign.status}, redemption not allowed`);
    }

    // Check campaign dates
    const now = new Date();
    if (now < campaign.startDate) {
      throw new ValidationError('Campaign has not started yet');
    }
    if (now > campaign.endDate) {
      throw new ValidationError('Campaign has ended');
    }

    // Check if mapping has available scratch cards
    if (mapping.remaining_scratch_cards <= 0) {
      throw new ValidationError('No scratch cards available for redemption');
    }

    // Update mapping
    const previousRemaining = mapping.remaining_scratch_cards;
    mapping.redeemed_scratch_cards += 1;
    mapping.remaining_scratch_cards =
      mapping.allocated_scratch_cards -
      mapping.used_scratch_cards -
      mapping.redeemed_scratch_cards;

    await mapping.validate();
    await mapping.save();

    // Update campaign totals
    const previousCampaignRedeemed = campaign.redeemed_scratch_cards;
    campaign.redeemed_scratch_cards += 1;
    campaign.remaining_scratch_cards =
      campaign.allocated_scratch_cards -
      campaign.used_scratch_cards -
      campaign.redeemed_scratch_cards;

    await campaign.validate();
    await campaign.save();

    // Update store inventory
    const store = await Store.findById(storeId);
    const previousStoreUsed = store.used_scratch_cards;
    store.used_scratch_cards += 1;
    store.remaining_scratch_cards = store.total_scratch_cards - store.used_scratch_cards;

    await store.save();

    // Create transaction record
    const transaction = await ScratchCardTransaction.create({
      merchant_id: merchantId,
      campaign_id: campaignId,
      store_id: storeId,
      campaign_store_mapping_id: mapping._id,
      scratch_card_id: scratchCardId,
      action_type: 'redeemed',
      quantity: 1,
      previous_balance: previousRemaining,
      new_balance: mapping.remaining_scratch_cards,
      created_by: redeemedBy,
      remarks: remarks || 'Scratch card redeemed at store',
      source_system: 'web_dashboard',
      status: 'completed'
    });

    return {
      success: true,
      redemption: {
        scratchCardId,
        campaignId: campaign._id,
        campaignName: campaign.campaignName,
        storeId: store._id,
        storeName: store.store_name,
        redeemedAt: transaction.createdAt,
        transactionId: transaction._id
      },
      inventory: {
        mappingRemaining: mapping.remaining_scratch_cards,
        campaignRemaining: campaign.remaining_scratch_cards,
        storeRemaining: store.remaining_scratch_cards
      },
      transaction: transaction.toObject()
    };
  }

  /**
   * Bulk redeem multiple scratch cards
   * @param {string} merchantId - The merchant ID
   * @param {Array} redemptions - Array of { campaignId, storeId, scratchCardId }
   * @param {string} redeemedBy - User ID redeeming the cards
   * @returns {Promise<Object>} - Bulk redemption results
   */
  static async bulkRedeemScratchCards(merchantId, redemptions, redeemedBy) {
    if (!Array.isArray(redemptions) || redemptions.length === 0) {
      throw new ValidationError('Redemptions array is required and must not be empty');
    }

    const results = {
      successful: [],
      failed: [],
      summary: {
        total: redemptions.length,
        success: 0,
        failed: 0
      }
    };

    // Process each redemption
    for (const redemption of redemptions) {
      try {
        const result = await this.redeemScratchCard(
          merchantId,
          redemption.campaignId,
          redemption.storeId,
          redemption.scratchCardId,
          redeemedBy,
          redemption.remarks || ''
        );

        results.successful.push(result.redemption);
        results.summary.success++;
      } catch (error) {
        results.failed.push({
          scratchCardId: redemption.scratchCardId,
          campaignId: redemption.campaignId,
          storeId: redemption.storeId,
          error: error.message
        });
        results.summary.failed++;
      }
    }

    return results;
  }

  /**
   * Get redemption summary for a campaign in a store
   * @param {string} campaignId - The campaign ID
   * @param {string} storeId - The store ID
   * @returns {Promise<Object>} - Redemption summary
   */
  static async getCampaignStoreRedemptionSummary(campaignId, storeId) {
    const mapping = await CampaignStoreMapping.findOne({
      campaign_id: campaignId,
      store_id: storeId
    });

    if (!mapping) {
      throw new NotFoundError('Campaign-store mapping not found');
    }

    return {
      allocated: mapping.allocated_scratch_cards,
      used: mapping.used_scratch_cards,
      redeemed: mapping.redeemed_scratch_cards,
      remaining: mapping.remaining_scratch_cards,
      redemptionRate: mapping.allocated_scratch_cards > 0
        ? Math.round((mapping.redeemed_scratch_cards / mapping.allocated_scratch_cards) * 100)
        : 0
    };
  }

  /**
   * Get redemption history for a campaign
   * @param {string} campaignId - The campaign ID
   * @param {Object} options - Filter options { storeId, startDate, endDate, limit }
   * @returns {Promise<Object>} - Redemption transactions
   */
  static async getCampaignRedemptionHistory(campaignId, options = {}) {
    const { storeId, startDate, endDate, limit = 50 } = options;

    const query = {
      campaign_id: campaignId,
      action_type: 'redeemed'
    };

    if (storeId) {
      query.store_id = storeId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await ScratchCardTransaction.find(query)
      .populate('store_id', 'store_name store_code')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const total = await ScratchCardTransaction.countDocuments(query);

    return {
      transactions,
      total,
      limit
    };
  }

  /**
   * Get redemption statistics for a store
   * @param {string} storeId - The store ID
   * @param {Object} dateRange - { startDate, endDate }
   * @returns {Promise<Object>} - Redemption stats
   */
  static async getStoreRedemptionStats(storeId, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    const query = {
      store_id: storeId,
      action_type: 'redeemed'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const stats = await ScratchCardTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$campaign_id',
          count: { $sum: 1 }
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
        $unwind: '$campaign'
      },
      {
        $project: {
          campaignId: '$_id',
          campaignName: '$campaign.campaignName',
          redemptionCount: '$count',
          _id: 0
        }
      },
      { $sort: { redemptionCount: -1 } }
    ]);

    const totalRedemptions = stats.reduce((sum, s) => sum + s.redemptionCount, 0);

    return {
      store: storeId,
      period: {
        startDate: startDate || 'all-time',
        endDate: endDate || 'all-time'
      },
      totalRedemptions,
      byCampaign: stats
    };
  }

  /**
   * Reverse a redemption (for error correction)
   * @param {string} transactionId - The redemption transaction ID
   * @param {string} reversedBy - User ID reversing the transaction
   * @param {string} reason - Reason for reversal
   * @returns {Promise<Object>} - Reversal result
   */
  static async reverseRedemption(transactionId, reversedBy, reason = '') {
    const transaction = await ScratchCardTransaction.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.action_type !== 'redeemed') {
      throw new ValidationError('Only redeemed transactions can be reversed');
    }

    if (transaction.status !== 'completed') {
      throw new ValidationError('Only completed transactions can be reversed');
    }

    // Find mapping and decrement redeemed count
    const mapping = await CampaignStoreMapping.findById(transaction.campaign_store_mapping_id);
    if (mapping) {
      mapping.redeemed_scratch_cards = Math.max(0, mapping.redeemed_scratch_cards - 1);
      mapping.remaining_scratch_cards =
        mapping.allocated_scratch_cards -
        mapping.used_scratch_cards -
        mapping.redeemed_scratch_cards;
      await mapping.save();
    }

    // Find campaign and decrement redeemed count
    const campaign = await Campaign.findById(transaction.campaign_id);
    if (campaign) {
      campaign.redeemed_scratch_cards = Math.max(0, campaign.redeemed_scratch_cards - 1);
      campaign.remaining_scratch_cards =
        campaign.allocated_scratch_cards -
        campaign.used_scratch_cards -
        campaign.redeemed_scratch_cards;
      await campaign.save();
    }

    // Find store and decrement used count
    const store = await Store.findById(transaction.store_id);
    if (store) {
      store.used_scratch_cards = Math.max(0, store.used_scratch_cards - 1);
      store.remaining_scratch_cards = store.total_scratch_cards - store.used_scratch_cards;
      await store.save();
    }

    // Create reversal transaction
    const reversalTransaction = await ScratchCardTransaction.create({
      merchant_id: transaction.merchant_id,
      campaign_id: transaction.campaign_id,
      store_id: transaction.store_id,
      campaign_store_mapping_id: transaction.campaign_store_mapping_id,
      scratch_card_id: transaction.scratch_card_id,
      action_type: 'reversed',
      quantity: 1,
      created_by: reversedBy,
      remarks: `Reversed transaction ${transactionId}. Reason: ${reason}`,
      reference_number: transactionId,
      status: 'completed',
      source_system: 'web_dashboard'
    });

    // Mark original transaction as reversed
    transaction.status = 'reversed';
    await transaction.save();

    return {
      originalTransaction: transaction.toObject(),
      reversalTransaction: reversalTransaction.toObject()
    };
  }
}

export default RedemptionService;
