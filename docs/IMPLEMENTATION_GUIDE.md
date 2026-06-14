# ScratchX Implementation Guide - Complete

## Executive Summary

This is a complete guide to implementing ScratchX authentication and signup system. The implementation is divided into 6 phases across 12 weeks.

**Key Features Being Implemented:**
- ✅ Multi-role authentication (Super Admin, Distributor, Admin, Store Manager, Staff)
- ✅ Multiple login methods (OTP, Password, Google)
- ✅ Role-specific signup flows (Public + Invite-only)
- ✅ Role-based access control with permissions
- ✅ Guided onboarding per role
- ✅ Complete security framework (2FA, device binding, rate limiting)
- ✅ Activity logging and audit trail

---

## Phase Breakdown & Timeline

### Phase 0: Database Setup (1 week)
**Objective**: Create all MongoDB collections and indexes needed for authentication

**Deliverables**:
- ✅ Account collection with comprehensive schema
- ✅ Business collection (for multi-tenancy)
- ✅ Store collection (for location-based access)
- ✅ Invite collection (for invite management)
- ✅ Permission collection (for RBAC)
- ✅ ActivityLog collection (for audit trail)
- ✅ OTP temporary collection (for OTP storage)
- ✅ All necessary indexes

**Files to Create**:
```
models/
├── accountModel.js (update)
├── businessModel.js (new)
├── storeModel.js (new)
├── inviteModel.js (new)
├── permissionModel.js (new)
├── activityLogModel.js (new)
├── otpModel.js (new)

migrations/
├── 001_initial_auth_schema.js
├── 002_create_indexes.js
├── 003_seed_permissions.js
```

**Key Schema Updates**:
1. Account: Add status, onboarding fields, device tracking
2. Business: New collection for business entity
3. Store: New collection for store management
4. Invite: New collection for invite system
5. Permission: New lookup collection for RBAC
6. ActivityLog: New collection for audit trail
7. OTP: New temporary collection for OTP management

**Success Criteria**:
- All 7 collections exist in MongoDB
- All indexes created successfully
- Permissions seeded with 20+ actions
- Migration scripts working

---

### Phase 1A: Core Authentication (2 weeks)

#### Task 1.1: OTP Infrastructure
**Objective**: Implement SMS-based OTP system

**SMS Provider Setup**:
- Choose provider: Twilio, AWS SNS, or Nexmo
- Get API credentials
- Create integration wrapper

**Implementation**:
```
lib/
├── otpService.js (new)
└── smsProvider.js (new)

app/api/auth/
├── send-otp/route.js (new)
└── verify-otp/route.js (new)
```

**Features**:
- Generate 6-digit OTP
- Send via SMS
- Validate OTP
- Rate limiting (1 per minute)
- Expiry (5 minutes)
- Max 3 attempts

**Tests**:
- OTP generation uniqueness
- OTP validation accuracy
- Rate limiting enforcement
- Expiry handling

---

#### Task 1.2: Password Management
**Objective**: Implement secure password handling

**Implementation**:
```
utils/
├── passwordUtils.js (new)

lib/
└── passwordValidation.js (new)
```

**Features**:
- Password hashing (bcrypt, 10 rounds)
- Password validation rules
  - Min 8 characters
  - 1 uppercase, 1 lowercase, 1 digit, 1 special char
  - Not in last 3 passwords
- Password strength meter
- Password reset flow

**Tests**:
- Hashing consistency
- Validation rules enforcement
- Strength calculation
- History checking

---

#### Task 1.3: JWT Token System
**Objective**: Implement JWT-based authentication

**Implementation**:
```
lib/
├── jwt.js (update from Phase 1)
├── tokenService.js (new)

middleware/
└── verifyToken.js (new)

app/api/auth/
├── login/route.js (update)
├── logout/route.js (update)
└── refresh-token/route.js (new)
```

**Features**:
- Access token (15 min TTL)
- Refresh token (7 days TTL)
- Token refresh endpoint
- Token invalidation on logout
- Secure httpOnly cookies
- CSRF protection

**Tests**:
- Token generation
- Token verification
- Refresh functionality
- Expiry handling

---

#### Task 1.4: Google OAuth Integration
**Objective**: Add Google login for Super Admin

**Google Setup**:
- Create Google Cloud project
- Setup OAuth credentials
- Configure redirect URI
- Get client ID & secret

**Implementation**:
```
lib/
└── googleOAuth.js (new)

app/api/auth/
└── google-callback/route.js (new)

app/(auth)/login/
└── GoogleButton.jsx (new - frontend)
```

