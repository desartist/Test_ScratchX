# ScratchX Complete System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete multi-role SaaS platform with role-specific authentication, dashboards, and features for Super Admin, Distributor, Admin, Store Manager, and Staff.

**Architecture:** 
- Multi-tenant architecture with role-based access control (RBAC)
- Stateless JWT authentication with OTP support
- Role-specific signup flows (public + invite-based)
- Dedicated dashboards and features per role
- Scratch economy system for gamification
- Advanced analytics and AI insights

**Tech Stack:** Next.js 16, MongoDB, Redis, JWT, Zod, bcrypt, Razorpay

**Timeline:** 16 weeks | **Effort:** 1600+ hours | **Team:** 5 people

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN LAYER                             │
│  Platform Governance | System Configuration | Global Analytics   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  DISTRIBUTOR LAYER                               │
│  Territory Management | Retailer Onboarding | Scratch Allocation │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN/RETAILER LAYER                          │
│  Business Management | Campaign Creation | Customer Analytics    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼──────────────┐               ┌───────────▼──────────┐
│  STORE MANAGER LAYER │               │    STAFF/REDEMPTION  │
│ Store Operations     │               │    Scan & Redeem     │
│ Local Campaigns      │               │    Loyalty Points    │
│ Team Management      │               │    Customer Assist   │
└──────────────────────┘               └──────────────────────┘
```

---

## Phase 0: Database Schema & Models (1 Week)

### Files to Create/Modify

```
models/
├── accountModel.js (update - add role-specific fields)
├── businessModel.js (new)
├── storeModel.js (new)
├── inviteModel.js (new)
├── permissionModel.js (new)
├── planModel.js (new)
├── scratchModel.js (new - scratch economy)
├── campaignModel.js (update - enhanced)
├── couponModel.js (update)
├── activityLogModel.js (new)
└── otpModel.js (new)

