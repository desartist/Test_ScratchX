/**
 * Migration: Backfill unlimitedScratches expiry dates for existing subscriptions
 *
 * This migration:
 * 1. Finds subscriptions with missing expiry date tracking
 * 2. Sets unlimitedScratches.grantedAt if missing
 * 3. Calculates unlimitedScratches.validUntil (90 days from grantedAt)
 * 4. Sets unlimitedScratches.isActive to true if plan is active
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Subscription from '../../models/subscriptionModel.js';
import { connectDB } from '../../lib/connectDB.js';

dotenv.config();

async function migrate() {
  let connection = null;
  try {
    console.log('[Migration] Starting: Backfill expiry dates for unlimited scratches...');

    // Connect to database
    connection = await connectDB();
    console.log('[Migration] Connected to database');

    // Find subscriptions that need expiry date backfill
    const subscriptions = await Subscription.find({
      $or: [
        { 'unlimitedScratches.validUntil': { $exists: false } },
        { 'unlimitedScratches.validUntil': null },
        { 'unlimitedScratches.grantedAt': { $exists: false } },
        { 'unlimitedScratches.grantedAt': null }
      ]
    });

    console.log(`[Migration] Found ${subscriptions.length} subscription(s) needing expiry backfill`);

    let updated = 0;
    let skipped = 0;

    for (const sub of subscriptions) {
      try {
        // Determine the start date (granted date)
        const grantedAt = sub.unlimitedScratches?.grantedAt || sub.purchaseDate || sub.createdAt;

        // Calculate expiry date (90 days from granted date)
        const validUntil = new Date(grantedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

        // Calculate days remaining
        const now = new Date();
        const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));

        // Determine if unlimited scratches should be active
        const isActive = sub.status === 'active' && now < validUntil;

        // Update subscription
        await Subscription.updateOne(
          { _id: sub._id },
          {
            unlimitedScratches: {
              ...sub.unlimitedScratches,
              grantedAt: grantedAt,
              validUntil: validUntil,
              daysRemaining: Math.max(0, daysRemaining),
              isActive: isActive,
              scratchValidityType: 'quarterly'
            }
          }
        );

        updated++;
        console.log(`[Migration] ✓ Updated subscription ${sub._id}`);
        console.log(`  - Granted: ${grantedAt.toISOString()}`);
        console.log(`  - Valid Until: ${validUntil.toISOString()}`);
        console.log(`  - Days Remaining: ${Math.max(0, daysRemaining)}`);
        console.log(`  - Active: ${isActive}`);
      } catch (error) {
        console.error(`[Migration] ✗ Error updating subscription ${sub._id}:`, error.message);
      }
    }

    console.log(`[Migration] ✓ Updated ${updated} subscription(s)`);
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
