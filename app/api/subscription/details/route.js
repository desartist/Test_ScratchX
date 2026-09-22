/**
 * GET /api/subscription/details
 *
 * Get detailed subscription information with plan features breakdown
 *
 * Response includes:
 * - Current plan details
 * - Available features
 * - Quota limits
 * - Current usage
 * - Alerts
 * - Upgrade recommendations
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { getSubscriptionDetails } from "@/lib/subscriptionAccessGuard";
import { getLoginToken, requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import SubscriptionPlan from "@/models/subscriptionPlanModel";

export async function GET(request) {
  try {
    await connectDB();

    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();

    // Authorization: Only Merchant and Distributor can purchase/upgrade plans
    if (!hasPermission(userRole, "subscription:upgrade")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // (A Super_Admin "act as merchant" branch used to live here, but it read
    // `body.merchantId` on a GET with no body — it always threw. Removed; this
    // route now always reports the caller's own subscription.)
    const merchantId = userId;
    // Get subscription details
    const details = await getSubscriptionDetails(merchantId);

    if (!details.subscription) {
      return NextResponse.json(
        {
          success: false,
          error: "No active subscription",
        },
        { status: 404 },
      );
    }

    const plan = details.plan;

    // A subscription can exist with no plan document attached (planId is
    // nullable). Everything below dereferences `plan`, so treat that the same
    // as having no subscription instead of throwing a 500. Previously
    // unreachable: this route read the id from an `x-user-id` header fed by an
    // `accountId` cookie that login never sets, so it 404'd for everyone.
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Subscription has no plan attached" },
        { status: 404 },
      );
    }

    // Get recommended upgrade plan (next tier up)
    const upgradePlan =
      plan.tier < 4
        ? await SubscriptionPlan.findOne({ tier: plan.tier + 1 })
        : null;

    // Build feature groups
    const featureGroups = groupFeatures(plan.features);

    // Build quota summary
    const quotaSummary = buildQuotaSummary(plan.limits, details.usage);

    // Response
    const response = {
      success: true,
      data: {
        subscription: {
          status: details.subscription.status,
          plan: plan.name,
          tier: plan.tier,
          currentPeriodEnd: details.subscription.currentPeriodEnd,
          daysRemaining: details.daysRemaining,
          trialEndsAt:
            details.subscription.status === "trial"
              ? details.subscription.trialEndsAt
              : null,
          isTrialExpiring:
            details.subscription.status === "trial" &&
            details.daysRemaining <= 3,
        },

        plan: {
          name: plan.name,
          displayName: plan.displayName,
          description: plan.description,
          tier: plan.tier,
          price: plan.price,
        },

        quotaSummary,

        features: featureGroups,

        usage: {
          metrics: details.usage?.metrics || {},
          alerts: details.alerts || [],
          quotaExceeded: details.usage?.quotaExceeded || {},
        },

        upgrade: upgradePlan
          ? {
              available: true,
              plan: upgradePlan.name,
              displayName: upgradePlan.displayName,
              price: upgradePlan.price,
              newFeatures: getNewFeatures(plan.features, upgradePlan.features),
              newLimits: getIncreasedLimits(plan.limits, upgradePlan.limits),
            }
          : {
              available: false,
              message: "You are on the highest tier plan",
            },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error fetching subscription details",
      },
      { status: 500 },
    );
  }
}

/**
 * Group features by category
 */
