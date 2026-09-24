import mongoose from 'mongoose';
import { WINNER_STATUSES } from '../lib/luckyDraw/constants.js';

const luckyDrawWinnerSchema = new mongoose.Schema(
  {
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDraw', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    rank: { type: Number, required: true, min: 1 },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawEntry', required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true },
    prizeDescription: { type: String, required: true, trim: true },
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

luckyDrawWinnerSchema.index({ campaignId: 1, customerPhone: 1 });
luckyDrawWinnerSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.models.LuckyDrawWinner || mongoose.model('LuckyDrawWinner', luckyDrawWinnerSchema);
