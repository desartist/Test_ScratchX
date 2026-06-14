# ScratchX Complete Signup & Registration Flows

## Overview: Who Can Create What

```
                        SCRATCHX COMPANY
                              │
                              ↓
                    SUPER ADMIN (Internal)
                    └─ Can create: Distributors
                              │
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
               Distributor  Distributor  Distributor
               (Territory1) (Territory2) (Territory3)
                    │
            ┌───────┼───────┐
            ↓       ↓       ↓
          Admin  Admin   Admin
        (Retail) (Retail)(Retail)
            │
        ┌───┴───┐
        ↓       ↓
    Store_Manager  Store_Manager
        │          │
        ├─ Staff   ├─ Staff
        ├─ Staff   ├─ Staff
        └─ Staff   └─ Staff

═══════════════════════════════════════════════════════════

SIGNUP RULES:
├─ Super Admin: Internal only (ScratchX creates)
├─ Distributor: Only by Super Admin (invite)
├─ Admin: Public OR by Distributor invite
├─ Store Manager: By Admin invite only
└─ Staff: By Store Manager or Admin invite only
```

---

## 1. Super Admin Registration

### 1.1 Initial Setup (ScratchX Internal)

```
SCENARIO: ScratchX company creates first Super Admin

Step 1: Backend/Admin Panel
├─ Create Account manually
├─ Email: admin@scratchx.com
├─ Phone: +91-XXXXX
└─ Send setup link

Step 2: Setup Email Link
├─ User clicks: https://app.scratch.com/setup?token=SETUP_TOKEN
├─ Token valid for: 24 hours
├─ Form: Password + Phone verification
└─ Continue

Step 3: Password Setup
├─ Requirements: Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special
├─ Hash with bcrypt (10 rounds)
├─ Store in Account.password
└─ Continue

Step 4: Phone Verification (OTP)
├─ Send OTP to phone
├─ User enters 6-digit OTP
├─ Verify OTP matches
└─ Mark: phoneVerified = true

Step 5: Email Verification
├─ Send verification email
├─ User clicks email link
├─ Mark: emailVerified = true
└─ Account ready

Step 6: First Login
├─ User logs in with email + password
├─ System detects: First super admin login
├─ Show: Platform onboarding
└─ Redirect: /admin/dashboard

RESULT:
├─ Account status: "Active"
├─ Role: "Super_Admin"
├─ Can now: Create distributors
└─ Email: Confirmation "You're all set!"
```

### 1.2 Creating Additional Super Admins

```
SCENARIO: Existing Super Admin creates another Super Admin

ACCESS CONTROL:
├─ Only Super Admin can access: /admin/users/create-super-admin
├─ Requires: Verification (2FA or new password)
└─ Action: Logged and audited

FLOW:
Step 1: Super Admin navigates to user management
├─ Page: /admin/team/create
├─ Form: Email, Phone, Name
└─ Action button: "Create Super Admin"

Step 2: Validation
├─ Email not already registered?
├─ Phone not already registered?
└─ Continue

Step 3: Account Creation (Backend)
├─ Create Account document:
│  ├─ email
│  ├─ phone
│  ├─ name
│  ├─ role: "Super_Admin"
│  ├─ status: "Pending"
│  └─ createdAt
├─ Generate: Setup token (24 hour expiry)
└─ Send: Setup email with link

Step 4: New Super Admin Setup
├─ Receives: "You've been invited to ScratchX Admin"
├─ Clicks: Setup link
├─ Process: Same as 1.1 (password + phone + email)
└─ Result: Account activated

RESULT:
├─ New Super Admin account active
├─ Can create distributors
├─ Full platform access
└─ Activity logged
```

---

## 2. Distributor Registration

### 2.1 Distributor Invite by Super Admin