migrations/
├── 001_initialize_schemas.js
├── 002_create_indexes.js
└── 003_seed_initial_data.js
```

### Task 0.1: Account Model Enhancement

**Files:**
- Modify: `models/accountModel.js`
- Create: `tests/models/accountModel.test.js`

**New Fields to Add:**
```javascript
{
  // Existing fields
  email: String,
  phone: String,
  password: String (hashed),
  role: Enum("Super_Admin", "Distributor", "Admin", "Store_Manager", "Staff"),
  
  // Role-specific assignments
  businessId: ObjectId,      // For Admin, Store_Manager, Staff
  storeId: ObjectId,         // For Store_Manager, Staff
  distributorId: ObjectId,   // For retailers under distributor
  
  // Status lifecycle
  status: Enum("Pending", "Active", "Suspended", "Incomplete_Setup", "Deactivated"),
  
  // Account metadata
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    phone: String,
    timezone: String,
    language: String
  },
  
  // Permissions & authorization
  permissions: [String],  // Array of permission keys
  customPermissions: {    // Override global permissions per role
    key: Boolean
  },
  
  // Authentication security
  password: String (bcrypt hashed),
  phoneVerified: Boolean,
  emailVerified: Boolean,
  passwordChangedAt: Date,
  passwordHistory: [String], // Store hashed last 3 passwords
  
  // Device & session management
  loginAttempts: Number,
  lastLoginAt: Date,
  lastLoginIP: String,
  lastLoginDevice: String,
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    ipAddress: String,
    lastUsedAt: Date,
    addedAt: Date
  }],
  
  // Onboarding
  onboardingStage: String,
  onboardingCompleted: Boolean,
  onboardingCompletedAt: Date,
  
  // Role-specific data
  roleData: {
    // For Distributor
    territory: {
      region: String,
      cities: [String],
      description: String
    },
    // For Store Manager
    assignedStores: [ObjectId],
    // For Staff
    staffPermissions: {
      canRedeem: Boolean,
      canCreateCampaigns: Boolean,
      canViewAnalytics: Boolean
    }
  },
  
  // System
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date (soft delete),
  
  // Indexes
  indexes: [
    { email: 1 },
    { phone: 1 },
    { role: 1, status: 1 },
    { businessId: 1, role: 1 },
    { storeId: 1, status: 1 },
    { distributorId: 1, status: 1 }
  ]
}
```

- [ ] **Step 1: Update account schema with all fields**
- [ ] **Step 2: Add indexes for performance**
- [ ] **Step 3: Create validation tests**
- [ ] **Step 4: Commit**

```bash
git add models/accountModel.js tests/models/accountModel.test.js
git commit -m "feat: enhance account model with role-specific fields"
```

---

### Task 0.2: Business Model

**Files:**
- Create: `models/businessModel.js`
- Create: `tests/models/businessModel.test.js`

**Schema:**
```javascript
{
  _id: ObjectId,
  
  // Basic info
  name: String (required),
  description: String,
  email: String,
  phone: String,
  website: String,
  logo: String,
  
  // Admin reference
  adminId: ObjectId (ref: Account),
  
  // Business type
  businessType: Enum("Retail", "E-commerce", "Distribution", "Restaurant"),
  industry: String,
  
  // Registration
  registrationNumber: String,
  taxId: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  },
  
  // Parent distributor (if applicable)
  distributorId: ObjectId,
  
  // Subscription
  currentPlan: ObjectId (ref: Plan),
  subscriptionStatus: Enum("Trial", "Active", "Expired", "Cancelled"),
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  trialEndsAt: Date,
  
  // Scratch economy
  scratchBalance: Number,
  totalScratchPurchased: Number,
  totalScratchUsed: Number,
  
  // Onboarding
  setupCompleted: Boolean,
  setupCompletedAt: Date,
  setupStage: String,
  
  // Business settings
  timezone: String,
  currency: String,
  language: String,
  
  // Marketing settings
  rewardSettings: {
    averageRewardValue: Number,
    maxRewardValue: Number,
    rewardFrequency: String
  },
  
  // Status
  status: Enum("Active", "Suspended", "Deleted"),
  suspensionReason: String,
  
  // System
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date,
  
  // Indexes
  indexes: [
    { adminId: 1 },
    { distributorId: 1, status: 1 },
    { subscriptionStatus: 1 },
    { status: 1, createdAt: -1 },
    { "address.coordinates": "2dsphere" } // Geospatial
  ]
}
```

- [ ] **Step 1: Create business model**
- [ ] **Step 2: Add geospatial index for location-based queries**
- [ ] **Step 3: Write validation tests**
- [ ] **Step 4: Commit**

```bash
git add models/businessModel.js tests/models/businessModel.test.js
git commit -m "feat: create business model with subscription and location support"
```

---

### Task 0.3: Store Model

**Files:**
- Create: `models/storeModel.js`

**Schema:**
```javascript
{
  _id: ObjectId,
  
  // Basic info
  name: String (required),
  storeCode: String (unique),
  
  // References
  businessId: ObjectId (ref: Business, required),
  managerId: ObjectId (ref: Account),
  
  // Location
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  },
  
  // Contact
  phone: String,
  email: String,
  
  // Team
  staffIds: [ObjectId],
  
  // Store operations
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    // ... other days
  },
  
  // Store-level settings
  enabledCampaigns: [ObjectId],
  storeBranding: {
    logo: String,
    color: String,
    displayName: String
  },
  
  // Performance metrics
  totalScans: Number,
  totalRedemptions: Number,
  repeatCustomerRate: Number,
  
  // Status
  status: Enum("Active", "Inactive", "Closed"),
  
  // System
  createdAt: Date,
  updatedAt: Date,
  
  // Indexes
  indexes: [
    { businessId: 1, status: 1 },
    { managerId: 1 },
    { storeCode: 1 },
    { "address.coordinates": "2dsphere" }
  ]
}
```

---

### Task 0.4: Scratch Economy Models

**Files:**
- Create: `models/scratchModel.js`
- Create: `models/scratchAllocationModel.js`
- Create: `models/scratchUsageModel.js`

**Scratch Balance Model:**
```javascript
{
  _id: ObjectId,
  
  // Owner
  businessId: ObjectId (required),
  
  // Balance tracking
  totalBalance: Number,
  availableBalance: Number,
  allocatedBalance: Number,
  usedBalance: Number,
  
  // History
  transactions: [{
    type: Enum("Purchase", "Allocation", "Usage", "Refund"),
    amount: Number,
    reason: String,
    timestamp: Date,
    relatedEntity: {
      type: String,
      id: ObjectId
    }
  }],
  
  // Forecasting
  estimatedDaysRemaining: Number,
  lastUpdatedAt: Date,
  
  // Indexes
  indexes: [
    { businessId: 1 },
    { lastUpdatedAt: -1 }
  ]
}
```

---

### Task 0.5: Campaign & Coupon Model Enhancement

**Files:**
- Modify: `models/campaignModel.js`
- Modify: `models/couponModel.js`

**Enhanced Campaign Model:**
```javascript
{
  _id: ObjectId,
  
  // Existing fields
  merchantId: ObjectId, // Update to businessId
  campaignName: String,
  
  // Campaign type
  campaignType: Enum("Limited", "Unlimited", "Festive", "Seasonal"),
  
  // Scratch configuration
  scratchAllocation: {
    total: Number,
    allocated: Number,
    used: Number,
    remaining: Number
  },
  
  // Reward configuration
  rewardStructure: {
    billingRange: {
      min: Number,
      max: Number
    },
    rewards: [{
      minBill: Number,
      maxBill: Number,
      rewardValue: Number,
      chanceToWin: Number, // 0-100%
      rewardType: Enum("Scratch", "Cashback", "Discount")
    }]
  },
  
  // Store assignments
  assignedStores: [ObjectId],
  
  // Performance
  metrics: {
    totalScans: Number,
    totalRedemptions: Number,
    redemptionRate: Number,
    averageRewardCost: Number,
    totalScratchUsed: Number
  },
  
  // Status
  status: Enum("Draft", "Active", "Paused", "Expired", "Ended"),
  startDate: Date,
  endDate: Date,
  
  // System
  createdAt: Date,
  updatedAt: Date,
  
  // Indexes
  indexes: [
    { businessId: 1, status: 1 },
    { startDate: 1, endDate: 1 },
    { assignedStores: 1 }
  ]
}
```

---

### Task 0.6: Analytics & Permission Models

**Files:**
- Create: `models/permissionModel.js`
- Create: `models/analyticsModel.js`
- Create: `models/activityLogModel.js`

**Permission Model Schema:**
```javascript
{
  _id: ObjectId,
  
  // Permission definition
  key: String (unique), // "campaign:create", "staff:add", etc
  name: String,
  description: String,
  category: String, // "Campaign", "Store", "Staff", "Analytics", "Settings"
  
  // Role mapping
  rolePermissions: {
    Super_Admin: { allowed: Boolean, restrictions: Object },
    Distributor: { allowed: Boolean, restrictions: Object },
    Admin: { allowed: Boolean, restrictions: Object },
    Store_Manager: { allowed: Boolean, restrictions: Object },
    Staff: { allowed: Boolean, restrictions: Object }
  },
  
  // System
  createdAt: Date,
  updatedAt: Date
}
```

**50+ Permissions to Define:**
```javascript
// Campaign permissions
"campaign:create"
"campaign:edit"
"campaign:delete"
"campaign:pause"
"campaign:resume"
"campaign:view_analytics"
"campaign:duplicate"

