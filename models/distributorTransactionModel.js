/**
 * Distributor Transaction Model
 *
 * Maintains financial ledger for each distributor
 * Tracks all financial movements: purchases, assignments, commissions, refunds, payouts
 */

import mongoose from 'mongoose';

const distributorTransactionSchema = new mongoose.Schema(
  {
    // Transaction identification
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Distributor involved
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Transaction type
    transactionType: {
      type: String,
      enum: [
        'purchase', // Distributor buys plans
        'assignment', // Distributor assigns plan to retailer
        'commission_earned', // Commission from retail
        'refund', // Refund issued
        'payout', // Payout to distributor
        'wallet_adjustment', // Manual adjustment
        'order_cancelled', // Order cancellation refund
      ],
      required: true,
      index: true,
    },

    // Amount and balance
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    transactionDirection: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },

    // Balance tracking
    balanceBefore: Number,
    balanceAfter: Number,

    // Reference data
    referenceType: String, // 'order', 'assignment', 'payout', 'adjustment'
    referenceId: mongoose.Schema.Types.ObjectId, // ID of referenced document
    relatedTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistributorTransaction',
      },
    ],

    // Order reference (if transaction_type = purchase/assignment)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DistributorOrder',
    },

    // Retailer reference (if transaction_type = assignment)
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    planAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanAssignment',
    },

    // Payment details
    paymentMethod: String,
    paymentReference: String, // Razorpay ref, bank ref, etc.

    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
      index: true,
    },
    failureReason: String,
    reversedAt: Date,
    reversalReason: String,

    // Description
    description: String,
    notes: String,

    // Metadata
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, createdAt: -1 },
      { distributorId: 1, transactionType: 1, createdAt: -1 },
      { transactionId: 1 },
      { status: 1, createdAt: -1 },
      { transactionDirection: 1, createdAt: -1 },
    ],
  }
);

export default mongoose.models.DistributorTransaction ||
  mongoose.model('DistributorTransaction', distributorTransactionSchema);
