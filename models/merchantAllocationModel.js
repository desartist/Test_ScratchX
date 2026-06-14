/**
 * Merchant Allocation Model
 *
 * Records allocation transactions from distributor to merchant.
 * Supports allocation, revocation, and adjustment transaction types.
 * Maintains complete audit trail for reconciliation and reporting.
 */

import mongoose from 'mongoose';

const merchantAllocationSchema = new mongoose.Schema(
  {
    // Distributor allocating cards
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    // Merchant receiving cards
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    // Quantity transferred
    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    // Transaction details
    transactionType: {
      type: String,
      enum: ['allocation', 'revocation', 'adjustment'],
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending',
      index: true
    },

    // Who performed the action
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },

    // Reason for revocation or adjustment
    reason: String,

    // Audit trail
    ipAddress: String,
    userAgent: String,
    reference: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // Notes
    notes: String,

    // Balances before and after (for audit)
    previousDistributorBalance: Number,
    newDistributorBalance: Number,
    previousMerchantBalance: Number,
    newMerchantBalance: Number
  },
  {
    timestamps: true
  }
);

// Compound indexes
merchantAllocationSchema.index({ distributorId: 1, merchantId: 1, createdAt: -1 });
merchantAllocationSchema.index({ distributorId: 1, createdAt: -1 });
merchantAllocationSchema.index({ transactionType: 1, status: 1 });

/**
 * Pre-save hook to ensure timestamps are set properly
 */
merchantAllocationSchema.pre('save', function () {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
});

export default mongoose.models.MerchantAllocation ||
  mongoose.model('MerchantAllocation', merchantAllocationSchema);
