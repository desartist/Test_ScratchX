/**
 * Migration: Remove Premium, Enterprise, Trial, Monthly, Annual plans
 * Keep: Core and Smart only
 *
 * This migration removes all subscription plans except Core and Smart,
 * which are the final plans for the subscription system.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SubscriptionPlan from '../../models/subscriptionPlanModel.js';
import { connectDB } from '../../lib/connectDB.js';

dotenv.config();

async function migrate() {
  let connection = null;
  try {
    console.log('[Migration] Starting: Remove non-Core/Smart plans...');

    // Connect to database
    connection = await connectDB();
    console.log('[Migration] Connected to database');

    // Find and remove plans that are not Core or Smart
    const result = await SubscriptionPlan.deleteMany({
      name: { $nin: ['Core', 'Smart'] }
    });

    console.log(`[Migration] ✓ Deleted ${result.deletedCount} plan(s)`);

    // List remaining plans
    const remaining = await SubscriptionPlan.find({}, 'name displayName isActive');
    console.log('[Migration] Remaining plans:');
    remaining.forEach(plan => {
      console.log(`  - ${plan.displayName || plan.name} (isActive: ${plan.isActive})`);
    });

    if (remaining.length === 0) {
      console.warn('[Migration] ⚠ Warning: No plans remain after migration. Ensure plans are seeded.');
    }

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
