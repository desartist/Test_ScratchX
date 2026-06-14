import mongoose from "mongoose";

const campaignStoreMappingSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true
    },
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Merchant ID is required'],
      index: true
    },
    allocated_scratch_cards: {
      type: Number,
      required: [true, 'Allocated scratch cards count is required'],
      min: [0, 'Allocated scratch cards cannot be negative']
    },
    used_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Used scratch cards cannot be negative']
    },
    redeemed_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Redeemed scratch cards cannot be negative']
    },
    remaining_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Remaining scratch cards cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'completed', 'cancelled'],
        message: 'Invalid status. Must be: active, paused, completed, or cancelled'
      },
      default: 'active',
      index: true
    },
    allocation_date: {
      type: Date,
      default: Date.now
    },
    allocation_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Allocation by user ID is required']
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: one campaign can only be assigned once to each store per merchant
campaignStoreMappingSchema.index(
  { campaign_id: 1, store_id: 1, merchant_id: 1 },
  { unique: true }
);

// Indexes for efficient queries
campaignStoreMappingSchema.index({ campaign_id: 1, status: 1 });
campaignStoreMappingSchema.index({ store_id: 1, status: 1 });
campaignStoreMappingSchema.index({ merchant_id: 1, status: 1 });
campaignStoreMappingSchema.index({ campaign_id: 1, store_id: 1 });

// Validation: remaining = allocated - used - redeemed
campaignStoreMappingSchema.pre('validate', function() {
  this.remaining_scratch_cards =
    this.allocated_scratch_cards -
    this.used_scratch_cards -
    this.redeemed_scratch_cards;

  if (this.used_scratch_cards + this.redeemed_scratch_cards > this.allocated_scratch_cards) {
    this.invalidate(
      'used_scratch_cards',
      'Used and redeemed scratch cards cannot exceed allocated amount'
    );
  }
});

export default mongoose.models.CampaignStoreMapping ||
  mongoose.model("CampaignStoreMapping", campaignStoreMappingSchema);
