import mongoose from 'mongoose';
import { WINNER_STATUSES } from '../lib/luckyDraw/constants.js';

const luckyDrawWinnerSchema = new mongoose.Schema(
  {
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDraw', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    rank: { type: Number, required: true, min: 1 },
    // Online winners point at their entry; slip winners (manual modes) have a slip number instead.
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawEntry', default: null },
    slipNumber: { type: Number, default: null, min: 1 },
    customerName: { type: String, trim: true, default: '' },
    customerPhone: { type: String, default: '' },
    prizeDescription: { type: String, required: true, trim: true },
    prizeValue: { type: Number, default: 0, min: 0 },
    claimCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: WINNER_STATUSES, default: 'pending' },
    notifiedAt: { type: Date },
    redeemedByAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    redeemedAtStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    redeemedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

luckyDrawWinnerSchema.pre('validate', function () {
  if (!this.entryId && this.slipNumber == null) {
    this.invalidate('entryId', 'A winner needs an online entry or a slip number');
  }
  if (this.entryId && (!this.customerName || !this.customerPhone)) {
    this.invalidate('customerPhone', 'Online winners need a name and phone number');
  }
});

luckyDrawWinnerSchema.index({ campaignId: 1, customerPhone: 1 });
luckyDrawWinnerSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.models.LuckyDrawWinner || mongoose.model('LuckyDrawWinner', luckyDrawWinnerSchema);
