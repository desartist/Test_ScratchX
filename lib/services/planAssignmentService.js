import Subscription from '@/models/subscriptionModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import SubscriptionUsage from '@/models/subscriptionUsageModel';
import DistributorBalance from '@/models/distributorBalanceModel';

/**
 * Assign a plan to an owner (merchant or distributor)
 *
 * @param {Object} params - Assignment parameters
 * @param {string} params.ownerType - Type of owner: 'merchant' or 'distributor'
 * @param {ObjectId} params.ownerId - ID of the owner
 * @param {ObjectId} params.planId - ID of the plan to assign
 * @param {string} params.planCode - Code/name of the plan (for validation)
 * @returns {Promise<{success: boolean, subscription?: Object, plan?: Object, usage?: Object, balance?: Object, error?: string}>}
 */
export async function assignPlanToOwner(params) {
  try {
    // Validate parameters
    const { ownerType, ownerId, planId, planCode } = params;

    if (!ownerType) {
      throw new Error('ownerType is required');
    }

    if (!ownerId) {
      throw new Error('ownerId is required');
    }

    if (!planId) {
      throw new Error('planId is required');
    }

    if (!planCode) {
      throw new Error('planCode is required');
    }

    // Get the plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Verify plan code matches
    if (plan.name !== planCode) {
      throw new Error(`Plan code mismatch. Expected: ${plan.name}, Got: ${planCode}`);
    }

    // Cancel any existing active subscriptions for this owner
    await Subscription.updateMany(
      {
        ownerType: ownerType,
        ownerId: ownerId,
        status: 'active'
      },
      {
        $set: { status: 'cancelled', cancelledAt: new Date() }
      }
    );

    // Calculate dates
    const startDate = new Date();
    const durationMs = plan.trialDurationDays
      ? plan.trialDurationDays * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000; // Default 365 days
    const endDate = new Date(startDate.getTime() + durationMs);

    // Create subscription
    const subscription = await Subscription.create({
      ownerType: ownerType,
      ownerId: ownerId,
      planId: planId,
      status: 'active',
      billingCycle: 'annual',
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      usage: {
        scansThisMonth: 0,
        activeCampaigns: 0,
        lastResetAt: startDate
      }
    });

    // Create subscription usage
    // Note: merchantId is required in the schema, so we use ownerId for all owner types
    // For merchants, ownerId == merchantId
    // For distributors, we store the distributorId in the merchantId field (schema limitation)
    const usage = await SubscriptionUsage.create({
      subscriptionId: subscription._id,
      merchantId: ownerId, // Use ownerId for both merchants and distributors
      billingPeriod: {
        startDate: startDate,
        endDate: endDate
      },
      metrics: {
        totalStoresCreated: 0,
        activeCampaigns: 0,
        totalCampaignsCreated: 0,
        scratchCardsGenerated: 0,
        scratchCardsRedeemed: 0,
        scratchCardsExpired: 0,
        totalScans: 0,
        totalParticipations: 0,
        uniqueCustomers: 0,
        teamMembers: 1,
        managers: 0,
        totalRewardsClaimed: 0,
        totalRedemptionValue: '0.00',
        reportsGenerated: 0,
        apiCallsUsed: 0
      },
      isActive: true
    });

    let balance = null;

    // If distributor, create DistributorBalance
    if (ownerType === 'distributor') {
      balance = await DistributorBalance.findOneAndUpdate(
        { distributorId: ownerId },
        {
          $set: {
            distributorId: ownerId,
            totalAllocated: plan.limits.maxScratchCardsPerMonth || 10000,
            allocations: [],
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

    return {
      success: true,
      subscription: subscription.toObject(),
      plan: plan.toObject(),
      usage: usage.toObject(),
      ...(balance && { balance: balance.toObject() })
    };
  } catch (error) {
    console.error('Error in assignPlanToOwner:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current active plan for an owner
 *
 * @param {string} ownerType - Type of owner: 'merchant' or 'distributor'
 * @param {ObjectId} ownerId - ID of the owner
 * @returns {Promise<{subscription: Object|null, plan: Object|null, usage: Object|null}>}
 */
export async function getPlanForOwner(ownerType, ownerId) {
  try {
    // Get active subscription
    const subscription = await Subscription.findOne({
      ownerType: ownerType,
      ownerId: ownerId,
      status: 'active'
    });

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
        usage: null
      };
    }

    // Get plan details
    const plan = await SubscriptionPlan.findById(subscription.planId);

    // Get usage details
    const usage = await SubscriptionUsage.findOne({
      subscriptionId: subscription._id
    });

    return {
      subscription: subscription.toObject(),
      plan: plan ? plan.toObject() : null,
      usage: usage ? usage.toObject() : null
    };
  } catch (error) {
    console.error('Error in getPlanForOwner:', error);
    return {
      subscription: null,
      plan: null,
      usage: null
    };
  }
}

/**
 * Get subscription history for an owner
 *
 * @param {string} ownerType - Type of owner: 'merchant' or 'distributor'
 * @param {ObjectId} ownerId - ID of the owner
 * @returns {Promise<Array>} - Array of subscriptions sorted by startDate descending
 */
export async function getOwnerSubscriptionHistory(ownerType, ownerId) {
  try {
    const subscriptions = await Subscription.find({
      ownerType: ownerType,
      ownerId: ownerId
    }).sort({ currentPeriodStart: -1 });

    return subscriptions.map(sub => sub.toObject());
  } catch (error) {
    console.error('Error in getOwnerSubscriptionHistory:', error);
    return [];
  }
}