**Features**:
- OAuth flow
- Email mapping
- Role restriction (Admin only)
- Account creation/linking

**Tests**:
- OAuth callback handling
- Email mapping
- Role enforcement
- Error handling

---

### Phase 1B: Signup Flows (2 weeks)

#### Task 2.1: Super Admin Registration
**Objective**: Internal setup for Super Admin

**Implementation**:
```
app/api/admin/
├── create-super-admin/route.js (new)
└── setup-admin/route.js (new)

app/(setup)/
└── admin-setup/page.js (new)
```

**Flow**:
1. Backend creates account manually
2. Sends setup email with 24h token
3. User sets password + verifies phone + verifies email
4. Auto-login after verification
5. Redirect to admin dashboard

**Features**:
- Manual account creation (backend only)
- Setup email with token
- Password validation
- Phone verification (OTP)
- Email verification (link)
- Auto-login after setup

---

#### Task 2.2: Distributor Registration (Invite-Only)
**Objective**: Super Admin invites distributors

**Implementation**:
```
app/api/admin/distributors/
└── invite/route.js (new)

app/api/invite/
├── validate/route.js (new)
└── join/route.js (new)

app/(client)/join/
└── page.js (new)

services/
└── inviteService.js (new)
```

**Flow**:
1. Super Admin creates invite
2. Invite email sent with link
3. User clicks link, validates token
4. Shows registration form
5. User sets password
6. Phone & email verification
7. Account created
8. Redirect to onboarding

**Features**:
- Invite creation with token
- Token validation
- Email & phone verification
- Password setup
- Auto-linking to distributor

---

#### Task 2.3: Admin Registration (Public + Invite)
**Objective**: Allow public signup and distributor invites

**Implementation**:
```
app/(auth)/signup/
└── page.js (update/new)

app/(client)/join/
└── page.js (handles invites)

app/api/auth/
└── signup/route.js (update)

services/
└── signupService.js (new)
```

**Flow**:
**Public Signup**:
1. User fills signup form
2. Validation (email/phone unique)
3. Account created, status = "Incomplete_Setup"
4. Verification emails & OTP
5. Redirect to onboarding

**Invite Signup**:
1. Same as Task 2.2, but role = Admin
2. No businessId initially
3. Redirect to business setup onboarding

**Features**:
- Public signup form
- Email/phone uniqueness check
- Verification process
- Password validation

---

#### Task 2.4: Store Manager & Staff Registration
**Objective**: Admin/Manager invites for team members

**Implementation**:
```
app/api/invite/
├── send/route.js (new - generic)
└── join/route.js (update to handle all roles)

app/(client)/join/
└── page.js (update to handle all roles)
```

**Flow**:
1. Admin/Manager navigates to invite page
2. Fills invite form (email, phone, role)
3. Creates invite record
4. Sends email
5. User clicks link
6. Registration form
7. Account created with role & assignments
8. Redirect to role-specific onboarding

**Features**:
- Multi-role invite creation
- Business/Store assignment
- Permission assignment (for staff)
- Flexible onboarding paths

---

### Phase 1C: Permissions & Authorization (1.5 weeks)

#### Task 3.1: Permission System Setup
**Objective**: Create RBAC with permission matrix

**Implementation**:
```
lib/
├── permissions.js (update)
├── rbac.js (new)

services/
└── permissionService.js (new)

seeds/
└── permissions.seed.js (new)
```

**Permissions to Define** (50+ total):
- Campaign: create, read, update, delete, publish, pause, analytics
- Store: read, update, manage
- Staff: create, read, update, delete, assign_role
- Coupon: create, read, redeem, view_analytics
- Report: view, export
- Settings: manage, invite_users
- Subscription: manage, upgrade, downgrade
- Admin: full access

**Role Permissions Matrix**:
```
Super Admin    → All permissions
Distributor    → Manage retailers, view analytics
Admin          → Full business management
Store Manager  → Manage store, staff, campaigns
Staff          → Redemption only (or custom)
```

---

#### Task 3.2: Permission Checking Middleware
**Objective**: Enforce permissions on all API endpoints

**Implementation**:
```
middleware/
├── checkPermission.js (new)
├── verifyBusinessAccess.js (new)
└── verifyStoreAccess.js (new)
```

**Features**:
- JWT verification
- Account status check
- Role permission check
- Business/Store hierarchy check
- Subscription feature check
- Activity logging

**Usage**:
```javascript
// On every protected route
export async function POST(request) {
  // Check permission
  const canCreate = await checkPermission(userId, 'campaign:create');
  if (!canCreate) return errorResponse(403, 'Permission denied');
  
  // Process request
}
```

