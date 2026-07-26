/**
 * Migration: recover merchant accounts whose profile.businessType was
 * accidentally overwritten by the Retail/Wholesale selector before it was
 * corrected to write to the new profile.businessModel field instead.
 *
 * Background: the distributor "Add New Business" form briefly saved its
 * Retail/Wholesale selection into profile.businessType — the pre-existing,
 * unrelated free-text industry-category field (e.g. "Electronics & Gadgets").
 * Any Merchant account created through that form during that window now has:
 *   - profile.businessType incorrectly set to exactly "Retail" or "Wholesale"
 *   - profile.businessModel missing (should hold that same value)
 *
 * This migration finds Merchant accounts where profile.businessType is
 * EXACTLY "Retail" or "Wholesale" (not a real free-text industry
 * description), copies that value into profile.businessModel, and resets
 * profile.businessType back to null.
 *
 * Caveat: if a merchant genuinely typed "Retail" or "Wholesale" (and nothing
 * else) as their own free-text industry category via Settings, this
 * migration cannot tell the difference and will treat it as the bug. Review
 * the dry-run list below before committing.
 *
 * Safe to re-run: once businessType no longer holds "Retail"/"Wholesale",
 * the query matches nothing.
 *
 * Usage:
 *   node scripts/migrate-business-type-to-business-model.js            (dry run — reports only)
 *   node scripts/migrate-business-type-to-business-model.js --commit   (applies the fix)
 *
 * To run against production instead of your local dev DB, point MONGODB_URI
 * at the prod connection string for this invocation, e.g.:
 *   MONGODB_URI="<prod-uri>" node scripts/migrate-business-type-to-business-model.js --commit
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
    console.log('Scanning Merchant accounts for stale businessType values...\n');

    const affected = await Account.find({
      role: 'Merchant',
      'profile.businessType': { $in: ['Retail', 'Wholesale'] },
    }).select('email name profile.businessType profile.businessModel');

    if (affected.length === 0) {
      console.log('No affected accounts found. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`Found ${affected.length} affected account(s):\n`);
    for (const acc of affected) {
      console.log(
        `  - ${acc.email} (${acc.name || 'no name'}): businessType="${acc.profile.businessType}" -> businessModel="${acc.profile.businessType}", businessType reset to null`,
      );
    }

    if (!COMMIT) {
      console.log('\nDry run only — re-run with --commit to apply these changes.');
      process.exit(0);
    }

    let migrated = 0;
    for (const acc of affected) {
      acc.profile.businessModel = acc.profile.businessType;
      acc.profile.businessType = null;
      await acc.save();
      migrated++;
    }

    console.log(`\n✓ Migrated ${migrated} account(s).`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
