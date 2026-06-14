/**
 * Distributor & Merchant Seed Data
 *
 * Creates test merchants and distributors with assigned plans across all tiers.
 * Run this to initialize test data in the database.
 *
 * Usage:
 * npm run seed:distributor-data
 */

import mongoose from 'mongoose';
import Account from '../../models/accountModel.js';
import SubscriptionPlan from '../../models/subscriptionPlanModel.js';
import { connectDB } from '../connectDB.js';
import { assignPlanToOwner } from '../services/planAssignmentService.js';

const PLAN_CODES = ['Starter', 'Growth', 'Professional'];

async function seedDistributorData() {
  try {
    console.log('🌱 Seeding distributor & merchant test data...');
    await connectDB();

    const results = [];

    for (const planCode of PLAN_CODES) {
      // Get plan by name
      const plan = await SubscriptionPlan.findOne({ name: planCode });
      if (!plan) {
        console.warn(`⚠️  Plan not found: ${planCode}. Skipping...`);
        continue;
      }

      // Create merchant
      const merchant = await Account.create({
        email: `merchant-${planCode.toLowerCase()}@test.local`,
        role: 'Merchant',
        status: 'active',
        profile: {
          storeName: `Test Merchant - ${planCode}`,
          storeAddress: `123 Test Street, Test City, Test State`,
          businessType: 'Retail',
          phoneNumber: '+91-9000000000',
        },
        source: 'Internal',
      });

      // Assign plan to merchant
      const merchantPlanResult = await assignPlanToOwner({
        ownerType: 'merchant',
        ownerId: merchant._id,
        planId: plan._id,
        planCode: plan.name,
      });

      if (!merchantPlanResult.success) {
        console.error(`❌ Failed to assign plan to merchant: ${merchantPlanResult.error}`);
        continue;
      }

      // Create distributor
      const distributor = await Account.create({
        email: `distributor-${planCode.toLowerCase()}@test.local`,
        role: 'Distributor',
        status: 'active',
        profile: {
          companyName: `Test Distributor - ${planCode}`,
          territory: `Test Territory - ${planCode}`,
          region: 'Test Region',
        },
        source: 'Internal',
      });

      // Assign plan to distributor
      const distributorPlanResult = await assignPlanToOwner({
        ownerType: 'distributor',
        ownerId: distributor._id,
        planId: plan._id,
        planCode: plan.name,
      });

      if (!distributorPlanResult.success) {
        console.error(`❌ Failed to assign plan to distributor: ${distributorPlanResult.error}`);
        continue;
      }

      // Record result
      results.push({
        planCode: planCode,
        planId: plan._id,
        merchant: {
          id: merchant._id,
          email: merchant.email,
          storeName: merchant.profile.storeName,
        },
        distributor: {
          id: distributor._id,
          email: distributor.email,
          companyName: distributor.profile.companyName,
        },
        balance: distributorPlanResult.balance || null,
      });

      console.log(`✅ ${planCode}:
  - Merchant: ${merchant._id} (${merchant.email})
  - Distributor: ${distributor._id} (${distributor.email})
  - Balance: ${distributorPlanResult.balance?.totalAllocated || 'N/A'}`);
    }

    console.log('\n✨ Seeding complete!');
    console.log(`Created ${results.length} merchant-distributor pairs`);

    // Print summary
    console.log('\n📊 Summary:');
    results.forEach(r => {
      console.log(`  ${r.planCode}:`);
      console.log(`    - Merchant ID: ${r.merchant.id}`);
      console.log(`    - Distributor ID: ${r.distributor.id}`);
      console.log(`    - Balance: ${r.balance?.totalAllocated || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

// Run if executed directly
seedDistributorData();

export default seedDistributorData;
