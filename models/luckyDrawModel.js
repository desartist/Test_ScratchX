import mongoose from 'mongoose';
import { DRAW_STATUSES, PRIZE_MODES } from '../lib/luckyDraw/constants.js';

// Append-only record of every change the store owner makes to the draw date.
const dateChangeSchema = new mongoose.Schema(
  {
    previousDate: { type: Date, required: true },
    newDate: { type: Date, required: true },
    changedByAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    changedAt: { type: Date, required: true },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    entrantsNotified: { type: Boolean, default: false },
    entrantsNotifiedCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const prizeSnapshotSchema = new mongoose.Schema(
  {
    rank: Number,
    prizeDescription: String,
    prizeValue: Number,
    quantity: { type: Number, default: 1 },
    imageUrl: { type: String, default: null },
    tierIndexes: { type: [Number], default: [] },
  },
  { _id: false },
);

const manualPickSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    slipNumbers: { type: [Number], default: [] },
  },
  { _id: false },
);

const luckyDrawSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', required: true },
    periodStart: { type: Date, required: true },
    drawDate: { type: Date, required: true, index: true },
    dateHistory: { type: [dateChangeSchema], default: [] },
    status: { type: String, enum: DRAW_STATUSES, default: 'scheduled', index: true },
    triggeredBy: {
      source: { type: String, enum: ['cron', 'manual'] },
      accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    },
    executedAt: { type: Date },
    // Stored so the draw can be replayed: same entries (sorted by _id) + seed = same winners.
    randomSeed: { type: String },
    prizeTiersSnapshot: { type: [prizeSnapshotSchema], default: [] },
    prizeMode: { type: String, enum: PRIZE_MODES, default: 'shared' },
    entryCount: { type: Number, default: 0 },
    winnerCount: { type: Number, default: 0 },
    // Live reveal progress: categories are revealed smallest prize first; revealedCount of them are public.
    reveal: {
      revealedCount: { type: Number, default: 0, min: 0 },
      startedAt: { type: Date },
      completedAt: { type: Date },
    },
    // Offline reveal: winning slip numbers the owner has typed in but not yet published.
    manualPicks: { type: [manualPickSchema], default: [] },
  },
  { timestamps: true },
);

luckyDrawSchema.index({ campaignId: 1, status: 1 });
// A campaign can have at most one open (scheduled) draw at a time.
luckyDrawSchema.index(
  { campaignId: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' }, name: 'one_scheduled_draw_per_campaign' },
);

export default mongoose.models.LuckyDraw || mongoose.model('LuckyDraw', luckyDrawSchema);
