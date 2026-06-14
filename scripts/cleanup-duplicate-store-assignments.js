/**
 * Cleanup Script: Remove Duplicate Store Assignments
 *
 * Usage: node scripts/cleanup-duplicate-store-assignments.js
 *
 * This script finds all campaigns with duplicate store assignments
 * (same storeId appearing multiple times) and removes the duplicates,
 * keeping only the first assignment.
 */

const mongoose = require('mongoose');
const path = require('path');

// Import models
const Campaign = require(path.join(__dirname, '../models/campaignModel'));

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coupon_campaigns';

async function cleanupDuplicateAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all campaigns with assignedStores
    const campaigns = await Campaign.find({
      assignedStores: { $exists: true, $ne: [] }
    });

    console.log(`\n📊 Found ${campaigns.length} campaigns with assigned stores`);

    let totalDuplicatesRemoved = 0;
    let campaignsWithDuplicates = 0;

    // Check each campaign for duplicates
    for (const campaign of campaigns) {
      const storeIds = new Map(); // Map of storeId -> array of indices
      let hasDuplicates = false;

      // Track all occurrences of each storeId
      campaign.assignedStores.forEach((store, index) => {
        const storeId = store.storeId.toString();
        if (!storeIds.has(storeId)) {
          storeIds.set(storeId, []);
        }
        storeIds.get(storeId).push(index);
      });

      // Find which storeIds have duplicates
      const duplicateIndices = [];
      for (const [storeId, indices] of storeIds) {
        if (indices.length > 1) {
          hasDuplicates = true;
          console.log(
            `⚠️  Campaign ${campaign._id}: Store ${storeId} assigned ${indices.length} times (indices: ${indices.join(', ')})`
          );

          // Keep first, mark others for deletion
          for (let i = 1; i < indices.length; i++) {
            duplicateIndices.push(indices[i]);
          }
        }
      }

      // Remove duplicates (delete in reverse order to maintain indices)
      if (hasDuplicates) {
        duplicateIndices.sort((a, b) => b - a); // Reverse sort
        for (const index of duplicateIndices) {
          const store = campaign.assignedStores[index];
          console.log(`   🗑️  Removing duplicate: ${store.storeName} (${store.storeId})`);
          campaign.assignedStores.splice(index, 1);
        }

        // Save campaign
        await campaign.save();
        campaignsWithDuplicates++;
        totalDuplicatesRemoved += duplicateIndices.length;
        console.log(`   ✅ Campaign updated. Removed ${duplicateIndices.length} duplicates\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total campaigns checked: ${campaigns.length}`);
    console.log(`Campaigns with duplicates: ${campaignsWithDuplicates}`);
    console.log(`Total duplicate assignments removed: ${totalDuplicatesRemoved}`);
    console.log('='.repeat(60) + '\n');

    if (totalDuplicatesRemoved > 0) {
      console.log('✅ Cleanup completed successfully!');
    } else {
      console.log('✅ No duplicates found. All campaigns are clean.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run cleanup
cleanupDuplicateAssignments();
