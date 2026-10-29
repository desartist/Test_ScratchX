import mongoose from 'mongoose';
import { CAMPAIGN_STATUSES, DRAW_TYPES, MAX_PRIZE_CATEGORIES } from '../lib/luckyDraw/constants.js';

const prizeTierSchema = new mongoose.Schema(
  {
    // 1 = grand prize (always one winner), 2 = 2nd prize, 3 = 3rd prize, then optional 4th, 5th, … prizes.
    rank: { type: Number, required: true, min: 1, max: MAX_PRIZE_CATEGORIES },
    prizeDescription: { type: String, required: true, trim: true, maxlength: 200 },
    prizeValue: { type: Number, default: 0, min: 0 },
    // How many winners get this prize (e.g. 2 x ₹5,000).
    quantity: { type: Number, default: 1, min: 1 },
    // Compressed data URL (same pattern as scratch-card gift images); null = no picture.
    imageUrl: { type: String, default: null },
  },
  { _id: false },
);

// Snapshot of a store at assignment time, same idea as Campaign.assignedStores.
const storeSnapshotSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    storeName: { type: String, required: true, trim: true },
    storeCode: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    // Used by the QR geofence; null when the store has no location (staff entries do not need one).
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { _id: false },
);

const nonEmpty = (label) => ({
  validator: (value) => Array.isArray(value) && value.length > 0,
  message: `At least one ${label} is required`,
});

const luckyDrawCampaignSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    // Every active store of the merchant, taken when the draft is created and again when it is published.
    assignedStores: { type: [storeSnapshotSchema], default: [] },
    // physical | live_online | digital (see lib/luckyDraw/constants.js). Locked after publishing.
    drawType: { type: String, enum: DRAW_TYPES, required: true },
    startDate: { type: Date, required: true },
    // Entries close (registration end).
    endDate: { type: Date, required: true },
    // When the draw happens / winners are revealed; null on very old campaigns (the draw then follows endDate).
    revealDate: { type: Date, default: null },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    // Every bill of at least this many rupees earns exactly one entry.
    minBillAmount: { type: Number, required: true, min: 0 },
    // Last entry number handed out. Incremented atomically, so two counters never hand out the same number.
    entryCounter: { type: Number, default: 0, min: 0 },
    prizeTiers: { type: [prizeTierSchema], validate: nonEmpty('prize') },
  },
  { timestamps: true },
);

luckyDrawCampaignSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  if (this.revealDate && this.endDate && this.revealDate < this.endDate) {
    this.invalidate('revealDate', 'The reveal date must be on or after the date entries close');
  }

  const prizes = this.prizeTiers || [];
  if (prizes.length) {
    // Ranks run 1, 2, 3, … with no gaps. New draws need at least three levels (checked by the API);
    // two are still accepted here so draws saved before the Third Prize became required keep saving.
    const ranks = prizes.map((p) => p.rank).sort((a, b) => a - b);
    if (ranks.length < 2 || !ranks.every((rank, i) => rank === i + 1)) {
      this.invalidate('prizeTiers', 'A draw has a grand prize, a 2nd prize and a 3rd prize, then any smaller prizes in order');
    }
    const grand = prizes.find((p) => p.rank === 1);
    if (grand && grand.quantity !== 1) this.invalidate('prizeTiers', 'The grand prize has exactly 1 winner');
  }
});

luckyDrawCampaignSchema.index({ merchantId: 1, status: 1 });

export default mongoose.models.LuckyDrawCampaign ||
  mongoose.model('LuckyDrawCampaign', luckyDrawCampaignSchema);
