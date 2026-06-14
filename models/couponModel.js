const CouponSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    billingRangeId: {
      type: Schema.Types.ObjectId,
      ref: "BillingRange",
      required: true,
    },

    couponTitle: { type: String, required: true }, // 10% OFF
    couponType: {
      type: String,
      enum: ["percentage", "flat", "gift"],
      required: true,
    },

    value: Number, // 10 / 200
    probability: { type: Number, required: true }, // 40%

    maxUses: Number,
    usedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Coupon = models.Coupon || model("Coupon", CouponSchema);
