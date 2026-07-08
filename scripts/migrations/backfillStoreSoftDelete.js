/**
 * Migration: Backfill Store isDeleted/deletedAt fields
 *
 * storeModel.js now has isDeleted (Boolean) and deletedAt (Date) fields, plus
 * a 'deleted' value in the status enum. Two things need fixing on old data:
 *
 * 1. Stores created before this schema change don't have isDeleted/deletedAt
 *    on disk at all — default them to "not deleted".
 * 2. Stores that were soft-deleted through the OLD /api/stores/delete route
 *    (before isDeleted/deletedAt existed on the schema) only ever got
 *    status: 'deleted' persisted — Mongoose's strict schema mode silently
 *    dropped isDeleted/deletedAt since they weren't real fields yet. Those
 *    stores are marked "deleted" by status but isDeleted is still false/
 *    missing, so they still show up anywhere that only filters on isDeleted.
 *    This finds and fixes exactly that legacy state.
 */

import dotenv from 'dotenv';

// .env.local (where MONGODB_URI actually lives for local dev) takes
// precedence; dotenv won't override a key that's already set, so loading it
// first and falling back to .env matches Next.js's own env file precedence.
dotenv.config({ path: '.env.local' });
dotenv.config();

// Dynamic imports below are intentional: connectDB.js reads MONGODB_URI and
// throws at module-load time (not inside a function), and ESM static imports
// are hoisted above the dotenv.config() calls above regardless of source
// order. A dynamic import() runs exactly where it's written, so it only
// evaluates connectDB.js after process.env is already populated.

async function migrate() {
  try {
    console.log('[Migration] Starting: Backfill store isDeleted/deletedAt fields...');

    const { default: Store } = await import('../../models/storeModel.js');
    const { connectDB } = await import('../../lib/connectDB.js');

    await connectDB();
    console.log('[Migration] Connected to database');

    // Step 1: default isDeleted/deletedAt on stores missing the fields entirely.
    const defaulted = await Store.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false, deletedAt: null } }
    );
    console.log(
      `[Migration] ✓ Defaulted isDeleted=false on ${defaulted.modifiedCount} store(s)`
    );

    // Step 2: fix legacy soft-deletes — status is 'deleted' but isDeleted
    // was never actually persisted for that record.
    const legacyDeleted = await Store.find({
      status: 'deleted',
      isDeleted: { $ne: true },
    }).select('_id updatedAt');
    console.log(
      `[Migration] Found ${legacyDeleted.length} legacy soft-deleted store(s) to fix`
    );

    let fixed = 0;
    for (const store of legacyDeleted) {
      await Store.updateOne(
        { _id: store._id },
        { $set: { isDeleted: true, deletedAt: store.updatedAt || new Date() } }
      );
      fixed++;
      console.log(`[Migration] ✓ Fixed legacy soft-deleted store ${store._id}`);
    }

    console.log(`[Migration] ✓ Fixed ${fixed} legacy soft-deleted store(s)`);
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
