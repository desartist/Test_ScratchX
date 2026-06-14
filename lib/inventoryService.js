import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';
import Account from '@/models/accountModel';
import { ValidationError, NotFoundError } from '@/lib/errors';

class InventoryService {
  /**
   * Allocate scratch cards from merchant to campaign
   * @param {string} merchantId - The merchant ID
   * @param {string} campaignId - The campaign ID
   * @param {number} quantity - Quantity to allocate
   * @param {string} allocatedBy - User ID making the allocation
   * @returns {Promise<Object>} - Updated campaign and transaction
   */
  static async allocateToCampaign(merchantId, campaignId, quantity, allocatedBy) {
    // Validate campaign exists and belongs to merchant
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    if (campaign.merchantId.toString() !== merchantId) {
      throw new ValidationError('Campaign does not belong to this merchant');
    }

    // Validate quantity
    if (!quantity || quantity <= 0) {
      throw new ValidationError('Allocation quantity must be greater than 0');
    }

    // Get merchant
    const merchant = await Account.findById(merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    // Check if merchant has enough remaining inventory
    if (merchant.remaining_scratch_cards < quantity) {
      throw new ValidationError(
        `Insufficient inventory. Available: ${merchant.remaining_scratch_cards}, Requested: ${quantity}`
      );
    }

    // Store previous values for transaction logging
    const previousCampaignAllocated = campaign.allocated_scratch_cards;

    // Update campaign
    campaign.allocated_scratch_cards += quantity;
    campaign.remaining_scratch_cards = campaign.allocated_scratch_cards -
                                        campaign.used_scratch_cards -
                                        campaign.redeemed_scratch_cards;

    await campaign.validate();
    await campaign.save();

    // Create transaction record
    const transaction = await ScratchCardTransaction.create({
      merchant_id: merchantId,
      campaign_id: campaignId,
      action_type: 'allocated_to_campaign',
      quantity,
      previous_balance: previousCampaignAllocated,
      new_balance: campaign.allocated_scratch_cards,
      created_by: allocatedBy,
      remarks: `Allocated to campaign: ${campaign.campaignName}`,
      source_system: 'web_dashboard'
    });

    return {
      campaign: campaign.toObject(),
      transaction: transaction.toObject()
    };
  }

  /**
   * Allocate scratch cards from campaign to store
   * @param {string} merchantId - The merchant ID
   * @param {string} campaignId - The campaign ID
   * @param {string} storeId - The store ID
   * @param {number} quantity - Quantity to allocate
   * @param {string} allocatedBy - User ID making the allocation
   * @returns {Promise<Object>} - Created/updated mapping and transaction
   */
  static async allocateToStore(merchantId, campaignId, storeId, quantity, allocatedBy) {
    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }
    if (campaign.merchantId.toString() !== merchantId) {
      throw new ValidationError('Campaign does not belong to this merchant');
    }

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }
    if (store.merchant_id.toString() !== merchantId) {
      throw new ValidationError('Store does not belong to this merchant');
    }

    // Validate quantity
    if (!quantity || quantity <= 0) {
      throw new ValidationError('Allocation quantity must be greater than 0');
    }

    // Check if campaign has enough remaining allocation
    if (campaign.remaining_scratch_cards < quantity) {
      throw new ValidationError(
        `Campaign has insufficient allocation. Available: ${campaign.remaining_scratch_cards}, Requested: ${quantity}`
      );
    }

