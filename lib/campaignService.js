import Campaign from '@/models/campaignModel';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel';
import Store from '@/models/storeModel';
import Account from '@/models/accountModel';
import ScratchCardTransaction from '@/models/scratchCardTransactionModel';
import Range from '@/models/rangeModel';
import { ValidationError, NotFoundError } from '@/lib/errors';

// Backward compatibility - support old CouponRange if it exists
let CouponRange;
try {
  CouponRange = require('@/models/couponRangeModel');
} catch (e) {
  CouponRange = null;
}

class CampaignService {
  /**
   * Create a new campaign for a merchant (new schema)
   */
  static async createCampaign(merchantId, campaignData, createdBy) {
    // Handle both old and new formats
    if (campaignData.name) {
      // Old format - legacy support
      return this.createCampaignLegacy(merchantId, campaignData);
    }

    // New format with inventory tracking
    if (!merchantId) {
      throw new ValidationError('Merchant ID is required');
    }

    const merchant = await Account.findById(merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    const { campaignName, description, startDate, endDate, campaign_code } = campaignData;

    if (!campaignName || !startDate || !endDate) {
      throw new ValidationError('campaignName, startDate, and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new ValidationError('End date must be after start date');
    }

    if (campaign_code) {
      const existing = await Campaign.findOne({
        campaign_code: campaign_code.toUpperCase(),
        merchantId
      });
      if (existing) {
        throw new ValidationError('Campaign code already exists for this merchant');
      }
    }

    const campaign = new Campaign({
      merchantId,
      campaignName,
      description,
      startDate: start,
      endDate: end,
      campaign_code: campaign_code ? campaign_code.toUpperCase() : undefined,
      status: campaignData.status || 'draft'
    });

    await campaign.validate();
    await campaign.save();

    return campaign.toObject();
  }

  /**
   * Legacy campaign creation for backward compatibility
   */
  static async createCampaignLegacy(merchantId, campaignData) {
    if (!campaignData.name || !campaignData.name.trim()) {
      throw new ValidationError('Campaign name is required');
    }

    if (!campaignData.startDate || !campaignData.endDate) {
      throw new ValidationError('Campaign dates are required');
    }

    if (!this.validateCampaignDates(campaignData.startDate, campaignData.endDate)) {
      throw new ValidationError('End date must be after start date');
    }

    try {
      const campaign = await Campaign.create({
        merchantId,
        campaignName: campaignData.name.trim(),
        description: campaignData.description,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate
      });

      return campaign.toObject();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        throw new ValidationError(`Campaign creation failed: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Get all campaigns for a merchant with store counts
   * UPDATED: Uses embedded store snapshots + validates store existence
   *
   * CRITICAL: Cleanup stale store references at list level to prevent
   * orphaned references from appearing throughout the UI.
   */
  static async getCampaigns(merchantId, filters = {}) {
    // First, update campaign statuses based on current dates
    const now = new Date();
    await Campaign.updateMany(
      {
        merchantId,
        status: { $ne: 'ended' },
        endDate: { $lt: now }
      },
      { status: 'ended' }
    );

    // Also update any ended campaigns that now have future end dates back to active
    await Campaign.updateMany(
      {
        merchantId,
        status: 'ended',
        endDate: { $gt: now }
      },
      { status: 'active' }
    );

    const query = { merchantId };

    if (filters.status) {
      query.status = filters.status;
    }

    let campaigns = await Campaign.find(query).sort({ createdAt: -1 });

    // Collect all unique store IDs across all campaigns
    const allStoreIds = new Set();
    campaigns.forEach(campaign => {
      (campaign.assignedStores || [])
        .filter(s => s.status === 'active')
        .forEach(s => allStoreIds.add(s.storeId.toString()));
    });

    // Verify which stores actually exist
    let validStoreIds = new Set();
    if (allStoreIds.size > 0) {
      const existingStores = await Store.find({
        _id: { $in: Array.from(allStoreIds) }
      }).select('_id').lean();

      validStoreIds = new Set(existingStores.map(s => s._id.toString()));
    }

    // Cleanup stale references from all campaigns
    let campaignsNeedingUpdate = [];
    campaigns.forEach(campaign => {
      const originalStoreCount = (campaign.assignedStores || [])
        .filter(s => s.status === 'active').length;

      // Filter out deleted stores
      campaign.assignedStores = (campaign.assignedStores || [])
        .filter(s => s.status !== 'active' || validStoreIds.has(s.storeId.toString()));

      const newStoreCount = (campaign.assignedStores || [])
        .filter(s => s.status === 'active').length;

      if (originalStoreCount !== newStoreCount) {
        campaignsNeedingUpdate.push(campaign);
      }
    });

    // Save all campaigns that had stale references removed
    if (campaignsNeedingUpdate.length > 0) {
      await Promise.all(campaignsNeedingUpdate.map(c => c.save()));
    }

    // Convert to lean for return
    const campaignsLean = campaigns.map(c => c.toObject ? c.toObject() : c);

    // Fetch all ranges for these campaigns to get actual billing ranges
    const campaignIds = campaignsLean.map(c => c._id);
    const ranges = await Range.find({ campaignId: { $in: campaignIds } }).lean();
    const rangesByCampaign = {};
    ranges.forEach(range => {
      const key = range.campaignId.toString();
      if (!rangesByCampaign[key]) {
        rangesByCampaign[key] = [];
      }
      rangesByCampaign[key].push(range);
    });

    // Enrich each campaign with store count from verified snapshots
    const campaignsWithCounts = campaignsLean.map((campaign) => {
      const activeStores = (campaign.assignedStores || [])
        .filter(s => s.status === 'active');

      // Calculate total allocated and remaining from store snapshots
      const totalAllocated = activeStores.reduce((sum, s) => sum + (s.allocated_scratch_cards || 0), 0);
      const totalRemaining = activeStores.reduce((sum, s) => sum + (s.remaining_scratch_cards || 0), 0);
      const totalUsed = totalAllocated - totalRemaining;

      // Get the maximum (last added) range for this campaign
      const campaignRanges = rangesByCampaign[campaign._id.toString()] || [];
      const lastRange = campaignRanges.length > 0
        ? campaignRanges[campaignRanges.length - 1]
        : null;

      // Build price range from the last/maximum range
      let priceRange = null;
      let hasRanges = false;
      if (lastRange) {
        hasRanges = true;
        // Use the label field if available (pre-formatted), otherwise format from minAmount/maxAmount
        if (lastRange.label) {
          priceRange = lastRange.label;
        } else if (lastRange.minAmount && lastRange.maxAmount) {
          priceRange = `₹${lastRange.minAmount}-₹${lastRange.maxAmount}`;
        }
      }

      return {
        ...campaign,
        storeCount: activeStores.length,
        priceRange: priceRange,
        hasRanges: hasRanges,
        // Campaign-level totals (for dashboard display)
        scratchCardsLimit: campaign.allocated_scratch_cards || totalAllocated,
        scratchCardsUsed: campaign.used_scratch_cards || totalUsed,
        allocated_scratch_cards: campaign.allocated_scratch_cards || totalAllocated,
        remaining_scratch_cards: campaign.remaining_scratch_cards || totalRemaining,
        // Store-level allocations (for detailed view)
        storeAllocations: activeStores.map(snapshot => ({
          storeId: snapshot.storeId,
          storeName: snapshot.storeName,
          storeCode: snapshot.storeCode,
          city: snapshot.city,
          allocated_scratch_cards: snapshot.allocated_scratch_cards,
          used_scratch_cards: snapshot.used_scratch_cards,
          remaining_scratch_cards: snapshot.remaining_scratch_cards
        }))
      };
    });

    return campaignsWithCounts;
  }

  /**
   * Get campaign detail with store snapshots
   * UPDATED: Uses embedded store snapshots + validates store existence
   *
   * CRITICAL: This method now verifies that every store in assignedStores
   * actually exists in the Store collection. If a store has been deleted,
   * it's automatically removed from the campaign and the campaign is saved.
   * This prevents orphaned references from appearing in the UI.
   */
  static async getCampaignDetail(campaignId) {
    let campaign = await Campaign.findById(campaignId)
      .populate('merchantId', 'storeName email')
      .lean();

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Get all store IDs from embedded snapshots
    const storeIdsInSnapshots = (campaign.assignedStores || [])
      .filter(s => s.status === 'active')
      .map(s => s.storeId);

    // CRITICAL: Verify that all referenced stores still exist in Store collection
    let validStoreIds = [];
    if (storeIdsInSnapshots.length > 0) {
      const existingStores = await Store.find({
        _id: { $in: storeIdsInSnapshots }
      }).select('_id').lean();

      validStoreIds = existingStores.map(s => s._id.toString());
    }

    // Check if any stores were deleted (stale references)
    const staleStoreCount = storeIdsInSnapshots.filter(
      id => !validStoreIds.includes(id.toString())
    ).length;

    // If there are stale references, cleanup and save
    if (staleStoreCount > 0) {
      // Fetch the full (non-lean) campaign document for mutation
      const campaignForUpdate = await Campaign.findById(campaignId);

      // Filter out deleted stores
      campaignForUpdate.assignedStores = (campaignForUpdate.assignedStores || [])
        .filter(s => s.status !== 'active' || validStoreIds.includes(s.storeId.toString()));

      // Save cleaned campaign
      await campaignForUpdate.save();

      // Re-fetch to get the cleaned data
      campaign = await Campaign.findById(campaignId)
        .populate('merchantId', 'storeName email')
        .lean();
    }

    // Get active store assignments from verified snapshots
    const assignedStores = (campaign.assignedStores || [])
      .filter(s => s.status === 'active')
      .map(snapshot => ({
        storeId: snapshot.storeId,
        storeName: snapshot.storeName,
        storeCode: snapshot.storeCode,
        address: snapshot.address,
        city: snapshot.city,
        state: snapshot.state,
        pincode: snapshot.pincode,
        contactPerson: snapshot.contactPerson,
        contactNumber: snapshot.contactNumber,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        allocated_scratch_cards: snapshot.allocated_scratch_cards,
        used_scratch_cards: snapshot.used_scratch_cards,
        redeemed_scratch_cards: snapshot.redeemed_scratch_cards,
        remaining_scratch_cards: snapshot.remaining_scratch_cards,
        assignedAt: snapshot.assignedAt,
        assignedBy: snapshot.assignedBy,
        status: snapshot.status,
      }));

    return {
      ...campaign,
      assignedStores,
      storeCount: assignedStores.length,
      staleReferencesCleaned: staleStoreCount > 0 ? staleStoreCount : undefined
    };
  }

  /**
   * Update campaign
   */
  static async updateCampaign(campaignId, updates) {
    try {
      if (updates.startDate || updates.endDate) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
          throw new NotFoundError('Campaign not found');
        }

        const startDate = updates.startDate || campaign.startDate;
        const endDate = updates.endDate || campaign.endDate;

        if (!this.validateCampaignDates(startDate, endDate)) {
          throw new ValidationError('End date must be after start date');
        }

        // Recalculate status based on new dates
        const now = new Date();
        const newEndDate = new Date(endDate);
        if (newEndDate > now) {
          // If end date is in the future, change status from "ended" to "active"
          updates.status = 'active';
        } else if (newEndDate <= now) {
          // If end date is in the past, set status to "ended"
          updates.status = 'ended';
        }
      }

      const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        updates,
        { new: true, runValidators: true }
      );

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      return campaign.toObject();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        throw new ValidationError(`Campaign update failed: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete campaign with cascade cleanup
   *
   * CRITICAL: When deleting a campaign, we must:
   * 1. Verify it's in draft status
   * 2. Verify no store allocations exist
   * 3. Remove campaign from all stores that reference it
   * 4. Then delete the campaign
   */
  static async deleteCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'ended') {
      throw new ValidationError('Only draft and ended campaigns can be deleted');
    }

    const allocations = await CampaignStoreMapping.countDocuments({
      campaign_id: campaignId
    });
    if (allocations > 0) {
      throw new ValidationError('Cannot delete campaign with store allocations');
    }

    // CASCADE CLEANUP: Remove this campaign from all stores
    const storesWithCampaign = await Store.find({
      'assignedCampaigns.campaignId': campaignId
    });

    if (storesWithCampaign.length > 0) {
      for (const store of storesWithCampaign) {
        // Filter out the campaign being deleted
        store.assignedCampaigns = (store.assignedCampaigns || [])
          .filter(c => c.campaignId.toString() !== campaignId.toString());

        // Save the cleaned store
        await store.save();
      }
    }

    // Now safe to delete the campaign
    await Campaign.deleteOne({ _id: campaignId });

    return {
      success: true,
      cascadeCleanupStats: {
      storesCleaned: storesWithCampaign.length,
        campaignRemoved: true
      }
    };
  }

  /**
   * Assign campaign to multiple stores with store snapshots
   * NEW: Creates embedded store snapshots in campaign document
   */
  static async assignCampaignToStores(campaignId, storeIds, quantityPerStore, assignedBy) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      throw new ValidationError('storeIds must be a non-empty array');
    }

    // CRITICAL FIX: Deduplicate storeIds to prevent duplicate assignments
    const uniqueStoreIds = [...new Set(storeIds.map(id => id.toString()))];
    if (uniqueStoreIds.length < storeIds.length) {
      console.warn(`⚠️ Duplicate storeIds detected. Removed ${storeIds.length - uniqueStoreIds.length} duplicates.`);
    }
    const storeIdsToProcess = uniqueStoreIds;

    if (!quantityPerStore || quantityPerStore <= 0) {
      throw new ValidationError('quantityPerStore must be greater than 0');
    }

    // Fetch all stores to create snapshots
    const stores = await Store.find({ _id: { $in: storeIdsToProcess } });
    if (stores.length !== storeIdsToProcess.length) {
      throw new ValidationError('One or more stores not found');
    }

    // Verify all stores belong to campaign merchant
    const merchantIds = [...new Set(stores.map(s => s.merchant_id.toString()))];
    if (merchantIds.length > 1 || merchantIds[0] !== campaign.merchantId.toString()) {
      throw new ValidationError('All stores must belong to campaign merchant');
    }

    // NOTE: Store assignment allocation validation has been removed.
    // Stores can now be assigned regardless of campaign remaining scratch cards.
    // Allocation validation only occurs during customer participation.

    // Initialize assignedStores array if not present
    if (!campaign.assignedStores) {
      campaign.assignedStores = [];
    }

    const results = { successful: [], failed: [], summary: { total: storeIdsToProcess.length, success: 0, failed: 0 } };

    // Process each store
    for (const store of stores) {
      try {
        // Check for existing active assignment
        const existingAssignment = campaign.assignedStores.find(
          s => s.storeId.toString() === store._id.toString() && s.status === 'active'
        );

        if (existingAssignment) {
          throw new ValidationError('Store already assigned to this campaign');
        }

        // Create store snapshot
        const storeSnapshot = {
          storeId: store._id,
          storeName: store.store_name,
          storeCode: store.store_code || `SC-${store._id.toString().slice(-6)}`,
          address: store.address,
          city: store.city,
          state: store.state,
          pincode: store.pincode,
          contactPerson: store.contact_person,
          contactNumber: store.contact_number,

          // Critical for QR validation
          latitude: store.latitude,
          longitude: store.longitude,

          // Inventory allocation
          allocated_scratch_cards: quantityPerStore,
          used_scratch_cards: 0,
          redeemed_scratch_cards: 0,
          remaining_scratch_cards: quantityPerStore,

          // Assignment metadata
          assignedAt: new Date(),
          assignedBy: assignedBy,
          status: 'active',
          lastModified: new Date(),
          lastModifiedBy: assignedBy
        };

        // Add snapshot to campaign
        campaign.assignedStores.push(storeSnapshot);

        // Bidirectional sync: Add campaign to store's assigned campaigns
        if (!store.assignedCampaigns) {
          store.assignedCampaigns = [];
        }

        // Check if campaign is already in store's assigned campaigns
        const campaignInStore = store.assignedCampaigns.find(
          c => c.campaignId.toString() === campaign._id.toString()
        );

        if (!campaignInStore) {
          store.assignedCampaigns.push({
            campaignId: campaign._id,
            campaignName: campaign.name || campaign.campaignName,
            status: campaign.status || 'active',
            startDate: campaign.startDate || campaign.start_date,
            endDate: campaign.endDate || campaign.end_date,
            allocatedScratchCards: quantityPerStore,
            usedScratchCards: 0,
            assignedAt: new Date(),
            assignedBy: assignedBy
          });

          // Save store with updated campaigns
          await store.save();
        }

        // Create transaction record (still maintain for audit trail)
        await ScratchCardTransaction.create({
          merchant_id: campaign.merchantId,
          campaign_id: campaignId,
          store_id: store._id,
          action_type: 'allocated_to_store',
          quantity: quantityPerStore,
          previous_balance: 0,
          new_balance: quantityPerStore,
          created_by: assignedBy,
          remarks: 'Campaign assigned to store via snapshot',
          source_system: 'web_dashboard'
        });

        results.successful.push({
          storeId: store._id,
          storeName: store.store_name,
          allocated: quantityPerStore,
          snapshot: storeSnapshot
        });
        results.summary.success++;

      } catch (error) {
        results.failed.push({
          storeId: store._id,
          storeName: store.store_name,
          error: error.message
        });
        results.summary.failed++;
      }
    }

    // Save campaign with all new snapshots
    await campaign.save();

    return results;
  }

  /**
   * Remove store from campaign (soft delete)
   */
  static async removeStoreFromCampaign(campaignId, storeId, removedBy) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    const assignment = campaign.assignedStores?.find(
      s => s.storeId.toString() === storeId.toString() && s.status === 'active'
    );

    if (!assignment) {
      throw new NotFoundError('Store assignment not found or already removed');
    }

    // Soft delete: mark as removed
    assignment.status = 'removed';
    assignment.lastModified = new Date();
    assignment.lastModifiedBy = removedBy;

    // Bidirectional sync: Remove campaign from store's assigned campaigns
    if (store.assignedCampaigns) {
      const campaignIndex = store.assignedCampaigns.findIndex(
        c => c.campaignId.toString() === campaign._id.toString()
      );

      if (campaignIndex >= 0) {
        store.assignedCampaigns.splice(campaignIndex, 1);
        await store.save();
      }
    }

    await campaign.save();

    return {
      success: true,
      message: 'Store removed from campaign',
      assignment
    };
  }

