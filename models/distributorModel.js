/**
 * Distributor Model
 *
 * Tracks distributors and their commission structure
 */

import mongoose from 'mongoose';

const distributorSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    phone: String,
    businessName: String,
    businessType: {
      type: String,
      enum: ['individual', 'agency', 'enterprise'],
      default: 'individual',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    approvedAt: Date,
    suspendedAt: Date,

    // Commission Structure
    commission: {
      // Percentage-based commission on total subscription revenue
      percentagePerSale: {
        type: Number,
        default: 10, // 10% default
      },
      // Or fixed amount per subscription
      fixedPerSale: {
        type: Number,
        default: 0,
      },
      // Bonus for reaching targets
      bonusStructure: [
        {
          targetRevenue: Number, // ₹ amount
          bonusPercentage: Number, // Additional % bonus
        },
      ],
    },

    // Bank Details
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      bankName: String,
      ifsc: String,
      verified: {
        type: Boolean,
        default: false,
      },
    },

    // Metrics
    totalSales: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalPayouts: {
      type: Number,
      default: 0,
    },
    pendingCommission: {
      type: Number,
      default: 0,
    },
    monthlyEarnings: [
      {
        month: String, // YYYY-MM
        amount: Number,
        salesCount: Number,
      },
    ],

    // Sub-merchants managed by this distributor
    subMerchants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
    ],
    subMerchantCount: {
      type: Number,
      default: 0,
    },

    // Additional Info
    address: String,
    city: String,
    state: String,
    pincode: String,
    panNumber: String,
    gstNumber: String,

    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [{ status: 1, createdAt: -1 }, { email: 1 }],
  }
);

export default mongoose.models.Distributor ||
  mongoose.model('Distributor', distributorSchema);