function groupFeatures(features) {
  const groups = {
    "Campaign Management": [],
    "Store Management": [],
    Analytics: [],
    Customization: [],
    Integrations: [],
    Team: [],
    Support: [],
    Advanced: [],
  };

  // Map features to groups
  const featureMap = {
    // Campaign
    canCreateCampaign: "Campaign Management",
    canDuplicateCampaign: "Campaign Management",
    canScheduleCampaign: "Campaign Management",
    canUseDynamicRewards: "Campaign Management",

    // Store
    canAddStore: "Store Management",
    canUseGeoFencing: "Store Management",
    canUseMultiStore: "Store Management",

    // Analytics
    canViewAnalytics: "Analytics",
    canViewRealTimeAnalytics: "Analytics",
    canExportReports: "Analytics",
    canScheduleReports: "Analytics",
    canViewCustomerList: "Analytics",
    canViewRedemptionHistory: "Analytics",

    // Customization
    canUseCustomBranding: "Customization",
    canCustomizeRewardPage: "Customization",
    canAddLogo: "Customization",
    canUseCustomDomain: "Customization",

    // Integrations
    canUseWhatsAppIntegration: "Integrations",
    canUseSMSIntegration: "Integrations",
    canUseEmailIntegration: "Integrations",
    canUseWebhooks: "Integrations",
    canUseAPI: "Integrations",

    // Team
    canAddManagers: "Team",
    canAddStaff: "Team",
    canCustomizePermissions: "Team",

    // Support
    canAccessPrioritySupport: "Support",
    canAccessDedicatedAccountManager: "Support",

    // Advanced
    canUseAdvancedRewards: "Advanced",
    canUseAbTesting: "Advanced",
    canUseAI: "Advanced",
    canUsePredictiveAnalytics: "Advanced",
  };

  for (const [feature, enabled] of Object.entries(features)) {
    const category = featureMap[feature] || "Other";
    if (!groups[category]) groups[category] = [];

    groups[category].push({
      feature: formatFeatureName(feature),
      key: feature,
      enabled,
    });
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, features]) => features.length > 0),
  );
}

/**
 * Build quota summary
 */
function buildQuotaSummary(limits, usage) {
  const summary = [];

  const items = [
    { key: "maxStores", label: "Stores", metric: "totalStoresCreated" },
    { key: "maxCampaigns", label: "Campaigns", metric: "activeCampaigns" },
    {
      key: "maxScratchCardsPerMonth",
      label: "Scratches/Month",
      metric: "scratchCardsGenerated",
    },
    { key: "maxMonthlyScans", label: "Scans/Month", metric: "totalScans" },
    {
      key: "maxManagersPerAccount",
      label: "Team Members",
      metric: "managers",
    },
  ];

  for (const item of items) {
    const limit = limits[item.key];
    const current = usage?.metrics[item.metric] || 0;

    if (limit === -1) {
      summary.push({
        label: item.label,
        current,
        limit: "Unlimited",
        percentage: 0,
        status: "ok",
      });
    } else {
      const percentage = limit > 0 ? (current / limit) * 100 : 0;
      let status = "ok";
      if (percentage >= 95) status = "critical";
      else if (percentage >= 80) status = "warning";

      summary.push({
        label: item.label,
        current,
        limit,
        remaining: Math.max(0, limit - current),
        percentage: Math.round(percentage),
        status,
      });
    }
  }

  return summary;
}

/**
 * Get new features when upgrading
 */
function getNewFeatures(currentFeatures, upgradeFeatures) {
  const newFeatures = [];

  for (const [feature, enabled] of Object.entries(upgradeFeatures)) {
    if (enabled && !currentFeatures[feature]) {
      newFeatures.push(formatFeatureName(feature));
    }
  }

  return newFeatures;
}

/**
 * Get increased limits when upgrading
 */
function getIncreasedLimits(currentLimits, upgradeLimits) {
  const increased = [];

  const items = [
    { key: "maxStores", label: "Stores" },
    { key: "maxCampaigns", label: "Campaigns" },
    { key: "maxScratchCardsPerMonth", label: "Scratches/Month" },
    { key: "maxMonthlyScans", label: "Scans/Month" },
  ];

  for (const item of items) {
    const current = currentLimits[item.key];
    const upgrade = upgradeLimits[item.key];

    if (upgrade > current || (upgrade === -1 && current !== -1)) {
      increased.push({
        metric: item.label,
        current: current === -1 ? "Unlimited" : current,
        upgrade: upgrade === -1 ? "Unlimited" : upgrade,
      });
    }
  }

  return increased;
}

/**
 * Format feature name for display
 */
function formatFeatureName(feature) {
  return (
    feature
      // Remove 'can' prefix
      .replace(/^can/, "")
      // Convert camelCase to spaces
      .replace(/([A-Z])/g, " $1")
      // Capitalize
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}