```
SCENARIO: Super Admin creates a new distributor account

FLOW:
Step 1: Super Admin creates distributor
├─ Navigate: /admin/distributors/invite
├─ Form:
│  ├─ Email (required)
│  ├─ Phone (required)
│  ├─ Name (required)
│  ├─ Territory/Region (dropdown)
│  ├─ Territory description (optional)
│  └─ Button: "Send Invite"

Step 2: Backend Validation
├─ Email not already used?
├─ Phone not already used?
├─ Territory valid?
└─ Continue

Step 3: Create Invite Record
├─ Collection: Invite
├─ Fields:
│  ├─ email
│  ├─ phone
│  ├─ role: "Distributor"
│  ├─ territory (JSON)
│  ├─ inviteToken: Random 32-char
│  ├─ invitedBy: Super Admin ID
│  ├─ status: "Sent"
│  ├─ sentAt: now()
│  ├─ expiresAt: now() + 7 days
│  └─ createdAt

Step 4: Send Invite Email
├─ Subject: "Join ScratchX as a Distributor"
├─ Body:
│  ├─ Welcome message
│  ├─ Territory assignment
│  ├─ Invite link: https://app.scratch.com/join?token=ABC123
│  ├─ Expiry: "This link expires in 7 days"
│  └─ CTA: "Accept Invite"
└─ Send via email provider

Step 5: Audit Log
├─ action: "distributor_invite_sent"
├─ actor: Super Admin ID
├─ recipient: email
├─ status: "success"
└─ timestamp: now()

RESULT:
├─ Invite in database, status="Sent"
├─ Email delivered to recipient
├─ Super Admin sees in dashboard: "Invite sent"
└─ Distributor receives: Invite email
```

### 2.2 Distributor Accepts Invite

```
SCENARIO: Distributor clicks invite link and registers

FLOW:
Step 1: User clicks invite link
├─ URL: https://app.scratch.com/join?token=ABC123XYZ...
├─ System: Validates token
└─ Continue

Step 2: Token Validation (Backend)
├─ Query: Invite WHERE inviteToken = "ABC123XYZ"
├─ Check: Invite exists?
│  └─→ NO: Show "Invalid invite link"
├─ Check: Invite status = "Sent"?
│  └─→ NO: Show "Invite already accepted or revoked"
├─ Check: expiresAt > now()?
│  └─→ NO: Show "Invite expired. Request new invite."
├─ Check: Email/Phone not already used?
│  └─→ NO: Show "Account already exists"
└─ Continue

Step 3: Show Registration Form
├─ Pre-filled fields:
│  ├─ Email: From invite (read-only)
│  ├─ Phone: From invite (read-only)
│  └─ Name: From invite (editable)
├─ Required fields:
│  ├─ Password (new)
│  ├─ Confirm Password
│  └─ Accept terms & conditions
└─ Submit button: "Create Account"

Step 4: Form Validation (Frontend + Backend)
├─ Password requirements:
│  ├─ Min 8 characters
│  ├─ 1 uppercase letter
│  ├─ 1 lowercase letter
│  ├─ 1 digit
│  └─ 1 special character
├─ Passwords match?
└─ Terms accepted?

Step 5: Create Account (Backend)
├─ Hash password with bcrypt
├─ Create Account document:
│  ├─ email
│  ├─ phone
│  ├─ name
│  ├─ password: hashed
│  ├─ role: "Distributor"
│  ├─ status: "Incomplete_Setup"
│  ├─ distributorProfile: {
│  │  ├─ territory: From invite
│  │  └─ createdAt: now()
│  ├─ emailVerified: false
│  ├─ phoneVerified: false
│  ├─ onboardingStage: "profile_setup"
│  ├─ onboardingCompleted: false
│  └─ createdAt

Step 6: Mark Invite as Accepted
├─ Update Invite:
│  ├─ status: "Accepted"
│  ├─ acceptedByAccountId: New Account ID
│  ├─ acceptedAt: now()
│  └─ save()

Step 7: Phone Verification (OTP)
├─ Send OTP to phone
├─ User enters 6-digit OTP
├─ Verify: Matches?
├─ Update: Account.phoneVerified = true
└─ Continue

Step 8: Email Verification
├─ Send verification email
├─ User clicks link in email
├─ Update: Account.emailVerified = true
└─ Continue

Step 9: Auto-Login & Redirect
├─ Create: JWT accessToken (15 min)
├─ Create: JWT refreshToken (7 days)
├─ Set: httpOnly cookies
├─ Update Account.lastLoginAt = now()
├─ Log: activity = "registration_complete"
└─ Redirect: /onboarding/profile-setup

RESULT:
├─ Account created and verified
├─ Status: "Incomplete_Setup"
├─ Ready for onboarding
├─ Email sent: "Welcome to ScratchX"
└─ Dashboard: Show profile setup form
```

---

## 3. Admin (Retailer) Registration

