import mongoose from "mongoose";

const scratchPackSchema = new mongoose.Schema(
  {
    // ========== SCRATCH PACK DETAILS ==========
    name: {
      type: String,
      required: [true, "Pack name is required"],
      example: "1000 Scratches"
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      enum: [1000, 5000, 10000, 50000],
      index: true
    },

    description: {
      type: String,
      default: null
    },

    // ========== PRICING ==========
    // Store price in smallest currency unit (paise for INR)
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"]
    },

    gstPercentage: {
      type: Number,
      default: 18,
      min: [0, "GST cannot be negative"]
    },

    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"]
    },

    // ========== STATUS ==========
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // ========== METADATA ==========
    icon: {
      type: String,
      default: "🎟️"
    }
  },
  { timestamps: true }
);

// Index for finding active packs
scratchPackSchema.index({ isActive: 1, quantity: 1 });

// Pre-save hook: Calculate total price with GST
scratchPackSchema.pre('save', function() {
  if (this.basePrice && this.gstPercentage) {
    const gstAmount = Math.ceil(this.basePrice * (this.gstPercentage / 100));
    this.totalPrice = this.basePrice + gstAmount;
  }
});

// Delete cached model to ensure hooks are fresh
if (mongoose.models.ScratchPack) {
  delete mongoose.models.ScratchPack;
}

export default mongoose.model("ScratchPack", scratchPackSchema);
