import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["Super_Admin", "Distributor", "Merchant", "Manager", "Store_Manager", "Store_Staff"],
    required: true,
  },

  // Device Tracking
  deviceId: {
    type: String,
    default: () => `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    index: true,
  },
  deviceType: {
    type: String,
    enum: ["desktop", "mobile", "tablet"],
    default: "desktop",
  },
  deviceName: {
    type: String,
    default: "Unknown Device",
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  os: {
    type: String,
    default: "Unknown",
  },
  ip: {
    type: String,
    index: true,
  },
  location: {
    type: String,
    default: "Unknown",
  },
  userAgent: {
    type: String,
    default: "Unknown",
  },

  // Session Activity
  loginTime: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },

}, { timestamps: true });

// Pre-save hook to ensure device info is always saved (never null)
sessionSchema.pre('save', async function() {
  // Ensure browser is never empty
  if (!this.browser || (typeof this.browser === 'string' && this.browser.trim() === "")) {
    this.browser = "Unknown";
  }

  // Ensure os is never empty
  if (!this.os || (typeof this.os === 'string' && this.os.trim() === "")) {
    this.os = "Unknown";
  }

  // Ensure deviceName is never empty
  if (!this.deviceName || (typeof this.deviceName === 'string' && this.deviceName.trim() === "")) {
    this.deviceName = `${this.os} ${this.browser}`.trim() || "Unknown Device";
  }
});

sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Index for finding active sessions by accountId
sessionSchema.index({ accountId: 1, isActive: 1 });

export default mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);