### 3.1 Public Signup (Self-Registration)

```
SCENARIO: Retail business owner signs up themselves

FLOW:
Step 1: User navigates to signup
├─ URL: https://app.scratch.com/signup
├─ Or: Click "Get Started" on landing page
└─ Show: Registration form

Step 2: Show Signup Form
├─ Fields:
│  ├─ Email (required)
│  ├─ Phone (required)
│  ├─ Business Name (required)
│  ├─ Password (required)
│  └─ Confirm Password
├─ Checkbox: "I agree to terms"
└─ Button: "Create Account"

Step 3: Frontend Validation
├─ Email format valid?
├─ Phone format valid?
├─ Password meets requirements?
├─ Terms accepted?
└─ If all OK: Submit to backend

Step 4: Backend Validation
├─ Email already registered?
│  └─→ YES: Return "Email already in use"
├─ Phone already registered?
│  └─→ YES: Return "Phone already in use"
├─ Password strength OK?
└─ Create Account

Step 5: Create Account (Backend)
├─ Hash password with bcrypt
├─ Create Account document:
│  ├─ email
│  ├─ phone
│  ├─ name: From business name
│  ├─ password: hashed
│  ├─ role: "Admin"
│  ├─ status: "Incomplete_Setup"
│  ├─ emailVerified: false
│  ├─ phoneVerified: false
│  ├─ onboardingStage: "business_setup"
│  ├─ onboardingCompleted: false
│  └─ createdAt

Step 6: Send Verification Emails
├─ Email 1: Verify email address
│  ├─ Contains: Verification link (token expires in 24h)
│  ├─ User clicks link
│  └─ Account.emailVerified = true
├─ Email 2: Welcome email
│  ├─ Contains: Next steps
│  └─ Show onboarding preview

Step 7: Phone Verification (OTP)
├─ Send OTP to phone
├─ User enters 6-digit OTP
├─ Verify: OTP matches
└─ Account.phoneVerified = true

Step 8: Auto-Login & Redirect
├─ Create: JWT tokens
├─ Set: Cookies
├─ Log: activity = "public_signup"
└─ Redirect: /onboarding/business-setup

RESULT:
├─ Account created with status "Incomplete_Setup"
├─ Email & phone verified
├─ User logged in
├─ Redirected to business setup onboarding
└─ Welcome email sent
```

### 3.2 Distributor Invites Admin

```
SCENARIO: Distributor invites an admin/retailer

FLOW:
Step 1: Distributor creates invite
├─ Navigate: /distributor/retailers/invite
├─ Form:
│  ├─ Email (required)
│  ├─ Phone (required)
│  ├─ Business Name (optional)
│  └─ Button: "Send Invite"

Step 2: Create Invite Record
├─ Collection: Invite
├─ Fields:
│  ├─ email
│  ├─ phone
│  ├─ role: "Admin"
│  ├─ businessName: (optional)
│  ├─ distributorId: Current distributor ID
│  ├─ inviteToken: Random 32-char
│  ├─ invitedBy: Distributor ID
│  ├─ status: "Sent"
│  ├─ expiresAt: now() + 7 days
│  └─ createdAt

Step 3: Send Invite
├─ Email: "You're invited to join ScratchX"
├─ Message: "From: Distributor name"
├─ Link: https://app.scratch.com/join?token=ABC123
└─ Expiry: 7 days

Step 4: User Clicks Invite
├─ Same as Section 3.1, but:
│  ├─ Status: "Incomplete_Setup"
│  ├─ distributorId: Set from invite
│  └─ role: "Admin"

Step 5: Onboarding
├─ Step 1: Business Setup
├─ Step 2: Store Setup
├─ Step 3: Plan Selection
├─ Step 4: First Campaign
└─ Dashboard access

RESULT:
├─ Admin account created
├─ Linked to distributor
├─ Ready for business setup
└─ Parent distributor can view in network
```

---

## 4. Store Manager Registration

### 4.1 Invite by Admin

