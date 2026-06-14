import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
    index: true,
  },

  action: {
    type: String,
    enum: [
      "LOGIN",
      "LOGOUT",
      "PASSWORD_CHANGE",
      "PROFILE_UPDATE",
      "BUSINESS_INFO_UPDATE",
      "NOTIFICATION_PREFERENCES_UPDATE",
      "DEVICE_LOGOUT",
      "LOGOUT_ALL_DEVICES",
      "ACCOUNT_DELETE",
      "ACCOUNT_RESTORE",
    ],
    required: true,
    index: true,
  },

  // Context
  ip: String,
  deviceId: String,
  browser: String,
  os: String,
  userAgent: String,

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: false });

// Index for querying logs by accountId and action
auditLogSchema.index({ accountId: 1, action: 1, timestamp: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);
