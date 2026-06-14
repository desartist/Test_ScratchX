/**
 * Subscription Access Guard Service
 *
 * Provides feature gating and quota enforcement for subscriptions.
 * Used throughout the application to check if a merchant can access a feature.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/connectDB";
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import SubscriptionUsage from "@/models/subscriptionUsageModel";
import DistributorBalance from "@/models/distributorBalanceModel";

/**
 * Check if owner has access to a feature based on their plan (GENERIC - merchant or distributor)
 *
 * @param {object} owner - { ownerType: 'merchant'|'distributor', ownerId }
 * @param {string} featureName - Feature key (e.g., "canCreateCampaign")
 * @returns {Promise<{allowed: boolean, plan?: object, reason?: string}>}
 *
 * Usage:
 * const access = await checkPlanAccess({ ownerType: 'distributor', ownerId }, "canCreateCampaign");
 * if (!access.allowed) throw new Error(access.reason);
 */
export async function checkPlanAccess(owner, featureName) {
  try {
    await connectDB();

    // Handle both old (merchantId) and new (owner object) signatures
    let ownerType = 'merchant';
    let ownerId = owner;

    if (typeof owner === 'object' && owner !== null) {
      ownerType = owner.ownerType || 'merchant';
      ownerId = owner.ownerId;
    }

    // 1. Get owner's active subscription
    const subscription = await Subscription.findOne({
      ownerType,
      ownerId,
      status: { $in: ["trial", "active"] },
    }).populate("planId");

    if (!subscription) {
      return {
        allowed: false,
        reason: `No active subscription found for this ${ownerType}`,
        plan: null,
      };
    }

    const plan = subscription.planId;

    // 2. Check if feature is enabled in plan
    const featureEnabled = plan.features[featureName];

    if (featureEnabled === undefined) {
      return {
        allowed: false,
        reason: `Feature "${featureName}" does not exist`,
        plan,
      };
    }

    if (!featureEnabled) {
      return {
        allowed: false,
        reason: `This feature is not available in the ${plan.name} plan`,
        plan,
        upgradeRequired: true,
      };
    }

    // 3. All checks passed
    return {
      allowed: true,
      plan,
      subscription,
    };
  } catch (error) {
    console.error("Error checking plan access:", error);
    return {
      allowed: false,
      reason: "Error checking subscription access",
      error: error.message,
    };
  }
}

/**
 * Check if owner has remaining quota for an action (GENERIC - merchant or distributor)
 *
 * @param {object} owner - { ownerType: 'merchant'|'distributor', ownerId } OR merchantId string
 * @param {string} limitName - Limit key (e.g., "maxCampaigns", "maxStores")
 * @param {number} requestAmount - How much quota is needed (default: 1)
 * @returns {Promise<{allowed: boolean, currentUsage: number, limit: number, remaining: number, reason?: string}>}
 *
 * Usage:
 * const quota = await checkQuotaLimit({ ownerType: 'distributor', ownerId }, "maxCampaigns", 1);
 * if (!quota.allowed) throw new Error(`Campaign limit reached: ${quota.currentUsage}/${quota.limit}`);
 */
export async function checkQuotaLimit(owner, limitName, requestAmount = 1) {
  try {
    await connectDB();

    // Handle both old (merchantId) and new (owner object) signatures
    let ownerType = 'merchant';
    let ownerId = owner;

    if (typeof owner === 'object' && owner !== null) {
      ownerType = owner.ownerType || 'merchant';
      ownerId = owner.ownerId;
    }

    // 1. Get subscription + plan
    const subscription = await Subscription.findOne({
      ownerType,
      ownerId,
      status: { $in: ["trial", "active"] },
    }).populate("planId");

    if (!subscription) {
      return {
        allowed: false,
        reason: "No active subscription",
        currentUsage: 0,
        limit: 0,
      };
    }

    const plan = subscription.planId;
    const limitValue = plan.limits[limitName];

    if (limitValue === undefined) {
      return {
        allowed: false,
        reason: `Limit "${limitName}" does not exist`,
        currentUsage: 0,
        limit: 0,
      };
    }

    // -1 means unlimited
    if (limitValue === -1) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: -1,
        unlimited: true,
      };
    }

    // 2. Get current usage
    const usage = await SubscriptionUsage.findOne({
      subscriptionId: subscription._id,
      isActive: true,
    });

    if (!usage) {
      // No usage record yet - create one (should exist but failsafe)
      const newUsage = new SubscriptionUsage({
        subscriptionId: subscription._id,
        merchantId: ownerType === 'merchant' ? ownerId : null,
        billingPeriod: {
          startDate: new Date(subscription.currentPeriodStart),
          endDate: new Date(subscription.currentPeriodEnd),
        },
      });
      await newUsage.save();

      return {
        allowed: requestAmount <= limitValue,
        currentUsage: 0,
        limit: limitValue,
        remaining: limitValue,
      };
    }

    // Map limit names to usage metric names
    const metricMap = {
      maxStores: "totalStoresCreated",
      maxCampaigns: "activeCampaigns",
      maxScratchCardsPerMonth: "scratchCardsGenerated",
      maxMonthlyScans: "totalScans",
      maxManagersPerAccount: "managers",
      maxRangesPerCampaign: "activeRanges", // Would need to track separately
    };

    const metricName = metricMap[limitName];
    const currentUsage = metricName ? usage.metrics[metricName] || 0 : 0;

    const allowed = currentUsage + requestAmount <= limitValue;
    const remaining = Math.max(0, limitValue - currentUsage);

    return {
      allowed,
      currentUsage,
      limit: limitValue,
      remaining,
      wouldExceed: !allowed,
      requestAmount,
    };
  } catch (error) {
    console.error("Error checking quota limit:", error);
    return {
      allowed: false,
      reason: "Error checking quota",
      error: error.message,
    };
  }
}

