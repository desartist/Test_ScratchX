import mongoose from "mongoose";

/**
 * SubscriptionUsage Schema
 *
 * Tracks actual usage metrics for a subscription.
 * Reset monthly via scheduled job.
 * Used by checkPlanAccess() to enforce limits.
 */
const subscriptionUsageSchema = new mongoose.Schema(
  {
    // Reference to subscription
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // Billing period these metrics are for
    billingPeriod: {
      startDate: {
        type: Date,
        required: true,
        index: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    // USAGE COUNTERS (Tracked in real-time)
    metrics: {
      // Stores & Campaigns
      totalStoresCreated: {
        type: Number,
        default: 0,
        description: "Total stores created in this period"
      },
      activeCampaigns: {
        type: Number,
        default: 0,
        description: "Currently active campaigns"
      },
      totalCampaignsCreated: {
        type: Number,
        default: 0,
        description: "Total campaigns ever created"
      },

      // Scratch Cards
      scratchCardsGenerated: {
        type: Number,
        default: 0,
        description: "Scratch cards generated this period"
      },
      scratchCardsRedeemed: {
        type: Number,
        default: 0,
        description: "Scratch cards redeemed this period"
      },
      scratchCardsExpired: {
        type: Number,
        default: 0,
        description: "Scratch cards expired this period"
      },

      // Customer Interactions
      totalScans: {
        type: Number,
        default: 0,
        description: "Total QR scans this period"
      },
      totalParticipations: {
        type: Number,
        default: 0,
        description: "Total customer participations this period"
      },
      uniqueCustomers: {
        type: Number,
        default: 0,
        description: "Unique customers who participated"
      },

      // Team
      teamMembers: {
        type: Number,
        default: 1,  // At least the merchant (owner)
        description: "Total team members"
      },
      managers: {
        type: Number,
        default: 0,
        description: "Number of managers added"
      },

      // Rewards
      totalRewardsClaimed: {
        type: Number,
        default: 0,
        description: "Total rewards claimed"
      },
      totalRedemptionValue: {
        type: mongoose.Decimal128,
        default: "0.00",
        description: "Total monetary value of redemptions"
      },

      // Reports
      reportsGenerated: {
        type: Number,
        default: 0,
        description: "Custom reports generated"
      },

      // API Calls
      apiCallsUsed: {
        type: Number,
        default: 0,
        description: "API calls made this period"
      },
    },

    // QUOTA ENFORCEMENT
    quotaExceeded: {
      storeLimitExceeded: { type: Boolean, default: false },
      campaignLimitExceeded: { type: Boolean, default: false },
      scratchCardLimitExceeded: { type: Boolean, default: false },
      monthlyScansExceeded: { type: Boolean, default: false },
      apiCallsExceeded: { type: Boolean, default: false },
    },

    // Alerts & Warnings
    alerts: [
      {
        type: {
          type: String,
          enum: ["quota_warning", "quota_exceeded", "feature_unavailable"],
        },
        metric: String,
        currentUsage: Number,
        limit: Number,
        percentageUsed: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
      description: "Is this usage record active (for current period)"
    },

    // Timestamps
    resetAt: {
      type: Date,
      default: null,
      description: "When this usage was last reset"
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
subscriptionUsageSchema.index({ subscriptionId: 1, billingPeriod: 1 });
subscriptionUsageSchema.index({ merchantId: 1, isActive: 1 });
subscriptionUsageSchema.index({ "billingPeriod.startDate": 1 });

// Virtual for percentage used of common limits
subscriptionUsageSchema.virtual("percentUsed").get(function () {
  // This will be populated when querying
  return this.metrics;
});

// Static method to get current usage for merchant
subscriptionUsageSchema.statics.getCurrentUsage = async function (merchantId) {
  return this.findOne({
    merchantId,
    isActive: true,
  }).populate("subscriptionId");
};

// Instance method to update metric
subscriptionUsageSchema.methods.incrementMetric = async function (metricPath, amount = 1) {
  const [category, metric] = metricPath.split(".");
  if (category === "metrics" && this.metrics[metric] !== undefined) {
    this.metrics[metric] += amount;
    await this.save();
  }
};

// Instance method to check if quota exceeded
subscriptionUsageSchema.methods.checkQuotaExceeded = async function (planLimits) {
  const exceeded = {};
  let hasExceeded = false;

  // Check each limit
  if (planLimits.maxStores !== -1 && this.metrics.totalStoresCreated > planLimits.maxStores) {
    exceeded.storeLimitExceeded = true;
    hasExceeded = true;
  }

  if (planLimits.maxCampaigns !== -1 && this.metrics.activeCampaigns > planLimits.maxCampaigns) {
    exceeded.campaignLimitExceeded = true;
    hasExceeded = true;
  }

  if (planLimits.maxScratchCardsPerMonth !== -1 && this.metrics.scratchCardsGenerated > planLimits.maxScratchCardsPerMonth) {
    exceeded.scratchCardLimitExceeded = true;
    hasExceeded = true;
  }

  if (planLimits.maxMonthlyScans !== -1 && this.metrics.totalScans > planLimits.maxMonthlyScans) {
    exceeded.monthlyScansExceeded = true;
    hasExceeded = true;
  }

  this.quotaExceeded = exceeded;
  if (hasExceeded) {
    await this.save();
  }

  return hasExceeded;
};

export default mongoose.models.SubscriptionUsage ||
  mongoose.model("SubscriptionUsage", subscriptionUsageSchema);
