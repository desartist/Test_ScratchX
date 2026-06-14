import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      sparse: true,
      index: true,
    },

    profileImage: { type: String, default: null },

    password: { type: String, default: null, select: false },
    passwordHistory: [
      {
        hash: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    passwordChangedAt: Date,

    role: {
      type: String,
      enum: ["Super_Admin", "Distributor", "Merchant", "Manager", "Store_Manager", "Store_Staff"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending", "deactivated"],
      default: "pending",
      index: true,
    },

    // Who created this account (one level up in hierarchy)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Immediate parent: Distributor for Merchant, Merchant for Manager, Manager for Store_Manager/Store_Staff
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Store reference for Store_Manager and Store_Staff roles
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      sparse: true,
      index: true,
    },

    // Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: Date,
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: Date,

    // Login tracking
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLoginAt: Date,
    lastLoginAt: Date,
    lastLoginIP: String,

    // OAuth fields
    googleId: { type: String, sparse: true },

    // Account source
    source: {
      type: String,
      enum: ["OTP_Signup", "Password_Signup", "Invited", "Internal", "Google_OAuth"],
      default: "OTP_Signup",
    },

    // Role-specific profile fields (sparse — only relevant fields populated)
    profile: {
      // Merchant & Manager fields
      storeName: { type: String, default: null },
      storeAddress: { type: String, default: null },
      businessType: { type: String, default: null },
      phoneNumber: { type: String, default: null },
      countryCode: { type: String, default: null },
      storeLocation: { type: String, default: null },

      // Distributor fields
      companyName: { type: String, default: null },
      territory: { type: String, default: null },
      region: { type: String, default: null },
      // Commission % earned per merchant payment (falls back to DISTRIBUTOR_COMMISSION_RATE env)
      commissionRate: { type: Number, default: null, min: 0, max: 100 },
    },

    // Scratch Card Allocation (for Merchants)
    scratchCards: {
      total_scratch_cards: {
        type: Number,
        default: 0,
        min: 0,
      },
      used_scratch_cards: {
        type: Number,
        default: 0,
        min: 0,
      },
      allocated_scratch_cards: {
        type: Number,
        default: 0,
        min: 0,
      },
      redeemed_scratch_cards: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Metadata
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
    },
    notes: String,

    // Business Information (for Merchants/Distributors)
    businessInfo: {
      businessName: {
        type: String,
        trim: true,
        default: null,
      },
      gstNumber: {
        type: String,
        trim: true,
        default: null,
        validate: {
          validator: function(v) {
            if (!v) return true; // Optional
            // GST: 2 digits (state) + 10 chars (PAN) + 1 digit (entity) + 1 char (check) = 15 chars
            return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9]{1}$/.test(v);
          },
          message: 'Invalid GST number format',
        },
        maxlength: [15, 'GST number must be exactly 15 characters'],
      },
      address: {
        type: String,
        trim: true,
        default: null,
      },
      city: {
        type: String,
        trim: true,
        default: null,
      },
      state: {
        type: String,
        trim: true,
        default: null,
      },
      pincode: {
        type: String,
        trim: true,
        default: null,
        match: [/^\d{6}$/, 'Pincode must be 6 digits'],
      },
    },

    // Notification Preferences
    notificationPreferences: {
      campaigns: { type: Boolean, default: true },
      stores: { type: Boolean, default: true },
      customers: { type: Boolean, default: false },
      subscription: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },

    // Subscription Tracking (updated when user purchases a plan)
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        default: null,
      },
      planName: {
        type: String,
        default: null,
      },
      maxStores: {
        type: Number,
        default: 0,
      },
      maxCampaigns: {
        type: Number,
        default: 0,
      },
      maxScratchCards: {
        type: Number,
        default: 0,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },

    // Main Store (Primary store for this account)
    mainStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      sparse: true,
      index: true,
    },

    // ✅ Plan Information (ONE-TIME LIFETIME PURCHASE)
    activePlan: {
      type: String,
      enum: ["CORE", "SMART", null],
      default: null,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    planPurchaseDate: {
      type: Date,
      default: null,
    },

    // Onboarding Status
    onboarding: {
      hasCompletedStoreCreation: {
        type: Boolean,
        default: false,
      },
      firstStoreCreatedAt: {
        type: Date,
        default: null,
      },
      hasCompletedProfileSetup: {
        type: Boolean,
        default: false,
      },
      hasCompletedSubscriptionSetup: {
        type: Boolean,
        default: false,
      },
      onboardingCompletedAt: {
        type: Date,
        default: null,
      },
    },

    // Account Deletion (Soft Delete)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Account ||
  mongoose.model("Account", accountSchema);
