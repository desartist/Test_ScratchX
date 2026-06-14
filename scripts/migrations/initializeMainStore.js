/**
 * Migration: Initialize mainStoreId for existing accounts with stores
 *
 * This migration:
 * 1. Finds all accounts without a mainStoreId
 * 2. Identifies their first active store (by creation date)
 * 3. Sets that store as the mainStore
 * 4. Updates the account.mainStoreId and store.isMainStore (or is_main_store)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../../models/accountModel.js';
import Store from '../../models/storeModel.js';
import { connectDB } from '../../lib/connectDB.js';

dotenv.config();

async function migrate() {
  let connection = null;
  try {
    console.log('[Migration] Starting: Initialize mainStoreId...');

    // Connect to database
    connection = await connectDB();
    console.log('[Migration] Connected to database');

    // Get all accounts
    const accounts = await Account.find({});
    console.log(`[Migration] Found ${accounts.length} account(s)`);

    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
      try {
        // Skip if already has mainStoreId
        if (account.mainStoreId) {
          skipped++;
          console.log(`[Migration] Skipping account ${account._id} - already has mainStoreId`);
          continue;
        }

        // Find first store created by this account (check both merchant_id and ownerId)
        const firstStore = await Store.findOne({
          $or: [
            { merchant_id: account._id },
            { ownerId: account._id }
          ],
          active: true
        }).sort({ createdAt: 1 });

        if (firstStore) {
          // Update account with mainStoreId
          await Account.updateOne(
            { _id: account._id },
            { mainStoreId: firstStore._id }
          );

          // Update store with isMainStore flag
          await Store.updateOne(
            { _id: firstStore._id },
            {
              is_main_store: true
            }
          );

          updated++;
          console.log(`[Migration] ✓ Updated account ${account._id} with mainStore ${firstStore._id}`);
        } else {
          console.warn(`[Migration] ⚠ Account ${account._id} has no active stores to set as main`);
        }
      } catch (error) {
        console.error(`[Migration] ✗ Error updating account ${account._id}:`, error.message);
      }
    }

    console.log(`[Migration] ✓ Updated ${updated} account(s), skipped ${skipped} account(s)`);
    console.log('[Migration] ✓ Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export default migrate;
