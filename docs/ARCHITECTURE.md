# ScratchX Complete System Architecture

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                         │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │ Login/Signup UI  │ Role-Based Admin │  Redemption      │    │
│  │ (Mobile + Email) │  Dashboards      │  Panel (Staff)   │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & MIDDLEWARE                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Rate Limiting  • JWT Verification  • CORS             │  │
│  │ • Request Logging • Permission Check • Session Mgmt     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │   Auth       │ │ Permission   │ │  Invite      │           │
│  │   Service    │ │  Service     │ │  Service     │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  Campaign    │ │   Coupon     │ │  Redemption  │           │
│  │  Service     │ │  Service     │ │  Service     │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        MongoDB Collections + Indexes + Queries           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ OTP        │  │ Razorpay   │  │ Google     │               │
│  │ Provider   │  │ Payment    │  │ OAuth      │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Data Models

### Core Collections

#### 2.1 Account Collection
```javascript
{
  _id: ObjectId,
  
  // Identity
  email: String,
  phone: String,
  name: String,
  
  // Authentication
  password: String (hashed), // null if using OTP or Google
  phoneVerified: Boolean,
  emailVerified: Boolean,
  passwordLastChanged: Date,
  
  // Role & Status
  role: Enum("Super_Admin", "Distributor", "Admin", "Store_Manager", "Staff"),
  status: Enum("Pending", "Active", "Suspended", "Incomplete_Setup", "Deactivated"),
  
  // Business Hierarchy
  businessId: ObjectId, // Reference to Business
  storeId: ObjectId,    // Reference to Store (if applicable)
  distributorId: ObjectId, // Parent distributor
  
  // Onboarding
  onboardingStage: String, // "business_setup", "store_setup", "plan_selection", "first_campaign"
  onboardingCompleted: Boolean,
  onboardingCompletedAt: Date,
  
  // Security
  loginAttempts: Number,
  lastLoginAt: Date,
  lastLoginIP: String,
  lastLoginDevice: String,
  loginAlerts: Boolean,
  
  // Device & Session
  trustedDevices: [
    {
      deviceId: String,
      deviceName: String,
      lastUsedAt: Date,
      addedAt: Date
    }
  ],
  
  // Preferences
  language: String,
  timezone: String,
  notifications: {
    email: Boolean,
    sms: Boolean,
    push: Boolean
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date (soft delete),
  
  // Indexes
  indexes: [
    { email: 1 },
    { phone: 1 },
    { businessId: 1, status: 1 },
    { storeId: 1, role: 1 },
    { status: 1, role: 1 }
  ]
}
```

#### 2.2 Business Collection
```javascript
{
  _id: ObjectId,
  
  // Basic Info
  name: String,
  phone: String,
  email: String,
  website: String,
  logo: String,
  
  // Admin Reference
  adminId: ObjectId, // Account._id
  
  // Business Details
  businessType: Enum("Retail", "E-commerce", "Distribution"),
  registrationNumber: String,
  taxId: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Subscription & Billing
  currentPlan: ObjectId, // Reference to Plan
  subscriptionStatus: Enum("Trial", "Active", "Expired", "Cancelled"),
  trialEndsAt: Date,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  
  // Onboarding
  setupCompleted: Boolean,
  setupCompletedAt: Date,
  
  // Settings
  timezone: String,
  currency: String,
  
  // Status
  status: Enum("Active", "Suspended", "Deleted"),
  
  createdAt: Date,
  updatedAt: Date,
  
  indexes: [
    { adminId: 1 },
    { subscriptionStatus: 1 },
    { status: 1 }
  ]
}
```

#### 2.3 Store Collection
```javascript
{
  _id: ObjectId,
  
  // Basic Info
  name: String,
  storeName: String,
  phone: String,
  
  // Business Reference
  businessId: ObjectId,
  
  // Location
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  
  // Manager
  managerId: ObjectId, // Account._id
  
  // Staff
  staffIds: [ObjectId], // Account._id array
  
  // Settings
  timezone: String,
  operatingHours: {
    monday: { open: String, close: String },
    // ... other days
  },
  
  // Status
  status: Enum("Active", "Inactive", "Closed"),
  
  createdAt: Date,
  updatedAt: Date,
  
  indexes: [
    { businessId: 1 },
    { managerId: 1 },
    { status: 1 }
  ]
}
```