```
SCENARIO: Admin invites store manager

FLOW:
Step 1: Admin creates invite
├─ Navigate: /admin/stores/{storeId}/team
├─ Click: "Invite Manager"
├─ Form:
│  ├─ Email (required)
│  ├─ Phone (required)
│  ├─ Manager Name (required)
│  └─ Button: "Send Invite"

Step 2: Create Invite Record
├─ Fields:
│  ├─ email
│  ├─ phone
│  ├─ role: "Store_Manager"
│  ├─ businessId: Admin's business
│  ├─ storeId: Selected store ID
│  ├─ inviteToken
│  ├─ invitedBy: Admin ID
│  ├─ status: "Sent"
│  └─ expiresAt: +7 days

Step 3: User Accepts Invite
├─ Clicks invite link
├─ Form: Password, name, confirmations
├─ Creates Account:
│  ├─ role: "Store_Manager"
│  ├─ businessId
│  ├─ storeId
│  ├─ status: "Incomplete_Setup"
│  └─ onboardingStage: "store_overview"

Step 4: Onboarding
├─ Show store details
├─ Show active campaigns
├─ Mark: onboardingCompleted = true
└─ Redirect: /store/dashboard

RESULT:
├─ Manager account created
├─ Assigned to specific store
├─ Can manage that store
└─ Cannot see other stores
```

---

## 5. Staff Registration

### 5.1 Invite by Store Manager or Admin

```
SCENARIO: Manager invites staff for redemption

FLOW:
Step 1: Manager creates invite
├─ Navigate: /store/team
├─ Click: "Add Staff Member"
├─ Form:
│  ├─ Email (required)
│  ├─ Phone (required)
│  ├─ Staff Name (required)
│  ├─ Access Level: (dropdown)
│  │  ├─ "Redemption Only"
│  │  ├─ "Can Create Campaigns"
│  │  └─ "Can View Reports"
│  └─ Button: "Send Invite"

Step 2: Create Invite Record
├─ Fields:
│  ├─ email
│  ├─ phone
│  ├─ role: "Staff"
│  ├─ businessId
│  ├─ storeId
│  ├─ staffPermissions: { ...from form }
│  ├─ inviteToken
│  ├─ invitedBy: Manager ID
│  ├─ status: "Sent"
│  └─ expiresAt: +7 days

Step 3: User Accepts Invite
├─ Clicks invite link
├─ Form: Password setup
├─ Creates Account:
│  ├─ role: "Staff"
│  ├─ storeId
│  ├─ businessId
│  ├─ status: "Incomplete_Setup"
│  └─ onboardingStage: "redemption_training"

Step 4: Onboarding
├─ Show: Redemption training video/guide
├─ Show: How to scan QR codes
├─ Show: How to process redemptions
├─ Require: Acknowledgement of training
└─ Mark: onboardingCompleted = true

Step 5: Ready for Work
├─ Redirect: /staff/redemption
├─ Can now: Scan and redeem coupons
└─ Can only: Work from assigned store

RESULT:
├─ Staff account created
├─ Trained on redemption process
├─ Ready to scan and redeem
└─ Limited to assigned store
```

---

## 6. Comparison Table: Who Creates What

| Role | Created By | Method | Invite | Can Self-Register |
|------|-----------|--------|--------|-------------------|
| Super Admin | ScratchX | Manual + Setup Link | Yes (24h) | ❌ No |
| Distributor | Super Admin | Invite | Yes (7d) | ❌ No |
| Admin | Public OR Distributor | Public signup OR Invite | Yes (7d) | ✅ Yes |
| Store Manager | Admin | Invite only | Yes (7d) | ❌ No |
| Staff | Manager/Admin | Invite only | Yes (7d) | ❌ No |

---

## 7. API Endpoints for Signup

### Public Endpoints

```
POST /api/auth/signup
├─ Body: { email, phone, password, businessName }
├─ Validates: Email unique, phone unique, password strong
├─ Creates: Account with status "Incomplete_Setup"
├─ Sends: Verification email
├─ Sends: OTP to phone
├─ Returns: { accessToken, refreshToken, user }
├─ Errors: 400, 409 (duplicate)
└─ Role: Admin only (from public signup)

POST /api/auth/send-otp
├─ Body: { phone }
├─ Generates: 6-digit OTP
├─ Stores: In OTP table (5 min TTL)
├─ Sends: Via SMS provider
├─ Returns: { success: true, message: "OTP sent" }
└─ Errors: 400, 429 (rate limited)

POST /api/auth/verify-otp
├─ Body: { phone, otp }
├─ Validates: OTP matches, not expired
├─ Updates: Account.phoneVerified = true
├─ Returns: { success: true }
└─ Errors: 400, 401

POST /api/invite/join
├─ Query: { token }
├─ Body: { password, name }
├─ Validates: Token valid, not expired, not duplicate
├─ Creates: Account from invite
├─ Updates: Invite.status = "Accepted"
├─ Returns: { accessToken, refreshToken, user }
├─ Errors: 400, 410 (expired), 409 (duplicate)
└─ Role: Any (from invite)

GET /api/invite/validate
├─ Query: { token }
├─ Returns: { valid: true, email, phone, role, businessName, expiresAt }
└─ Errors: 404, 410 (expired)

GET /api/invite/join-page
├─ Query: { token }
├─ Returns: { form, preFilledData, inviteInfo }
└─ Used by: /join page to show invite details
```