/**
 * Get full subscription details for an owner (GENERIC - merchant or distributor)
 *
 * @param {object} owner - { ownerType: 'merchant'|'distributor', ownerId } OR merchantId string
 * @returns {Promise<{subscription, plan, usage, alerts, daysRemaining}>}
 */
export async function getSubscriptionDetails(owner) {
  try {
    await connectDB();

    // Handle both old (merchantId) and new (owner object) signatures
    let ownerType = 'merchant';
    let ownerId = owner;

    if (typeof owner === 'object' && owner !== null) {
      ownerType = owner.ownerType || 'merchant';
      ownerId = owner.ownerId;
    }

    const subscription = await Subscription.findOne({
      ownerType,
      ownerId,
      status: { $in: ["trial", "active"] },
    })
      .populate("planId")
      .populate("distributorId", "name email");

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
        usage: null,
        alerts: [],
      };
    }

    const usage = await SubscriptionUsage.findOne({
      subscriptionId: subscription._id,
      isActive: true,
    });

    // Generate usage alerts
    const alerts = generateUsageAlerts(subscription.planId, usage);

    return {
      subscription,
      plan: subscription.planId,
      usage,
      alerts,
      daysRemaining: subscription.currentPeriodEnd
        ? Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
        : null,
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    return {
      subscription: null,
      plan: null,
      usage: null,
      alerts: [{ type: "error", message: "Unable to load subscription details" }],
      error: error.message,
    };
  }
}

/**
 * Generate usage alerts based on current usage
 *
 * @private
 */
function generateUsageAlerts(plan, usage) {
  if (!usage || !plan) return [];

  const alerts = [];
  const warningThreshold = 0.8; // 80% usage = warning
  const criticalThreshold = 0.95; // 95% usage = critical

  // Check each limit
  const limitsToCheck = [
    { limit: "maxStores", metric: "totalStoresCreated", label: "Stores" },
    { limit: "maxCampaigns", metric: "activeCampaigns", label: "Campaigns" },
    {
      limit: "maxScratchCardsPerMonth",
      metric: "scratchCardsGenerated",
      label: "Scratches",
    },
    { limit: "maxMonthlyScans", metric: "totalScans", label: "Monthly Scans" },
  ];

  for (const check of limitsToCheck) {
    const limitValue = plan.limits[check.limit];
    if (limitValue === -1) continue; // Skip unlimited

    const currentUsage = usage.metrics[check.metric] || 0;
    const percentage = currentUsage / limitValue;

    if (percentage >= criticalThreshold) {
      alerts.push({
        type: "critical",
        metric: check.label,
        message: `${check.label} limit almost reached: ${currentUsage}/${limitValue} (${Math.round(percentage * 100)}%)`,
        currentUsage,
        limit: limitValue,
        percentage: Math.round(percentage * 100),
      });
    } else if (percentage >= warningThreshold) {
      alerts.push({
        type: "warning",
        metric: check.label,
        message: `${check.label} usage at ${Math.round(percentage * 100)}% of limit`,
        currentUsage,
        limit: limitValue,
        percentage: Math.round(percentage * 100),
      });
    }
  }

  return alerts;
}

/**
 * Increment usage metric for a merchant
 *
 * @param {string} merchantId
 * @param {string} metricPath - Path to metric (e.g., "metrics.totalScans")
 * @param {number} amount - Amount to increment
 */
export async function incrementUsageMetric(merchantId, metricPath, amount = 1) {
  try {
    await connectDB();

    const usage = await SubscriptionUsage.findOne({
      merchantId,
      isActive: true,
    });

    if (!usage) {
      console.warn(`No active usage record found for merchant ${merchantId}`);
      return null;
    }

    const [category, metric] = metricPath.split(".");
    if (category === "metrics" && usage.metrics[metric] !== undefined) {
      usage.metrics[metric] += amount;
      await usage.save();
      return usage;
    }

    return null;
  } catch (error) {
    console.error("Error incrementing usage metric:", error);
    return null;
  }
}

