import mongoose from "mongoose";

/**
 * PlatformSettings — singleton document (always the first/only doc in the
 * collection) for the small set of platform-wide values that are genuinely
 * DB-configurable today. Deliberately narrow: things like GST rate and
 * subscription plan pricing are hardcoded across multiple checkout/payment
 * files (app/api/subscription/*) and are NOT included here, since editing a
 * single DB value would not actually change what merchants pay.
 */
const platformSettingsSchema = new mongoose.Schema(
  {
    defaultCommissionRate: { type: Number, default: null, min: 0, max: 100 },
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "" },
    },
    supportContacts: {
      salesEmail: { type: String, default: "grow@thescratchx.com" },
      supportEmail: { type: String, default: "support@thescratchx.com" },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  },
  { timestamps: true },
);

export default mongoose.models.PlatformSettings ||
  mongoose.model("PlatformSettings", platformSettingsSchema);
