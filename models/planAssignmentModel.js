/**
 * Plan Assignment Model
 *
 * Tracks when a distributor assigns a plan to a retailer
 * Maintains history of all plan assignments
 */

import mongoose from 'mongoose';

const planAssignmentSchema = new mongoose.Schema(
  {
    // Assignment identification
    assignmentNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Parties involved
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    // Plan details
    planType: {
      type: String,
      enum: ['CORE', 'SMART'],
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      sparse: true,
    },
    planName: String,

    // Subscription created from assignment
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },

    // Inventory reference
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DistributorInventory',
      required: true,
    },

    // Assignment status
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },

    // Dates
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: Date,
    revokeReason: String,
    expiresAt: Date, // If assignment has expiry

    // Pricing (for record purposes)
    assignmentValue: {
      type: Number,
      required: true, // MRP of the plan
    },
    distributorCostPrice: {
      type: Number,
      required: true, // What distributor paid
    },
    distributorProfit: {
      type: Number,
      required: true, // assignmentValue - distributorCostPrice
    },

    // Retailer activation status
    retailerActivated: {
      type: Boolean,
      default: false,
    },
    retailerActivatedAt: Date,

    // Usage statistics
    retailerUsage: {
      activeCampaigns: {
        type: Number,
        default: 0,
      },
      storesCreated: {
        type: Number,
        default: 0,
      },
      scratchesUsed: {
        type: Number,
        default: 0,
      },
    },

    // Notes and metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, retailerId: 1 },
      { distributorId: 1, createdAt: -1 },
      { retailerId: 1, createdAt: -1 },
      { assignmentNumber: 1 },
      { status: 1, createdAt: -1 },
      { planType: 1, createdAt: -1 },
    ],
  }
);

export default mongoose.models.PlanAssignment ||
  mongoose.model('PlanAssignment', planAssignmentSchema);
