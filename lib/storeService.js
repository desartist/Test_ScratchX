import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";
import Account from "@/models/accountModel";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "@/lib/errors";
import ScratchCardTransaction from "@/models/scratchCardTransactionModel";

class StoreService {
  /**
   * Create a new store for a merchant
   * @param {string} merchantId - The merchant account ID
   * @param {Object} storeData - Store information
   * @param {string} createdBy - The user ID creating the store
   * @returns {Promise<Object>} - Created store object
   */
  static async createStore(merchantId, storeData, createdBy) {
    // Validate merchant exists and is a Merchant role
    const merchant = await Account.findById(merchantId);
    if (!merchant) {
      throw new NotFoundError("Merchant not found");
    }
    if (merchant.role !== "Merchant") {
      throw new ValidationError("Account is not a Merchant");
    }

    // Normalize coordinates: if location coordinates exist, populate latitude/longitude
    if (
      storeData.location &&
      Array.isArray(storeData.location.coordinates) &&
      storeData.location.coordinates.length === 2
    ) {
      if (
        storeData.longitude === undefined ||
        storeData.longitude === null ||
        storeData.longitude === ""
      ) {
        storeData.longitude = storeData.location.coordinates[0];
      }
      if (
        storeData.latitude === undefined ||
        storeData.latitude === null ||
        storeData.latitude === ""
      ) {
        storeData.latitude = storeData.location.coordinates[1];
      }
    } else if (
      storeData.latitude !== undefined &&
      storeData.latitude !== null &&
      storeData.latitude !== "" &&
      storeData.longitude !== undefined &&
      storeData.longitude !== null &&
      storeData.longitude !== ""
    ) {
      storeData.location = {
        type: "Point",
        coordinates: [
          parseFloat(storeData.longitude),
          parseFloat(storeData.latitude),
        ],
      };
    }

    // Validate required fields (store_code is now auto-generated)
    const requiredFields = [
      "store_name",
      "address",
      "city",
      "state",
      "pincode",
      "contact_person",
      "contact_number",
      "latitude",
      "longitude",
    ];
    for (const field of requiredFields) {
      if (
        storeData[field] === null ||
        storeData[field] === undefined ||
        storeData[field] === ""
      ) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Validate coordinates
    const { latitude, longitude } = storeData;
    if (latitude < -90 || latitude > 90) {
      throw new ValidationError("Latitude must be between -90 and 90");
    }
    if (longitude < -180 || longitude > 180) {
      throw new ValidationError("Longitude must be between -180 and 180");
    }

    // Auto-generate store_code if not provided
    // let storeCode = storeData.store_code;
    // if (!storeCode) {
    //   const merchantIdSuffix = merchantId.toString().slice(-6);
    //   const timestamp = Date.now();
    //   storeCode = `SC-${merchantIdSuffix}-${timestamp}`;
    // }

    // Check if store_code is unique
    // const existingStore = await Store.findOne({ store_code: storeCode.toUpperCase() });
    // if (existingStore) {
    //   throw new ValidationError('Store code already exists');
    // }

    // Create store with GeoJSON location
    const store = new Store({
      merchant_id: merchantId,
      ...storeData,
      //store_code: storeCode.toUpperCase(),
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
      },
    });

    await store.validate();
    await store.save();

    // Log transaction
    await ScratchCardTransaction.create({
      merchant_id: merchantId,
      store_id: store._id,
      action_type: "inventory_added",
      quantity: storeData.total_scratch_cards || 0,
      previous_balance: 0,
      new_balance: storeData.total_scratch_cards || 0,
      created_by: createdBy,
      remarks: `Store created: ${store.store_name}`,
      source_system: "web_dashboard",
    });

    return store.toObject();
  }