#### 2.4 Invite Collection
```javascript
{
  _id: ObjectId,
  
  // Invite Details
  email: String,
  phone: String,
  
  // Role & Access
  role: Enum("Distributor", "Admin", "Store_Manager", "Staff"),
  inviteToken: String (unique), // Random 32-char token
  
  // Context
  businessId: ObjectId,
  storeId: ObjectId, // if applicable
  invitedBy: ObjectId, // Account._id
  
  // Status & Expiry
  status: Enum("Sent", "Accepted", "Expired", "Revoked"),
  sentAt: Date,
  acceptedAt: Date,
  expiresAt: Date, // +7 days from creation
  
  // Post-Accept
  acceptedByAccountId: ObjectId, // Created account
  
  createdAt: Date,
  updatedAt: Date,
  
  indexes: [
    { inviteToken: 1 },
    { email: 1, role: 1 },
    { status: 1, expiresAt: 1 },
    { businessId: 1, status: 1 }
  ]
}
```

#### 2.5 Permission Collection (Lookup Table)
```javascript
{
  _id: ObjectId,
  
  // Permission Definition
  name: String, // "create_campaign", "view_analytics", etc
  description: String,
  category: String, // "Campaign", "Store", "Reporting", "Settings"
  
  // Role Mapping
  roles: [
    {
      role: String,
      canExecute: Boolean,
      restrictions: {
        // Role-specific restrictions
        canOnlyAccessOwnStore: Boolean,
        canOnlyAccessOwnBusiness: Boolean
      }
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.6 Activity Log Collection
```javascript
{
  _id: ObjectId,
  
  // User
  userId: ObjectId,
  userRole: String,
  
  // Action
  action: String, // "login", "create_campaign", "logout"
  resource: String, // "campaign", "coupon", "account"
  resourceId: ObjectId,
  
  // Request Details
  ipAddress: String,
  userAgent: String,
  deviceId: String,
  
  // Status
  status: Enum("Success", "Failed", "Unauthorized"),
  errorMessage: String,
  
  // Metadata
  metadata: Object,
  
  createdAt: Date,
  
  indexes: [
    { userId: 1, createdAt: -1 },
    { action: 1, createdAt: -1 },
    { status: 1, createdAt: -1 }
  ]
}
```

---

## 3. Authentication & Authorization Flow

### 3.1 Complete Login Flow (Step-by-Step)

```
START: User accesses /login
│
├─ Step 1: User enters email OR phone
│  └─→ Validate format
│      └─→ Route to appropriate method
│
├─── IF EMAIL + PASSWORD METHOD ───┐
│                                   │
├─ Step 2: User enters password     │
│  ├─ Query: Find Account by email  │
│  ├─ Check: Account exists?        │
│  │  └─→ NO: Return "Account not found"
│  │                                │
│  ├─ Check: Password matches?      │
│  │  └─→ NO: Increment login attempts
│  │      └─→ If attempts > 5: Lock account for 30 min
│  │      └─→ Return "Invalid password"
│  │                                │
│  └─→ YES: Continue to Step 3      │
│                                   │
├─── OR IF MOBILE + OTP METHOD ────┤
│                                   │
├─ Step 2: Send OTP to phone        │
│  ├─ Generate 6-digit OTP          │
│  ├─ Store in OTP table (5 min TTL)│
│  ├─ Send via SMS provider         │
│  └─→ Return "OTP sent"            │
│                                   │
├─ Step 3: User enters OTP          │
│  ├─ Query: Find OTP record        │
│  ├─ Check: OTP valid & not expired│
│  │  └─→ NO: Return "Invalid OTP"  │
│  ├─ Check: Account exists?        │
│  │  └─→ NO: Create new account    │
│  └─→ Continue                     │
│                                   │
├─── OR IF GOOGLE LOGIN (ADMIN ONLY)
│                                   │
├─ Step 2: Redirect to Google OAuth │
│  └─→ Return email from Google     │
│                                   │
└─ Step 4: Check Account Status
   │
   ├─ Query: SELECT Account WHERE email=X
   │
   ├─ Check: Account exists?
   │  └─→ NO: Create new account
   │
   ├─ Check: Account status
   │  ├─ IF "Pending": Show "Accept invite first"
   │  ├─ IF "Suspended": Show "Account suspended"
   │  ├─ IF "Deactivated": Show "Account deactivated"
   │  ├─ IF "Incomplete_Setup": Continue to onboarding
   │  └─ IF "Active": Continue
   │
   └─ Step 5: Verify Role & Get Role Details
      │
      ├─ Query: Role from Account document
      │
      ├─ Check: Assigned Business & Store
      │  ├─ Query: Business WHERE businessId=X
      │  ├─ Query: Store WHERE storeId=X
      │  └─ Verify user has access
      │
      └─ Step 6: Generate Session & Tokens
         │
         ├─ Create JWT: accessToken (15 min)
         ├─ Create JWT: refreshToken (7 days)
         ├─ Log activity: "login_success"
         │
         ├─ Check: First-time login?
         │  └─→ YES: Set onboardingStage
         │
         └─ Step 7: Determine Redirect URL
            │
            ├─ IF role = "Super_Admin": /admin/dashboard
            ├─ IF role = "Distributor": /distributor/dashboard
            ├─ IF role = "Admin": /retailer/dashboard
            ├─ IF role = "Store_Manager": /store/dashboard
            └─ IF role = "Staff": /redemption/panel