// Store permissions
"store:create"
"store:edit"
"store:delete"
"store:assign_manager"
"store:view_analytics"

// Staff permissions
"staff:add"
"staff:edit"
"staff:remove"
"staff:view_redemptions"
"staff:assign_permissions"

// Scratch economy
"scratch:purchase"
"scratch:allocate"
"scratch:view_balance"
"scratch:forecast"

// Analytics
"analytics:view_business"
"analytics:view_store"
"analytics:view_customer"
"analytics:export_data"

// Settings
"settings:manage_business"
"settings:manage_team"
"settings:manage_subscription"
"settings:manage_permissions"

// Admin-only
"admin:manage_distributors"
"admin:manage_retailers"
"admin:manage_plans"
"admin:manage_pricing"
"admin:view_platform_analytics"
"admin:configure_system"
```

---

### Task 0.7: Seed Initial Data

**Files:**
- Create: `seeds/permissions.seed.js`
- Create: `seeds/plans.seed.js`
- Create: `seeds/initial-data.seed.js`

**Permissions Seed (50+ permissions):**
```javascript
const permissions = [
  // Campaign management
  {
    key: "campaign:create",
    name: "Create Campaign",
    category: "Campaign",
    rolePermissions: {
      Super_Admin: { allowed: true },
      Distributor: { allowed: false },
      Admin: { allowed: true },
      Store_Manager: { allowed: false },
      Staff: { allowed: false }
    }
  },
  // ... 49 more permissions
];