  /**
   * Get assigned stores for a campaign (with option to include removed)
   */
  static async getAssignedStoresSnapshot(campaignId, includeRemoved = false) {
    const campaign = await Campaign.findById(campaignId).select('assignedStores').lean();

    if (!campaign || !campaign.assignedStores) {
      return [];
    }

    let stores = campaign.assignedStores;

    if (!includeRemoved) {
      stores = stores.filter(s => s.status === 'active');
    }

    return stores;
  }

  /**
   * Get active store count for a campaign (optimized query)
   */
  static async getStoreCountByCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId).select('assignedStores').lean();

    if (!campaign || !campaign.assignedStores) {
      return 0;
    }

    return campaign.assignedStores.filter(s => s.status === 'active').length;
  }

  /**
   * Get campaign with all store snapshots
   */
  static async getCampaignWithStores(campaignId, includeRemoved = false) {
    const campaign = await Campaign.findById(campaignId)
      .populate('merchantId', 'storeName email')
      .lean();

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Filter store assignments
    let assignedStores = campaign.assignedStores || [];
    if (!includeRemoved) {
      assignedStores = assignedStores.filter(s => s.status === 'active');
    }

    return {
      ...campaign,
      assignedStores,
      storeCount: assignedStores.filter(s => s.status === 'active').length
    };
  }

  /**
   * Get campaigns assigned to a store
   */
  static async getCampaignsByStore(storeId) {
    const mappings = await CampaignStoreMapping.find({ store_id: storeId })
      .populate('campaign_id', 'campaignName campaign_code status startDate endDate')
      .lean();

    return mappings.map(m => ({
      ...m.campaign_id,
      allocation: {
        allocated: m.allocated_scratch_cards,
        used: m.used_scratch_cards,
        redeemed: m.redeemed_scratch_cards,
        remaining: m.remaining_scratch_cards
      },
      mappingId: m._id,
      status: m.status
    }));
  }

  /**
   * Get campaign inventory summary
   */
  static async getCampaignInventorySummary(campaignId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const storeAllocations = await CampaignStoreMapping.find({
      campaign_id: campaignId,
      status: { $in: ['active', 'paused'] }
    }).lean();

    return {
      campaign: { id: campaign._id, name: campaign.campaignName, status: campaign.status },
      inventory: {
        total_allocated: campaign.allocated_scratch_cards,
        total_used: campaign.used_scratch_cards,
        total_redeemed: campaign.redeemed_scratch_cards,
        total_remaining: campaign.remaining_scratch_cards,
        utilization_percentage: campaign.allocated_scratch_cards > 0
          ? Math.round((campaign.used_scratch_cards / campaign.allocated_scratch_cards) * 100)
          : 0
      },
      store_count: storeAllocations.length
    };
  }

  /**
   * Create a new QR code range for a campaign (legacy support)
   */
  static async createRange(campaignId, rangeData) {
    if (!CouponRange) {
      throw new ValidationError('CouponRange model not available');
    }

    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      if (!this.validateCampaignDates(rangeData.generatedDate, rangeData.expiryDate)) {
        throw new ValidationError('Expiry date must be after generated date');
      }

      const range = await CouponRange.create({
        campaignId,
        startCode: rangeData.startCode,
        endCode: rangeData.endCode,
        totalCodes: rangeData.totalCodes,
        generatedDate: rangeData.generatedDate,
        expiryDate: rangeData.expiryDate
      });

      return range;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        throw new ValidationError(`Range creation failed: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Get all ranges for a campaign (legacy support)
   */
  static async getRanges(campaignId) {
    if (!CouponRange) {
      return [];
    }
    return await CouponRange.find({ campaignId }).sort({ createdAt: -1 });
  }

  /**
   * Delete a QR code range (legacy support)
   */
  static async deleteRange(rangeId) {
    if (!CouponRange) {
      throw new ValidationError('CouponRange model not available');
    }
    const range = await CouponRange.findByIdAndDelete(rangeId);
    if (!range) {
      throw new NotFoundError('Range not found');
    }
    return range;
  }

  /**
   * Validate campaign dates
   */
  static validateCampaignDates(startDate, endDate) {
    return endDate >= startDate;
  }

  /**
   * Calculate metrics for a range
   */
  static calculateRangeMetrics(range) {
    const totalCodes = range.totalCodes || 0;
    const usedCodes = range.usedCodes || 0;
    const usagePercentage = totalCodes > 0 ? (usedCodes / totalCodes) * 100 : 0;

    return {
      totalCodes,
      usedCodes,
      usagePercentage: Math.round(usagePercentage),
      codesScanned: range.tracking?.codesScanned || 0
    };
  }

  /**
   * Check if campaign can generate more QR codes
   */
  static canGenerateQRCodes(campaign) {
    return campaign.generatedQRCodes < campaign.totalQRCodes;
  }

  /**
   * Validate campaign can be activated
   */
  static validateCanActivate(campaign) {
    const errors = [];

    if (!campaign.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
      errors.push('Please allocate scratch cards before activating the campaign.');
    }

    if (!campaign.storeAllocations || campaign.storeAllocations.length === 0) {
      errors.push('Please assign at least one store before activating.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate status transition is allowed
   */
  static canTransitionToStatus(currentStatus, newStatus) {
    const validTransitions = {
      draft: ['active'],
      active: ['paused', 'ended'],
      paused: ['active', 'ended'],
      ended: []
    };

    const current = currentStatus?.toLowerCase() || 'draft';
    const valid = validTransitions[current] || [];

    return valid.includes(newStatus?.toLowerCase());
  }
}

export default CampaignService;
