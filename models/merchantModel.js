import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema(
  {
    yourName: { type: String, required: true },
    storeName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    storeAddress: { type: String, required: true },
    businessType: { type: String, required: true },
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    storeLocation: { type: String, required: true },
    // Additional merchant info
    gst_number: {
      type: String,
      maxlength: [15, 'GST number cannot exceed 15 characters'],
      trim: true,
      sparse: true
    },
    business_name: {
      type: String,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
      trim: true
    },
    // Inventory tracking at merchant level (aggregate)
    total_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Total scratch cards cannot be negative']
    },
    used_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Used scratch cards cannot be negative']
    },
    remaining_scratch_cards: {
      type: Number,
      default: 0,
      min: [0, 'Remaining scratch cards cannot be negative']
    }
  },
  { timestamps: true },
);

// Validation: remaining_scratch_cards = total - used
merchantSchema.pre('validate', function() {
  this.remaining_scratch_cards = this.total_scratch_cards - this.used_scratch_cards;
  if (this.remaining_scratch_cards < 0) {
    this.invalidate('used_scratch_cards', 'Used scratch cards cannot exceed total');
  }
});

// Index for email-based lookups
merchantSchema.index({ email: 1 });

export default mongoose.models.Merchant ||
  mongoose.model("Merchant", merchantSchema);