await Permission.insertMany(permissions);
```

**Plans Seed:**
```javascript
const plans = [
  {
    name: "Starter",
    price: 999,
    currency: "INR",
    billingCycle: "monthly",
    features: {
      maxCampaigns: 5,
      maxStores: 1,
      maxStaff: 5,
      maxScratchPerMonth: 100,
      analytics: false,
      customBranding: false
    }
  },
  {
    name: "Growth",
    price: 4999,
    features: {
      maxCampaigns: 50,
      maxStores: 10,
      maxStaff: 50,
      maxScratchPerMonth: 1000,
      analytics: true,
      customBranding: true
    }
  },
  {
    name: "Enterprise",
    price: null, // Custom pricing
    features: {
      maxCampaigns: -1, // Unlimited
      maxStores: -1,
      maxStaff: -1,
      maxScratchPerMonth: -1,
      analytics: true,
      customBranding: true,
      dedicatedSupport: true,
      customIntegrations: true
    }
  }
];

await Plan.insertMany(plans);
```

- [ ] **Step 1: Create and run migration scripts**
- [ ] **Step 2: Seed 50+ permissions**
- [ ] **Step 3: Seed subscription plans**
- [ ] **Step 4: Verify data in MongoDB**
- [ ] **Step 5: Commit**

```bash
git add seeds/ migrations/
git commit -m "feat: seed initial permissions, plans, and configuration"
```

---

## Phase 1: Authentication & Signup (4 Weeks)

### Task 1.1-1.10: Authentication System
(See Phase 1 plan from previous documentation - OTP, JWT, Password, Google OAuth)

### Task 1.11-1.20: Role-Specific Signup Flows
(See signup flows documentation - Super Admin, Distributor, Admin, Store Manager, Staff)

---

## Phase 2: Role-Specific Dashboards & Features (6 Weeks)

### Task 2.1: Super Admin Dashboard

**Files:**
- Create: `app/admin/dashboard/page.js`
- Create: `components/dashboards/SuperAdminDashboard.jsx`
- Create: `app/api/admin/dashboard/route.js`

**Dashboard Components:**
```
┌─────────────────────────────────────────────────────┐
│            SUPER ADMIN DASHBOARD                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Platform Health KPIs]  [Revenue Analytics]        │
│  • Active Retailers      • MRR                       │
│  • Active Campaigns      • Scratch Sales             │
│  • Total Scans           • Distributor Revenue      │
│  • Redemption Rate       • Churn Rate               │
│                                                      │
│  [Distributor Network]   [Scratch Economy]          │
│  • Territory Growth      • Total Scratches Sold     │
│  • Onboarding Rates      • Consumed Balance         │
│  • Top Performers        • Platform Balance         │
│  • Revenue Contribution  • Consumption Trends       │
│                                                      │
│  [Security & Monitoring]                            │
│  • Fraud Alerts          • API Status              │
│  • Abuse Detection       • System Health           │
│                                                      │
│  [Recent Activity]                                   │
│  • New Retailer Signups  • Failed Transactions     │
│  • Distributor Activity  • System Alerts           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**API Endpoint:**
```javascript
GET /api/admin/dashboard
Response: {
  platformKPIs: {
    totalRetailers: Number,
    activeRetailers: Number,
    totalCampaigns: Number,
    activeCampaigns: Number,
    totalScans: Number,
    totalRedemptions: Number,
    redemptionRate: Number
  },
  revenueAnalytics: {
    mrr: Number,
    scratchSalesRevenue: Number,
    distributorRevenue: Number,
    churnRate: Number
  },
  distributorNetwork: {
    activeDistributors: Number,
    territoryGrowth: [{ territory, growth, retailers }],
    topPerformers: [{ distributor, revenue, retailers }]
  },
  scratchEconomy: {
    totalSold: Number,
    totalConsumed: Number,
    platformBalance: Number,
    consumptionTrends: [{ date, consumed }]
  },
  securityAlerts: [{ type, severity, count, details }],
  recentActivity: [...]
}
```

