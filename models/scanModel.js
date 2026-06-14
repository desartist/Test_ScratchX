import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
    },

    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    ipAddress: String,
    device: String,
    browser: String,

    source: String, // qr, whatsapp, direct

    scannedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const Scan = mongoose.models.Scan || mongoose.model("Scan", ScanSchema);
