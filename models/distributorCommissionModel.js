/**
 * Distributor Commission Model
 *
 * Tracks commission earned by distributors from plan assignments to retailers
 * Maintains detailed commission calculations and payout history
 */

import mongoose from 'mongoose';

const distributorCommissionSchema = new mongoose.Schema(
  {
    // Commission identification
    commissionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Distributor earning commission
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Source of commission
    sourceType: {
      type: String,
      enum: ['plan_assignment', 'retailer_purchase', 'bonus', 'referral'],
      required: true,
      index: true,
    },

    // Plan assignment reference
    planAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanAssignment',
    },

    // Retailer reference
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },

    // Plan details
    planType: {
      type: String,
      enum: ['CORE', 'SMART'],
      required: true,
    },

    // Commission calculation
    planMRP: {
      type: Number,
      required: true, // Official price
    },
    commissionPercentage: {
      type: Number,
      required: true, // Percentage set by super admin
    },
    commissionAmount: {
      type: Number,
      required: true, // planMRP * (commissionPercentage / 100)
    },

    // Status tracking
    status: {
      type: String,
      enum: ['earned', 'pending', 'approved', 'paid', 'reversed'],
      default: 'earned',
      index: true,
    },

    // Dates
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    paidAt: Date,
    reversedAt: Date,
    reversalReason: String,

    // Payout details
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DistributorPayout',
    },
    payoutBatchNumber: String,

    // Tax details
    taxRate: {
      type: Number,
      default: 0, // Tax percentage if applicable
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    netCommission: {
      type: Number, // commissionAmount - taxAmount
    },

    // Hold period
    holdUntilDate: Date,
    holdReason: String,

    // Metadata
    notes: String,
    tags: [String],

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, createdAt: -1 },
      { distributorId: 1, status: 1, createdAt: -1 },
      { retailerId: 1, createdAt: -1 },
      { planAssignmentId: 1 },
      { status: 1, createdAt: -1 },
      { commissionId: 1 },
      { payoutId: 1 },
    ],
  }
);

// Calculate netCommission if not set
distributorCommissionSchema.pre('save', function (next) {
  if (!this.netCommission) {
    this.netCommission = this.commissionAmount - (this.taxAmount || 0);
  }
  next();
});

export default mongoose.models.DistributorCommission ||
  mongoose.model('DistributorCommission', distributorCommissionSchema);
