import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Merchant ID is required'],
      index: true
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      // required: [true, 'Store ID is required'],
      index: true,
      default: null
    },
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      minlength: [3, 'Campaign name must be at least 3 characters'],
      maxlength: [100, 'Campaign name cannot exceed 100 characters'],
      trim: true
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true
    },
    // ============ STORE SNAPSHOT ASSIGNMENTS ============
    // Embedded store data for historical record and performance optimization
    assignedStores: [
      {
        // Store reference for updates only
        storeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Store',
          required: [true, 'Store ID is required in assignment']
        },

        // Store information snapshot (at assignment time)
        storeName: {
          type: String,
          required: [true, 'Store name is required'],
          trim: true
        },
        storeCode: {
          type: String,
          required: [true, 'Store code is required'],
          trim: true,
          uppercase: true
        },
        address: {
          type: String,
          required: [true, 'Store address is required'],
          trim: true
        },
        city: {
          type: String,
          required: [true, 'City is required'],
          trim: true
        },
        state: {
          type: String,
          required: [true, 'State is required'],
          trim: true
        },
        pincode: {
          type: String,
          required: [true, 'Pincode is required'],
          trim: true,
          match: [/^\d{6}$/, 'Pincode must be 6 digits']
        },

        // Contact information snapshot
        contactPerson: {
          type: String,
          required: [true, 'Contact person is required'],
          trim: true
        },
        contactNumber: {
          type: String,
          required: [true, 'Contact number is required'],
          trim: true,
          match: [/^\d{10,}$/, 'Contact number must be at least 10 digits']
        },

        // Location snapshot (critical for QR validation and geofencing)
        latitude: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90']
        },
        longitude: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180']
        },

        // Inventory tracking per store assignment
        allocated_scratch_cards: {
          type: Number,
          required: [true, 'Allocated scratch cards is required'],
          default: 0,
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

        // Assignment metadata
        assignedAt: {
          type: Date,
          default: Date.now
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
          required: [true, 'Assignment user ID is required']
        },

        // Status management (soft delete)
        status: {
          type: String,
          enum: {
            values: ['active', 'removed'],
            message: 'Status must be: active or removed'
          },
          default: 'active',
          index: true
        },

        // Audit trail
        lastModified: {
          type: Date,
          default: Date.now
        },
        lastModifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account'
        }
      }
    ],
    // campaignType: {
    //   type: String,
    //   enum: {
    //     values: ['discount', 'freeItem', 'buyOneGetOne', 'seasonal'],
    //     message: 'Invalid campaign type. Must be: discount, freeItem, buyOneGetOne, or seasonal'
    //   },
    //   required: [true, 'Campaign type is required']
    // },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    // totalQRCodes: {
    //   type: Number,
    //   required: [true, 'Total QR codes count is required'],
    //   min: [1, 'At least 1 QR code is required']
    // },
    // generatedQRCodes: {
    //   type: Number,
    //   default: 0,
    //   min: 0
    // },
    // discountPercentage: {
    //   type: Number,
    //   min: [0, 'Discount cannot be less than 0%'],
    //   max: [100, 'Discount cannot exceed 100%']
    // },
    // offerDescription: {
    //   type: String,
    //   trim: true
    // },
    // campaign_code: {
    //   type: String,
    //   unique: true,
    //   uppercase: true,
    //   trim: true,
    //   minlength: [3, 'Campaign code must be at least 3 characters'],
    //   maxlength: [20, 'Campaign code cannot exceed 20 characters']
    // },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'paused', 'ended'],
        message: 'Invalid status. Must be: draft, active, paused, or ended'
      },
      default: 'draft'
    },
    // Inventory tracking at campaign level
    allocated_scratch_cards: {
      type: Number,
      default: 0,
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
    tracking: {
      type: {
        qrCodesScanned: {
          type: Number,
          default: 0,
          min: 0
        },
        uniqueCustomers: {
          type: Number,
          default: 0,
          min: 0
        },
        conversionRate: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        }
      },
      default: {
        qrCodesScanned: 0,
        uniqueCustomers: 0,
        conversionRate: 0
      }
    },
    qrCodeUrl: { type: String, default: null },
    qrGeneratedAt: { type: Date, default: null },
    // Customizable QR studio styling (colors + center logo + brand name).
    // Additive, non-breaking: persisted so saved styles reload in the studio.
    qrStyle: {
      fgColor: { type: String, default: "#010f44" },
      bgColor: { type: String, default: "#ffffff" },
      brandName: { type: String, default: "" },
      logoUrl: { type: String, default: null }, // data URL or remote URL
    }
  },
  {
    timestamps: true
  }
);

// Validation: endDate must be after startDate and inventory consistency
campaignSchema.pre('validate', function () {
  // Validate campaign dates
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }

  // Calculate campaign-level remaining scratch cards: allocated - used - redeemed
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

  // Validate and calculate remaining scratch cards for each assigned store
  if (this.assignedStores && Array.isArray(this.assignedStores)) {
    for (let i = 0; i < this.assignedStores.length; i++) {
      const assignment = this.assignedStores[i];

      // Calculate remaining for this assignment
      assignment.remaining_scratch_cards =
        (assignment.allocated_scratch_cards || 0) -
        (assignment.used_scratch_cards || 0) -
        (assignment.redeemed_scratch_cards || 0);

      // Validate inventory consistency for each assignment
      if ((assignment.used_scratch_cards || 0) + (assignment.redeemed_scratch_cards || 0) > (assignment.allocated_scratch_cards || 0)) {
        this.invalidate(
          `assignedStores.${i}.used_scratch_cards`,
          'Used and redeemed scratch cards cannot exceed allocated amount for this store'
        );
      }

      // Ensure location data is present
      if (!assignment.latitude || !assignment.longitude) {
        this.invalidate(
          `assignedStores.${i}.latitude`,
          'Location coordinates are required for store assignment'
        );
      }
    }
  }
});

// Index for efficient queries
campaignSchema.index({ merchantId: 1, createdAt: -1 });
campaignSchema.index({ status: 1 });
// Compound index for efficient active campaign queries
campaignSchema.index({ status: 1, createdAt: -1 });

// Indexes for assignedStores nested array queries
campaignSchema.index({ 'assignedStores.storeId': 1 });
campaignSchema.index({ 'assignedStores.status': 1 });
campaignSchema.index({ 'assignedStores.assignedAt': -1 });
campaignSchema.index({ merchantId: 1, 'assignedStores.status': 1 });

export default mongoose.models.Campaign ||
  mongoose.model("Campaign", campaignSchema);