END: User redirected to dashboard
```

### 3.2 Permission Checking System

```
PERMISSION CHECK FLOW:
┌────────────────────────────────────────────┐
│ User attempts action (e.g., create campaign)
└────────────┬─────────────────────────────────┘
             │
             ├─ Step 1: Extract JWT token
             │  └─→ Verify signature & expiry
             │
             ├─ Step 2: Get user from token
             │  └─→ Query: Account WHERE _id=userId
             │
             ├─ Step 3: Check Session validity
             │  ├─→ Is session still active?
             │  ├─→ Has session expired?
             │  └─→ Is user still active?
             │
             ├─ Step 4: Check Account Status
             │  ├─→ IF Suspended: DENY
             │  ├─→ IF Deactivated: DENY
             │  └─→ IF Active: Continue
             │
             ├─ Step 5: Check Role Permission
             │  ├─→ Query: Permission WHERE name="create_campaign"
             │  ├─→ Check: Does role have permission?
             │  └─→ IF NO: Return 403 Forbidden
             │
             ├─ Step 6: Check Business/Store Assignment
             │  ├─→ Is user assigned to this business/store?
             │  ├─→ Query: Business & Store ownership
             │  └─→ IF NOT: Return 403 Access Denied
             │
             ├─ Step 7: Check Feature Access (Subscription)
             │  ├─→ Query: Subscription for business
             │  ├─→ Get: Plan feature limits
             │  ├─→ Check: Is this feature available?
             │  └─→ Check: Usage within limit?
             │
             └─ Step 8: Log Activity
                ├─→ action: "create_campaign"
                ├─→ status: "success" or "denied"
                ├─→ ipAddress, deviceId, userAgent
                └─→ Save to ActivityLog

RESULT: ALLOW / DENY + Log entry
```

---

## 4. First-Time Login Onboarding Flow

### 4.1 Admin (Retailer) Onboarding

```
Step 1: Business Setup
├─ Form: Business name, phone, address
├─ Save: Create Business document
├─ Set: onboardingStage = "store_setup"
└─ Redirect: /onboarding/store-setup

Step 2: Store Setup
├─ Form: Store name, address, hours
├─ Save: Create Store document
├─ Link: Store.managerId = Admin Account
├─ Set: onboardingStage = "plan_selection"
└─ Redirect: /onboarding/plan-selection

