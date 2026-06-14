import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';

/**
 * Database Consistency Service
 *
 * This service verifies and repairs bidirectional relationships between
 * Campaign and Store collections. It ensures that:
 *
 * 1. Every store in campaign.assignedStores exists in Store collection
 * 2. Every campaign in store.assignedCampaigns exists in Campaign collection
 * 3. No orphaned references exist
 * 4. Both sides of the relationship are synchronized
 */
class DatabaseConsistencyService {
  /**
   * Comprehensive consistency check and repair
   *
   * @returns {Promise<Object>} - Report of issues found and fixed
   */
  static async syncCampaignStoreRelationships() {
    const report = {
      timestamp: new Date().toISOString(),
      issues: {
        orphanedStoresInCampaigns: 0,
        orphanedCampaignsInStores: 0,
        missingBidirectionalLinks: 0,
        extraBidirectionalLinks: 0,
      },
      fixes: {
        removedOrphanedStores: 0,
        removedOrphanedCampaigns: 0,
        addedMissingLinks: 0,
        removedExtraLinks: 0,
      },
      campaignsCleaned: [],
      storesCleaned: [],
    };

    try {
      // ===== PHASE 1: Check campaigns for orphaned stores =====
      const campaigns = await Campaign.find({});
      for (const campaign of campaigns) {
        const originalStoreCount = (campaign.assignedStores || []).length;

        // Verify each store in campaign exists
        if (campaign.assignedStores && campaign.assignedStores.length > 0) {
          const storeIds = campaign.assignedStores.map(s => s.storeId);
          const existingStores = await Store.find({
            _id: { $in: storeIds }
          }).select('_id').lean();

          const existingIds = new Set(existingStores.map(s => s._id.toString()));

          // Remove orphaned stores
          const beforeFilter = campaign.assignedStores.length;
          campaign.assignedStores = campaign.assignedStores.filter(
            s => existingIds.has(s.storeId.toString())
          );

          if (beforeFilter !== campaign.assignedStores.length) {
            const removed = beforeFilter - campaign.assignedStores.length;
            report.issues.orphanedStoresInCampaigns += removed;
            report.fixes.removedOrphanedStores += removed;

            await campaign.save();
            report.campaignsCleaned.push({
              campaignId: campaign._id,
              campaignName: campaign.campaignName,
              storesRemoved: removed,
            });
          }
        }
      }

      // ===== PHASE 2: Check stores for orphaned campaigns =====
      const stores = await Store.find({});
      for (const store of stores) {
        if (store.assignedCampaigns && store.assignedCampaigns.length > 0) {
          const campaignIds = store.assignedCampaigns.map(c => c.campaignId);
          const existingCampaigns = await Campaign.find({
            _id: { $in: campaignIds }
          }).select('_id').lean();

          const existingIds = new Set(existingCampaigns.map(c => c._id.toString()));

          // Remove orphaned campaigns
          const beforeFilter = store.assignedCampaigns.length;
          store.assignedCampaigns = store.assignedCampaigns.filter(
            c => existingIds.has(c.campaignId.toString())
          );

          if (beforeFilter !== store.assignedCampaigns.length) {
            const removed = beforeFilter - store.assignedCampaigns.length;
            report.issues.orphanedCampaignsInStores += removed;
            report.fixes.removedOrphanedCampaigns += removed;

            await store.save();
            report.storesCleaned.push({
              storeId: store._id,
              storeName: store.store_name,
              campaignsRemoved: removed,
            });
          }
        }
      }

      // ===== PHASE 3: Verify bidirectional sync =====
      // For each campaign store relationship, verify it exists on both sides
      for (const campaign of campaigns) {
        if (campaign.assignedStores && campaign.assignedStores.length > 0) {
          for (const storeSnapshot of campaign.assignedStores) {
            const store = await Store.findById(storeSnapshot.storeId);
            if (store && store.assignedCampaigns) {
              // Check if this campaign exists in the store's list
              const exists = store.assignedCampaigns.some(
                c => c.campaignId.toString() === campaign._id.toString()
              );

              if (!exists) {
                report.issues.missingBidirectionalLinks++;
                // Add missing link to store
                store.assignedCampaigns.push({
                  campaignId: campaign._id,
                  campaignName: campaign.campaignName,
                  status: storeSnapshot.status,
                  assignedAt: storeSnapshot.assignedAt,
                });
                await store.save();
                report.fixes.addedMissingLinks++;
              }
            }
          }
        }
      }

      // ===== PHASE 4: Verify reverse bidirectional sync =====
      for (const store of stores) {
        if (store.assignedCampaigns && store.assignedCampaigns.length > 0) {
          for (const campaignRef of store.assignedCampaigns) {
            const campaign = await Campaign.findById(campaignRef.campaignId);
            if (campaign && campaign.assignedStores) {
              // Check if this store exists in the campaign's list
              const exists = campaign.assignedStores.some(
                s => s.storeId.toString() === store._id.toString()
              );

              if (!exists) {
                report.issues.missingBidirectionalLinks++;
                // Add missing link to campaign
                campaign.assignedStores.push({
                  storeId: store._id,
                  storeName: store.store_name,
                  status: campaignRef.status,
                  assignedAt: campaignRef.assignedAt,
                });
                await campaign.save();
                report.fixes.addedMissingLinks++;
              }
            }
          }
        }
      }

      report.summary = {
        totalIssuesFound:
          report.issues.orphanedStoresInCampaigns +
          report.issues.orphanedCampaignsInStores +
          report.issues.missingBidirectionalLinks,
        totalIssuesFixed:
          report.fixes.removedOrphanedStores +
          report.fixes.removedOrphanedCampaigns +
          report.fixes.addedMissingLinks,
        status: 'completed',
      };

      return report;
    } catch (error) {
      report.error = error.message;
      report.status = 'failed';
      return report;
    }
  }