  /**
   * Get all stores for a merchant with pagination
   * @param {string} merchantId - The merchant ID
   * @param {Object} options - Pagination options { page, limit, status, searchTerm }
   * @returns {Promise<Object>} - Paginated stores list
   */
  static async getStoresByMerchant(merchantId, options = {}) {
    const { page = 1, limit = 10, status = null, searchTerm = "" } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query = { merchant_id: merchantId };
    if (status) {
      query.status = status;
    }
    if (searchTerm) {
      query.$or = [
        { store_name: new RegExp(searchTerm, "i") },
        // { store_code: new RegExp(searchTerm, 'i') },
        { city: new RegExp(searchTerm, "i") },
      ];
    }

    // Execute query with pagination
    const [stores, total] = await Promise.all([
      Store.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Store.countDocuments(query),
    ]);

    // Enrich stores with campaign counts and QR scan data
    const enrichedStores = await Promise.all(
      stores.map(async (store) => {
        // Get campaigns assigned to this store
        const campaignsCount = await Campaign.countDocuments({
          'assignedStores.storeId': store._id,
          'assignedStores.status': 'active'
        });

        // Get QR scans for this store today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setHours(23, 59, 59, 999);

        const scansToday = await ScratchCardTransaction.countDocuments({
          store_id: store._id,
          action_type: 'redeemed',
          createdAt: {
            $gte: today,
            $lte: tomorrow
          }
        });

        return {
          ...store,
          campaigns_count: campaignsCount,
          qr_scans: scansToday,
          manager_name: store.contact_person || 'Unknown',
          scratch_budget: 0 // Default value - can be enhanced if needed
        };
      })
    );

    return {
      stores: enrichedStores,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single store by ID
   * @param {string} storeId - The store ID
   * @returns {Promise<Object>} - Store object
   */
  static async getStoreById(storeId) {
    const store = await Store.findById(storeId).lean();
    if (!store) {
      throw new NotFoundError("Store not found");
    }
    return store;
  }

  /**
   * Update a store
   * @param {string} storeId - The store ID
   * @param {Object} updateData - Fields to update
   * @param {string} updatedBy - The user ID updating the store
   * @returns {Promise<Object>} - Updated store object
   */
  static async updateStore(storeId, updateData, updatedBy) {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    // Don't allow changing merchant_id
    // if (updateData.merchant_id) {
    //   throw new ValidationError('Cannot change store merchant');
    // }

    // Don't allow changing store_code
    // if (updateData.store_code && updateData.store_code !== store.store_code) {
    //   throw new ValidationError('Cannot change store code');
    // }

    // Update fields
    Object.assign(store, updateData);

    await store.validate();
    await store.save();

    return store.toObject();
  }

  /**
   * Update store inventory (add or adjust scratch cards)
   * @param {string} storeId - The store ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {string} action - Action type (inventory_added, inventory_removed)
   * @param {string} createdBy - The user ID making the update
   * @param {string} remarks - Optional remarks
   * @returns {Promise<Object>} - Updated store and transaction
   */
  static async updateStoreInventory(
    storeId,
    quantity,
    action,
    createdBy,
    remarks = "",
  ) {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    // Validate action
    if (!["inventory_added", "inventory_removed"].includes(action)) {
      throw new ValidationError("Invalid action type");
    }

    // Store current balance
    const previousBalance = store.total_scratch_cards;

    // Update totals
    if (action === "inventory_added") {
      store.total_scratch_cards += quantity;
    } else if (action === "inventory_removed") {
      store.total_scratch_cards -= quantity;
    }

    // Validate
    if (store.total_scratch_cards < 0) {
      throw new ValidationError(
        "Cannot remove more scratch cards than available",
      );
    }

    if (store.used_scratch_cards > store.total_scratch_cards) {
      throw new ValidationError("Used scratch cards exceed total after update");
    }

    // Recalculate remaining
    store.remaining_scratch_cards =
      store.total_scratch_cards - store.used_scratch_cards;

    await store.save();

    // Create transaction record
    const transaction = await ScratchCardTransaction.create({
      merchant_id: store.merchant_id,
      store_id: storeId,
      action_type: action,
      quantity: Math.abs(quantity),
      previous_balance: previousBalance,
      new_balance: store.total_scratch_cards,
      created_by: createdBy,
      remarks:
        remarks || `Inventory ${action.replace("inventory_", "")} by system`,
      source_system: "web_dashboard",
    });

    return {
      store: store.toObject(),
      transaction: transaction.toObject(),
    };
  }

  /**
   * Get inventory summary for a store
   * @param {string} storeId - The store ID
   * @returns {Promise<Object>} - Inventory summary
   */
  static async getStoreInventorySummary(storeId) {
    const store = await Store.findById(storeId).lean();
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    return {
      total: store.total_scratch_cards,
      used: store.used_scratch_cards,
      remaining: store.remaining_scratch_cards,
      utilizationPercentage:
        store.total_scratch_cards > 0
          ? Math.round(
              (store.used_scratch_cards / store.total_scratch_cards) * 100,
            )
          : 0,
    };
  }

  /**
   * Get all stores for a merchant at a glance
   * @param {string} merchantId - The merchant ID
   * @returns {Promise<Array>} - Array of stores with key metrics
   */
  static async getMerchantStoresOverview(merchantId) {
    const stores = await Store.find({ merchant_id: merchantId })
      .select(
        "store_name status total_scratch_cards used_scratch_cards remaining_scratch_cards is_main_store",
      )
      .lean();

    return stores.map((store) => ({
      ...store,
      utilizationPercentage:
        store.total_scratch_cards > 0
          ? Math.round(
              (store.used_scratch_cards / store.total_scratch_cards) * 100,
            )
          : 0,
    }));
  }

  /**
   * Delete a store by ID with cascade cleanup
   *
   * CRITICAL: When deleting a store, we must:
   * 1. Remove this store from ALL campaigns that reference it
   * 2. Update campaign inventory counts
   * 3. Only then delete the store
   *
   * @param {string} storeId - The store ID
   * @returns {Promise<Object>} - Deleted store object with cleanup stats
   */
  static async deleteStore(storeId) {
    // Step 1: Find all campaigns that reference this store
    const campaignsWithStore = await Campaign.find({
      "assignedStores.storeId": storeId,
    });

    // Step 2: Remove this store from all campaigns' assignedStores
    if (campaignsWithStore.length > 0) {
      for (const campaign of campaignsWithStore) {
        // Filter out the store being deleted
        campaign.assignedStores = (campaign.assignedStores || []).filter(
          (snapshot) => snapshot.storeId.toString() !== storeId.toString(),
        );

        // Save the cleaned campaign
        await campaign.save();
      }
    }

    // Step 3: Now safe to delete the store
    const store = await Store.findByIdAndDelete(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    return {
      ...store.toObject(),
      cascadeCleanupStats: {
        campaignsCleaned: campaignsWithStore.length,
        storeRemoved: true,
      },
    };
  }

  /**
   * Check if user can manage a store
   * @param {string} userId - The user ID
   * @param {string} storeId - The store ID
   * @param {string} userRole - The user's role
   * @returns {Promise<boolean>} - True if user can manage store
   */
  static async canManageStore(userId, storeId, userRole) {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    // Super_Admin can manage any store
    if (userRole === "Super_Admin") {
      return true;
    }

    // Merchant can manage their own stores
    if (userRole === "Merchant") {
      const user = await Account.findById(userId);
      return user && user._id.toString() === store.merchant_id.toString();
    }

    // Manager can manage stores under their merchant
    if (userRole === "Manager") {
      const user = await Account.findById(userId);
      if (user && user.parentId) {
        return user.parentId.toString() === store.merchant_id.toString();
      }
    }

    // Store_Manager can only manage their assigned store
    if (userRole === "Store_Manager") {
      return userId === storeId;
    }

    return false;
  }

  /**
   * Assign campaigns to a store
   * @param {string} storeId - The store ID
   * @param {Array<string>} campaignIds - Array of campaign IDs to assign
   * @param {string} createdBy - The user ID making the assignment
   * @returns {Promise<Object>} - Assignment result with assigned and skipped campaigns
   */
  static async assignCampaignsToStore(storeId, campaignIds, createdBy) {
    const Campaign = (await import("@/models/campaignModel")).default;

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    // Validate campaigns exist
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } });
    if (campaigns.length === 0) {
      throw new NotFoundError("No valid campaigns found");
    }

    // Validate that campaigns are in a valid state for assignment
    // (not draft or ended - must be active or paused)
    for (const campaign of campaigns) {
      if (campaign.status === "draft") {
        throw new ValidationError(
          `Cannot assign draft campaign "${campaign.name || campaign.campaignName}" to store. ` +
            `Campaign must be activated first.`,
        );
      }
      if (campaign.status === "ended") {
        throw new ValidationError(
          `Cannot assign ended campaign "${campaign.name || campaign.campaignName}" to store.`,
        );
      }
    }

    // Initialize assigned and skipped arrays
    const assigned = [];
    const skipped = [];

    // Process each campaign
    for (const campaign of campaigns) {
      // Check if store is already assigned to this campaign
      // Use assignedStores (correct field name) instead of storeSnapshots
      const existingAssignment = campaign.assignedStores?.find(
        (s) => s.storeId.toString() === storeId && s.status === "active",
      );

      if (existingAssignment) {
        // Already assigned - skip
        skipped.push({
          campaignId: campaign._id,
          campaignName: campaign.name || campaign.campaignName,
        });
      } else {
        // Not yet assigned - add to campaign's assignedStores
        if (!campaign.assignedStores) {
          campaign.assignedStores = [];
        }

        // Create store snapshot with ALL required fields from schema
        const storeSnapshot = {
          storeId: storeId,
          storeName: store.store_name || store.storeName,
          storeCode: store.store_code || `SC-${storeId.toString().slice(-6)}`,
          address: store.address || "",
          city: store.city || "",
          state: store.state || "",
          pincode: store.pincode || "000000",
          contactPerson: store.contact_person || "N/A",
          contactNumber: store.contact_number || "0000000000",
          latitude: store.latitude || 0,
          longitude: store.longitude || 0,
          allocated_scratch_cards: 0,
          used_scratch_cards: 0,
          redeemed_scratch_cards: 0,
          remaining_scratch_cards: 0,
          assignedAt: new Date(),
          assignedBy: createdBy,
          status: "active",
          lastModified: new Date(),
          lastModifiedBy: createdBy,
        };

        // Use Mongoose $push operator for nested array update (more reliable than array.push)
        try {
          const updateResult = await Campaign.findByIdAndUpdate(
            campaign._id,
            { $push: { assignedStores: storeSnapshot } },
            { new: true, runValidators: true },
          );

          if (!updateResult) {
            throw new Error("Campaign update returned null");
          }

          // Verify the store was actually added
          const storeInCampaign = updateResult.assignedStores?.some(
            (s) => s.storeId.toString() === storeId,
          );
          if (!storeInCampaign) {
            throw new Error(
              `Store not found in campaign.assignedStores after $push operation`,
            );
          }
        } catch (updateError) {
          console.error(
            `Failed to push store to campaign ${campaign._id}:`,
            updateError.message,
          );
          throw new Error(
            `Cannot assign store to campaign: ${updateError.message}`,
          );
        }

        // Also add campaign to store's assigned campaigns (bidirectional sync)
        // But first check if it's already there to prevent duplicates
        if (!store.assignedCampaigns) {
          store.assignedCampaigns = [];
        }

        const campaignExists = store.assignedCampaigns.some(
          (c) => c.campaignId.toString() === campaign._id.toString(),
        );

        if (!campaignExists) {
          store.assignedCampaigns.push({
            campaignId: campaign._id,
            campaignName: campaign.name || campaign.campaignName,
            status: campaign.status || "active",
            startDate: campaign.startDate || campaign.start_date,
            endDate: campaign.endDate || campaign.end_date,
            allocatedScratchCards:
              campaign.scratchTotal || campaign.allocated_scratch_cards || 0,
            usedScratchCards:
              campaign.scratchUsed || campaign.used_scratch_cards || 0,
            assignedAt: new Date(),
            assignedBy: createdBy,
          });
        }

        assigned.push({
          campaignId: campaign._id,
          campaignName: campaign.name || campaign.campaignName,
        });
      }
    }

    // Save store with updated campaigns
    await store.save();

    return {
      assigned,
      skipped,
      summary: {
        total: campaignIds.length,
        assigned: assigned.length,
        skipped: skipped.length,
      },
    };
  }

