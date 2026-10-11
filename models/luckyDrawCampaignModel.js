import mongoose from 'mongoose';
import {
  CAMPAIGN_STATUSES,
  PRIZE_MODES,
  RECURRENCE_FREQUENCIES,
  REVEAL_MODES,
  SCHEDULE_TYPES,
  TRIGGER_MODES,
} from '../lib/luckyDraw/constants.js';

const entryTierSchema = new mongoose.Schema(
  {
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, default: null },
    entriesGranted: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const prizeTierSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    prizeDescription: { type: String, required: true, trim: true, maxlength: 200 },
    prizeValue: { type: Number, default: 0, min: 0 },
    // How many winners get this prize (a prize category, e.g. 10 x ₹3,000).
    quantity: { type: Number, default: 1, min: 1 },
    // Compressed data URL (same pattern as scratch-card gift images); null = no picture.
    imageUrl: { type: String, default: null },
    // Ranges (positions in entryTiers, sorted by minAmount) whose entries may win this prize; none = everyone.
    tierIndexes: { type: [Number], default: [] },
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
    // Needed for the geofence: customers enter only when they are at one of the stores.
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
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
    assignedStores: { type: [storeSnapshotSchema], default: [] },
    revealMode: { type: String, enum: REVEAL_MODES, default: 'instant' },
    startDate: { type: Date, required: true },
    // Entries close (registration end).
    endDate: { type: Date, required: true },
    // When winners are revealed; null on campaigns made before v2 (the draw date then follows endDate).
    revealDate: { type: Date, default: null },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    entryTiers: { type: [entryTierSchema], validate: nonEmpty('entry tier') },
    prizeTiers: { type: [prizeTierSchema], validate: nonEmpty('prize') },
    // shared: one prize list for everyone | pool_per_tier: each range has its own prizes | restricted: some prizes only for some ranges
    prizeMode: { type: String, enum: PRIZE_MODES, default: 'shared' },
    // Cap on total entries one phone number can hold in a single draw; null = uncapped.
    maxEntriesPerCustomerPerPeriod: { type: Number, default: null, min: 1 },
    drawConfig: {
      scheduleType: { type: String, enum: SCHEDULE_TYPES, required: true },
      recurrence: {
        frequency: { type: String, enum: RECURRENCE_FREQUENCIES },
        time: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '18:00' },
        dayOfWeek: { type: Number, min: 0, max: 6, default: null },
      },
      triggerMode: { type: String, enum: TRIGGER_MODES, default: 'automatic' },
    },
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

  const config = this.drawConfig || {};
  // The owner starts a live reveal, so it is one draw that never runs by itself.
  if (this.revealMode === 'live' && (config.scheduleType !== 'end_of_campaign' || config.triggerMode !== 'manual')) {
    this.invalidate('drawConfig', 'A live reveal is one draw that you start yourself');
  }
  if (config.scheduleType === 'recurring') {
    const recurrence = config.recurrence || {};
    if (!recurrence.frequency) {
      this.invalidate('drawConfig.recurrence.frequency', 'Recurring draws need a frequency');
    } else if (recurrence.frequency === 'weekly' && recurrence.dayOfWeek == null) {
      this.invalidate('drawConfig.recurrence.dayOfWeek', 'Weekly draws need a weekday');
    }
  }
});

luckyDrawCampaignSchema.index({ merchantId: 1, status: 1 });

export default mongoose.models.LuckyDrawCampaign ||
  mongoose.model('LuckyDrawCampaign', luckyDrawCampaignSchema);