---

#### Task 3.3: Business & Store Hierarchy
**Objective**: Enforce multi-tenancy

**Implementation**:
```
services/
├── businessService.js (new)
├── storeService.js (new)
└── hierarchyService.js (new)
```

**Features**:
- Account → Business relationship
- Business → Store relationships
- Access validation on every query
- Scope queries to user's business/store

**Example**:
```javascript
// Get only user's stores
const stores = await Store.find({
  businessId: user.businessId
});

// Get only user's campaigns
const campaigns = await Campaign.find({
  $or: [
    { businessId: user.businessId },
    { storeId: user.storeId }
  ]
});
```

---

### Phase 2: Onboarding Flows (2 weeks)

#### Task 4.1: Admin Onboarding
**Objective**: Guide new admins through setup

**Flow**:
1. **Business Setup** - Create/update business info
2. **Store Setup** - Create store, address, hours
3. **Plan Selection** - Choose trial/paid plan
4. **First Campaign** (Optional) - Create sample campaign

**Implementation**:
```
app/(onboarding)/
├── business-setup/page.js
├── store-setup/page.js
├── plan-selection/page.js
└── first-campaign/page.js

services/
└── onboardingService.js (new)
```

**Features**:
- Form validation
- Progress tracking
- Save draft functionality
- Skip optional steps
- Auto-redirect based on status

---

#### Task 4.2: Distributor Onboarding
**Objective**: Quick distributor setup

**Flow**:
1. **Profile Setup** - Territory, contact info
2. **Territory Overview** - Show KPIs
3. **Onboarding Guide** - How to invite retailers

**Implementation**:
```
app/(onboarding)/distributor/
├── profile-setup/page.js
├── territory-overview/page.js
└── onboarding-guide/page.js
```

---

#### Task 4.3: Store Manager & Staff Onboarding
**Objective**: Minimal onboarding for team members

**Flow**:
- **Manager**: Show store overview, active campaigns
- **Staff**: Show redemption training, then redemption panel

**Implementation**:
```
app/(onboarding)/
├── store-manager/overview/page.js
└── staff/redemption-training/page.js
```

---

### Phase 3: Security & Advanced Features (1.5 weeks)

#### Task 5.1: Two-Factor Authentication
**Objective**: 2FA for Super Admin

**Implementation**:
```
lib/
└── totpService.js (new)

app/api/auth/
├── setup-2fa/route.js (new)
├── verify-2fa/route.js (new)
└── backup-codes/route.js (new)

app/settings/security/
└── 2fa/page.js (new)
```

**Features**:
- QR code generation
- TOTP verification
- Backup codes
- Recovery options

---

#### Task 5.2: Device Binding
**Objective**: Restrict staff redemption to trusted devices

**Implementation**:
```
lib/
└── deviceService.js (new)

app/api/device/
├── register/route.js (new)
└── list/route.js (new)

app/settings/devices/
└── page.js (new)
```

**Features**:
- Device fingerprinting
- Device registration
- Session management
- Device revocation

---

#### Task 5.3: Activity Logging
**Objective**: Audit trail for all actions

**Implementation**:
```
services/
└── auditService.js (new)

app/admin/activity-logs/
└── page.js (new)
```

**Features**:
- Log all authentication events
- Log permission checks
- Log data modifications
- Searchable activity history
- Export to CSV

---

#### Task 5.4: Rate Limiting
**Objective**: DDoS & brute force protection

**Implementation**:
```
middleware/
└── rateLimiter.js (update from Phase 1)

lib/
└── rateLimitService.js (new)
```

**Limits**:
- Login: 5 attempts/min per account
- OTP: 3 attempts per OTP
- OTP send: 1 per minute per phone
- API: 100 calls/min per user
- Anonymous: 20 calls/min per IP

---

### Phase 4: Testing & QA (1 week)

#### Task 6.1: Unit Tests
**Objective**: >80% code coverage

**Tests**:
- OTP service
- Password utilities
- JWT utilities
- Permission checking
- Role detection
- Invite validation

---

#### Task 6.2: Integration Tests
**Objective**: Test complete flows

**Scenarios**:
- Complete signup flow for each role
- Login with all methods
- Permission checking on restricted endpoints
- Onboarding progression
- Invite acceptance

---

#### Task 6.3: E2E Tests
**Objective**: Browser-based testing

**Scenarios**:
- Admin: Signup → Business Setup → First Campaign → Create Coupon
- Distributor: Accept Invite → Profile Setup → Invite Retailer
- Staff: Accept Invite → Redemption Training → Scan Coupon