---

### Task 2.2: Distributor Dashboard

**Files:**
- Create: `app/distributor/dashboard/page.js`
- Create: `components/dashboards/DistributorDashboard.jsx`
- Create: `app/api/distributor/dashboard/route.js`

**Dashboard Components:**
```
┌─────────────────────────────────────────────────────┐
│          DISTRIBUTOR DASHBOARD                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Territory Highlights]  [Retailer Growth]          │
│  • Total Retailers       • Onboarded This Month     │
│  • Active Retailers      • Activation Rate          │
│  • Territory Name        • At-Risk Retailers        │
│  • Region Map            • New Lead Count           │
│                                                      │
│  [Scratch Distribution]  [Revenue & Commission]     │
│  • Total Allocated       • Monthly Earnings         │
│  • Retailer Balances     • Sales Revenue            │
│  • Low Balance Alerts    • Acquisition Revenue      │
│  • Allocation Trends     • Target Progress          │
│                                                      │
│  [Campaign Overview]                                │
│  • Active Campaigns      • Top Retailers            │
│  • Participation Rate    • Redemption Rate          │
│                                                      │
│  [Quick Actions]                                    │
│  [+ Create Retailer] [Low Balance Alert] [Reports]  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

### Task 2.3: Admin (Retailer) Dashboard

**Files:**
- Create: `app/admin/dashboard/page.js`
- Create: `components/dashboards/AdminDashboard.jsx`
- Create: `app/api/merchant/dashboard/route.js`

**Dashboard Components:**
```
┌─────────────────────────────────────────────────────┐
│           ADMIN DASHBOARD                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Scratch Balance]       [Campaign Performance]     │
│  • Remaining Balance     • Active Campaigns         │
│  • Usage Trends          • Total Scans              │
│  • Days Remaining        • Redemption Rate          │
│  • Recharge Option       • Top Campaign             │
│                                                      │
│  [Customer Analytics]    [Store Performance]        │
│  • Total Customers       • Active Stores            │
│  • Repeat Rate           • Top Performing Store     │
│  • New Customers         • Scans by Store           │
│  • Engagement Rate       • Redemptions by Store     │
│                                                      │
│  [Business Growth]                                  │
│  • Monthly Trend         • Campaign ROI             │
│  • Repeat Visit Growth   • Customer Retention       │
│                                                      │
│  [Quick Actions]                                    │
│  [+ New Campaign] [Add Store] [View Customers]     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

### Task 2.4: Store Manager Dashboard

