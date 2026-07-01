/**
 * Distributor Payout Model
 *
 * Tracks payout transactions when platform pays distributors their earned commissions
 */

import mongoose from 'mongoose';

const distributorPayoutSchema = new mongoose.Schema(
  {
    // Payout identification
    payoutId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      index: true,
    },

    // Distributor receiving payout
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Payout details
    periodStart: Date,
    periodEnd: Date,

    // Amount details
    totalCommissions: {
      type: Number,
      required: true, // Total commissions earned in period
    },
    adjustments: {
      type: Number,
      default: 0, // Manual adjustments (can be positive or negative)
    },
    reversals: {
      type: Number,
      default: 0, // Reversed commissions
    },
    taxes: {
      type: Number,
      default: 0,
    },
    fees: {
      type: Number,
      default: 0, // Platform fees, bank charges, etc.
    },
    payoutAmount: {
      type: Number,
      required: true, // Final amount to be paid
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'wallet', 'neft', 'rtgs'],
      required: true,
    },

    // Bank details (snapshot at time of payout)
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      bankName: String,
      ifsc: String,
    },

    // Payout status
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // Status tracking
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    failureReason: String,

    // Payment reference
    paymentReference: String, // Bank reference, transaction ID
    utrNumber: String, // Unique Transaction Reference

    // Commission details
    commissionsIncluded: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistributorCommission',
      },
    ],
    commissionCount: Number,

    // Holds and disputes
    onHold: {
      type: Boolean,
      default: false,
    },
    holdReason: String,
    holdUntilDate: Date,

    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },

    // Notes and metadata
    notes: String,
    internalNotes: String,
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,

    // Audit
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
      { distributorId: 1, createdAt: -1 },
      { distributorId: 1, status: 1 },
      { payoutId: 1 },
      { batchNumber: 1 },
      { status: 1, createdAt: -1 },
      { periodStart: 1, periodEnd: 1 },
    ],
  }
);

export default mongoose.models.DistributorPayout ||
  mongoose.model('DistributorPayout', distributorPayoutSchema);
