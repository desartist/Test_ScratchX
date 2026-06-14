import mongoose from "mongoose";

/**
 * SubscriptionPlan Schema
 *
 * Defines all features and limits for each subscription tier.
 * Used by checkPlanAccess() to gate features.
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    // Plan Metadata
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      enum: {
        values: ["Trial", "Starter", "Growth", "Professional", "Enterprise", "Core", "Smart"],
        message: "Invalid plan type"
      },
      index: true,
    },
    displayName: {
      type: String,
      default: function() { return this.name; }
    },
    description: {
      type: String,
      default: ""
    },
    tier: {
      type: Number,
      default: function() {
        const tierMap = { Trial: 0, Starter: 1, Growth: 2, Professional: 3, Enterprise: 4, Core: 1, Smart: 2 };
        return tierMap[this.name] || 0;
      }
    },

    // Pricing
    price: {
      monthly: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },

    // CORE LIMITS (Main Metrics)
    limits: {
      // Store Management
      maxStores: {
        type: Number,
        default: 1,  // -1 = unlimited
        description: "Maximum number of stores merchant can create"
      },

      // Campaign Management
      maxCampaigns: {
        type: Number,
        default: 1,  // -1 = unlimited
        description: "Maximum concurrent active campaigns"
      },
      maxCampaignsPerStore: {
        type: Number,
        default: 1,  // -1 = unlimited
        description: "Max campaigns assignable per store"
      },

      // Scratch Card Limits
      maxScratchCardsPerMonth: {
        type: Number,
        default: 1000,  // -1 = unlimited
        description: "Monthly limit for scratch card generation"
      },
      maxScratchCardsPerCampaign: {
        type: Number,
        default: 5000,  // -1 = unlimited
        description: "Total scratch cards per campaign"
      },

      // Reward Ranges
      maxRangesPerCampaign: {
        type: Number,
        default: 1  // -1 = unlimited
      },
      maxRewardsPerRange: {
        type: Number,
        default: 5  // -1 = unlimited
      },

      // Team Management
      maxManagersPerAccount: {
        type: Number,
        default: 0  // 0 = no team members allowed
      },
      maxStaffPerStore: {
        type: Number,
        default: 0
      },

      // Scans & Participations
      maxMonthlyScans: {
        type: Number,
        default: 10000,  // -1 = unlimited
        description: "Monthly customer scan limit"
      },
      maxMonthlyParticipations: {
        type: Number,
        default: 10000,  // -1 = unlimited
      },

      // QR Code Ranges
      maxQRBatches: {
        type: Number,
        default: 2  // -1 = unlimited
      },
    },

    // FEATURE FLAGS (Boolean features)
    features: {
      // Campaign Features
      canCreateCampaign: { type: Boolean, default: true },
      canDuplicateCampaign: { type: Boolean, default: false },
      canScheduleCampaign: { type: Boolean, default: false },
      canUseDynamicRewards: { type: Boolean, default: false },

      // Store Features
      canAddStore: { type: Boolean, default: true },
      canUseGeoFencing: { type: Boolean, default: false },
      canUseMultiStore: { type: Boolean, default: false },

      // Analytics & Reporting
      canViewAnalytics: { type: Boolean, default: false },
      canViewRealTimeAnalytics: { type: Boolean, default: false },
      canExportReports: { type: Boolean, default: false },
      canScheduleReports: { type: Boolean, default: false },
      canViewCustomerList: { type: Boolean, default: false },
      canViewRedemptionHistory: { type: Boolean, default: false },

      // Customization
      canUseCustomBranding: { type: Boolean, default: false },
      canCustomizeRewardPage: { type: Boolean, default: false },
      canAddLogo: { type: Boolean, default: false },
      canUseCustomDomain: { type: Boolean, default: false },

      // Integrations
      canUseWhatsAppIntegration: { type: Boolean, default: false },
      canUseSMSIntegration: { type: Boolean, default: false },
      canUseEmailIntegration: { type: Boolean, default: false },
      canUseWebhooks: { type: Boolean, default: false },
      canUseAPI: { type: Boolean, default: false },

      // Team & Permissions
      canAddManagers: { type: Boolean, default: false },
      canAddStaff: { type: Boolean, default: false },
      canCustomizePermissions: { type: Boolean, default: false },

      // Support
      canAccessPrioritySupport: { type: Boolean, default: false },
      canAccessDedicatedAccountManager: { type: Boolean, default: false },

      // Advanced Features
      canUseAdvancedRewards: { type: Boolean, default: false },
      canUseAbTesting: { type: Boolean, default: false },
      canUseAI: { type: Boolean, default: false },
      canUsePredictiveAnalytics: { type: Boolean, default: false },
    },

    // Visibility
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },  // Show on pricing page
    isTrialPlan: { type: Boolean, default: false },
    trialDurationDays: {
      type: Number,
      default: 14,
      description: "Trial duration in days (only for Trial plans)"
    },

    // Ordering on pricing page
    sortOrder: { type: Number, default: 0, index: true },

    // Special Details
    targetAudience: {
      type: String,
      enum: ["Individual", "SMB", "Enterprise", "Agency"],
      default: "Individual"
    },
    recommended: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Index for efficient feature queries
subscriptionPlanSchema.index({ "features.canCreateCampaign": 1 });
subscriptionPlanSchema.index({ tier: 1 });
subscriptionPlanSchema.index({ isActive: 1, isPublic: 1, sortOrder: 1 });

export default mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
