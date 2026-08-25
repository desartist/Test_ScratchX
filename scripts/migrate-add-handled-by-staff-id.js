/**
 * Migration: backfill handled_by_staff_id onto existing CustomerParticipation
 * documents and explicitly build its index.
 *
 * Background: handled_by_staff_id is a newly added schema field
 * (models/customerParticipationModel.js) that records which Store_Manager/
 * Store_Staff's personalized QR code a customer scanned through (see the
 * per-staff QR attribution feature in components/campaign/CampaignQrStudio.js
 * and app/api/customer/participate/route.js). Mongoose already applies the
 * schema's `default: null` in memory for any document that doesn't have this
 * field, so nothing is broken without running this — but existing documents
 * in MongoDB itself don't physically have the key yet, and the collection's
 * index on it doesn't exist until something builds it.
 *
 * This script does two things:
 *   1. Writes handled_by_staff_id = null explicitly onto every
 *      CustomerParticipation document missing the key, so raw Mongo
 *      queries, exports, and aggregations see it too. (Mongo's own
 *      `{ handled_by_staff_id: null }` query already matches missing-field
 *      documents, so this step is about tooling consistency, not
 *      correctness — the app works fine without it.)
 *   2. Explicitly builds the `handled_by_staff_id` index in the background,
 *      rather than leaving it to Mongoose's automatic on-connect autoIndex
 *      behavior (the default in this app — see lib/connectDB.js) to build
 *      it under production load on first deploy.
 *
 * Only touches documents where handled_by_staff_id does not already exist —
 * never overwrites a value that's already set.
 *
 * Safe to re-run: once every document has the field and the index exists,
 * both steps are no-ops.
 *
 * Usage:
 *   node scripts/migrate-add-handled-by-staff-id.js            (dry run — reports only)
 *   node scripts/migrate-add-handled-by-staff-id.js --commit   (applies the fix)
 *
 * To run against production instead of your local dev DB, point MONGODB_URI
 * at the prod connection string for this invocation, e.g.:
 *   MONGODB_URI="<prod-uri>" node scripts/migrate-add-handled-by-staff-id.js --commit
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const CustomerParticipation = require('../models/customerParticipationModel').default;
const { connectDB } = require('../lib/connectDB');

const COMMIT = process.argv.includes('--commit');

async function migrate() {
  try {
    await connectDB();

    console.log(`Mode: ${COMMIT ? 'COMMIT (writing changes)' : 'DRY RUN (no changes will be made)'}`);
    console.log('Scanning customer participations missing handled_by_staff_id...\n');

    const query = { handled_by_staff_id: { $exists: false } };
    const count = await CustomerParticipation.countDocuments(query);

    if (count === 0) {
      console.log('No participations are missing handled_by_staff_id. Nothing to backfill.');
    } else {
      console.log(`Found ${count} participation(s) missing handled_by_staff_id.`);

      if (!COMMIT) {
        console.log('Dry run only — re-run with --commit to set handled_by_staff_id = null on these documents.');
      } else {
        const result = await CustomerParticipation.updateMany(query, {
          $set: { handled_by_staff_id: null },
        });
        console.log(`✓ Updated ${result.modifiedCount} participation(s).`);
      }
    }

    console.log('\nChecking handled_by_staff_id index...');
    const existingIndexes = await CustomerParticipation.collection.indexes();
    const hasIndex = existingIndexes.some(
      (idx) => Object.keys(idx.key).length === 1 && idx.key.handled_by_staff_id === 1
    );

    if (hasIndex) {
      console.log('Index on handled_by_staff_id already exists. Nothing to build.');
    } else if (!COMMIT) {
      console.log('Dry run only — re-run with --commit to build the handled_by_staff_id index.');
    } else {
      console.log('Building index on handled_by_staff_id (background)...');
      await CustomerParticipation.collection.createIndex(
        { handled_by_staff_id: 1 },
        { background: true }
      );
      console.log('✓ Index built.');
    }

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
