import mongoose from 'mongoose';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';
import ScratchCardRecord from '@/models/scratchCardRecordModel';
import Range from '@/models/rangeModel';
import CustomerParticipation from '@/models/customerParticipationModel';
import Account from '@/models/accountModel';
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from '@/lib/errors';
import { isExpired } from '@/lib/services/expiryManagementService';
import {
  takeRewardStock,
  returnRewardStock,
  runAllOrNothing,
} from '@/lib/services/rewardInventoryService';

class RedemptionService {
  /**
   * Redeem a single issued scratch card at a store.
   *
   * The scratch card record is the source of truth: campaign, store and
   * reward come from it, never from the caller, so a redemption can't be
   * pointed at another campaign's or store's stock.
   *
   * Order of operations (all-or-nothing — runAllOrNothing):
   *   1. CLAIM the card: one conditional update 'revealed' → 'redeemed'.
   *      Only one concurrent request can win; a duplicate / retried request
   *      gets "already redeemed" and deducts nothing.
   *   2. Take one unit of reward stock, if the reward is quantity-limited —
   *      a conditional `remainingQuantity > 0` decrement, so the last unit
   *      can't be redeemed twice and stock never goes negative. Hitting 0
   *      switches the reward inactive. Unlimited rewards are untouched.
   *   3. Participation → 'redeemed', inventory counters, ledger entry.
   * Any failure rolls every step back (a real transaction on Atlas; undo
   * steps on a standalone server), so stock and redemption records never
   * disagree.
   *
   * Store allocation: the campaign must be assigned to the store — via an
   * active CampaignStoreMapping when store-level inventory is in use, or via
   * the campaign's own assignedStores list otherwise. (This used to REQUIRE
   * a mapping, which the normal assign flow never creates, so every
   * redemption failed with "Campaign not allocated to this store".)
   *
   * @param {string} merchantId - kept for the existing signature (not trusted)
   * @param {string} campaignId - if given, must match the card's campaign
   * @param {string} storeId - the redeeming staff member's store
   * @param {string} scratchCardId - the issued card
   * @param {string} redeemedBy - account id of the redeemer
   * @param {string} remarks
   * @returns {Promise<Object>} { success, redemption, inventory, transaction, stock }
   * @throws {ValidationError|NotFoundError|AuthorizationError|ConflictError}
   *   ConflictError carries code ALREADY_REDEEMED or OUT_OF_STOCK.
   */
  static async redeemScratchCard(
    merchantId,
    campaignId,
    storeId,
    scratchCardId,
    redeemedBy,
    remarks = ''
  ) {
    if (!mongoose.Types.ObjectId.isValid(String(scratchCardId))) {
      throw new ValidationError('Invalid scratch card ID');
    }

    const card = await ScratchCardRecord.findById(scratchCardId).lean();
    if (!card) {
      throw new NotFoundError('Scratch card not found');
    }
    if (campaignId && String(card.campaign_id) !== String(campaignId)) {
      throw new ValidationError('This scratch card does not belong to that campaign');
    }
    if (!storeId || String(card.store_id) !== String(storeId)) {
      throw new AuthorizationError('This card does not belong to your store');
    }
    if (card.status === 'redeemed') {
      const err = new ConflictError('This reward has already been redeemed');
      err.code = 'ALREADY_REDEEMED';
      throw err;
    }
    if (card.status !== 'revealed') {
      throw new ValidationError(
        `Scratch card must be in 'revealed' status to redeem. Current status: ${card.status}`
      );
    }
    if (isExpired(card)) {
      throw new ValidationError('Scratch card has expired and cannot be redeemed');
    }

    // Archived (deleted) campaigns are hidden by the campaign model's query
    // middleware, so they come back as not found here.
    const campaign = await Campaign.findById(card.campaign_id).lean();
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    if (campaign.status !== 'active') {
      throw new ValidationError(`Campaign is ${campaign.status}, redemption not allowed`);
    }
    const now = new Date();
    if (campaign.startDate && now < new Date(campaign.startDate)) {
      throw new ValidationError('Campaign has not started yet');
    }
    if (campaign.endDate && now > new Date(campaign.endDate)) {
      throw new ValidationError('Campaign has ended');
    }

    const mapping = await CampaignStoreMapping.findOne({
      campaign_id: card.campaign_id,
      store_id: card.store_id,
    }).lean();
    if (mapping) {
      if (mapping.status !== 'active') {
        throw new ValidationError(`Campaign-store allocation is ${mapping.status}, redemption not allowed`);
      }
      if (mapping.remaining_scratch_cards <= 0) {
        throw new ValidationError('No scratch cards available for redemption');
      }
    } else {
      const assigned = (campaign.assignedStores || []).some(
        (s) => String(s.storeId) === String(card.store_id) && s.status !== 'removed'
      );
      if (!assigned) {
        throw new NotFoundError('Campaign not allocated to this store');
      }
    }

    const store = await Store.findById(card.store_id).select('store_name').lean();

    const outcome = await runAllOrNothing(async ({ session, onRollback }) => {
      // 1. Claim — the single point that makes redemption happen once.
      const claimed = await ScratchCardRecord.findOneAndUpdate(
        { _id: card._id, status: 'revealed' },
        { $set: { status: 'redeemed', redeemed_at: now } },
        { new: true, session }
      );
      if (!claimed) {
        const err = new ConflictError('This reward has already been redeemed');
        err.code = 'ALREADY_REDEEMED';
        throw err;
      }
      onRollback(() =>
        ScratchCardRecord.updateOne(
          { _id: card._id, status: 'redeemed', redeemed_at: now },
          { $set: { status: 'revealed', redeemed_at: null } }
        )
      );

      // 2. Reward stock (only quantity-limited rewards are touched). A card
      // revealed while the cashier flow was off already took its unit at
      // reveal (stock_stage 'reveal') — never take a second one.
      const stock = claimed.stock_stage === 'reveal'
        ? { tracked: false }
        : await takeRewardStock({
            rangeId: card.range_id,
            rewardId: card.reward_id,
            session,
          });
      if (stock.tracked) {
        onRollback(() =>
          returnRewardStock({
            rangeId: card.range_id,
            rewardId: card.reward_id,
            reactivate: stock.deactivated,
          })
        );
      }

      // 3a. Participation.
      await CustomerParticipation.updateOne(
        { _id: card.customer_participation_id },
        { $set: { status: 'redeemed', redeemed_at: now } },
        { session }
      );
      onRollback(() =>
        CustomerParticipation.updateOne(
          { _id: card.customer_participation_id, status: 'redeemed' },
          { $set: { status: 'revealed', redeemed_at: null } }
        )
      );

      // 3b. Inventory counters — atomic $inc, never read-modify-save.
      let mappingRemaining = null;
      let storeRemaining = null;
      if (mapping) {
        const m = await CampaignStoreMapping.findOneAndUpdate(
          { _id: mapping._id, remaining_scratch_cards: { $gt: 0 } },
          { $inc: { redeemed_scratch_cards: 1, remaining_scratch_cards: -1 } },
          { new: true, session }
        );
        if (!m) {
          throw new ValidationError('No scratch cards available for redemption');
        }
        mappingRemaining = m.remaining_scratch_cards;
        onRollback(() =>
          CampaignStoreMapping.updateOne(
            { _id: mapping._id },
            { $inc: { redeemed_scratch_cards: -1, remaining_scratch_cards: 1 } }
          )
        );

        // Store-level inventory only exists alongside a store mapping.
        const s = await Store.findOneAndUpdate(
          { _id: card.store_id, $expr: { $lt: ['$used_scratch_cards', '$total_scratch_cards'] } },
          { $inc: { used_scratch_cards: 1, remaining_scratch_cards: -1 } },
          { new: true, session }
        );
        if (!s) {
          throw new ValidationError('This store has no scratch cards left');
        }
        storeRemaining = s.remaining_scratch_cards;
        onRollback(() =>
          Store.updateOne(
            { _id: card.store_id },
            { $inc: { used_scratch_cards: -1, remaining_scratch_cards: 1 } }
          )
        );
      }

      // Campaign-level counters are NOT touched here: the reveal route
      // (participate/[id]/reveal → redeemInventory) already adds the card to
      // campaign.redeemed_scratch_cards when it's revealed. Counting it again
      // at redemption would double every card in the dashboards now that
      // staff redemption actually succeeds (before, it always failed on the
      // missing store mapping, so only the reveal count ever applied).

      // 3c. Ledger.
      const previousBalance = mapping ? mapping.remaining_scratch_cards : campaign.remaining_scratch_cards;
      const [transaction] = await ScratchCardTransaction.create(
        [
          {
            merchant_id: campaign.merchantId,
            campaign_id: card.campaign_id,
            store_id: card.store_id,
            campaign_store_mapping_id: mapping ? mapping._id : null,
            scratch_card_id: String(card._id),
            action_type: 'redeemed',
            quantity: 1,
            previous_balance: previousBalance,
            new_balance: mapping ? mappingRemaining : Math.max(0, (previousBalance || 0) - 1),
            created_by: redeemedBy,
            remarks: remarks || 'Scratch card redeemed at store',
            source_system: 'web_dashboard',
            status: 'completed',
          },
        ],
        { session }
      );
      onRollback(() => ScratchCardTransaction.deleteOne({ _id: transaction._id }));

      return { transaction, stock, mappingRemaining, storeRemaining };
    });

    return {
      success: true,
      redemption: {
        scratchCardId: String(card._id),
        campaignId: campaign._id,
        campaignName: campaign.campaignName,
        storeId: card.store_id,
        storeName: store?.store_name || null,
        redeemedAt: now,
        transactionId: outcome.transaction._id,
      },
      inventory: {
        mappingRemaining: outcome.mappingRemaining,
        campaignRemaining: campaign.remaining_scratch_cards ?? null,
        storeRemaining: outcome.storeRemaining,
      },
      stock: outcome.stock,
      transaction: outcome.transaction.toObject(),
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
    const original = await ScratchCardTransaction.findById(transactionId).lean();
    if (!original) {
      throw new NotFoundError('Transaction not found');
    }
    if (original.action_type !== 'redeemed') {
      throw new ValidationError('Only redeemed transactions can be reversed');
    }
    if (original.status !== 'completed') {
      throw new ValidationError('Only completed transactions can be reversed');
    }

    // A reversal is a true undo: the card goes back to 'revealed' and a
    // quantity-limited reward gets its unit of stock back — otherwise
    // remainingQuantity would stay below total − (redemptions that count).
    // The reward is NOT re-activated even if it had auto-deactivated at
    // zero; the merchant decides that.
    const card = original.scratch_card_id && mongoose.Types.ObjectId.isValid(String(original.scratch_card_id))
      ? await ScratchCardRecord.findById(original.scratch_card_id).lean()
      : null;

    return runAllOrNothing(async ({ session, onRollback }) => {
      // Flip the original first: a second concurrent reversal finds it
      // already 'reversed' and stops here.
      const flipped = await ScratchCardTransaction.findOneAndUpdate(
        { _id: original._id, status: 'completed' },
        { $set: { status: 'reversed' } },
        { new: true, session }
      );
      if (!flipped) {
        throw new ConflictError('This redemption has already been reversed');
      }
      onRollback(() =>
        ScratchCardTransaction.updateOne({ _id: original._id }, { $set: { status: 'completed' } })
      );

      if (card && card.status === 'redeemed') {
        await ScratchCardRecord.updateOne(
          { _id: card._id, status: 'redeemed' },
          { $set: { status: 'revealed', redeemed_at: null } },
          { session }
        );
        onRollback(() =>
          ScratchCardRecord.updateOne(
            { _id: card._id },
            { $set: { status: 'redeemed', redeemed_at: card.redeemed_at } }
          )
        );
        await CustomerParticipation.updateOne(
          { _id: card.customer_participation_id, status: 'redeemed' },
          { $set: { status: 'revealed', redeemed_at: null } },
          { session }
        );
        onRollback(() =>
          CustomerParticipation.updateOne(
            { _id: card.customer_participation_id },
            { $set: { status: 'redeemed', redeemed_at: card.redeemed_at } }
          )
        );

        // Stock taken at reveal stays taken: the card is still revealed.
        if (card.reward_id && card.stock_stage !== 'reveal') {
          const back = await Range.updateOne(
            {
              _id: card.range_id,
              rewards: {
                $elemMatch: {
                  rewardId: String(card.reward_id),
                  quantityEnabled: true,
                  redeemedQuantity: { $gt: 0 },
                },
              },
            },
            {
              $inc: {
                'rewards.$.remainingQuantity': 1,
                'rewards.$.redeemedQuantity': -1,
                rewardsVersion: 1,
              },
            },
            { session }
          );
          if (back.modifiedCount === 1) {
            onRollback(() =>
              Range.updateOne(
                { _id: card.range_id, rewards: { $elemMatch: { rewardId: String(card.reward_id) } } },
                {
                  $inc: {
                    'rewards.$.remainingQuantity': -1,
                    'rewards.$.redeemedQuantity': 1,
                    rewardsVersion: 1,
                  },
                }
              )
            );
          }
        }
      }

      if (original.campaign_store_mapping_id) {
        await CampaignStoreMapping.updateOne(
          { _id: original.campaign_store_mapping_id, redeemed_scratch_cards: { $gt: 0 } },
          { $inc: { redeemed_scratch_cards: -1, remaining_scratch_cards: 1 } },
          { session }
        );
        await Store.updateOne(
          { _id: original.store_id, used_scratch_cards: { $gt: 0 } },
          { $inc: { used_scratch_cards: -1, remaining_scratch_cards: 1 } },
          { session }
        );
      }
      // Campaign counters: redemption no longer changes them (see
      // redeemScratchCard), so a reversal mustn't either.

      const [reversalTransaction] = await ScratchCardTransaction.create(
        [
          {
            merchant_id: original.merchant_id,
            campaign_id: original.campaign_id,
            store_id: original.store_id,
            campaign_store_mapping_id: original.campaign_store_mapping_id,
            scratch_card_id: original.scratch_card_id,
            action_type: 'reversed',
            quantity: 1,
            created_by: reversedBy,
            remarks: `Reversed transaction ${transactionId}. Reason: ${reason}`,
            reference_number: String(transactionId),
            status: 'completed',
            source_system: 'web_dashboard',
          },
        ],
        { session }
      );
      onRollback(() => ScratchCardTransaction.deleteOne({ _id: reversalTransaction._id }));

      return {
        originalTransaction: flipped.toObject(),
        reversalTransaction: reversalTransaction.toObject(),
      };
    });
  }
}

export default RedemptionService;
