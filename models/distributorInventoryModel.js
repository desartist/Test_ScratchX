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
    // Distributor owning this inventory
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
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

    // Purchase order references
    purchaseOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistributorOrder',
      },
    ],

    // Plan assignments from this inventory
    planAssignments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlanAssignment',
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
distributorInventorySchema.pre('save', function (next) {
  this.totalRemaining = this.totalPurchased - this.totalAssigned;
  next();
});

export default mongoose.models.DistributorInventory ||
  mongoose.model('DistributorInventory', distributorInventorySchema);
