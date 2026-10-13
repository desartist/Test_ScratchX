import mongoose from 'mongoose';
import { ENTRY_SOURCES } from '../lib/luckyDraw/constants.js';

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
    // Shown to the customer and written on the paper slip; unique within the campaign.
    entryNumber: { type: Number, required: true, min: 1 },
    // qr: the customer scanned the store's QR code. staff: a staff member typed it in at the counter.
    source: { type: String, enum: ENTRY_SOURCES, default: 'qr' },
    addedByAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    distanceMeters: { type: Number, default: null },
    customerLatitude: { type: Number, default: null },
    customerLongitude: { type: Number, default: null },
  },
  { timestamps: true },
);

luckyDrawEntrySchema.index({ drawId: 1, customerPhone: 1, createdAt: -1 });
luckyDrawEntrySchema.index({ campaignId: 1, entryNumber: 1 }, { unique: true });

export default mongoose.models.LuckyDrawEntry || mongoose.model('LuckyDrawEntry', luckyDrawEntrySchema);
