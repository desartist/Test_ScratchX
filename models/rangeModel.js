import mongoose from "mongoose";
const RangeSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },

    label: { type: String }, // Example ₹500 - ₹999

    rewards: [{ type: Object }], // Holds the array of coupons/rewards created for this range
  },
  { timestamps: true },
);

export default mongoose.models.Range || mongoose.model("Range", RangeSchema);
