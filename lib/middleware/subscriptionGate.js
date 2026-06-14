/**
 * Subscription Feature Gate Middleware
 *
 * Middleware for Next.js API routes to enforce subscription-based feature access.
 * Wraps endpoint handlers to check if merchant has access before allowing execution.
 */

import { NextResponse } from "next/server";
import { checkPlanAccess, checkQuotaLimit } from "@/lib/subscriptionAccessGuard";

/**
 * HOF that creates a gated endpoint handler
 *
 * Usage:
 * export const POST = requireFeature("canCreateCampaign")(async (req, context) => {
 *   // Handler code
 * });
 *
 * Or with quota check:
 * export const POST = requireFeature("canCreateCampaign", { quota: "maxCampaigns" })(handler);
 */
export function requireFeature(featureName, options = {}) {
  return (handler) => async (req, context) => {
    try {
      // Extract merchant ID from request
      const merchantId = req.headers.get("x-merchant-id") ||
                        req.headers.get("x-user-id") ||
                        context?.params?.merchantId;

      if (!merchantId) {
        return NextResponse.json(
          {
            success: false,
            error: "Merchant ID is required",
          },
          { status: 400 }
        );
      }

      // 1. Check feature access
      const featureAccess = await checkPlanAccess(merchantId, featureName);

      if (!featureAccess.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: featureAccess.reason,
            plan: featureAccess.plan?.name,
            upgradeRequired: featureAccess.upgradeRequired || false,
          },
          { status: 403 }
        );
      }

      // 2. Check quota limit if specified
      if (options.quota) {
        const quotaCheck = await checkQuotaLimit(
          merchantId,
          options.quota,
          options.quotaAmount || 1
        );

        if (!quotaCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: `${options.quotaErrorMessage || "Quota limit"} reached: ${quotaCheck.currentUsage}/${quotaCheck.limit}`,
              quota: {
                currentUsage: quotaCheck.currentUsage,
                limit: quotaCheck.limit,
                remaining: quotaCheck.remaining,
              },
              upgradeRequired: true,
            },
            { status: 429 }
          );
        }

        // Attach quota info to request for handler use
        req.quotaInfo = quotaCheck;
      }

      // 3. Attach subscription info to request
      req.subscriptionInfo = featureAccess;

      // 4. Call original handler
      return handler(req, context);
    } catch (error) {
      console.error("Subscription gate middleware error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Error checking subscription access",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to check multiple features
 *
 * Usage:
 * export const POST = requireAnyFeature(["canCreateCampaign", "canDuplicateCampaign"])(handler);
 */
export function requireAnyFeature(featureNames) {
  return (handler) => async (req, context) => {
    try {
      const merchantId = req.headers.get("x-merchant-id") ||
                        req.headers.get("x-user-id");

      if (!merchantId) {
        return NextResponse.json(
          { success: false, error: "Merchant ID is required" },
          { status: 400 }
        );
      }

      // Check if ANY feature is available
      let hasAccess = false;
      let lastError = null;

      for (const feature of featureNames) {
        const access = await checkPlanAccess(merchantId, feature);
        if (access.allowed) {
          hasAccess = true;
          req.subscriptionInfo = access;
          break;
        }
        lastError = access;
      }

      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: lastError.reason,
            requiredFeatures: featureNames,
          },
          { status: 403 }
        );
      }

      return handler(req, context);
    } catch (error) {
      console.error("Subscription gate error:", error);
      return NextResponse.json(
        { success: false, error: "Error checking subscription" },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if request has subscription access (for use inside handlers)
 *
 * Usage:
 * const access = checkSubscriptionAccess(req);
 * if (!access.allowed) return error response;
 */
export async function checkSubscriptionAccess(req, featureName) {
  const merchantId = req.headers.get("x-merchant-id") ||
                    req.headers.get("x-user-id");

  if (!merchantId) {
    return {
      allowed: false,
      error: "No merchant ID found",
    };
  }

  return checkPlanAccess(merchantId, featureName);
}

/**
 * Get available quota from request (set by requireFeature middleware)
 *
 * Usage:
 * const quota = getQuotaFromRequest(req);
 * console.log(`${quota.remaining} campaigns remaining`);
 */
export function getQuotaFromRequest(req) {
  return req.quotaInfo || null;
}

/**
 * Check if feature is enabled in plan without hitting database
 * (Use when you have plan object from context)
 *
 * Usage:
 * const canCreate = isFeatureEnabled(plan, "canCreateCampaign");
 */
export function isFeatureEnabled(plan, featureName) {
  if (!plan || !plan.features) return false;
  return plan.features[featureName] === true;
}

/**
 * Check if limit is exceeded without hitting database
 *
 * Usage:
 * const canAdd = isWithinQuota(usage, plan, "maxCampaigns", 1);
 */
export function isWithinQuota(usage, plan, limitName, requestAmount = 1) {
  if (!usage || !plan) return false;

  const limitValue = plan.limits[limitName];
  if (limitValue === -1) return true; // Unlimited

  const metricMap = {
    maxStores: "totalStoresCreated",
    maxCampaigns: "activeCampaigns",
    maxScratchCardsPerMonth: "scratchCardsGenerated",
    maxMonthlyScans: "totalScans",
  };

  const metricName = metricMap[limitName];
  const currentUsage = usage.metrics[metricName] || 0;

  return currentUsage + requestAmount <= limitValue;
}

/**
 * Format error response for subscription issues
 */
export function formatSubscriptionError(error, plan) {
  return {
    success: false,
    error: error.message || "Feature not available in your plan",
    plan: plan?.name,
    upgradeRequired: true,
    contact: "support@scratchx.com",
  };
}

export default {
  requireFeature,
  requireAnyFeature,
  checkSubscriptionAccess,
  getQuotaFromRequest,
  isFeatureEnabled,
  isWithinQuota,
  formatSubscriptionError,
};
