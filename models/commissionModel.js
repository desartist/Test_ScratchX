import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema(
  {
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    salesAmount: { type: Number, required: true },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    commissionRate: Number,
    commissionAmount: { type: Number, required: true },
    bonusAmount: { type: Number, default: 0 },
    totalEarning: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid'],
      default: 'pending',
      index: true,
    },
    approvedAt: Date,
    paidAt: Date,
    payoutId: mongoose.Schema.Types.ObjectId,
    period: { type: String, index: true },
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { distributorId: 1, status: 1 },
      { distributorId: 1, period: 1 },
    ],
  }
);

// Delete cached model to ensure schema changes are fresh (avoids stale
// schema surviving a Next.js dev hot-reload)
if (mongoose.models.Commission) {
  delete mongoose.models.Commission;
}

export default mongoose.model('Commission', commissionSchema);
