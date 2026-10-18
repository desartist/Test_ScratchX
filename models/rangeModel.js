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

    // The coupons/rewards for this range. Schema-less on purpose (older
    // records carry arbitrary shapes), but everything saved through
    // /api/campaign_range is normalised by
    // lib/services/rewardInventoryService.js#normalizeRewardsForSave to:
    //   {
    //     rewardId,          // stable id — stock and issued cards point at it
    //     type,              // 'flat' | 'percentage' | 'gift'
    //     value,             // amount / percentage / gift image data URL
    //     description,
    //     isActive,          // false = never issued as a NEW reward
    //     quantityEnabled,   // false = unlimited
    //     totalQuantity,     // merchant-set stock (null when unlimited)
    //     remainingQuantity, // totalQuantity − redeemedQuantity (server-owned)
    //     redeemedQuantity,  // redemptions counted against stock (reveals,
    //                        //   while the cashier flow is off)
    //   }
    // Records saved before quantities existed lack these fields and are
    // treated as active + unlimited.
    rewards: [{ type: Object }],

    // Bumped on every write to `rewards` — merchant saves AND the atomic
    // stock decrement (at reveal while there's no cashier, else at redemption). A merchant save only applies if the
    // version is still the one it read, so an edit can never overwrite a
    // redemption that landed in between (lost update).
    rewardsVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.Range || mongoose.model("Range", RangeSchema);