/**
 * Reset monthly usage (called by scheduled job)
 *
 * @param {string} merchantId
 */
export async function resetMonthlyUsage(merchantId) {
  try {
    await connectDB();

    const subscription = await Subscription.findOne({
      merchantId,
    });

    if (!subscription) return null;

    // Mark old usage as inactive
    await SubscriptionUsage.updateMany(
      {
        subscriptionId: subscription._id,
        isActive: true,
      },
      {
        isActive: false,
        resetAt: new Date(),
      }
    );

    // Create new usage record for new period
    const newUsage = new SubscriptionUsage({
      subscriptionId: subscription._id,
      merchantId,
      billingPeriod: {
        startDate: new Date(subscription.currentPeriodStart),
        endDate: new Date(subscription.currentPeriodEnd),
      },
    });

    await newUsage.save();
    return newUsage;
  } catch (error) {
    console.error("Error resetting monthly usage:", error);
    return null;
  }
}

/**
 * Get distributor balance and allocations
 *
 * @param {string} distributorId - Distributor ObjectId
 * @returns {Promise<{allowed: boolean, balance?: object, error?: string}>}
 *
 * Returns total allocated, remaining balance, and allocations list
 */
export async function getDistributorBalance(distributorId) {
  try {
    // Only connect if not already connected (for tests)
    if (typeof mongoose !== 'undefined' && mongoose.connection && mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Check if distributor has active subscription
    const subscription = await Subscription.findOne({
      ownerType: 'distributor',
      ownerId: distributorId,
      status: 'active',
    }).populate('planId');

    if (!subscription) {
      return { allowed: false, error: 'No active subscription found' };
    }

    // Get balance record
    const balance = await DistributorBalance.findOne({ distributorId });

    if (!balance) {
      return { allowed: false, error: 'No balance record found' };
    }

    return {
      allowed: true,
      balance: {
        total: balance.totalAllocated,
        remaining: balance.getRemainingBalance(),
        allocations: balance.allocations,
      },
    };
  } catch (error) {
    console.error('Error getting distributor balance:', error);
    return { allowed: false, error: error.message };
  }
}

/**
 * Validate distributor allocation to merchant
 *
 * @param {string} distributorId - Distributor ObjectId
 * @param {string} merchantId - Merchant ObjectId
 * @param {number} quantity - Quantity to allocate
 * @returns {Promise<{allowed: boolean, error?: string, remainingBalance?: number}>}
 *
 * Checks quantity is positive and sufficient balance exists
 */
export async function validateDistributorAllocation(distributorId, merchantId, quantity) {
  try {
    // Validate quantity
    if (!quantity || quantity <= 0) {
      return {
        allowed: false,
        error: 'Quantity must be greater than 0',
      };
    }

    // Get distributor balance
    const result = await getDistributorBalance(distributorId);

    if (!result.allowed) {
      return {
        allowed: false,
        error: result.error,
      };
    }

    const remaining = result.balance.remaining;

    // Check if quantity exceeds remaining balance
    if (quantity > remaining) {
      return {
        allowed: false,
        error: `Insufficient balance. Available: ${remaining}, Requested: ${quantity}`,
        remainingBalance: remaining,
      };
    }

    return {
      allowed: true,
      remainingBalance: remaining - quantity,
    };
  } catch (error) {
    console.error('Error validating allocation:', error);
    return { allowed: false, error: error.message };
  }
}

/**
 * Check subscription access for generic ownership (merchant or distributor)
 *
 * @param {string} ownerType - 'merchant' or 'distributor'
 * @param {string} ownerId - Owner ObjectId
 * @returns {Promise<{allowed: boolean, subscription?: object, plan?: object, error?: string}>}
 *
 * Returns active subscription and populated plan details
 */
export async function checkSubscriptionAccess(ownerType, ownerId) {
  try {
    // Only connect if not already connected (for tests)
    if (mongoose.connection && mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const subscription = await Subscription.findOne({
      ownerType,
      ownerId,
      status: 'active',
    }).populate('planId');

    if (!subscription) {
      return {
        allowed: false,
        error: `No active subscription found for ${ownerType}`,
      };
    }

    const plan = subscription.populated('planId');

    return {
      allowed: true,
      subscription: subscription.toObject(),
      plan: plan ? plan.toObject() : null,
    };
  } catch (error) {
    console.error('Error checking subscription access:', error);
    return { allowed: false, error: error.message };
  }
}

export default {
  checkPlanAccess,
  checkQuotaLimit,
  getSubscriptionDetails,
  incrementUsageMetric,
  resetMonthlyUsage,
  getDistributorBalance,
  validateDistributorAllocation,
  checkSubscriptionAccess,
};
