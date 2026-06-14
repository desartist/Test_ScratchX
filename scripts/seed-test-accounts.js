import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../models/accountModel.js';
import Subscription from '../models/subscriptionModel.js';
import SubscriptionPlan from '../models/subscriptionPlanModel.js';
import { connectDB } from '../lib/connectDB.js';
import bcrypt from 'bcrypt';

dotenv.config();

/**
 * Seed test accounts with active subscriptions
 */
async function seedTestAccounts() {
  try {
    await connectDB();

    console.log('[SEED] Starting test account seeding...');

    // Get plan IDs
    const corePlan = await SubscriptionPlan.findOne({ name: 'Core' });
    const smartPlan = await SubscriptionPlan.findOne({ name: 'Smart' });

    if (!corePlan || !smartPlan) {
      throw new Error('Plans not found. Run seed:plans first.');
    }

    // Test Merchant with Core plan
    const merchantPassword = await bcrypt.hash('TestMerchant@123', 10);
    let merchant = await Account.findOne({ email: 'test-merchant@scratchx.local' });
    if (!merchant) {
      merchant = await Account.create({
        email: 'test-merchant@scratchx.local',
        firstName: 'Test',
        lastName: 'Merchant',
        name: 'Test Merchant',
        phone: '9876543210',
        password: merchantPassword,
        role: 'Merchant',
        status: 'active',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        source: 'Internal',
        profile: {
          storeName: 'Test Store',
          storeAddress: '123 Main St, Mumbai',
          businessType: 'Retail',
          countryCode: 'IN',
          storeLocation: 'Mumbai',
        },
      });
      console.log('  ✓ Created test merchant:', merchant.email);
    }

    // Create active subscription for merchant
    let merchantSub = await Subscription.findOne({
      ownerId: merchant._id,
      ownerType: 'merchant',
    });
    if (!merchantSub) {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      merchantSub = await Subscription.create({
        ownerId: merchant._id,
        ownerType: 'merchant',
        merchantId: merchant._id,
        planId: corePlan._id,
        planType: 'CORE',
        status: 'active',
        billingCycle: 'one-time',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil: validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 90,
        },
      });
      console.log('  ✓ Created subscription for merchant:', corePlan.name);
    }

    // Test Distributor with Smart plan
    const distributorPassword = await bcrypt.hash('TestDistributor@123', 10);
    let distributor = await Account.findOne({ email: 'test-distributor@scratchx.local' });
    if (!distributor) {
      distributor = await Account.create({
        email: 'test-distributor@scratchx.local',
        firstName: 'Test',
        lastName: 'Distributor',
        name: 'Test Distributor',
        phone: '9876543211',
        password: distributorPassword,
        role: 'Distributor',
        status: 'active',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        source: 'Internal',
        profile: {
          companyName: 'Test Distribution Co.',
          territory: 'Mumbai',
          region: 'Western India',
        },
      });
      console.log('  ✓ Created test distributor:', distributor.email);
    }

    // Create active subscription for distributor
    let distributorSub = await Subscription.findOne({
      ownerId: distributor._id,
      ownerType: 'distributor',
    });
    if (!distributorSub) {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      distributorSub = await Subscription.create({
        ownerId: distributor._id,
        ownerType: 'distributor',
        planId: smartPlan._id,
        planType: 'SMART',
        status: 'active',
        billingCycle: 'one-time',
        purchaseDate: now,
        unlimitedScratches: {
          isActive: true,
          grantedAt: now,
          validUntil: validUntil,
          scratchValidityType: 'quarterly',
          daysRemaining: 90,
        },
      });
      console.log('  ✓ Created subscription for distributor:', smartPlan.name);
    }

    console.log('\n[SEED] Test account seeding completed!');
    console.log('\nTest Credentials:');
    console.log('  Merchant:');
    console.log('    Email: test-merchant@scratchx.local');
    console.log('    Password: TestMerchant@123');
    console.log('    Plan: Core (₹2,099/month)');
    console.log('\n  Distributor:');
    console.log('    Email: test-distributor@scratchx.local');
    console.log('    Password: TestDistributor@123');
    console.log('    Plan: Smart (₹2,999/month)');

    process.exit(0);
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    process.exit(1);
  }
}

seedTestAccounts();
