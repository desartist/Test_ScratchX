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
    // Required for new entries (checked by entryService); null on entries made before email was asked for.
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
    consent: {
      type: Boolean,
      required: true,
      validate: { validator: (value) => value === true, message: 'Consent is required' },
    },
    // Staff type the bill in at the counter; QR entries don't ask for it, so theirs is null.
    billAmount: { type: Number, min: 0, default: null },
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
// Partial so older entries with no entryNumber (all null) don't collide on the unique index.
luckyDrawEntrySchema.index({ campaignId: 1, entryNumber: 1 }, { unique: true, partialFilterExpression: { entryNumber: { $type: 'number' } } });

export default mongoose.models.LuckyDrawEntry || mongoose.model('LuckyDrawEntry', luckyDrawEntrySchema);