**Files:**
- Create: `app/store/dashboard/page.js`
- Create: `components/dashboards/StoreManagerDashboard.jsx`
- Create: `app/api/store/dashboard/route.js`

**Dashboard Components:**
```
┌─────────────────────────────────────────────────────┐
│         STORE MANAGER DASHBOARD                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Today's Activity]      [Campaign Status]          │
│  • Scans Today           • Running Campaigns        │
│  • Redemptions Today     • Scratch Allocation       │
│  • Active Customers      • Ending Soon              │
│  • Participation Rate    • Low Balance Alert        │
│                                                      │
│  [Store Performance]     [Customer Insights]        │
│  • Repeat Customers      • Recent Visitors          │
│  • Engagement Rate       • High-Value Customers     │
│  • Average Reward        • Participation Trend      │
│                                                      │
│  [Staff Operations]                                 │
│  • Redemptions Handled   • Staff Activity           │
│  • Verification Status   • Performance             │
│                                                      │
│  [Quick Actions]                                    │
│  [View Campaigns] [Manage Staff] [Print QR]        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

### Task 2.5: Staff Redemption Panel

**Files:**
- Create: `app/staff/redemption/page.js`
- Create: `components/RedemptionePanel.jsx`
- Create: `app/api/redemption/route.js`

**Redemption Panel Features:**
```
┌──────────────────────────────────┐
│    REDEMPTION PANEL (Staff)      │
├──────────────────────────────────┤
│                                   │
│  [QR Scanner]                     │
│  ┌────────────────────┐           │
│  │   [📱 Camera]      │           │
│  │  (QR Scanner)      │           │
│  └────────────────────┘           │
│                                   │
│  Scanned Code: ABC123DEF          │
│                                   │
│  [Redemption Details]             │
│  Customer: John Doe               │
│  Bill Amount: ₹450                │
│  Reward: ₹50                      │
│  Status: ✅ Valid                 │
│                                   │
│  [Action Buttons]                 │
│  [✓ Redeem] [❌ Reject] [? Help]  │
│                                   │
│  [Activity Log]                   │
│  10:23 AM - ₹500 redeemed         │
│  10:15 AM - ₹300 redeemed         │
│  ...                              │
│                                   │
└──────────────────────────────────┘
```

---

## Phase 3: Advanced Features (5 Weeks)

### Task 3.1: AI Insights Engine

**Files:**
- Create: `services/aiInsightsService.js`
- Create: `app/api/insights/route.js`

**Features:**
- Campaign recommendations
- Optimal reward structure
- Retailer health scoring
- Territory performance analysis
- Fraud detection

**Example Insights:**
```javascript
{
  campaignInsights: [
    "Weekend campaigns perform 28% better",
    "Fashion retailers show 35% higher retention",
    "Reduce high-value rewards by 15% for better margin"
  ],
  retailerAlerts: [
    "12 retailers inactive for 14+ days",
    "Ahmedabad region growing 45% this month",
    "3 retailers at risk of churn"
  ],
  scratchForecasts: [
    "At current usage, balance will last 12 days",
    "Expected consumption increase in festive season"
  ]
}
```

---

### Task 3.2: Advanced Analytics & Reporting

**Files:**
- Create: `components/analytics/BusinessAnalytics.jsx`
- Create: `components/analytics/CustomerSegmentation.jsx`
- Create: `app/api/analytics/route.js`

**Reports Generated:**
- Business performance report
- Customer segmentation analysis
- Campaign ROI analysis
- Territory performance analysis
- Redemption trends
- Fraud detection report

---

### Task 3.3: Automation Features

**Files:**
- Create: `services/automationService.js`
- Create: `jobs/automationJobs.js`

**Automations:**
- Auto-recharge scratch balance
- Low-balance alerts
- Inactive retailer notifications
- Fraud detection alerts
- Campaign recommendations
- Retailer health scoring

---

### Task 3.4: Multi-Channel Marketing

**Files:**
- Create: `services/marketingService.js`
- Create: `components/marketing/CampaignCreator.jsx`

**Channels:**
- WhatsApp promotions
- SMS reminders
- Email campaigns
- In-store posters (generated)
- QR standees

---

### Task 3.5: Advanced Scratch Economy

**Files:**
- Create: `services/scratchEconomyService.js`
- Create: `models/scratchTransactionModel.js`

**Features:**
- Scratch allocation optimization
- Consumption forecasting
- Territory-wise scratch distribution
- Scratch inventory management
- Auto-replenishment

---

## Phase 4: Integration & APIs (3 Weeks)

### Task 4.1: Razorpay Integration

**Files:**
- Create: `lib/razorpayService.js`
- Create: `app/api/billing/route.js`

**Features:**
- Plan upgrades
- Scratch purchases
- Subscription management
- Refunds & credits

---

### Task 4.2: Email & SMS Integration

**Files:**
- Create: `services/emailService.js`
- Create: `services/smsService.js`

**Providers:**
- Email: SendGrid / AWS SES
- SMS: Twilio / AWS SNS

---

### Task 4.3: Creative Studio API

**Files:**
- Create: `services/creativeStudioService.js`
- Create: `app/api/creative/route.js`

**Features:**
- Template management
- QR code generation
- Poster creation
- Asset export (PDF, PNG, JPG)

---

## Phase 5: Testing & Deployment (2 Weeks)

### Task 5.1: Unit & Integration Tests

- Test all APIs
- Test role-based access control
- Test payment flow
- Test automation services

**Target:** >85% code coverage

---

### Task 5.2: E2E Testing

**Scenarios:**
- Complete Super Admin workflow
- Complete Distributor workflow
- Complete Admin workflow
- Complete Store Manager workflow
- Complete Staff redemption workflow

---

### Task 5.3: Security & Performance

- Security audit
- Load testing (5000 concurrent users)
- Database optimization
- API response time optimization
- CDN setup for assets

---

### Task 5.4: Documentation & Deployment

- API documentation (OpenAPI/Swagger)
- User guides for each role
- Admin onboarding guide
- Deployment runbook
- Production deployment

---

## Summary: 100+ Implementation Tasks

This complete plan covers:

✅ **7 MongoDB Collections** with proper indexes
✅ **5 Role-Specific Dashboards** with real-time data
✅ **40+ API Endpoints** for each role
✅ **50+ Permission Matrix** for RBAC
✅ **Authentication System** (OTP, JWT, Google OAuth)
✅ **Scratch Economy System** with forecasting
✅ **Advanced Analytics** with AI insights
✅ **Multi-channel Marketing** (WhatsApp, SMS, Email)
✅ **Payment Integration** (Razorpay)
✅ **Creative Studio** for asset generation
✅ **Fraud Detection** & security monitoring
✅ **E2E Testing** for all workflows

**Timeline:** 16 weeks
**Team:** 5 engineers
**Effort:** 1600+ hours
**Scalability:** 100,000+ users

---

## Execution Plan

**This plan is divided into:**
- **Phase 0:** 1 week (Database)
- **Phase 1:** 4 weeks (Auth + Signup)
- **Phase 2:** 6 weeks (Dashboards + Features)
- **Phase 3:** 5 weeks (Advanced Features)
- **Phase 4:** 3 weeks (Integrations)
- **Phase 5:** 2 weeks (Testing + Deployment)

**Total:** 16 weeks = ~4 months

---

Plan complete and saved to `docs/superpowers/plans/2026-05-23-complete-scratchx-system.md`.

## Execution Options

**1. Subagent-Driven (Recommended)** - Fresh subagent per task, quality gates, fast iteration

**2. Inline Execution** - Sequential execution with checkpoints, detailed reviews

**Which approach would you prefer?** 🚀

Or would you like me to create a **more detailed Phase 0 plan** with exact code for database setup to start immediately?