  /**
   * Quick sanity check without repair
   * Returns only issues found, no automatic fixes
   *
   * @returns {Promise<Object>} - Report of issues found
   */
  static async checkConsistency() {
    const report = {
      timestamp: new Date().toISOString(),
      issues: [],
    };

    try {
      // Check campaigns for orphaned stores
      const campaigns = await Campaign.find({});
      for (const campaign of campaigns) {
        if (campaign.assignedStores && campaign.assignedStores.length > 0) {
          const storeIds = campaign.assignedStores.map(s => s.storeId);
          const existingStores = await Store.find({
            _id: { $in: storeIds }
          }).select('_id').lean();

          const existingIds = new Set(existingStores.map(s => s._id.toString()));

          const orphaned = campaign.assignedStores.filter(
            s => !existingIds.has(s.storeId.toString())
          );

          if (orphaned.length > 0) {
            report.issues.push({
              type: 'orphaned_stores_in_campaign',
              campaignId: campaign._id,
              campaignName: campaign.campaignName,
              orphanedStoreCount: orphaned.length,
              storeIds: orphaned.map(s => s.storeId),
            });
          }
        }
      }

      // Check stores for orphaned campaigns
      const stores = await Store.find({});
      for (const store of stores) {
        if (store.assignedCampaigns && store.assignedCampaigns.length > 0) {
          const campaignIds = store.assignedCampaigns.map(c => c.campaignId);
          const existingCampaigns = await Campaign.find({
            _id: { $in: campaignIds }
          }).select('_id').lean();

          const existingIds = new Set(existingCampaigns.map(c => c._id.toString()));

          const orphaned = store.assignedCampaigns.filter(
            c => !existingIds.has(c.campaignId.toString())
          );

          if (orphaned.length > 0) {
            report.issues.push({
              type: 'orphaned_campaigns_in_store',
              storeId: store._id,
              storeName: store.store_name,
              orphanedCampaignCount: orphaned.length,
              campaignIds: orphaned.map(c => c.campaignId),
            });
          }
        }
      }

      report.summary = {
        totalIssuesFound: report.issues.length,
        status: report.issues.length === 0 ? 'healthy' : 'issues_detected',
      };

      return report;
    } catch (error) {
      report.error = error.message;
      report.status = 'failed';
      return report;
    }
  }

  /**
   * Get detailed relationship audit
   * Returns the full state of all campaign-store relationships
   *
   * @returns {Promise<Object>} - Complete audit report
   */
  static async auditRelationships() {
    const audit = {
      timestamp: new Date().toISOString(),
      campaigns: [],
      stores: [],
    };

    try {
      // Audit all campaigns
      const campaigns = await Campaign.find({});
      for (const campaign of campaigns) {
        const activeStores = (campaign.assignedStores || [])
          .filter(s => s.status === 'active');

        audit.campaigns.push({
          campaignId: campaign._id,
          campaignName: campaign.campaignName,
          totalAssignedStores: activeStores.length,
          stores: activeStores.map(s => ({
            storeId: s.storeId,
            storeName: s.storeName,
            assignedAt: s.assignedAt,
          })),
        });
      }

      // Audit all stores
      const stores = await Store.find({});
      for (const store of stores) {
        const activeCampaigns = (store.assignedCampaigns || [])
          .filter(c => c.status !== 'inactive');

        audit.stores.push({
          storeId: store._id,
          storeName: store.store_name,
          totalAssignedCampaigns: activeCampaigns.length,
          campaigns: activeCampaigns.map(c => ({
            campaignId: c.campaignId,
            campaignName: c.campaignName,
            assignedAt: c.assignedAt,
          })),
        });
      }

      audit.status = 'completed';
      return audit;
    } catch (error) {
      audit.error = error.message;
      audit.status = 'failed';
      return audit;
    }
  }
}

export default DatabaseConsistencyService;
