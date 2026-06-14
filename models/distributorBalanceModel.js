/**
 * Distributor Balance Model
 *
 * Tracks scratch card allocation from distributor's plan allocation to merchants.
 * Maintains allocation history and balance calculation.
 */

import mongoose from 'mongoose';

const distributorBalanceSchema = new mongoose.Schema(
  {
    // Reference to distributor (Account with role: Distributor)
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
      index: true,
    },

    // Total scratch cards allocated to distributor via plan
    totalAllocated: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Allocations to individual merchants
    allocations: [
      {
        merchantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
          required: true,
        },
        merchantName: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        allocatedAt: {
          type: Date,
          default: Date.now,
        },
        allocatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
          required: true,
        },
        notes: String,
      },
    ],

    // Metadata
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1 },
      { createdAt: -1 },
      { 'allocations.merchantId': 1 },
    ],
  }
);

/**
 * Get remaining balance (totalAllocated - sum of all allocations)
 * @returns {number} Remaining balance
 */
distributorBalanceSchema.methods.getRemainingBalance = function () {
  const allocatedSum = this.allocations.reduce((sum, allocation) => {
    return sum + allocation.quantity;
  }, 0);
  return this.totalAllocated - allocatedSum;
};

/**
 * Get allocation record for specific merchant
 * @param {ObjectId} merchantId - The merchant ID to find
 * @returns {object|undefined} Allocation record or undefined if not found
 */
distributorBalanceSchema.methods.getMerchantAllocation = function (merchantId) {
  if (!this.allocations || this.allocations.length === 0) {
    return undefined;
  }
  return this.allocations.find(
    (allocation) => allocation.merchantId.toString() === merchantId.toString()
  );
};

/**
 * Add new allocation to merchant, with validation for over-allocation
 * @param {ObjectId} merchantId - The merchant ID
 * @param {string} merchantName - The merchant name
 * @param {number} quantity - The quantity to allocate
 * @param {ObjectId} allocatedBy - The user ID who made the allocation
 * @throws {Error} If allocation would exceed remaining balance
 */
distributorBalanceSchema.methods.allocateToMerchant = async function (
  merchantId,
  merchantName,
  quantity,
  allocatedBy
) {
  // Calculate remaining balance
  const remaining = this.getRemainingBalance();

  // Validate no over-allocation
  if (quantity > remaining) {
    throw new Error('Insufficient balance');
  }

  // Add new allocation
  this.allocations.push({
    merchantId,
    merchantName,
    quantity,
    allocatedAt: new Date(),
    allocatedBy,
  });

  // Update lastUpdated timestamp
  this.lastUpdated = new Date();

  return this;
};

/**
 * Pre-save hook to update lastUpdated timestamp
 */
distributorBalanceSchema.pre('save', function () {
  if (!this.isNew) {
    this.lastUpdated = new Date();
  }
});

export default mongoose.models.DistributorBalance ||
  mongoose.model('DistributorBalance', distributorBalanceSchema);
