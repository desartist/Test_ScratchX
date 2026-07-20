/**
 * Distributor Inventory Model
 *
 * Tracks plans purchased and available inventory for each distributor
 * When distributor buys plans, inventory increases
 * When distributor assigns plans to retailers, inventory decreases
 */

import mongoose from 'mongoose';

const distributorInventorySchema = new mongoose.Schema(
  {
    // Distributor owning this inventory (real accounts live on the Account model)
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    // Plan type (CORE or SMART)
    planType: {
      type: String,
      enum: ['CORE', 'SMART'],
      required: true,
      index: true,
    },

    // Inventory counts
    totalPurchased: {
      type: Number,
      default: 0,
      required: true,
    },
    totalAssigned: {
      type: Number,
      default: 0,
      required: true,
    },
    totalRemaining: {
      type: Number,
      default: 0,
      required: true,
    },

    // Cost tracking
    unitCostPrice: {
      type: Number,
      required: true, // Distributor's cost price (after commission)
    },
    totalCostPrice: {
      type: Number,
      required: true, // Total amount paid for these plans
    },

    // Metadata
    lastPurchasedAt: Date,
    lastAssignedAt: Date,

    // Distributor purchase orders that contributed to this inventory
    purchaseOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistributorOrder',
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, planType: 1 },
      { distributorId: 1, createdAt: -1 },
    ],
  }
);

// Middleware to ensure totalRemaining = totalPurchased - totalAssigned
// (Mongoose 9 dropped the legacy callback-style `next` — hooks are sync/async functions now.)
distributorInventorySchema.pre('save', function () {
  this.totalRemaining = this.totalPurchased - this.totalAssigned;
});

// Delete cached model to ensure hooks are fresh (avoids stale schema/hooks
// surviving a Next.js dev hot-reload — see subscriptionModel.js for the same pattern)
if (mongoose.models.DistributorInventory) {
  delete mongoose.models.DistributorInventory;
}

export default mongoose.model('DistributorInventory', distributorInventorySchema);
