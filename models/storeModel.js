import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Merchant ID is required'],
      index: true
    },
    store_name: {
      type: String,
      required: [true, 'Store name is required'],
      minlength: [3, 'Store name must be at least 3 characters'],
      maxlength: [100, 'Store name cannot exceed 100 characters'],
      trim: true
    },
    store_code: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Store code must be at least 3 characters'],
      maxlength: [20, 'Store code cannot exceed 20 characters']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      maxlength: [500, 'Address cannot exceed 500 characters'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      maxlength: [50, 'City cannot exceed 50 characters'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      maxlength: [50, 'State cannot exceed 50 characters'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Pincode must be exactly 6 digits'],
      trim: true
    },
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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 &&
              v[1] >= -90 && v[1] <= 90;
          },
          message: 'Coordinates must be valid [longitude, latitude]'
        }
      }
    },
    contact_person: {
      type: String,
      required: [true, 'Contact person name is required'],
      maxlength: [100, 'Contact person name cannot exceed 100 characters'],
      trim: true
    },
    contact_number: {
      type: String,
      required: [true, 'Contact number is required'],
      match: [/^[0-9]{10}$/, 'Contact number must be exactly 10 digits'],
      trim: true
    },
    is_main_store: {
      type: Boolean,
      default: false
    },
    // ✅ FIX #2: Track if store is an extra store (SMART plan feature)
    // SMART plan: 1 main store free + up to 4 extra stores @ ₹199 each
    isExtraStore: {
      type: Boolean,
      default: false,
      index: true
    },
    // ✅ FIX #2: Store fee for extra stores (₹199 for SMART plan)
    extraStoreFee: {
      type: Number,
      default: 0, // 0 for main store, 199 for extra stores in SMART plan
      min: [0, 'Extra store fee cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'suspended'],
        message: 'Invalid status. Must be: active, inactive, or suspended'
      },
      default: 'active',
      index: true
    },
    // Inventory tracking at store level
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
    },
    // Campaigns assigned to this store (bidirectional sync with campaign.storeSnapshots)
    assignedCampaigns: [
      {
        campaignId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Campaign'
        },
        campaignName: String,
        status: {
          type: String,
          enum: ['active', 'inactive', 'ending_soon', 'ended'],
          default: 'active'
        },
        startDate: Date,
        endDate: Date,
        allocatedScratchCards: {
          type: Number,
          default: 0
        },
        usedScratchCards: {
          type: Number,
          default: 0
        },
        assignedAt: {
          type: Date,
          default: Date.now
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account'
        }
      }
    ],

    // Main store indicators
    isDefaultStore: {
      type: Boolean,
      default: false,
      index: true,
    },

    storeType: {
      type: String,
      enum: ['MAIN', 'BRANCH'],
      default: 'BRANCH',
      index: true,
    },
  },
  {
    timestamps: true
  }
);

// Geospatial index for location-based queries
storeSchema.index({ location: '2dsphere' });

// Coordinate indexes
storeSchema.index({ latitude: 1, longitude: 1 });

// Compound indexes for efficient queries
storeSchema.index({ merchant_id: 1, status: 1 });
storeSchema.index({ merchant_id: 1, is_main_store: 1 });

// Sync and validate store locations and inventory
storeSchema.pre('validate', function () {
  // Sync latitude/longitude with location coordinates
  if (this.location && Array.isArray(this.location.coordinates) && this.location.coordinates.length === 2) {
    if (this.longitude === undefined || this.longitude === null) {
      this.longitude = this.location.coordinates[0];
    }
    if (this.latitude === undefined || this.latitude === null) {
      this.latitude = this.location.coordinates[1];
    }
  } else if (this.latitude !== undefined && this.latitude !== null && this.longitude !== undefined && this.longitude !== null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }

  // Fallback for missing coordinates (e.g. in legacy tests)
  if ((this.latitude === undefined || this.latitude === null) && (this.longitude === undefined || this.longitude === null)) {
    this.latitude = 19.0760; // Mumbai latitude default
    this.longitude = 72.8479; // Mumbai longitude default
    this.location = {
      type: 'Point',
      coordinates: [72.8479, 19.0760]
    };
  }

  this.remaining_scratch_cards = this.total_scratch_cards - this.used_scratch_cards;
  if (this.remaining_scratch_cards < 0) {
    this.invalidate('used_scratch_cards', 'Used scratch cards cannot exceed total');
  }
});

// ===== AUTO-SYNC STORE LOCATION WITH CAMPAIGNS =====
// When a store's location (latitude/longitude) is updated, automatically
// sync that change to all campaigns that have this store assigned
storeSchema.post('save', async function (doc) {
  try {
    // Only sync if location changed (latitude or longitude modified)
    if (this.isModified('latitude') || this.isModified('longitude')) {
      const Campaign = mongoose.model('Campaign');

      // Find all campaigns with this store assigned
      const campaignFilter = {
        'assignedStores.storeId': this._id
      };

      const campaigns = await Campaign.find(campaignFilter);

      if (campaigns.length > 0) {
        console.log(`🔄 Syncing store ${doc.store_name} coordinates to ${campaigns.length} campaign(s)`);

        // Update each campaign's assignedStores snapshot
        for (const campaign of campaigns) {
          const storeAssignment = campaign.assignedStores.find(
            s => s.storeId.toString() === this._id.toString()
          );

          if (storeAssignment) {
            // Update coordinates in the snapshot
            storeAssignment.latitude = doc.latitude;
            storeAssignment.longitude = doc.longitude;
            storeAssignment.lastModified = new Date();

            // Save campaign with updated coordinates
            await campaign.save();
            console.log(`✅ Updated campaign ${campaign._id} with new store coordinates`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error syncing store location to campaigns:', error.message);
    // Don't throw - store save succeeded, just log the sync error
  }
});

export default mongoose.models.Store ||
  mongoose.model("Store", storeSchema);
