import mongoose from "mongoose";

const customerParticipationSchema = new mongoose.Schema(
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

    // Matched Store Information (from location validation)
    matched_store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null
    },
    matched_store_name: {
      type: String,
      default: null,
      maxlength: [100, 'Store name cannot exceed 100 characters']
    },
    distance_from_store: {
      type: Number,
      default: 0,
      min: [0, 'Distance cannot be negative']
    },

    scratch_card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScratchCardRecord',
      default: null,
      // Optional: Set after ScratchCardRecord is created to avoid circular dependency
      index: true
    },
    reward_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    range_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Range',
      required: [true, 'Range ID is required']
    },

    // Customer Information
    customer_name: {
      type: String,
      required: [true, 'Customer name is required'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      trim: true
    },
    customer_mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[0-9]{10}$/, 'Mobile must be 10 digits'],
      index: true
    },
    customer_email: {
      type: String,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      trim: true,
      lowercase: true
    },
    customer_consent: {
      type: Boolean,
      required: [true, 'Consent is required'],
      default: false
    },

    // Transaction Details
    bill_amount: {
      type: Number,
      required: [true, 'Bill amount is required'],
      min: [0, 'Bill amount cannot be negative']
    },

    // Location Data
    customer_latitude: {
      type: Number,
      required: [true, 'Customer latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    customer_longitude: {
      type: Number,
      required: [true, 'Customer longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    distance_from_store_meters: {
      type: Number,
      default: 0,
      min: [0, 'Distance cannot be negative']
    },

    // Status Tracking
    status: {
      type: String,
      enum: {
        values: ['initiated', 'verified', 'scratched', 'revealed', 'redeemed', 'expired', 'failed'],
        message: 'Invalid status'
      },
      default: 'initiated',
      index: true
    },

    // Timestamps for expiry logic
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
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
customerParticipationSchema.index({ campaign_id: 1, createdAt: -1 });
customerParticipationSchema.index({ merchant_id: 1, createdAt: -1 });
customerParticipationSchema.index({ store_id: 1, createdAt: -1 });
customerParticipationSchema.index({ customer_mobile: 1, campaign_id: 1 });
customerParticipationSchema.index({ status: 1, expires_at: 1 });
customerParticipationSchema.index({ campaign_id: 1, status: 1, createdAt: -1 });

export default mongoose.models.CustomerParticipation ||
  mongoose.model("CustomerParticipation", customerParticipationSchema);
