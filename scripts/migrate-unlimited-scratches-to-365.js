/**
 * Migration: upgrade unlimited-scratches entitlement from 30 days to 365 days.
 *
 * For every subscription that has ever been granted unlimited scratches
 * (grantedAt is set), recompute validUntil as grantedAt + 365 days instead
 * of the old grantedAt + 30 days, and reactivate isActive if the new
 * validUntil is still in the future (covers subscriptions the old 30-day
 * cron already expired, which should now still be within their window).
 *
 * Safe to re-run: it always recomputes from grantedAt, so running it twice
 * produces the same result.
 *
 * Usage: node scripts/migrate-unlimited-scratches-to-365.js
 * (loads .env.local if present, falling back to .env — same as `next dev`)
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../models/subscriptionModel').default;
const { connectDB } = require('../lib/connectDB');

const DURATION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

async function migrateUnlimitedScratchesTo365() {
  try {
    await connectDB();

    console.log('Starting unlimited-scratches 30→365 day migration...');

    const subscriptions = await Subscription.find({
      'unlimitedScratches.grantedAt': { $ne: null },
    });
    console.log(`Found ${subscriptions.length} subscriptions with an unlimited-scratches grant`);

    const now = new Date();
    let extended = 0;
    let reactivated = 0;

    for (const sub of subscriptions) {
      const grantedAt = sub.unlimitedScratches.grantedAt;
      const newValidUntil = new Date(grantedAt.getTime() + DURATION_DAYS * DAY_MS);
      const wasActive = sub.unlimitedScratches.isActive;
      const nowActive = newValidUntil > now;

      sub.unlimitedScratches.validUntil = newValidUntil;
      sub.unlimitedScratches.scratchValidityType = 'yearly';
      sub.unlimitedScratches.isActive = nowActive;
      sub.unlimitedScratches.daysRemaining = nowActive
        ? Math.ceil((newValidUntil - now) / DAY_MS)
        : 0;

      await sub.save();
      extended++;
      if (!wasActive && nowActive) reactivated++;
    }

    console.log(`✓ Extended ${extended} subscriptions to a 365-day unlimited-scratches window`);
    console.log(`  (${reactivated} of those were re-activated after having expired under the old 30-day rule)`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUnlimitedScratchesTo365();
