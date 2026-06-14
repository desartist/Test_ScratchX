/**
 * Subscription Plans Seed Data
 *
 * Default subscription plans for ScratchX platform.
 * Run this to initialize plans in the database.
 *
 * Usage:
 * import { seedSubscriptionPlans } from "@/lib/seeds/subscriptionPlans";
 * await seedSubscriptionPlans();
 */

import { connectDB } from "@/lib/connectDB";
import SubscriptionPlan from "@/models/subscriptionPlanModel";

export const SUBSCRIPTION_PLANS = [
  {
    name: "Trial",
    displayName: "14-Day Trial",
    description: "Free trial to explore ScratchX features",
    tier: 0,
    price: {
      monthly: 0,
      annual: 0,
      currency: "INR",
    },
    isTrialPlan: true,
    trialDurationDays: 14,
    limits: {
      maxStores: 1,
      maxCampaigns: 1,
      maxCampaignsPerStore: 1,
      maxScratchCardsPerMonth: 1000,
      maxScratchCardsPerCampaign: 5000,
      maxRangesPerCampaign: 2,
      maxRewardsPerRange: 5,
      maxManagersPerAccount: 0,
      maxStaffPerStore: 0,
      maxMonthlyScans: 10000,
      maxMonthlyParticipations: 10000,
      maxQRBatches: 2,
    },
    features: {
      canCreateCampaign: true,
      canDuplicateCampaign: false,
      canScheduleCampaign: false,
      canUseDynamicRewards: false,
      canAddStore: true,
      canUseGeoFencing: false,
      canUseMultiStore: false,
      canViewAnalytics: false,
      canViewRealTimeAnalytics: false,
      canExportReports: false,
      canScheduleReports: false,
      canViewCustomerList: false,
      canViewRedemptionHistory: false,
      canUseCustomBranding: false,
      canCustomizeRewardPage: false,
      canAddLogo: false,
      canUseCustomDomain: false,
      canUseWhatsAppIntegration: false,
      canUseSMSIntegration: false,
      canUseEmailIntegration: false,
      canUseWebhooks: false,
      canUseAPI: false,
      canAddManagers: false,
      canAddStaff: false,
      canCustomizePermissions: false,
      canAccessPrioritySupport: false,
      canAccessDedicatedAccountManager: false,
      canUseAdvancedRewards: false,
      canUseAbTesting: false,
      canUseAI: false,
      canUsePredictiveAnalytics: false,
    },
    isActive: true,
    isPublic: true,
    sortOrder: 0,
    targetAudience: "Individual",
    recommended: false,
  },

  {
    name: "Starter",
    displayName: "Starter Plan",
    description: "Perfect for single-store retailers getting started",
    tier: 1,
    price: {
      monthly: 499,
      annual: 4990,
      currency: "INR",
    },
    limits: {
      maxStores: 1,
      maxCampaigns: 3,
      maxCampaignsPerStore: 3,
      maxScratchCardsPerMonth: 10000,
      maxScratchCardsPerCampaign: 25000,
      maxRangesPerCampaign: 3,
      maxRewardsPerRange: 10,
      maxManagersPerAccount: 1,
      maxStaffPerStore: 2,
      maxMonthlyScans: 50000,
      maxMonthlyParticipations: 50000,
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
      canExportReports: false,
      canScheduleReports: false,
      canViewCustomerList: true,
      canViewRedemptionHistory: true,
      canUseCustomBranding: false,
      canCustomizeRewardPage: false,
      canAddLogo: false,
      canUseCustomDomain: false,
      canUseWhatsAppIntegration: false,
      canUseSMSIntegration: false,
      canUseEmailIntegration: false,
      canUseWebhooks: false,
      canUseAPI: false,
      canAddManagers: true,
      canAddStaff: true,
      canCustomizePermissions: false,
      canAccessPrioritySupport: false,
      canAccessDedicatedAccountManager: false,
      canUseAdvancedRewards: false,
      canUseAbTesting: false,
      canUseAI: false,
      canUsePredictiveAnalytics: false,
    },
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    targetAudience: "Individual",
    recommended: false,
  },

  {
    name: "Growth",
    displayName: "Growth Plan",
    description: "For growing retailers managing multiple stores",
    tier: 2,
    price: {
      monthly: 1499,
      annual: 14990,
      currency: "INR",
    },
    limits: {
      maxStores: 10,
      maxCampaigns: 20,
      maxCampaignsPerStore: -1,
      maxScratchCardsPerMonth: 100000,
      maxScratchCardsPerCampaign: -1,
      maxRangesPerCampaign: -1,
      maxRewardsPerRange: -1,
      maxManagersPerAccount: 5,
      maxStaffPerStore: 10,
      maxMonthlyScans: -1,
      maxMonthlyParticipations: -1,
      maxQRBatches: -1,
    },
    features: {
      canCreateCampaign: true,
      canDuplicateCampaign: true,
      canScheduleCampaign: true,
      canUseDynamicRewards: false,
      canAddStore: true,
      canUseGeoFencing: true,
      canUseMultiStore: true,
      canViewAnalytics: true,
      canViewRealTimeAnalytics: true,
      canExportReports: true,
      canScheduleReports: false,
      canViewCustomerList: true,
      canViewRedemptionHistory: true,
      canUseCustomBranding: true,
      canCustomizeRewardPage: true,
      canAddLogo: true,
      canUseCustomDomain: false,
      canUseWhatsAppIntegration: true,
      canUseSMSIntegration: false,
      canUseEmailIntegration: true,
      canUseWebhooks: true,
      canUseAPI: true,
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
    sortOrder: 2,
    targetAudience: "SMB",
    recommended: true,
  },

  {
    name: "Professional",
    displayName: "Professional Plan",
    description: "Enterprise features for large retailers",
    tier: 3,
    price: {
      monthly: 4999,
      annual: 49990,
      currency: "INR",
    },
    limits: {
      maxStores: 50,
      maxCampaigns: -1,
      maxCampaignsPerStore: -1,
      maxScratchCardsPerMonth: -1,
      maxScratchCardsPerCampaign: -1,
      maxRangesPerCampaign: -1,
      maxRewardsPerRange: -1,
      maxManagersPerAccount: 20,
      maxStaffPerStore: 50,
      maxMonthlyScans: -1,
      maxMonthlyParticipations: -1,
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
      canUseCustomDomain: true,
      canUseWhatsAppIntegration: true,
      canUseSMSIntegration: true,
      canUseEmailIntegration: true,
      canUseWebhooks: true,
      canUseAPI: true,
      canAddManagers: true,
      canAddStaff: true,
      canCustomizePermissions: true,
      canAccessPrioritySupport: true,
      canAccessDedicatedAccountManager: true,
      canUseAdvancedRewards: true,
      canUseAbTesting: true,
      canUseAI: true,
      canUsePredictiveAnalytics: true,
    },
    isActive: true,
    isPublic: true,
    sortOrder: 3,
    targetAudience: "Enterprise",
    recommended: false,
  },

  {
    name: "Enterprise",
    displayName: "Enterprise Plan",
    description: "Unlimited features with dedicated support",
    tier: 4,
    price: {
      monthly: 0, // Custom pricing
      annual: 0,
      currency: "INR",
    },
    limits: {
      maxStores: -1,
      maxCampaigns: -1,
      maxCampaignsPerStore: -1,
      maxScratchCardsPerMonth: -1,
      maxScratchCardsPerCampaign: -1,
      maxRangesPerCampaign: -1,
      maxRewardsPerRange: -1,
      maxManagersPerAccount: -1,
      maxStaffPerStore: -1,
      maxMonthlyScans: -1,
      maxMonthlyParticipations: -1,
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
      canUseCustomDomain: true,
      canUseWhatsAppIntegration: true,
      canUseSMSIntegration: true,
      canUseEmailIntegration: true,
      canUseWebhooks: true,
      canUseAPI: true,
      canAddManagers: true,
      canAddStaff: true,
      canCustomizePermissions: true,
      canAccessPrioritySupport: true,
      canAccessDedicatedAccountManager: true,
      canUseAdvancedRewards: true,
      canUseAbTesting: true,
      canUseAI: true,
      canUsePredictiveAnalytics: true,
    },
    isActive: true,
    isPublic: false, // Custom plan - not shown on pricing page
    sortOrder: 4,
    targetAudience: "Enterprise",
    recommended: false,
  },
];

/**
 * Seed subscription plans to database
 */
export async function seedSubscriptionPlans() {
  try {
    await connectDB();

    // Check if plans already exist
    const existingCount = await SubscriptionPlan.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Subscription plans already exist (${existingCount} found)`);
      return {
        success: true,
        message: `Already seeded. Found ${existingCount} plans`,
        count: existingCount,
      };
    }

    // Insert all plans
    const inserted = await SubscriptionPlan.insertMany(SUBSCRIPTION_PLANS);
    console.log(`✅ Seeded ${inserted.length} subscription plans`);

    return {
      success: true,
      message: `Successfully seeded ${inserted.length} subscription plans`,
      count: inserted.length,
      plans: inserted.map(p => ({ name: p.name, tier: p.tier })),
    };
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get plan by name
 */
export async function getPlanByName(planName) {
  try {
    await connectDB();
    return await SubscriptionPlan.findOne({ name: planName });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return null;
  }
}

/**
 * Get all active public plans (for pricing page)
 */
export async function getPublicPlans() {
  try {
    await connectDB();
    return await SubscriptionPlan.find({
      isActive: true,
      isPublic: true,
    }).sort({ sortOrder: 1 });
  } catch (error) {
    console.error("Error fetching public plans:", error);
    return [];
  }
}

export default {
  SUBSCRIPTION_PLANS,
  seedSubscriptionPlans,
  getPlanByName,
  getPublicPlans,
};
