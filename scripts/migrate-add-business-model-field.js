/**
 * Migration: backfill profile.businessModel onto existing Account documents.
 *
 * Background: profile.businessModel is a newly added schema field
 * (models/accountModel.js) for classifying Merchant accounts as
 * 'Retail' or 'Wholesale'. Mongoose already applies the schema's
 * `default: null` in memory for any document that doesn't have this field,
 * so nothing is broken without running this — but existing documents in
 * MongoDB itself don't physically have the key yet. This script writes it
 * explicitly onto every account that's missing it, so raw Mongo queries,
 * exports, and aggregations see it too.
 *
 * Only touches documents where profile.businessModel does not already
 * exist — never overwrites a value that's already set.
 *
 * Safe to re-run: once every document has the field, the query matches
 * nothing.
 *
 * Usage:
 *   node scripts/migrate-add-business-model-field.js            (dry run — reports only)
 *   node scripts/migrate-add-business-model-field.js --commit   (applies the fix)
 *
 * To run against production instead of your local dev DB, point MONGODB_URI
 * at the prod connection string for this invocation, e.g.:
 *   MONGODB_URI="<prod-uri>" node scripts/migrate-add-business-model-field.js --commit
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const Account = require('../models/accountModel').default;
const { connectDB } = require('../lib/connectDB');

const COMMIT = process.argv.includes('--commit');

async function migrate() {
  try {
    await connectDB();

    console.log(`Mode: ${COMMIT ? 'COMMIT (writing changes)' : 'DRY RUN (no changes will be made)'}`);
    console.log('Scanning accounts missing profile.businessModel...\n');

    const query = { 'profile.businessModel': { $exists: false } };
    const count = await Account.countDocuments(query);

    if (count === 0) {
      console.log('No accounts are missing profile.businessModel. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`Found ${count} account(s) missing profile.businessModel.`);

    if (!COMMIT) {
      console.log('\nDry run only — re-run with --commit to set profile.businessModel = null on these accounts.');
      process.exit(0);
    }

    const result = await Account.updateMany(query, {
      $set: { 'profile.businessModel': null },
    });

    console.log(`\n✓ Updated ${result.modifiedCount} account(s).`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