### Protected Endpoints (Super Admin Only)

```
POST /api/admin/distributors/invite
├─ Body: { email, phone, name, territory, description }
├─ Creates: Invite record
├─ Sends: Invite email
├─ Returns: { invite, message }
└─ Permission: Super Admin only

POST /api/admin/super-admin/create
├─ Body: { email, phone, name }
├─ Creates: Account with role "Super_Admin"
├─ Sends: Setup email
├─ Returns: { account, setupLinkExpiry }
└─ Permission: Super Admin only (existing)
```

---

## 8. Database Queries & Indexes

### Key Queries for Signup Flow

```javascript
// Check email exists
db.Account.findOne({ email: "user@example.com" })

// Check phone exists
db.Account.findOne({ phone: "+91XXXXXXXXXX" })

// Find invite by token
db.Invite.findOne({ inviteToken: "ABC123..." })

// Get invite with details
db.Invite.findOne({ inviteToken: "..." }).populate('invitedBy')

// Mark invite accepted
db.Invite.updateOne(
  { _id: inviteId },
  { 
    status: "Accepted",
    acceptedByAccountId: accountId,
    acceptedAt: new Date()
  }
)

// Create account from invite
db.Account.insertOne({
  email,
  phone,
  password,
  role,
  businessId,
  storeId,
  status: "Incomplete_Setup",
  // ... other fields
})

// Verify OTP
db.OTP.findOne({ 
  phone, 
  expiresAt: { $gt: new Date() },
  verified: false
})
```

### Recommended Indexes

```javascript
db.Account.createIndex({ email: 1 }, { unique: true })
db.Account.createIndex({ phone: 1 }, { unique: true })
db.Account.createIndex({ role: 1, status: 1 })

db.Invite.createIndex({ inviteToken: 1 }, { unique: true })
db.Invite.createIndex({ email: 1, role: 1 })
db.Invite.createIndex({ status: 1, expiresAt: 1 })

db.OTP.createIndex({ phone: 1 }, { unique: true })
db.OTP.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## 9. Error Handling for Signup

| Case | HTTP | Message | Action |
|------|------|---------|--------|
| Email already exists | 409 | "Email already registered. Try login." | Link to login |
| Phone already exists | 409 | "Phone already registered." | Show phone |
| Weak password | 400 | "Password must have 8+ chars, 1 uppercase, 1 digit, 1 special char" | Highlight requirements |
| Invalid OTP | 401 | "Invalid OTP. Try again." | Allow retry (3 attempts) |
| Invite expired | 410 | "Invite link expired. Request a new invite." | Link to request invite |
| Invite already used | 400 | "This invite has already been accepted." | Show error |
| Invalid token | 404 | "Invite link not found. Please check the link." | Suggest contacting admin |

---

## 10. Security Considerations for Signup

### Input Validation
- Email: RFC 5322 format + deliverability check
- Phone: E.164 format + local validation
- Password: Min 8 chars, complexity requirements
- Name: No SQL injection, XSS protection

### Password Storage
- Hash algorithm: bcrypt with 10 rounds
- Never store plain text
- Never send password in email

### Token Security
- Invite tokens: Cryptographically random (32 chars)
- Setup tokens: Cryptographically random
- OTP tokens: Hashed before storage
- All tokens: Short TTL (24h for setup, 5 min for OTP, 7d for invite)

### Email/SMS Security
- Use HTTPS for all links
- Include token in URL (not in email text)
- Rate limit: 1 email per minute per user
- Unsubscribe option for all transactional emails

### Privacy
- Collect only necessary data
- Don't store unnecessary information
- GDPR compliant data handling
- Allow data deletion on request

