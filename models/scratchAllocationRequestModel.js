import mongoose from "mongoose";

const scratchAllocationRequestSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    }, // manager
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    campaignName: { type: String, default: "" },
    storeName: { type: String, default: "" },
    requestedByName: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    respondedAt: { type: Date, default: null },
    responseNote: { type: String, default: "" },
  },
  { timestamps: true }
);

scratchAllocationRequestSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

export default mongoose.models.ScratchAllocationRequest ||
  mongoose.model("ScratchAllocationRequest", scratchAllocationRequestSchema);
