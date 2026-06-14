// Load environment variables first
require('dotenv').config();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Start MongoDB Memory Server before all tests
 */
beforeAll(async () => {
  try {
    // Disconnect from any existing connection first
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to in-memory MongoDB
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Test setup failed:', error.message);
    throw new Error(`MongoDB Memory Server failed to start: ${error.message}`);
  }
});

/**
 * Clear all database collections after each test
 */
afterEach(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  } catch (error) {
    console.warn('Warning: Database cleanup failed:', error.message);
    // Continue test anyway but log warning
  }
});

/**
 * Disconnect mongoose and stop MongoDB Memory Server after all tests
 */
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

/**
 * Global mock function to generate a test ObjectId
 */
global.generateTestId = () => {
  return new mongoose.Types.ObjectId();
};

/**
 * Global mock function to create a test user object
 */
global.createMockUser = (overrides = {}) => {
  const validKeys = ['_id', 'email', 'password', 'firstName', 'lastName', 'role', 'merchantId', 'status'];

  // Validate override keys to prevent prototype pollution
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(key => {
      if (!validKeys.includes(key)) {
        console.warn(`Unexpected override key: ${key}`);
      }
    });
  }

  const defaults = {
    _id: new mongoose.Types.ObjectId(),
    email: `user-${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'Merchant',
    merchantId: new mongoose.Types.ObjectId(),
    status: 'active'
  };

  return { ...defaults, ...overrides };
};

/**
 * Global mock function to create a test merchant object
 */
global.createMockMerchant = (overrides = {}) => {
  const validKeys = ['_id', 'yourName', 'storeName', 'email', 'password', 'storeAddress', 'businessType', 'countryCode', 'phoneNumber', 'storeLocation', 'gst_number', 'business_name', 'contact_number', 'status', 'total_scratch_cards', 'used_scratch_cards', 'remaining_scratch_cards'];

  // Validate override keys to prevent prototype pollution
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(key => {
      if (!validKeys.includes(key)) {
        console.warn(`Unexpected override key: ${key}`);
      }
    });
  }

  const defaults = {
    _id: new mongoose.Types.ObjectId(),
    yourName: 'Test Merchant Owner',
    storeName: 'Test Store',
    email: `merchant-${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
    password: 'hashedPassword123',
    storeAddress: '123 Main Street',
    businessType: 'Retail',
    countryCode: '+91',
    phoneNumber: '9999999999',
    storeLocation: 'Downtown',
    gst_number: '18AABCT1234A1Z5',
    business_name: 'Test Business LLC',
    contact_number: '9999999999',
    status: 'active',
    total_scratch_cards: 1000,
    used_scratch_cards: 0,
    remaining_scratch_cards: 1000
  };

  return { ...defaults, ...overrides };
};

/**
 * Global mock function to create a test store object
 */
global.createMockStore = (merchantId = null, overrides = {}) => {
  const validKeys = ['_id', 'merchant_id', 'store_name', 'store_code', 'address', 'city', 'state', 'pincode', 'contact_person', 'contact_number', 'location', 'latitude', 'longitude', 'is_main_store', 'status', 'total_scratch_cards', 'used_scratch_cards', 'remaining_scratch_cards'];

  // Validate override keys to prevent prototype pollution
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(key => {
      if (!validKeys.includes(key)) {
        console.warn(`Unexpected override key: ${key}`);
      }
    });
  }

  const defaults = {
    _id: new mongoose.Types.ObjectId(),
    merchant_id: merchantId || new mongoose.Types.ObjectId(),
    store_name: 'Test Store Location',
    store_code: `ST${Date.now().toString().slice(-12)}`.substring(0, 20).toUpperCase(),
    address: '123 Business Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    contact_person: 'Store Manager',
    contact_number: '9876543210',
    latitude: 19.0760,
    longitude: 72.8479,
    location: {
      type: 'Point',
      coordinates: [72.8479, 19.0760] // Mumbai coordinates
    },
    is_main_store: false,
    status: 'active',
    total_scratch_cards: 500,
    used_scratch_cards: 0,
    remaining_scratch_cards: 500
  };

  return { ...defaults, ...overrides };
};

/**
 * Global mock function to create a test campaign object
 */
global.createMockCampaign = (merchantId = null, overrides = {}) => {
  const validKeys = ['_id', 'merchantId', 'storeId', 'campaignName', 'description', 'startDate', 'endDate', 'campaign_code', 'status', 'allocated_scratch_cards', 'used_scratch_cards', 'redeemed_scratch_cards', 'remaining_scratch_cards', 'tracking'];

  // Validate override keys to prevent prototype pollution
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach(key => {
      if (!validKeys.includes(key)) {
        console.warn(`Unexpected override key: ${key}`);
      }
    });
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

  const defaults = {
    _id: new mongoose.Types.ObjectId(),
    merchantId: merchantId || new mongoose.Types.ObjectId(),
    storeId: null,
    campaignName: 'Test Campaign',
    description: 'A test campaign for scratch cards',
    startDate: startDate,
    endDate: endDate,
    campaign_code: `CAMP${Date.now()}${Math.random().toString(36).substring(7)}`,
    status: 'active',
    allocated_scratch_cards: 1000,
    used_scratch_cards: 0,
    redeemed_scratch_cards: 0,
    remaining_scratch_cards: 1000,
    tracking: {
      qrCodesScanned: 0,
      uniqueCustomers: 0,
      conversionRate: 0
    }
  };

  return { ...defaults, ...overrides };
};
