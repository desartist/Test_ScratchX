import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SubscriptionPlan from '../models/subscriptionPlanModel.js';
import { connectDB } from '../lib/connectDB.js';

dotenv.config();

/**
 * Seed subscription plans for ScratchX
 * Plans:
 * - Core (Single Store): ₹2,099/month (single store, 5 campaigns, basic features)
 * - Smart (Multi-Store): ₹2,999/month (10 stores, 50 campaigns, advanced features)
 */
async function seedPlans() {
  try {
    await connectDB();

    console.log('[SEED] Starting plan seeding...');

    const plans = [
      {
        name: 'Core',
        displayName: 'ScratchX Core',
        description: 'Perfect for retailers getting started with rewards. Single store with 5 campaigns.',
        tier: 1,
        price: { monthly: 2099, annual: 22490, currency: 'INR' },
        limits: {
          maxStores: 1,
          maxCampaigns: 5,
          maxCampaignsPerStore: 5,
          maxScratchCardsPerMonth: 5000,
          maxScratchCardsPerCampaign: 5000,
          maxRangesPerCampaign: 2,
          maxRewardsPerRange: 10,
          maxManagersPerAccount: 3,
          maxStaffPerStore: 2,
          maxMonthlyScans: 10000,
          maxMonthlyParticipations: 10000,
          maxQRBatches: 5,
        },
        features: {
          canCreateCampaign: true,
          canDuplicateCampaign: false,
          canScheduleCampaign: false,
          canUseDynamicRewards: false,
          canAddStore: true,
          canUseGeoFencing: false,
          canUseMultiStore: false,
          canViewAnalytics: true,
          canViewRealTimeAnalytics: false,
          canExportReports: true,
          canScheduleReports: false,
          canViewCustomerList: true,
          canViewRedemptionHistory: true,
          canUseCustomBranding: true,
          canCustomizeRewardPage: false,
          canAddLogo: true,
          canUseCustomDomain: false,
          canUseWhatsAppIntegration: false,
          canUseSMSIntegration: false,
          canUseEmailIntegration: false,
          canUseWebhooks: false,
          canUseAPI: false,
          canAddManagers: true,
          canAddStaff: true,
          canCustomizePermissions: false,
          canAccessPrioritySupport: true,
          canAccessDedicatedAccountManager: false,
          canUseAdvancedRewards: false,
          canUseAbTesting: false,
          canUseAI: false,
          canUsePredictiveAnalytics: false,
        },
        isActive: true,
        isPublic: true,
        isTrialPlan: false,
        sortOrder: 1,
        targetAudience: 'SMB',
        recommended: false,
      },
      {
        name: 'Smart',
        displayName: 'ScratchX Smart',
        description: 'For growing businesses with multiple locations. Unlimited campaigns, advanced analytics, priority support.',
        tier: 2,
        price: { monthly: 2999, annual: 32389, currency: 'INR' },
        limits: {
          maxStores: 10,
          maxCampaigns: 50,
          maxCampaignsPerStore: -1,
          maxScratchCardsPerMonth: 50000,
          maxScratchCardsPerCampaign: 50000,
          maxRangesPerCampaign: 5,
          maxRewardsPerRange: 20,
          maxManagersPerAccount: 10,
          maxStaffPerStore: 5,
          maxMonthlyScans: 100000,
          maxMonthlyParticipations: 100000,
          maxQRBatches: -1,
        },
        features: {
          canCreateCampaign: true,
          canDuplicateCampaign: true,
          canScheduleCampaign: true,
          canUseDynamicRewards: true,
          canAddStore: true,
          canUseGeoFencing: true,
          canUseMultiStore: true,
          canViewAnalytics: true,
          canViewRealTimeAnalytics: true,
          canExportReports: true,
          canScheduleReports: true,
          canViewCustomerList: true,
          canViewRedemptionHistory: true,
          canUseCustomBranding: true,
          canCustomizeRewardPage: true,
          canAddLogo: true,
          canUseCustomDomain: false,
          canUseWhatsAppIntegration: true,
          canUseSMSIntegration: false,
          canUseEmailIntegration: false,
          canUseWebhooks: true,
          canUseAPI: false,
          canAddManagers: true,
          canAddStaff: true,
          canCustomizePermissions: true,
          canAccessPrioritySupport: true,
          canAccessDedicatedAccountManager: false,
          canUseAdvancedRewards: true,
          canUseAbTesting: true,
          canUseAI: false,
          canUsePredictiveAnalytics: false,
        },
        isActive: true,
        isPublic: true,
        isTrialPlan: false,
        sortOrder: 2,
        targetAudience: 'SMB',
        recommended: true,
      },
    ];

    // Upsert plans (insert or update if exists)
    for (const plan of plans) {
      const existing = await SubscriptionPlan.findOne({ name: plan.name });
      if (existing) {
        await SubscriptionPlan.updateOne({ name: plan.name }, plan);
        console.log(`  ✓ Updated plan: ${plan.name}`);
      } else {
        await SubscriptionPlan.create(plan);
        console.log(`  ✓ Created plan: ${plan.name}`);
      }
    }

    console.log('[SEED] Plan seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    process.exit(1);
  }
}

seedPlans();
