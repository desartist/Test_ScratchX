import mongoose from "mongoose";

/**
 * TeamSeatRequest
 *
 * A retailer/wholesaler's request to buy an extra Store_Manager/Store_Staff
 * seat beyond their plan's free per-store limit (see lib/teamLimits.js).
 * Payment is collected manually by the merchant's distributor — there is no
 * payment-gateway interaction on this record. The distributor marks it paid
 * (which activates the seat by incrementing Store.teamSeatAddons) or
 * rejected.
 */
const teamSeatRequestSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["Store_Manager", "Store_Staff"],
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    unitPriceINR: {
      type: Number,
      required: true,
    },
    totalAmountINR: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

teamSeatRequestSchema.index({ distributorId: 1, status: 1, createdAt: -1 });

export default mongoose.models.TeamSeatRequest ||
  mongoose.model("TeamSeatRequest", teamSeatRequestSchema);