    // Check if store has space (total allocation can't exceed what merchant has)
    const totalAllocatedToStore = await CampaignStoreMapping.aggregate([
      {
        $match: {
          merchant_id: merchantId,
          store_id: storeId,
          status: { $in: ['active', 'paused'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$allocated_scratch_cards' }
        }
      }
    ]);

    const currentlyAllocated = totalAllocatedToStore.length > 0 ? totalAllocatedToStore[0].total : 0;

    if (currentlyAllocated + quantity > store.total_scratch_cards) {
      throw new ValidationError(
        `Store allocation would exceed total inventory. Current: ${currentlyAllocated}, Requested: ${quantity}, Available: ${store.total_scratch_cards}`
      );
    }

    // Check or create mapping
    let mapping = await CampaignStoreMapping.findOne({
      campaign_id: campaignId,
      store_id: storeId,
      merchant_id: merchantId
    });

    if (mapping) {
      // Update existing mapping
      const previousAllocated = mapping.allocated_scratch_cards;
      mapping.allocated_scratch_cards += quantity;
      mapping.remaining_scratch_cards = mapping.allocated_scratch_cards -
                                        mapping.used_scratch_cards -
                                        mapping.redeemed_scratch_cards;

      await mapping.validate();
      await mapping.save();

      // Create transaction
      const transaction = await ScratchCardTransaction.create({
        merchant_id: merchantId,
        campaign_id: campaignId,
        store_id: storeId,
        campaign_store_mapping_id: mapping._id,
        action_type: 'allocated_to_store',
        quantity,
        previous_balance: previousAllocated,
        new_balance: mapping.allocated_scratch_cards,
        created_by: allocatedBy,
        remarks: `Additional allocation to store`,
        source_system: 'web_dashboard'
      });

      return {
        mapping: mapping.toObject(),
        transaction: transaction.toObject(),
        isNew: false
      };
    } else {
      // Create new mapping
      const newMapping = new CampaignStoreMapping({
        campaign_id: campaignId,
        store_id: storeId,
        merchant_id: merchantId,
        allocated_scratch_cards: quantity,
        allocation_by: allocatedBy,
        status: 'active'
      });

      await newMapping.validate();
      await newMapping.save();

      // Create transaction
      const transaction = await ScratchCardTransaction.create({
        merchant_id: merchantId,
        campaign_id: campaignId,
        store_id: storeId,
        campaign_store_mapping_id: newMapping._id,
        action_type: 'allocated_to_store',
        quantity,
        previous_balance: 0,
        new_balance: quantity,
        created_by: allocatedBy,
        remarks: `Initial allocation to store`,
        source_system: 'web_dashboard'
      });

      return {
        mapping: newMapping.toObject(),
        transaction: transaction.toObject(),
        isNew: true
      };
    }
  }

  /**
   * Get inventory allocation status for a campaign
   * @param {string} campaignId - The campaign ID
   * @returns {Promise<Object>} - Allocation summary
   */
  static async getCampaignInventoryStatus(campaignId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Get store allocations
    const storeAllocations = await CampaignStoreMapping.find({
      campaign_id: campaignId,
      status: { $in: ['active', 'paused'] }
    })
      .populate('store_id', 'store_name store_code')
      .lean();

    return {
      campaign: {
        id: campaign._id,
        name: campaign.campaignName,
        status: campaign.status
      },
      allocation: {
        total: campaign.allocated_scratch_cards,
        used: campaign.used_scratch_cards,
        redeemed: campaign.redeemed_scratch_cards,
        remaining: campaign.remaining_scratch_cards,
        utilizationPercentage: campaign.allocated_scratch_cards > 0
          ? Math.round((campaign.used_scratch_cards / campaign.allocated_scratch_cards) * 100)
          : 0
      },
      storeAllocations: storeAllocations.map(mapping => ({
        storeId: mapping.store_id._id,
        storeName: mapping.store_id.store_name,
        storeCode: mapping.store_id.store_code,
        allocated: mapping.allocated_scratch_cards,
        used: mapping.used_scratch_cards,
        redeemed: mapping.redeemed_scratch_cards,
        remaining: mapping.remaining_scratch_cards,
        status: mapping.status
      }))
    };
  }

  /**
   * Get inventory status for a store
   * @param {string} storeId - The store ID
   * @returns {Promise<Object>} - Store inventory summary with campaign breakdown
   */
  static async getStoreInventoryStatus(storeId) {
    const store = await Store.findById(storeId).lean();
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    // Get campaign allocations to this store
    const campaignAllocations = await CampaignStoreMapping.find({
      store_id: storeId,
      status: { $in: ['active', 'paused'] }
    })
      .populate('campaign_id', 'campaignName campaign_code status')
      .lean();

    const totalAllocated = campaignAllocations.reduce((sum, m) => sum + m.allocated_scratch_cards, 0);
    const totalUsed = campaignAllocations.reduce((sum, m) => sum + m.used_scratch_cards, 0);
    const totalRedeemed = campaignAllocations.reduce((sum, m) => sum + m.redeemed_scratch_cards, 0);

    return {
      store: {
        id: store._id,
        name: store.store_name,
        code: store.store_code,
        status: store.status
      },
      inventory: {
        total: store.total_scratch_cards,
        allocated: totalAllocated,
        used: totalUsed,
        redeemed: totalRedeemed,
        unallocated: store.total_scratch_cards - totalAllocated,
        utilizationPercentage: store.total_scratch_cards > 0
          ? Math.round(((totalUsed + totalRedeemed) / store.total_scratch_cards) * 100)
          : 0
      },
      campaignAllocations: campaignAllocations.map(mapping => ({
        campaignId: mapping.campaign_id._id,
        campaignName: mapping.campaign_id.campaignName,
        campaignCode: mapping.campaign_id.campaign_code,
        allocated: mapping.allocated_scratch_cards,
        used: mapping.used_scratch_cards,
        redeemed: mapping.redeemed_scratch_cards,
        remaining: mapping.remaining_scratch_cards,
        status: mapping.status
      }))
    };
  }

  /**
   * Get allocation history for audit purposes
   * @param {string} merchantId - The merchant ID
   * @param {Object} filters - Filter options { campaignId, storeId, startDate, endDate }
   * @returns {Promise<Array>} - Transaction history
   */
  static async getAllocationHistory(merchantId, filters = {}) {
    const { campaignId, storeId, startDate, endDate } = filters;

    const query = {
      merchant_id: merchantId,
      action_type: { $in: ['allocated_to_campaign', 'allocated_to_store'] }
    };

    if (campaignId) {
      query.campaign_id = campaignId;
    }

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

    const history = await ScratchCardTransaction.find(query)
      .populate('campaign_id', 'campaignName campaign_code')
      .populate('store_id', 'store_name store_code')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return history;
  }
}

export default InventoryService;
