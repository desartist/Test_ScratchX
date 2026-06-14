import mongoose from "mongoose";

/**
 * Notification Schema
 *
 * Stores all notifications for merchants and distributors.
 * Used for:
 * - Plan purchase notifications
 * - Scratch pack purchase notifications
 * - Expiry warnings (15, 7, 3, 1 days)
 * - Entitlement expired notifications
 */
const notificationSchema = new mongoose.Schema(
  {
    // ========== OWNERSHIP ==========
    ownerType: {
      type: String,
      enum: ["merchant", "distributor"],
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // ========== NOTIFICATION DETAILS ==========
    type: {
      type: String,
      enum: [
        "plan_purchased",
        "scratch_pack_purchased",
        "scratch_expiry_warning",
        "scratch_expired",
        "campaign_created",
        "campaign_activated",
        "system_alert",
        "other",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Notification title is required"],
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
    },

    // ========== SEVERITY & PRIORITY ==========
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high", "critical"],
      default: "info",
      index: true,
    },

    // ========== ACTION & CTA ==========
    actionUrl: {
      type: String,
      default: null,
    },

    actionText: {
      type: String,
      default: null,
    },

    // ========== READ STATUS ==========
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // ========== METADATA ==========
    metadata: {
      type: Map,
      of: String,
      default: {},
    },

    // ========== EXPIRY ==========
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ========== GROUPING ==========
    // Prevent duplicate notifications of the same type
    groupKey: {
      type: String,
      default: null,
    },

    // ========== CHANNELS ==========
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    // ========== DELIVERY TRACKING ==========
    deliveryStatus: {
      email: { type: String, default: "pending" },
      sms: { type: String, default: "pending" },
      push: { type: String, default: "pending" },
    },
  },
  {
    timestamps: true,
    indexes: [
      { ownerId: 1, ownerType: 1, read: 1, createdAt: -1 },
      { type: 1, severity: 1, createdAt: -1 },
      { groupKey: 1, ownerId: 1 },
    ],
  },
);

// Auto-delete expired notifications
notificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