---

#### Task 6.4: Security Testing
**Objective**: Identify vulnerabilities

**Tests**:
- SQL injection attempts
- XSS vulnerabilities
- CSRF protection
- Token tampering
- Rate limit bypass
- Permission escalation

---

## Technology Stack

### Backend
- **Framework**: Next.js 16
- **Runtime**: Node.js 18+
- **Database**: MongoDB 5.0+
- **Cache**: Redis 6.0+
- **Password Hashing**: bcrypt 10 rounds
- **JWT**: jsonwebtoken
- **Validation**: Zod
- **OTP**: node-otp or custom
- **SMS**: Twilio SDK

### Frontend
- **Framework**: React 19
- **Auth State**: zustand or Context API
- **Forms**: react-hook-form + Zod
- **UI**: Tailwind CSS
- **HTTP**: axios or fetch

### DevOps
- **Deployment**: Vercel or Railway
- **Database Hosting**: MongoDB Atlas
- **Cache Hosting**: Redis Cloud
- **Monitoring**: Sentry + DataDog
- **Logging**: CloudWatch

---

## File Structure After Implementation

```
scratchx/
├── app/
│   ├── (auth)/
│   │   ├── login/page.js
│   │   └── signup/page.js
│   ├── (onboarding)/
│   │   ├── business-setup/page.js
│   │   ├── store-setup/page.js
│   │   ├── plan-selection/page.js
│   │   └── first-campaign/page.js
│   ├── (client)/
│   │   └── join/page.js (invite join)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js
│   │   │   ├── signup/route.js
│   │   │   ├── logout/route.js
│   │   │   ├── send-otp/route.js
│   │   │   ├── verify-otp/route.js
│   │   │   ├── refresh-token/route.js
│   │   │   └── google-callback/route.js
│   │   ├── invite/
│   │   │   ├── send/route.js
│   │   │   ├── join/route.js
│   │   │   └── validate/route.js
│   │   ├── admin/
│   │   │   └── create-super-admin/route.js
│   │   └── device/
│   │       ├── register/route.js
│   │       └── list/route.js
│   ├── admin/
│   │   ├── dashboard/page.js
│   │   ├── distributors/page.js
│   │   ├── activity-logs/page.js
│   │   └── users/page.js
│   ├── distributor/
│   │   ├── dashboard/page.js
│   │   └── retailers/page.js
│   ├── store/
│   │   ├── dashboard/page.js
│   │   ├── team/page.js
│   │   └── campaigns/page.js
│   ├── settings/
│   │   ├── profile/page.js
│   │   ├── security/page.js
│   │   └── devices/page.js
│   ├── layout.js
│   └── middleware.js
│
├── models/
│   ├── accountModel.js
│   ├── businessModel.js
│   ├── storeModel.js
│   ├── inviteModel.js
│   ├── permissionModel.js
│   ├── activityLogModel.js
│   └── otpModel.js
│
├── lib/
│   ├── redis.js
│   ├── cache.js
│   ├── jwt.js
│   ├── tokenService.js
│   ├── auth.js
│   ├── permissions.js
│   ├── rbac.js
│   ├── otpService.js
│   ├── smsProvider.js
│   ├── googleOAuth.js
│   ├── totpService.js
│   ├── deviceService.js
│   └── connectDB.js
│
├── services/
│   ├── signupService.js
│   ├── inviteService.js
│   ├── onboardingService.js
│   ├── permissionService.js
│   ├── businessService.js
│   ├── storeService.js
│   ├── hierarchyService.js
│   ├── auditService.js
│   ├── rateLimitService.js
│   └── passwordService.js
│
├── middleware/
│   ├── verifyToken.js
│   ├── checkPermission.js
│   ├── verifyBusinessAccess.js
│   ├── verifyStoreAccess.js
│   ├── rateLimiter.js
│   ├── validateRequest.js
│   └── auditLog.js
│
├── utils/
│   ├── validators.js
│   ├── passwordUtils.js
│   ├── errorHandler.js
│   └── responseFormatter.js
│
├── tests/
│   ├── unit/
│   │   ├── otpService.test.js
│   │   ├── passwordUtils.test.js
│   │   ├── jwt.test.js
│   │   └── rbac.test.js
│   ├── integration/
│   │   ├── signup-flow.test.js
│   │   ├── login-flow.test.js
│   │   └── permission-check.test.js
│   └── e2e/
│       ├── admin-signup.spec.js
│       ├── distributor-flow.spec.js
│       └── staff-redemption.spec.js
│
├── seeds/
│   ├── permissions.seed.js
│   ├── plans.seed.js
│   └── super-admin.seed.js
│
├── migrations/
│   ├── 001_initial_auth_schema.js
│   ├── 002_create_indexes.js
│   └── 003_seed_permissions.js
│
├── docs/
│   ├── ARCHITECTURE.md ✅
│   ├── SIGNUP_FLOWS.md ✅
│   ├── IMPLEMENTATION_GUIDE.md (this file)
│   ├── IMPLEMENTATION_ROADMAP.md ✅
│   ├── API.md (OpenAPI spec)
│   └── SECURITY.md
│
├── .env.example
├── package.json
└── jest.config.js
```

