import mongoose from 'mongoose';
import {
  CAMPAIGN_STATUSES,
  RECURRENCE_FREQUENCIES,
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
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    entryTiers: { type: [entryTierSchema], validate: nonEmpty('entry tier') },
    prizeTiers: { type: [prizeTierSchema], validate: nonEmpty('prize') },
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

  const config = this.drawConfig || {};
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
