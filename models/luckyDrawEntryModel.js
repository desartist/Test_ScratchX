import mongoose from 'mongoose';

const luckyDrawEntrySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', required: true, index: true },
    // Entries point at the scheduled draw, not at a date, so moving the draw date never orphans them.
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDraw', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    customerPhone: { type: String, required: true, match: /^[0-9]{10}$/ },
    consent: {
      type: Boolean,
      required: true,
      validate: { validator: (value) => value === true, message: 'Consent is required' },
    },
    billAmount: { type: Number, required: true, min: 0 },
    entriesGranted: { type: Number, required: true, min: 1 },
    // Position of the bill range this entry fell in (campaign ranges are stored sorted); null for older entries.
    tierIndex: { type: Number, default: null, min: 0 },
    distanceMeters: { type: Number, default: null },
    customerLatitude: { type: Number, default: null },
    customerLongitude: { type: Number, default: null },
  },
  { timestamps: true },
);

luckyDrawEntrySchema.index({ drawId: 1, customerPhone: 1, createdAt: -1 });

export default mongoose.models.LuckyDrawEntry || mongoose.model('LuckyDrawEntry', luckyDrawEntrySchema);
