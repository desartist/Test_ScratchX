/**
 * GET /api/subscription/usage
 *
 * Get current subscription usage and quota details for merchant
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     subscription: {...},
 *     plan: {...},
 *     usage: {...},
 *     alerts: [...],
 *     daysRemaining: number,
 *     percentageUsed: {...}
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { getSubscriptionDetails } from "@/lib/subscriptionAccessGuard";
import { getLoginToken } from "@/lib/auth";

export async function GET(request) {
  try {
    await connectDB();

    // Get merchant ID from auth
    const authToken = await getLoginToken();
    if (!authToken || !authToken.accountId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - No account ID found" },
        { status: 401 }
      );
    }

    const merchantId = authToken.accountId.toString();

    // Get full subscription details
    const details = await getSubscriptionDetails(merchantId);

    if (!details.subscription) {
      return NextResponse.json(
        {
          success: false,
          error: "No active subscription found",
          data: {
            subscription: null,
            plan: null,
            usage: null,
            alerts: [],
          },
        },
        { status: 404 }
      );
    }

    // Calculate percentage used for each metric
    const percentageUsed = calculatePercentageUsed(
      details.plan,
      details.usage
    );

    // Format response
    const response = {
      success: true,
      data: {
        subscription: formatSubscription(details.subscription),
        plan: formatPlan(details.plan),
        usage: formatUsage(details.usage),
        alerts: details.alerts || [],
        daysRemaining: details.daysRemaining,
        percentageUsed,
        trialEndingIfApplicable: details.subscription.trialEndsAt,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching subscription usage:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error fetching subscription usage",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate percentage used for each limit
 */
function calculatePercentageUsed(plan, usage) {
  if (!usage || !plan) return {};

  const percentages = {};

  const limitsToCalculate = [
    { limit: "maxStores", metric: "totalStoresCreated", label: "Stores" },
    { limit: "maxCampaigns", metric: "activeCampaigns", label: "Campaigns" },
    {
      limit: "maxScratchCardsPerMonth",
      metric: "scratchCardsGenerated",
      label: "Scratches",
    },
    { limit: "maxMonthlyScans", metric: "totalScans", label: "Scans" },
    { limit: "maxManagersPerAccount", metric: "managers", label: "Team Members" },
  ];

  for (const check of limitsToCalculate) {
    const limitValue = plan.limits[check.limit];
    if (limitValue === -1) {
      percentages[check.label] = {
        percentage: 0,
        unlimited: true,
        current: usage.metrics[check.metric] || 0,
      };
    } else {
      const current = usage.metrics[check.metric] || 0;
      const percentage = limitValue > 0 ? (current / limitValue) * 100 : 0;
      percentages[check.label] = {
        percentage: Math.round(percentage),
        unlimited: false,
        current,
        limit: limitValue,
      };
    }
  }

  return percentages;
}

/**
 * Format subscription for response
 */
function formatSubscription(subscription) {
  return {
    _id: subscription._id,
    planId: subscription.planId,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    cancelledAt: subscription.cancelledAt,
  };
}

/**
 * Format plan for response
 */
function formatPlan(plan) {
  return {
    _id: plan._id,
    name: plan.name,
    displayName: plan.displayName,
    tier: plan.tier,
    price: plan.price,
    limits: plan.limits,
    features: plan.features,
  };
}

/**
 * Format usage for response
 */
function formatUsage(usage) {
  if (!usage) return null;

  return {
    _id: usage._id,
    metrics: usage.metrics,
    quotaExceeded: usage.quotaExceeded,
    alerts: usage.alerts,
    billingPeriod: usage.billingPeriod,
    isActive: usage.isActive,
  };
}