Step 3: Plan/Trial Selection
├─ Display: Available plans
├─ Action: Choose trial or paid plan
├─ Create: Subscription document
├─ If Paid: Redirect to checkout (Razorpay)
├─ If Trial: 14-day trial starts
├─ Set: onboardingStage = "first_campaign"
└─ Redirect: /onboarding/first-campaign

Step 4: Create First Campaign (Optional)
├─ Form: Campaign details
├─ If Created: Set onboardingCompleted = true
└─ Redirect: /retailer/dashboard

FINAL STATE:
├─ Account.onboardingCompleted = true
├─ Account.status = "Active"
├─ Business created and linked
├─ Store created and linked
├─ Subscription created
└─ Campaign created (optional)
```

### 4.2 Distributor Onboarding

```
Step 1: Profile Setup
├─ Form: Territory, contact info
├─ Save: Update Account with details
└─ Redirect: /onboarding/territory

Step 2: Territory Overview
├─ Display: Assigned territory/region
├─ Show: KPIs and quick stats
└─ Redirect: /onboarding/guide

Step 3: Retailer Onboarding Guide
├─ Show: How to invite retailers
├─ Provide: Invite link generation UI
├─ Set: onboardingCompleted = true
└─ Redirect: /distributor/dashboard
```

### 4.3 Store Manager Onboarding

```
Step 1: Assigned Store Overview
├─ Display: Store details and stats
├─ Show: Active campaigns
└─ Set: onboardingCompleted = true

Step 2: Navigation Introduction
├─ Highlight: Key features
└─ Redirect: /store/dashboard
```

### 4.4 Staff Onboarding

```
Step 1: Redemption Training
├─ Show: Tutorial video / guide
├─ Explain: How to scan & redeem
└─ Require: Acknowledgement

Step 2: Redemption Panel
├─ Display: Ready-to-use scanner interface
├─ Set: onboardingCompleted = true
└─ Redirect: /staff/redemption
```

---

## 5. Invite System Logic

### 5.1 Invite Creation Process

```
INVITE CREATION:
┌──────────────────────────────────┐
│ Admin creates invite for new user │
└────────┬──────────────────────────┘
         │
    ├─ Step 1: Check Permission
    │  └─→ Does inviter have permission to invite this role?
    │
    ├─ Step 2: Validate Input
    │  ├─→ Email or Phone format?
    │  ├─→ Not already an account?
    │  └─→ Role is valid?
    │
    ├─ Step 3: Generate Invite
    │  ├─→ Create unique inviteToken (random 32 chars)
    │  ├─→ Set expiresAt = now + 7 days
    │  ├─→ Save Invite document
    │  └─→ status = "Sent"
    │
    ├─ Step 4: Send Invitation
    │  ├─→ Email/SMS with invite link
    │  ├─→ Link: https://app.scratch.com/join?token=ABC123...
    │  ├─→ Include: Expiry info, role details
    │  └─→ Send via provider
    │
    └─ Step 5: Log Activity
       └─→ action: "invite_sent", success: true

RESULT: Invite created, notification sent
```

### 5.2 Invite Acceptance Process

```
USER CLICKS INVITE LINK:
┌────────────────────────────────────┐
│ User: https://app.scratch.com/join │
│ Params: ?token=ABC123...           │
└────────┬─────────────────────────────┘
         │
    ├─ Step 1: Validate Token
    │  ├─→ Query: Invite WHERE inviteToken=ABC123
    │  ├─→ Check: Invite exists?
    │  │   └─→ NO: Show "Invalid/expired invite"
    │  └─→ Check: Not already accepted?
    │      └─→ YES: Show "Already accepted"
    │
    ├─ Step 2: Check Expiry
    │  ├─→ Is expiresAt > now()?
    │  └─→ NO: Update status="Expired", show error
    │
    ├─ Step 3: Show Registration Form
    │  ├─→ Pre-fill: email/phone from Invite
    │  ├─→ Form: Password, name, confirm email
    │  └─→ Show: Role & assigned business info
    │
    ├─ Step 4: User Registers
    │  ├─→ Hash password
    │  ├─→ Create Account document
    │  ├─→ Set fields from Invite:
    │  │   ├─ role
    │  │   ├─ businessId
    │  │   ├─ storeId
    │  │   └─ status = "Incomplete_Setup"
    │  │
    │  ├─ Step 5: Link Invite to Account
    │  │  ├─→ Invite.acceptedByAccountId = newAccount._id
    │  │  ├─→ Invite.acceptedAt = now()
    │  │  └─→ Invite.status = "Accepted"
    │  │
    │  └─ Step 6: Redirect to Onboarding
    │     └─→ Call first-time onboarding flow for role