  /**
   * Remove campaigns from a store
   * @param {string} storeId - The store ID
   * @param {Array<string>} campaignIds - Array of campaign IDs to remove
   * @param {string} removedBy - The user ID making the removal
   * @returns {Promise<Object>} - Removal result with removed and failed campaigns
   */
  static async removeCampaignsFromStore(storeId, campaignIds, removedBy) {
    const Campaign = (await import("@/models/campaignModel")).default;

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store not found");
    }

    // Validate campaigns exist
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } });
    if (campaigns.length === 0) {
      throw new NotFoundError("No valid campaigns found");
    }

    // Initialize removed and failed arrays
    const removed = [];
    const failed = [];

    // Process each campaign
    for (const campaignId of campaignIds) {
      try {
        // Use Mongoose $pull operator to remove from campaign's assignedStores
        const campaignUpdateResult = await Campaign.findByIdAndUpdate(
          campaignId,
          { $pull: { assignedStores: { storeId: storeId } } },
          { new: true },
        );

        if (!campaignUpdateResult) {
          failed.push({
            campaignId: campaignId,
            campaignName: "Unknown",
            error: "Campaign not found",
          });
          continue;
        }

        // Verify store was actually removed
        const storeWasRemoved = !campaignUpdateResult.assignedStores?.some(
          (s) => s.storeId.toString() === storeId,
        );

        if (!storeWasRemoved) {
          failed.push({
            campaignId: campaignId,
            campaignName:
              campaignUpdateResult.name || campaignUpdateResult.campaignName,
            error: `Campaign not assigned to this store (store not found in campaign.assignedStores)`,
          });
          continue;
        }

        // Remove campaign from store's assignedCampaigns (bidirectional sync)
        const storeUpdateResult = await Store.findByIdAndUpdate(
          storeId,
          { $pull: { assignedCampaigns: { campaignId: campaignId } } },
          { new: true },
        );

        if (!storeUpdateResult) {
          failed.push({
            campaignId: campaignId,
            campaignName:
              campaignUpdateResult.name || campaignUpdateResult.campaignName,
            error: "Failed to update store",
          });
          continue;
        }

        removed.push({
          campaignId: campaignId,
          campaignName:
            campaignUpdateResult.name || campaignUpdateResult.campaignName,
        });
      } catch (err) {
        failed.push({
          campaignId: campaignId,
          campaignName: "Unknown",
          error: err.message || "Failed to remove campaign from store",
        });
      }
    }

    // Note: Store updates already saved via findByIdAndUpdate above
    // No additional save needed

    return {
      removed,
      failed,
      summary: {
        total: campaignIds.length,
        removed: removed.length,
        failed: failed.length,
      },
    };
  }
}

export default StoreService;
