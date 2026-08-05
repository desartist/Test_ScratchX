/**
 * Migration: default profile.businessModel to 'Retail' for existing Merchant
 * accounts that don't already have it set to 'Wholesale'.
 *
 * Background: profile.businessModel (Retail/Wholesale) now drives Team
 * Access seat limits (lib/teamLimits.js). Accounts created before this field
 * existed — or that were never classified by their distributor — have it as
 * null, which the Team Access page correctly shows as "business type not
 * set" rather than a real limit. This migration clears that backlog by
 * defaulting anyone not already marked Wholesale to Retail, since Retail is
 * the overwhelmingly common case and Wholesale accounts were already
 * deliberately classified.
 *
 * Only touches Merchant accounts where profile.businessModel is NOT
 * 'Wholesale' and NOT already 'Retail' (i.e. null, undefined, or missing the
 * key entirely) — an account already marked 'Wholesale' is left untouched
 * (skipped), and one already 'Retail' needs no write.
 *
 * Safe to re-run: once every non-Wholesale account is 'Retail', the query
 * matches nothing.
 *
 * Usage:
 *   node scripts/migrate-default-business-model-to-retail.js            (dry run — reports only)
 *   node scripts/migrate-default-business-model-to-retail.js --commit   (applies the fix)
 *
 * To run against production instead of your local dev DB, point MONGODB_URI
 * at the prod connection string for this invocation, e.g.:
 *   MONGODB_URI="<prod-uri>" node scripts/migrate-default-business-model-to-retail.js --commit
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
    console.log("Scanning Merchant accounts without profile.businessModel = 'Wholesale' or 'Retail'...\n");

    const query = {
      role: 'Merchant',
      'profile.businessModel': { $nin: ['Wholesale', 'Retail'] },
    };
    const count = await Account.countDocuments(query);

    const wholesaleCount = await Account.countDocuments({ role: 'Merchant', 'profile.businessModel': 'Wholesale' });
    console.log(`Skipping ${wholesaleCount} Merchant account(s) already marked Wholesale.`);

    if (count === 0) {
      console.log('No accounts need a default. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`Found ${count} Merchant account(s) to default to Retail.`);

    if (!COMMIT) {
      console.log('\nDry run only — re-run with --commit to set profile.businessModel = "Retail" on these accounts.');
      process.exit(0);
    }

    const result = await Account.updateMany(query, {
      $set: { 'profile.businessModel': 'Retail' },
    });

    console.log(`\n✓ Updated ${result.modifiedCount} account(s) to Retail.`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
