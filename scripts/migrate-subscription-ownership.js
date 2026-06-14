const mongoose = require('mongoose');
const Subscription = require('../models/subscriptionModel');
const { connectDB } = require('../lib/connectDB');

async function migrateSubscriptionOwnership() {
  try {
    await connectDB();

    console.log('Starting subscription ownership migration...');

    // Find all subscriptions missing ownerId
    const missingOwnerId = await Subscription.find({ ownerId: { $exists: false } });
    console.log(`Found ${missingOwnerId.length} subscriptions needing migration`);

    // Update each subscription
    let updated = 0;
    for (const sub of missingOwnerId) {
      if (sub.merchantId) {
        sub.ownerId = sub.merchantId;
        sub.ownerType = 'merchant';
        await sub.save();
        updated++;
      }
    }

    console.log(`✓ Successfully updated ${updated} subscriptions`);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateSubscriptionOwnership();