RESULT: Account created from Invite, onboarding started
```

### 5.3 Invite Management (Dashboard)

```
ADMIN CAN:
├─ View all sent invites
├─ Resend expired invites
├─ Revoke pending invites
├─ View invite acceptance history
└─ Filter by role, status, date range
```

---

## 6. API Endpoints Design

### 6.1 Authentication Endpoints

```
PUBLIC ENDPOINTS (No Auth Required):
═══════════════════════════════════

POST /api/auth/login
├─ Body: { email, phone, password, otp }
├─ Response: { accessToken, refreshToken, user }
└─ Errors: 400, 401, 429 (rate limited)

POST /api/auth/send-otp
├─ Body: { phone }
├─ Response: { success: true, message: "OTP sent" }
└─ Errors: 400, 429

POST /api/auth/verify-otp
├─ Body: { phone, otp }
├─ Response: { accessToken, refreshToken, user }
└─ Errors: 400, 401

POST /api/auth/google-callback
├─ Query: { code, state }
├─ Response: { accessToken, refreshToken, user }
└─ Errors: 400, 401

POST /api/auth/refresh-token
├─ Body: { refreshToken }
├─ Response: { accessToken }
└─ Errors: 401

POST /api/auth/logout
├─ Body: {}
├─ Response: { success: true }
└─ Errors: 401

POST /api/invite/join
├─ Query: { token }
├─ Body: { email, phone, password, name }
├─ Response: { success: true, message: "Account created" }
└─ Errors: 400, 410 (invite expired)

GET /api/invite/validate
├─ Query: { token }
├─ Response: { valid: true, role, businessName, expiresAt }
└─ Errors: 404, 410

═══════════════════════════════════

PROTECTED ENDPOINTS (Auth Required):
═══════════════════════════════════

GET /api/user/profile
├─ Headers: { Authorization: "Bearer TOKEN" }
├─ Response: { account, business, store, permissions }
└─ Errors: 401, 403

PATCH /api/user/profile
├─ Body: { name, phone, email, preferences }
├─ Response: { success: true, user }
└─ Errors: 400, 401, 403

PATCH /api/user/password
├─ Body: { currentPassword, newPassword }
├─ Response: { success: true }
└─ Errors: 400, 401

POST /api/user/setup-complete
├─ Body: { onboardingStage }
├─ Response: { success: true }
└─ Errors: 400, 401

GET /api/business/{businessId}
├─ Response: { business, stores, members, stats }
├─ Permission: Admin of this business
└─ Errors: 401, 403, 404

POST /api/invite/send
├─ Body: { email/phone, role, businessId, storeId }
├─ Response: { invite, message }
├─ Permission: Can invite users
└─ Errors: 400, 403

GET /api/invite/list
├─ Query: { businessId, status, role }
├─ Response: { invites: [] }
├─ Permission: Can manage invites
└─ Errors: 401, 403

POST /api/invite/{inviteId}/resend
├─ Response: { success: true }
├─ Permission: Can manage invites
└─ Errors: 403, 404

POST /api/invite/{inviteId}/revoke
├─ Response: { success: true }
├─ Permission: Can manage invites
└─ Errors: 403, 404

GET /api/activity-logs
├─ Query: { userId, action, startDate, endDate, limit }
├─ Response: { logs: [] }
├─ Permission: Can view logs
└─ Errors: 401, 403
```

---

## 7. Security Implementation Details

### 7.1 OTP Strategy

```
SMS-BASED OTP:
├─ Provider: Twilio / Nexmo / AWS SNS
├─ Format: 6-digit numeric
├─ Validity: 5 minutes
├─ Attempts: Max 3 attempts, then cooldown
├─ Cooldown: 5 minutes between sending
└─ Storage: OTP table with TTL

