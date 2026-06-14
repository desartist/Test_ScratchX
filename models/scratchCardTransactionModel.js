import mongoose from "mongoose";

const scratchCardTransactionSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Merchant ID is required'],
      index: true
    },
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true
    },
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      index: true
    },
    campaign_store_mapping_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignStoreMapping',
      default: null
    },
    scratch_card_id: {
      type: String,
      maxlength: [100, 'Scratch card ID cannot exceed 100 characters'],
      trim: true
    },
    action_type: {
      type: String,
      enum: {
        values: [
          'inventory_added',
          'inventory_removed',
          'allocated_to_campaign',
          'allocated_to_store',
          'redeemed',
          'reversed',
          'expired',
          'returned',
          'cancelled'
        ],
        message: 'Invalid action type'
      },
      required: [true, 'Action type is required'],
      index: true
    },
    quantity: {
      type: Number,
      required: false,
      min: [0, 'Quantity cannot be negative']
    },
    previous_balance: {
      type: Number,
      default: 0,
      min: [0, 'Previous balance cannot be negative']
    },
    new_balance: {
      type: Number,
      default: 0,
      min: [0, 'New balance cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['completed', 'pending', 'failed', 'reversed'],
        message: 'Invalid transaction status'
      },
      default: 'completed',
      index: true
    },
    reference_number: {
      type: String,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
      trim: true
    },
    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
      trim: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Created by user ID is required']
    },
    source_system: {
      type: String,
      enum: {
        values: ['web_dashboard', 'mobile_app', 'api', 'batch_import'],
        message: 'Invalid source system'
      },
      default: 'web_dashboard'
    },
    ip_address: {
      type: String,
      maxlength: [45, 'IP address cannot exceed 45 characters'],
      trim: true
    },
    user_agent: {
      type: String,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries and auditing
scratchCardTransactionSchema.index({ merchant_id: 1, createdAt: -1 });
scratchCardTransactionSchema.index({ campaign_id: 1, createdAt: -1 });
scratchCardTransactionSchema.index({ store_id: 1, createdAt: -1 });
scratchCardTransactionSchema.index({ action_type: 1, status: 1 });
scratchCardTransactionSchema.index({ created_by: 1, createdAt: -1 });
scratchCardTransactionSchema.index({ reference_number: 1 });

// Compound indexes for common audit queries
scratchCardTransactionSchema.index({
  merchant_id: 1,
  action_type: 1,
  createdAt: -1
});

scratchCardTransactionSchema.index({
  merchant_id: 1,
  campaign_id: 1,
  store_id: 1,
  createdAt: -1
});

export default mongoose.models.ScratchCardTransaction ||
  mongoose.model("ScratchCardTransaction", scratchCardTransactionSchema);
