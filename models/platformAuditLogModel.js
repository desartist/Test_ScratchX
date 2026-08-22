import mongoose from "mongoose";

/**
 * PlatformAuditLog
 *
 * Generic, cross-module audit trail for Super Admin / internal-team actions
 * (Retailers, Distributors, Subscriptions, Payments, Notifications, Reports,
 * Team & Roles, Platform Settings, ...). Deliberately separate from
 * `AuditLog` (login/profile self-service events only) and
 * `DistributorAuditLog` (requires a distributorId, scoped to distributor
 * commerce flows) — neither fits a generic "admin did X to Y" record.
 *
 * Immutable by design: no update/delete route is ever exposed for this
 * collection from the admin UI.
 */
const platformAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    adminName: { type: String, required: true },
    adminRole: { type: String, required: true },

    module: {
      type: String,
      enum: [
        "Retailers",
        "Distributors",
        "Stores",
        "Campaigns",
        "ScratchInventory",
        "Subscriptions",
        "Payments",
        "Customers",
        "Redemptions",
        "Notifications",
        "Support",
        "Reports",
        "Team",
        "Settings",
      ],
      required: true,
      index: true,
    },
    action: { type: String, required: true, index: true },

    targetType: { type: String, default: null },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    targetLabel: { type: String, default: null },

    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },

    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

platformAuditLogSchema.index({ module: 1, createdAt: -1 });
platformAuditLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.models.PlatformAuditLog ||
  mongoose.model("PlatformAuditLog", platformAuditLogSchema);
