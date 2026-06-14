const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * JWT Configuration for tests
 * Mirrors the app's JWT configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-12345';
const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours for testing

/**
 * Generate a JWT token for authenticated test requests
 * @param {Object} user - User object with _id, email, role, etc.
 * @returns {string} - JWT token
 */
function generateAuthToken(user) {
  const payload = {
    accountId: user._id.toString(),
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    status: user.status || 'active',
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'scratchx-auth',
    audience: 'scratchx-api',
  });
}

/**
 * Generate a test user object with provided role and overrides
 * @param {string} role - User role (Super_Admin, Distributor, Merchant, Manager, Store_Manager, Store_Staff)
 * @param {Object} overrides - Fields to override in the test user
 * @returns {Object} - Test user object
 */
function generateTestUser(role = 'Merchant', overrides = {}) {
  const validRoles = [
    'Super_Admin',
    'Distributor',
    'Merchant',
    'Manager',
    'Store_Manager',
    'Store_Staff'
  ];

  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }

  const defaults = {
    _id: new mongoose.Types.ObjectId(),
    email: `user-${role.toLowerCase()}-${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
    password: 'hashedPassword123',
    phone: '9999999999',
    firstName: `Test`,
    lastName: role,
    role: role,
    status: 'active',
    isEmailVerified: true,
    isPhoneVerified: true,
  };

  // Add role-specific defaults
  if (role === 'Merchant') {
    defaults.profile = {
      storeName: 'Test Merchant Store',
      storeAddress: '123 Main St',
      businessType: 'Retail',
      phoneNumber: '9999999999',
      countryCode: '+91',
      storeLocation: 'Downtown',
    };
  } else if (role === 'Manager') {
    defaults.parentId = new mongoose.Types.ObjectId(); // References the merchant
    defaults.profile = {
      storeName: 'Manager Store',
      storeAddress: '456 Secondary St',
    };
  } else if (role === 'Store_Manager' || role === 'Store_Staff') {
    defaults.parentId = new mongoose.Types.ObjectId(); // References the manager/merchant
    defaults.storeId = new mongoose.Types.ObjectId(); // References the store
  } else if (role === 'Distributor') {
    defaults.profile = {
      companyName: 'Test Distribution Company',
      territory: 'North India',
      region: 'North',
      commissionRate: 5,
    };
  }

  return { ...defaults, ...overrides };
}

/**
 * Generate Authorization header object
 * @param {string} token - JWT token
 * @returns {Object} - Authorization header object
 */
function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Generate headers for Next.js API routes
 * These are parsed from Authorization header by middleware
 * @param {Object} user - User object
 * @returns {Object} - Headers object with x-user-id and x-user-role
 */
function getNextAuthHeaders(user) {
  return {
    'x-user-id': user._id.toString(),
    'x-user-role': user.role,
  };
}

/**
 * Generate complete auth headers for testing
 * @param {string} token - JWT token
 * @param {Object} user - User object
 * @returns {Object} - Combined headers
 */
function getCompleteAuthHeaders(token, user) {
  return {
    ...getAuthHeaders(token),
    ...getNextAuthHeaders(user),
  };
}

module.exports = {
  generateAuthToken,
  generateTestUser,
  getAuthHeaders,
  getNextAuthHeaders,
  getCompleteAuthHeaders,
};
