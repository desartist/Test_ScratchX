/**
 * Migration: Add platformNotice consent field to existing accounts
 *
 * accountModel.js now has a `platformNotice: { accepted, acceptedAt, version }`
 * field used to gate Merchant/Distributor accounts behind the Platform Usage
 * & Subscription Notice modal. Documents created before this schema change
 * don't have the field on disk at all, so this backfills an explicit
 * "not yet accepted" state onto every account that's missing it.
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
    console.log('[Migration] Starting: Add platformNotice consent field...');

    const { default: Account } = await import('../../models/accountModel.js');
    const { connectDB } = await import('../../lib/connectDB.js');

    await connectDB();
    console.log('[Migration] Connected to database');

    const result = await Account.updateMany(
      { platformNotice: { $exists: false } },
      {
        $set: {
          platformNotice: {
            accepted: false,
            acceptedAt: null,
            version: null,
          },
        },
      }
    );

    console.log(
      `[Migration] ✓ Matched ${result.matchedCount}, updated ${result.modifiedCount} account(s)`
    );
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
