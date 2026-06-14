/**
 * Migration Script: Set Main Store for Existing Accounts
 *
 * Purpose: For existing accounts without mainStoreId set, this script:
 * 1. Finds their oldest/first store
 * 2. Marks it as main store (isMainStore, isDefaultStore, storeType)
 * 3. Updates account.mainStoreId
 * 4. Updates onboarding flags
 *
 * Usage: node scripts/migrate-main-stores.js
 */

const mongoose = require('mongoose');

// Import models
const accountPath = require.resolve('../models/accountModel.js');
const storePath = require.resolve('../models/storeModel.js');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scratchx';

// Load models dynamically (ESM compatibility)
let Account, Store;

async function loadModels() {
  try {
    const accountModule = await import(accountPath);
    const storeModule = await import(storePath);
    Account = accountModule.default;
    Store = storeModule.default;
  } catch (err) {
    console.log('Using require fallback for models...');
    Account = require('../models/accountModel.js');
    Store = require('../models/storeModel.js');
  }
}

async function migrateMainStores() {
  try {
    console.log('🚀 Starting Main Store Migration...');
    console.log('Connecting to MongoDB:', MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    await loadModels();
    console.log('✓ Connected to MongoDB\n');

    // Find all accounts without mainStoreId
    const accountsNeedingMigration = await Account.find({
      $or: [
        { mainStoreId: null },
        { mainStoreId: { $exists: false } },
      ],
      role: { $in: ['Merchant', 'Distributor'] },
    });

    console.log(`📋 Found ${accountsNeedingMigration.length} accounts needing migration\n`);

    if (accountsNeedingMigration.length === 0) {
      console.log('✅ No accounts need migration!');
      await mongoose.disconnect();
      process.exit(0);
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const account of accountsNeedingMigration) {
      try {
        // Find stores for this account, sorted by creation date (oldest first)
        const stores = await Store.find({
          merchant_id: account._id,
        })
          .sort({ createdAt: 1 })
          .limit(1);

        if (stores.length === 0) {
          console.log(
            `⚠️  Account ${account.email} has no stores. Skipping...`
          );
          continue;
        }

        const mainStore = stores[0];

        // Update store
        await Store.updateOne(
          { _id: mainStore._id },
          {
            $set: {
              is_main_store: true,
              isMainStore: true,
              isDefaultStore: true,
              storeType: 'MAIN',
            },
          }
        );

        // Update account
        await Account.updateOne(
          { _id: account._id },
          {
            $set: {
              mainStoreId: mainStore._id,
              'onboarding.hasCompletedStoreCreation': true,
              'onboarding.firstStoreCreatedAt': mainStore.createdAt,
            },
          }
        );

        console.log(
          `✅ ${account.email} → Main Store: "${mainStore.store_name}" (${mainStore._id})`
        );
        migratedCount++;
      } catch (accountError) {
        console.error(
          `❌ Error migrating account ${account.email}:`,
          accountError.message
        );
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏭️  Total accounts: ${accountsNeedingMigration.length}`);

    if (migratedCount > 0) {
      console.log('\n✨ Main Store migration completed successfully!');
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyCount = await Account.countDocuments({
      mainStoreId: { $ne: null, $exists: true },
      role: { $in: ['Merchant', 'Distributor'] },
    });

    console.log(`   Accounts with mainStoreId: ${verifyCount}\n`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(migratedCount === accountsNeedingMigration.length ? 0 : 1);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateMainStores();
