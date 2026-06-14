import mongoose from "mongoose";

const scratchPackOrderSchema = new mongoose.Schema(
  {
    // ========== OWNERSHIP ==========
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Owner ID is required"],
      index: true
    },

    ownerType: {
      type: String,
      enum: ["merchant", "distributor"],
      required: [true, "Owner type is required"],
      index: true
    },

    // ========== PACK DETAILS ==========
    packId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScratchPack",
      required: [true, "Pack ID is required"]
    },

    packName: {
      type: String,
      required: true,
      example: "1000 Scratches"
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"]
    },

    // ========== PRICING ==========
    basePrice: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"]
    },

    gstAmount: {
      type: Number,
      required: true,
      min: [0, "GST cannot be negative"]
    },

    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total cannot be negative"]
    },

    // ========== PAYMENT STATUS ==========
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true
    },

    transactionId: {
      type: String,
      default: null,
      index: true
    },

    razorpayOrderId: {
      type: String,
      default: null,
      sparse: true
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      sparse: true
    },

    failureReason: {
      type: String,
      default: null
    },

    // ========== CONSUMPTION TRACKING ==========
    consumed: {
      type: Number,
      default: 0,
      min: [0, "Consumed cannot be negative"]
    },

    remaining: {
      type: Number,
      required: true,
      min: [0, "Remaining cannot be negative"]
    },

    // ========== DATES ==========
    purchasedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    expiresAt: {
      type: Date,
      default: null
    },

    refundedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Indexes for common queries
scratchPackOrderSchema.index({ ownerId: 1, ownerType: 1, paymentStatus: 1 });
scratchPackOrderSchema.index({ createdAt: -1 });
scratchPackOrderSchema.index({ remaining: 1 });

// Pre-save hook: Ensure remaining matches quantity on creation
scratchPackOrderSchema.pre('save', async function() {
  if (this.isNew && this.remaining === 0) {
    this.remaining = this.quantity;
  }

  // Auto-generate transaction ID if not Razorpay
  if (!this.transactionId && this.paymentStatus === "completed") {
    this.transactionId = `SCRATCH-ORDER-${this._id.toString().substring(0, 8)}-${Date.now()}`;
  }
});

// Delete cached model
if (mongoose.models.ScratchPackOrder) {
  delete mongoose.models.ScratchPackOrder;
}

export default mongoose.model("ScratchPackOrder", scratchPackOrderSchema);