---

## Success Criteria & Metrics

### Phase 0
- [ ] All 7 collections created
- [ ] All indexes working
- [ ] Permissions seeded
- [ ] Migrations tested

### Phase 1A
- [ ] OTP system fully working
- [ ] Login with all methods
- [ ] All auth tests passing
- [ ] <100ms auth latency

### Phase 1B
- [ ] All signup flows working
- [ ] All roles can register
- [ ] Email/SMS sent correctly
- [ ] >90% signup completion

### Phase 1C
- [ ] Permission system tested
- [ ] RBAC enforced on all endpoints
- [ ] Permission matrix complete
- [ ] No permission bypass possible

### Phase 2
- [ ] All onboarding flows complete
- [ ] >85% onboarding completion
- [ ] Progress tracking working
- [ ] All role-specific paths correct

### Phase 3
- [ ] 2FA working for Super Admin
- [ ] Device binding for Staff
- [ ] Activity logging complete
- [ ] Rate limiting enforced

### Phase 4
- [ ] >80% test coverage
- [ ] All E2E tests passing
- [ ] Security audit passed
- [ ] No critical vulnerabilities

---

## Deployment Checklist

**Pre-Deployment** (24 hours before)
- [ ] Code reviewed by 2+ engineers
- [ ] All tests passing (>80% coverage)
- [ ] Security audit completed
- [ ] Database backup taken
- [ ] Rollback script tested

**Deployment** (off-peak hours)
- [ ] Deploy to staging
- [ ] Run full regression tests
- [ ] Load test (1000 concurrent users)
- [ ] Deploy to production
- [ ] Monitor for 24 hours

**Post-Deployment** (7 days)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Plan improvements

---

## Resource Allocation

| Role | Effort | Duration |
|------|--------|----------|
| Backend Engineer | 600 hours | 12 weeks |
| Frontend Engineer | 300 hours | 10 weeks |
| QA Engineer | 150 hours | 8 weeks |
| DevOps Engineer | 50 hours | 6 weeks |
| Product Manager | 100 hours | 12 weeks |
| **Total** | **1200 hours** | **12 weeks** |

---

## Next Steps

**Recommended Approach**:

1. **Review & Approve** (This week)
   - Review all 3 documents (ARCHITECTURE, SIGNUP_FLOWS, IMPLEMENTATION_GUIDE)
   - Get stakeholder sign-off
   - Clarify any requirements

2. **Phase 0 Start** (Week 1)
   - Create database schema
   - Set up MongoDB collections
   - Create migrations

3. **Phase 1A Start** (Week 2)
   - Begin OTP infrastructure
   - Implement JWT system
   - Add password hashing

4. **Parallel: Frontend** (Week 2)
   - Create login page
   - Create signup page
   - Create join (invite) page

5. **Testing & QA** (Throughout)
   - Unit tests after each task
   - Integration tests after each phase
   - E2E tests after complete flows

---

## Questions & Clarifications Needed

1. **OTP Provider**: Which SMS provider to use? (Twilio, AWS SNS, Nexmo)
2. **Email Provider**: Which email service? (SendGrid, AWS SES, Mailgun)
3. **Deployment Target**: Vercel, Railway, or custom EC2?
4. **Database Hosting**: MongoDB Atlas or self-hosted?
5. **Timeline**: Can we do 12 weeks? Can we accelerate to 8 weeks?
6. **Team**: Who are the engineers? What are their skills?
7. **QA**: In-house or outsourced testing?

---

## Approved? Ready to Proceed?

Once you approve this implementation guide, we can:

**Option A**: Create a detailed Phase 0 plan (database setup)
**Option B**: Create a detailed Phase 1 plan (authentication)
**Option C**: Start implementing Phase 0 immediately in a worktree
**Option D**: Discuss & refine requirements further

**Which would you prefer?** 🚀
