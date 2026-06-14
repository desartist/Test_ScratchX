import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
      default: null,
    },
    // Generic ownership fields for supporting multiple owner types
    ownerType: {
      type: String,
      enum: ['merchant', 'distributor'],
      required: false,
      default: 'merchant'
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: false,
      default: null,
    },
    // Plan type for quick reference (CORE or SMART)
    planType: {
      type: String,
      enum: ["CORE", "SMART"],
      required: true,
    },
    // Which distributor sold / assigned this subscription (nullable)
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    status: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled", "expired"],
      default: "trial",
    },

    billingCycle: {
      type: String,
      enum: ["one-time"],
      default: "one-time",
    },

    // ========== LIFETIME PLAN (ONE-TIME PURCHASE) ==========
    // Plans are purchased once and active for lifetime (no expiry)
    purchaseDate: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },

    // ========== UNLIMITED SCRATCHES (QUARTERLY - 90 DAYS) ==========
    // When plan is purchased, merchant receives unlimited scratches for 90 days
    unlimitedScratches: {
      isActive: { type: Boolean, default: false },
      grantedAt: { type: Date, default: null },      // When scratches were granted (plan purchase date)
      validUntil: { type: Date, default: null },    // 90 days from grant date
      scratchValidityType: {
        type: String,
        enum: ['quarterly'],
        default: 'quarterly'
      },
      daysRemaining: { type: Number, default: 0 },  // Calculated field: Math.ceil((validUntil - now) / (1000*60*60*24))
      lastWarningAt: { type: Date, default: null },  // Track last warning sent (prevent spam)
    },

    // ========== SCRATCH PACK PURCHASES (After unlimited period expires) ==========
    scratchPacks: [
      {
        packId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ScratchPack",
        },
        quantity: { type: Number, required: true },  // 1000, 5000, 10000, 50000
        purchasedAt: { type: Date, default: Date.now },
        consumed: { type: Number, default: 0 },
        remaining: { type: Number, required: true },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ScratchPackOrder",
        },
      },
    ],
    totalScratchesConsumed: { type: Number, default: 0 },

    // Usage counters — reset each billing cycle via a scheduled job
    usage: {
      scansThisMonth: { type: Number, default: 0 },
      activeCampaigns: { type: Number, default: 0 },
      lastResetAt: { type: Date, default: null },
    },

    // Payment gateway recurring subscription handle
    gatewaySubscriptionId: { type: String, default: null },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", null],
      default: null,
    },
  },
  { timestamps: true },
);

// Add compound index for common ownership queries
subscriptionSchema.index({ ownerType: 1, ownerId: 1, status: 1 });

// Pre-save hook to maintain backward compatibility
// Sync both directions: ownerId ↔ merchantId
subscriptionSchema.pre('save', async function() {
  // If ownerId is missing but merchantId exists, populate ownerId (legacy backward compat)
  if (!this.ownerId && this.merchantId) {
    this.ownerId = this.merchantId;
    if (!this.ownerType) {
      this.ownerType = 'merchant';
    }
  }
  // If ownerType is merchant, sync merchantId from ownerId
  if (this.ownerType === 'merchant' && this.ownerId) {
    this.merchantId = this.ownerId;
  }

  // Validation: ensure ownerId is set after hook
  if (!this.ownerId) {
    throw new Error('ownerId is required. Provide either ownerId or merchantId.');
  }
});

// Delete cached model to ensure hooks are fresh
if (mongoose.models.Subscription) {
  delete mongoose.models.Subscription;
}

export default mongoose.model("Subscription", subscriptionSchema);
