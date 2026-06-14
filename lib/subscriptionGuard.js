import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";

/**
 * Check whether a merchant is within the limit for a given plan feature.
 *
 * @param {string} merchantId  - Account._id of the merchant
 * @param {"maxCampaigns"|"maxScansPerMonth"|"maxRangesPerCampaign"|"maxManagers"} feature
 * @param {number} currentCount - current usage count to compare against the limit
 * @returns {{ allowed: boolean, limit: number, current: number, status: string }}
 *
 * Returns allowed=true when there is no active subscription (fail-open during
 * trial or when subscription data is missing — tighten this if you want
 * strict enforcement from day one).
 */
export async function checkFeatureAccess(merchantId, feature, currentCount = 0) {
  await connectDB();

  const subscription = await Subscription.findOne({
    merchantId,
    status: { $in: ["trial", "active"] },
  }).populate("planId");

  // No subscription found → allow (free trial / grace period)
  if (!subscription || !subscription.planId) {
    return { allowed: true, limit: null, current: currentCount, status: "no_subscription" };
  }

  // Plan limits live under `limits` (e.g. maxRangesPerCampaign, maxCampaigns);
  // fall back to `features` for any boolean-style flags stored there.
  const planLimits = subscription.planId.limits || {};
  const planFeatures = subscription.planId.features || {};
  const limit = planLimits[feature] ?? planFeatures[feature];

  // Unlimited when -1, or when the limit isn't configured on the plan
  // (null/undefined) — fail-open, consistent with the no-subscription case
  // above. A real cap must be an explicit non-negative number.
  if (limit === -1 || limit === null || limit === undefined) {
    return {
      allowed: true,
      limit: limit ?? -1,
      current: currentCount,
      status: subscription.status,
    };
  }

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
    status: subscription.status,
  };
}

/**
 * Convenience wrapper that returns a 403 Response when the limit is exceeded.
 * Returns null when access is allowed.
 */
export async function enforceFeatureLimit(merchantId, feature, currentCount) {
  const result = await checkFeatureAccess(merchantId, feature, currentCount);
  if (!result.allowed) {
    return Response.json(
      {
        success: false,
        error: `Plan limit reached for '${feature}'. Current: ${result.current}, Limit: ${result.limit}. Please upgrade your plan.`,
        upgrade: true,
      },
      { status: 403 },
    );
  }
  return null;
}
