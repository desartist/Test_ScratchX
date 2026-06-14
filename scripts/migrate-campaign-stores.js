/**
 * Migration Script: Campaign Store Snapshot Backfill
 *
 * This script migrates existing campaign-store relationships from the
 * CampaignStoreMapping collection to embedded snapshots in the Campaign document.
 *
 * Usage: node scripts/migrate-campaign-stores.js
 *
 * Process:
 * 1. Find all campaigns
 * 2. For each campaign, find associated stores via CampaignStoreMapping
 * 3. Create store snapshots with current store data
 * 4. Embed snapshots in campaign.assignedStores
 * 5. Preserve all inventory tracking data
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/connectDB.js';
import Campaign from '@/models/campaignModel.js';
import CampaignStoreMapping from '@/models/campaignStoreMappingModel.js';
import Store from '@/models/storeModel.js';

// Migration statistics
const stats = {
  campaignsProcessed: 0,
  campaignsSkipped: 0,
  campaignsWithStores: 0,
  snapshotsCreated: 0,
  storesNotFound: 0,
  errors: []
};

/**
 * Migrate a single campaign's store assignments
 */
async function migrateCampaign(campaign) {
  try {
    // Skip if already migrated
    if (campaign.assignedStores && campaign.assignedStores.length > 0) {
      console.log(`✓ Campaign "${campaign.campaignName}" (${campaign._id}) already migrated`);
      stats.campaignsSkipped++;
      return;
    }

    // Get all active store mappings for this campaign
    const mappings = await CampaignStoreMapping.find({
      campaign_id: campaign._id,
      status: { $in: ['active', 'paused'] }
    }).lean();

    if (mappings.length === 0) {
      console.log(`✓ Campaign "${campaign.campaignName}" (${campaign._id}) has no store assignments`);
      stats.campaignsProcessed++;
      return;
    }

    // Create snapshots for each mapping
    const snapshots = [];

    for (const mapping of mappings) {
      try {
        // Fetch current store data
        const store = await Store.findById(mapping.store_id).lean();

        if (!store) {
          console.warn(`  ⚠ Store ${mapping.store_id} not found (possibly deleted)`);
          stats.storesNotFound++;
          continue;
        }

        // Validate required location data
        if (!store.latitude || !store.longitude) {
          console.warn(`  ⚠ Store "${store.store_name}" (${store._id}) missing location data, skipping`);
          continue;
        }

        // Create store snapshot
        const snapshot = {
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

          // Preserve existing inventory tracking
          allocated_scratch_cards: mapping.allocated_scratch_cards || 0,
          used_scratch_cards: mapping.used_scratch_cards || 0,
          redeemed_scratch_cards: mapping.redeemed_scratch_cards || 0,
          remaining_scratch_cards: mapping.remaining_scratch_cards || 0,

          // Assignment metadata
          assignedAt: mapping.allocation_date || mapping.createdAt || new Date(),
          assignedBy: mapping.allocation_by,
          status: 'active', // Convert active/paused mappings to active snapshots
          lastModified: mapping.updatedAt || new Date(),
          lastModifiedBy: mapping.allocation_by
        };

        snapshots.push(snapshot);
      } catch (error) {
        console.error(`  ✗ Error processing mapping ${mapping._id}:`, error.message);
        stats.errors.push({
          campaignId: campaign._id,
          mappingId: mapping._id,
          error: error.message
        });
      }
    }

    // Save snapshots to campaign
    if (snapshots.length > 0) {
      campaign.assignedStores = snapshots;
      await campaign.save();

      console.log(`✓ Campaign "${campaign.campaignName}" (${campaign._id}) migrated with ${snapshots.length} store snapshots`);
      stats.campaignsWithStores++;
      stats.snapshotsCreated += snapshots.length;
    } else {
      console.log(`✓ Campaign "${campaign.campaignName}" (${campaign._id}) had stores but all were skipped`);
    }

    stats.campaignsProcessed++;
  } catch (error) {
    console.error(`✗ Error migrating campaign ${campaign._id}:`, error.message);
    stats.errors.push({
      campaignId: campaign._id,
      error: error.message
    });
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('\n=== Campaign Store Snapshot Migration ===\n');
    console.log('Connecting to database...');

    await connectDB();

    console.log('✓ Connected to database\n');

    // Find all campaigns
    console.log('Finding campaigns to migrate...');
    const campaigns = await Campaign.find({}).lean();

    console.log(`Found ${campaigns.length} campaigns\n`);

    // Process each campaign
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      process.stdout.write(`[${i + 1}/${campaigns.length}] `);
      await migrateCampaign(campaign);
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total campaigns processed: ${stats.campaignsProcessed}`);
    console.log(`Campaigns already migrated: ${stats.campaignsSkipped}`);
    console.log(`Campaigns with stores: ${stats.campaignsWithStores}`);
    console.log(`Total snapshots created: ${stats.snapshotsCreated}`);
    console.log(`Stores not found: ${stats.storesNotFound}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n=== Errors Encountered ===');
      stats.errors.forEach(err => {
        console.error(`- Campaign ${err.campaignId}: ${err.error}`);
      });
    }

    console.log('\n✓ Migration complete\n');

    // Exit with appropriate code
    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

export { migrate };
