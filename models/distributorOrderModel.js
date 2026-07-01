/**
 * Distributor Order Model
 *
 * Tracks purchase orders when distributors buy plans from the platform
 * Contains order details, pricing, payment information
 */

import mongoose from 'mongoose';

const distributorOrderSchema = new mongoose.Schema(
  {
    // Order identification
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Distributor placing the order
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Distributor',
      required: true,
      index: true,
    },

    // Order items (plans purchased)
    items: [
      {
        planType: {
          type: String,
          enum: ['CORE', 'SMART'],
          required: true,
        },
        planName: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitMRP: {
          type: Number,
          required: true, // Official price
        },
        commissionPercentage: {
          type: Number,
          required: true, // Distributor's commission %
        },
        discountAmount: {
          type: Number,
          required: true, // unitMRP * (commissionPercentage / 100)
        },
        unitCostPrice: {
          type: Number,
          required: true, // unitMRP - discountAmount (what distributor pays)
        },
        lineTotal: {
          type: Number,
          required: true, // unitCostPrice * quantity
        },
      },
    ],

    // Pricing breakdown
    pricing: {
      subtotalMRP: {
        type: Number,
        required: true, // Sum of all unit MRP * quantity
      },
      totalDiscount: {
        type: Number,
        required: true, // Sum of all discounts
      },
      subtotal: {
        type: Number,
        required: true, // What distributor pays (before tax)
      },
      gst: {
        type: Number,
        default: 0, // 18% of subtotal
      },
      grandTotal: {
        type: Number,
        required: true, // subtotal + gst
      },
    },

    // Payment details
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'bank_transfer', 'cheque'],
      default: 'razorpay',
    },
    paymentGatewayReference: String, // Razorpay order ID / payment ID
    transactionId: String,
    paymentDate: Date,

    // Order status
    orderStatus: {
      type: String,
      enum: ['draft', 'submitted', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    submittedAt: Date,
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,

    // Inventory impact
    inventoryUpdated: {
      type: Boolean,
      default: false,
    },
    inventoryUpdatedAt: Date,

    // Metadata
    notes: String,
    tags: [String],
    source: {
      type: String,
      enum: ['web', 'api', 'mobile'],
      default: 'web',
    },

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
      { orderNumber: 1 },
      { paymentStatus: 1, createdAt: -1 },
      { orderStatus: 1, createdAt: -1 },
    ],
  }
);

export default mongoose.models.DistributorOrder ||
  mongoose.model('DistributorOrder', distributorOrderSchema);
