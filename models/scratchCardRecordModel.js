import mongoose from "mongoose";

const scratchCardRecordSchema = new mongoose.Schema(
  {
    // References
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Merchant ID is required'],
      index: true
    },
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true
    },
    range_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Range',
      required: [true, 'Range ID is required']
    },
    customer_participation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerParticipation',
      required: [true, 'Customer participation ID is required']
    },

    // Reward Information
    reward_type: {
      type: String,
      enum: {
        values: ['discount', 'freeItem', 'cashback', 'voucher'],
        message: 'Invalid reward type'
      },
      required: [true, 'Reward type is required']
    },
    reward_value: {
      type: Number,
      required: [true, 'Reward value is required'],
      min: [0, 'Reward value cannot be negative']
    },
    reward_image: {
      type: String,
      default: null
    },
    reward_description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      trim: true
    },

    // Status Tracking
    status: {
      type: String,
      enum: {
        values: ['generated', 'revealed', 'redeemed', 'expired'],
        message: 'Invalid status'
      },
      default: 'generated',
      index: true
    },

    // Timestamps
    generated_at: {
      type: Date,
      default: Date.now
    },
    revealed_at: {
      type: Date,
      default: null
    },
    redeemed_at: {
      type: Date,
      default: null
    },
    expires_at: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true
    },

    // Expiry Details
    expiry_duration_minutes: {
      type: Number,
      default: 5,
      min: [1, 'Expiry must be at least 1 minute']
    },
    is_expired: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
scratchCardRecordSchema.index({ campaign_id: 1, status: 1 });
scratchCardRecordSchema.index({ merchant_id: 1, createdAt: -1 });
scratchCardRecordSchema.index({ status: 1, expires_at: 1 });
scratchCardRecordSchema.index({ is_expired: 1, status: 1 });
scratchCardRecordSchema.index({ campaign_id: 1, store_id: 1, createdAt: -1 });

// TTL Index for automatic deletion of expired records (optional - delete after 30 days)
scratchCardRecordSchema.index({ createdAt: 1 }, {
  expireAfterSeconds: 2592000
});

// Force schema reload on hot-reload in dev (avoids cached model missing new fields)
if (mongoose.models.ScratchCardRecord) {
  delete mongoose.models.ScratchCardRecord;
}
export default mongoose.model("ScratchCardRecord", scratchCardRecordSchema);
