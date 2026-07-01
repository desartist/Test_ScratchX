/**
 * Retailer Profile Model
 *
 * Extends Account model with retailer-specific information
 * Links retailers to their distributors and tracks their subscription status
 */

import mongoose from 'mongoose';

const retailerProfileSchema = new mongoose.Schema(
  {
    // Link to Account (same as merchant)
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
      index: true,
    },

    // Distributor who created/manages this retailer
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Retailer-specific fields
    businessName: String,
    ownerName: String,
    businessCategory: String,
    businessRegistrationNumber: String,

    // Contact details
    email: String,
    phone: String,
    alternatePhone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,

    // Subscription status
    activeSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'expired', 'suspended'],
      default: 'none',
      index: true,
    },
    planType: {
      type: String,
      enum: ['CORE', 'SMART'],
    },

    // Plan assignment
    planAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanAssignment',
    },
    assignedAt: Date,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account', // The distributor's account ID
    },

    // Retailer metrics
    metrics: {
      totalStores: {
        type: Number,
        default: 0,
      },
      activeCampaigns: {
        type: Number,
        default: 0,
      },
      totalScratches: {
        type: Number,
        default: 0,
      },
      scannedScratches: {
        type: Number,
        default: 0,
      },
      totalCustomers: {
        type: Number,
        default: 0,
      },
      lastActivityAt: Date,
    },

    // Onboarding status
    onboardingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    onboardingCompletedAt: Date,

    // Account status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    suspendedAt: Date,
    suspensionReason: String,

    // Communication preferences
    communicationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
      whatsappNotifications: {
        type: Boolean,
        default: false,
      },
    },

    // Notes from distributor
    notes: String,
    internalNotes: String,

    // Metadata
    customFields: mongoose.Schema.Types.Mixed,
    tags: [String],

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  {
    timestamps: true,
    indexes: [
      { accountId: 1 },
      { distributorId: 1, createdAt: -1 },
      { distributorId: 1, subscriptionStatus: 1 },
      { subscriptionStatus: 1, createdAt: -1 },
      { status: 1, createdAt: -1 },
      { planType: 1, createdAt: -1 },
    ],
  }
);

export default mongoose.models.RetailerProfile ||
  mongoose.model('RetailerProfile', retailerProfileSchema);