OTP TABLE SCHEMA:
{
  _id: ObjectId,
  phone: String,
  otp: String (hashed),
  expiresAt: Date,
  attempts: Number,
  lastAttemptAt: Date,
  verified: Boolean,
  verifiedAt: Date,
  createdAt: Date
}
```

### 7.2 Password Policy

```
REQUIREMENTS:
├─ Minimum 8 characters
├─ At least 1 uppercase letter
├─ At least 1 lowercase letter
├─ At least 1 digit
├─ At least 1 special character (!@#$%^&*)
└─ Not matching last 3 passwords

HASHING:
├─ Algorithm: bcrypt
├─ Rounds: 10
├─ Never store plain text
└─ Compare using safe methods
```

### 7.3 Two-Factor Authentication (Super Admin Only)

```
2FA SETUP:
├─ Scan QR code with authenticator app (Google Authenticator, Authy)
├─ Store backup codes securely
├─ Require 2FA for login if enabled
└─ Allow fallback: SMS if app unavailable

LOGIN WITH 2FA:
├─ Step 1: Email + Password (or OTP)
├─ Step 2: Request 6-digit code from authenticator
├─ Step 3: Verify TOTP
└─ Step 4: Grant access
```

### 7.4 Session Security

```
SESSION MANAGEMENT:
├─ JWT tokens stored in httpOnly cookies
├─ Secure flag enabled (HTTPS only)
├─ SameSite=Strict to prevent CSRF
├─ Access token TTL: 15 minutes
├─ Refresh token TTL: 7 days
├─ Max sessions per user: 3 (revoke oldest)
├─ Session timeout on logout
└─ Activity logging on all operations

DEVICE BINDING (STAFF):
├─ deviceId = hash(user_agent + ip_address)
├─ Staff can only redeem from trusted devices
├─ Whitelist devices per staff member
└─ Alert on unusual login from new device
```

### 7.5 Rate Limiting & DDoS Protection

```
RATE LIMITS:
├─ Login attempts: 5 per minute per account
├─ OTP verification: 3 attempts per OTP
├─ OTP sending: 1 per minute per phone
├─ Invite sending: 10 per hour per user
├─ API calls: 100 per minute per user
├─ Anonymous IP: 20 per minute
└─ Account lockout: 15 minutes after 5 failed attempts

IMPLEMENTATION:
├─ Redis-based counter with TTL
├─ Return: Retry-After header
└─ Log: All rate limit violations
```

---

## 8. Error Handling & Messages

### 8.1 Authentication Errors

```
SCENARIO: Wrong Password
├─ HTTP: 401 Unauthorized
├─ Message: "Invalid email or password"
├─ Action: Clear password field, allow retry
├─ Log: Failed login attempt

SCENARIO: Account Suspended
├─ HTTP: 403 Forbidden
├─ Message: "Your account is suspended. Contact support at support@scratch.com"
├─ Action: Show support contact info
├─ Log: Attempted login to suspended account

SCENARIO: Invite Expired
├─ HTTP: 410 Gone
├─ Message: "This invite link has expired (sent 8 days ago). Request a new invite."
├─ Link: Request new invite / Contact admin
├─ Log: Attempted to accept expired invite

SCENARIO: OTP Invalid
├─ HTTP: 401 Unauthorized
├─ Message: "Invalid OTP. You have 2 attempts remaining."
├─ Action: Allow retry
├─ Log: Invalid OTP attempt

SCENARIO: Account Not Found
├─ HTTP: 404 Not Found
├─ Message: "Account not found. Please sign up."
├─ Link: /signup
├─ Log: Login attempt for non-existent account
```

---

## 9. Implementation Roadmap

### Phase 1: Core Authentication (Weeks 1-2)
- [x] Database schema design
- [ ] OTP infrastructure (SMS provider integration)
- [ ] Password authentication (bcrypt)
- [ ] JWT token generation & verification
- [ ] Account status validation
- [ ] Activity logging

### Phase 2: Authorization & Permissions (Weeks 3-4)
- [ ] Role-based access control (RBAC)
- [ ] Permission checking system
- [ ] Business/Store assignment validation
- [ ] Permission matrix setup

### Phase 3: Invite System (Weeks 5-6)
- [ ] Invite creation & validation
- [ ] Invite token generation
- [ ] Email/SMS invite sending
- [ ] Invite acceptance & account creation
- [ ] Invite management dashboard

### Phase 4: Onboarding Flows (Weeks 7-8)
- [ ] First-time login detection
- [ ] Role-specific onboarding workflows
- [ ] Onboarding UI/UX
- [ ] Onboarding step tracking

### Phase 5: Security & Advanced Features (Weeks 9-10)
- [ ] 2FA for Super Admin
- [ ] Device binding for Staff
- [ ] Login alerts
- [ ] Device management
- [ ] Session management improvements

### Phase 6: Monitoring & Optimization (Weeks 11-12)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Load testing
- [ ] Documentation completion

---

## 10. Technical Implementation Notes

### 10.1 Role-Specific Login Handling

```javascript
// After authentication, determine next step based on role

const redirects = {
  "Super_Admin": {
    path: "/admin/dashboard",
    requireOnboarding: false,
    require2FA: true
  },
  "Distributor": {
    path: "/distributor/dashboard",
    requireOnboarding: true,
    stages: ["profile_setup", "territory_overview"]
  },
  "Admin": {
    path: "/retailer/dashboard",
    requireOnboarding: true,
    stages: ["business_setup", "store_setup", "plan_selection", "first_campaign"]
  },
  "Store_Manager": {
    path: "/store/dashboard",
    requireOnboarding: true,
    stages: ["store_overview"]
  },
  "Staff": {
    path: "/redemption/panel",
    requireOnboarding: true,
    stages: ["redemption_training"]
  }
};
```

### 10.2 Permission Check Helper Function

```javascript
async function checkPermission(userId, action, resourceId, resourceType) {
  // 1. Get user
  const user = await Account.findById(userId);
  
  // 2. Check status
  if (user.status !== "Active") throw new ForbiddenError("Account not active");
  
  // 3. Get permission definition
  const permission = await Permission.findOne({ name: action });
  
  // 4. Check role has permission
  const rolePermission = permission.roles.find(r => r.role === user.role);
  if (!rolePermission?.canExecute) throw new ForbiddenError("Permission denied");
  
  // 5. Check business/store access
  if (rolePermission.restrictions.canOnlyAccessOwnBusiness) {
    const resource = await getResource(resourceType, resourceId);
    if (resource.businessId !== user.businessId) {
      throw new ForbiddenError("Cannot access other business");
    }
  }
  
  // 6. Check subscription access
  const subscription = await Subscription.findOne({ businessId: user.businessId });
  if (!subscription.planId.features.includes(action)) {
    throw new ForbiddenError("Feature not available in your plan");
  }
  
  // 7. Log activity
  await logActivity({
    userId,
    action,
    status: "success",
    resourceId,
    resourceType
  });
  
  return true;
}
```

---

## 11. Summary: Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| JWT + httpOnly cookies | Stateless auth, XSS protection, no session DB overhead |
| OTP + Email/Password | Flexible login, easy for mobile users, SMS backup |
| Role-based not permission-based | Simpler for current scale, easier to manage 5 roles |
| Invite expiry 7 days | Balance between flexibility and security |
| Activity logging on all actions | Compliance, debugging, security monitoring |
| Onboarding stages | Guided UX, progress tracking, prevents incomplete setups |
| MongoDB soft deletes | Audit trail, data recovery, historical analysis |
| Device binding for Staff | Prevents coupon fraud, ties redemption to location |

---

## 12. Next Steps

This architecture provides:
- ✅ Multi-tenant, role-based access control
- ✅ Flexible authentication (OTP, password, Google)
- ✅ Guided onboarding per role
- ✅ Robust invite system
- ✅ Comprehensive security
- ✅ Audit & activity logging
- ✅ Scalable to thousands of users

**Ready to proceed with detailed implementation plan for specific components?**
