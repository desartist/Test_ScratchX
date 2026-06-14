const mongoose = require('mongoose');

const couponRangeSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    startCode: {
      type: String,
      required: [true, 'Start code is required'],
      trim: true
    },
    endCode: {
      type: String,
      required: [true, 'End code is required'],
      trim: true
    },
    totalCodes: {
      type: Number,
      required: [true, 'Total codes count is required'],
      min: [1, 'At least 1 code is required'],
      max: [1000000, 'Cannot exceed 1 million codes per range']
    },
    usedCodes: {
      type: Number,
      default: 0,
      min: [0, 'Used codes cannot be negative']
    },
    generatedDate: {
      type: Date,
      required: [true, 'Generated date is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'archived'],
        message: 'Invalid status. Must be: active, expired, or archived'
      },
      default: 'active'
    },
    tracking: {
      type: {
        codesScanned: {
          type: Number,
          default: 0,
          min: [0, 'Codes scanned cannot be negative']
        },
        uniqueScans: {
          type: Number,
          default: 0,
          min: [0, 'Unique scans cannot be negative']
        },
        lastScannedDate: {
          type: Date,
          default: null
        }
      },
      default: {
        codesScanned: 0,
        uniqueScans: 0,
        lastScannedDate: null
      }
    }
  },
  {
    timestamps: true
  }
);

// Validation: expiryDate must be after generatedDate
couponRangeSchema.pre('validate', function () {
  if (this.generatedDate && this.expiryDate && this.expiryDate <= this.generatedDate) {
    this.invalidate('expiryDate', 'Expiry date must be after generated date');
  }

  // Validation: usedCodes cannot exceed totalCodes
  if (this.usedCodes && this.totalCodes && this.usedCodes > this.totalCodes) {
    this.invalidate('usedCodes', 'Used codes cannot exceed total codes');
  }
});

// Indexes
couponRangeSchema.index({ campaignId: 1, createdAt: -1 });
couponRangeSchema.index({ status: 1 });

module.exports = mongoose.model('CouponRange', couponRangeSchema);
