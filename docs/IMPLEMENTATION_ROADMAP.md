# ScratchX Implementation Roadmap - Detailed

## Current State vs. Target State

### Current Implementation
- ✅ Cookie-based auth with role cookies
- ✅ Basic RBAC with role checking
- ❌ No OTP support
- ❌ No invite system
- ❌ No onboarding flows
- ❌ No account status handling
- ❌ No activity logging

### Target Implementation
- ✅ JWT + OTP authentication
- ✅ Comprehensive RBAC with permissions table
- ✅ Multi-method login (OTP, Password, Google)
- ✅ Invite system with 7-day expiry
- ✅ Role-specific onboarding workflows
- ✅ Account status lifecycle management
- ✅ Complete activity audit logging
- ✅ Security features (2FA, device binding, rate limiting)

---

## Phased Implementation Plan

### Phase 0: Database & Schema Updates (1 week)
**Goal**: Prepare database for new requirements

**Tasks:**
1. Create new Account schema with:
   - status field (Pending, Active, Suspended, Incomplete_Setup, Deactivated)
   - onboarding fields
   - device & security fields
   - activity tracking fields

2. Create Business collection
3. Create Store collection
4. Create Invite collection
5. Create Permission lookup table
6. Create ActivityLog collection
7. Create OTP temporary table
8. Add all indexes

**Dependencies**: None
**Effort**: 20 hours
**Output**: 7 new MongoDB collections, migration script

---

### Phase 1A: Core Authentication (2 weeks)
**Goal**: Replace cookie auth with JWT + OTP

**Tasks:**

#### 1.1 SMS OTP Integration
- Choose provider: Twilio / AWS SNS
- Create OTP service wrapper
- Implement OTP generation, validation, expiry
- Add rate limiting per phone number
- Create OTP tests

**Files to create:**
- `services/otpService.js`
- `tests/services/otpService.test.js`

**Output**: OTP system working end-to-end

---

#### 1.2 Password Hashing & Validation
- Implement bcrypt hashing (10 rounds)
- Create password validation rules:
  - Min 8 chars
  - 1 uppercase, 1 lowercase, 1 digit, 1 special char
  - Not matching last 3 passwords
- Create password comparison function
- Add password change endpoint

**Files:**
- Update `lib/auth.js`
- Create `utils/passwordUtils.js`

---

#### 1.3 Google OAuth Integration (Admin Only)
- Setup Google Cloud project
- Create OAuth flow: redirect → callback → token
- Limit to Admin role only
- Map Google email to account

**Files:**
- Create `lib/googleOAuth.js`
- Create `app/api/auth/google-callback/route.js`

**Output**: 3 login methods working (OTP, Password, Google)

---

#### 1.4 JWT Token System Upgrade
- Replace existing JWT with:
  - accessToken: 15 min expiry
  - refreshToken: 7 days expiry
- Implement token refresh endpoint
- Add token validation middleware
- Invalidate tokens on logout

**Files:**
- Update `lib/jwt.js` (Phase 1 work)
- Create `app/api/auth/refresh/route.js`
- Update `middleware.js`

**Output**: Stateless authentication with refresh capability

---

#### 1.5 Account Status Lifecycle
- Implement status checking in login:
  - Pending: Can't login, show accept invite
  - Active: Allow login
  - Suspended: Block login, show support message
  - Incomplete_Setup: Redirect to onboarding
  - Deactivated: Block login permanently

**Files:**
- Create `services/accountService.js`
- Update login route

**Output**: Account status controls all access

---

### Phase 1B: Authorization & Permissions (2 weeks)
**Goal**: Implement role-based access control with permissions

**Tasks:**

#### 2.1 Permission System Setup
- Create Permission collection with all actions:
  - Campaign: create, read, update, delete, publish
  - Store: create, read, update, manage_staff
  - Redemption: view, scan, redeem
  - Reports: view, export
  - Settings: manage, invite_users
  
- Create role-permission mappings
- Seed database with permissions

**Files:**
- Create `lib/permissions.js` (enhanced)
- Create `seeds/permissions.seed.js`

**Output**: Permissions database fully seeded and queryable

---

#### 2.2 Permission Checking Middleware
- Implement middleware that checks:
  1. JWT validity
  2. Account status
  3. Role permission
  4. Business/Store access
  5. Feature access (subscription)

- Add before each protected route

**Files:**
- Create `middleware/checkPermission.js`
- Update `middleware.js`

**Output**: Automatic permission checking on all routes

---

#### 2.3 Business & Store Hierarchy
- Implement account → business → store relationship
- Verify user can only access assigned resources
- Add hierarchy validation on every DB query

**Files:**
- Update `Account`, `Business`, `Store` models
- Add validation helpers

**Output**: Full multi-tenancy enforcement

---

### Phase 2A: Invite System (1.5 weeks)
**Goal**: Complete invite flow for non-admin roles

**Tasks:**

#### 3.1 Invite Creation & Validation
- Admin can send invites for: Distributor, Store_Manager, Staff
- Invite contains: email/phone, role, business, store, expiry
- Auto-generate unique token (32 char random)
- Set expiry to +7 days

**API:**
- POST /api/invite/send
- GET /api/invite/list
- POST /api/invite/{id}/resend
- POST /api/invite/{id}/revoke

**Files:**
- Create `services/inviteService.js`
- Create invite API routes

**Output**: Admins can create and manage invites

---

#### 3.2 Invite Acceptance Flow
- User clicks invite link with token
- Validate token, check expiry, check not already accepted
- Show registration form (pre-filled email/phone)
- Create new Account from invite
- Link Account to Business/Store
- Redirect to role-specific onboarding

**API:**
- GET /api/invite/validate?token=ABC
- POST /api/invite/join

**Files:**
- Create `app/(client)/join/page.js`
- Create `app/api/invite/validate/route.js`
- Update `app/api/invite/join/route.js`

**Output**: End users can accept invites and create accounts

---

#### 3.3 Invite Dashboard
- Show all sent invites with status
- Filter by role, status, date
- Resend/revoke options
- View acceptance history

**UI:**
- Create `/admin/invites/page.js`
- List, resend, revoke components

**Output**: Admin dashboard for invite management

---

### Phase 2B: Onboarding Flows (2 weeks)
**Goal**: Role-specific first-time login journeys

**Tasks:**

#### 4.1 Admin (Retailer) Onboarding
```
Step 1: Business Setup → Create Business
Step 2: Store Setup → Create Store
Step 3: Plan Selection → Create Subscription
Step 4: First Campaign (Optional) → Create Campaign
```

**Files:**
- Create `app/(onboarding)/business-setup/page.js`
- Create `app/(onboarding)/store-setup/page.js`
- Create `app/(onboarding)/plan-selection/page.js`
- Create `app/(onboarding)/first-campaign/page.js`
- Create API routes for each step
- Create `services/onboardingService.js`

**Output**: Guided admin onboarding with business setup

---

#### 4.2 Distributor Onboarding
```
Step 1: Profile Setup → Collect territory info
Step 2: Territory Overview → Show stats
Step 3: Onboarding Guide → How to invite
```

**Files:**
- Create onboarding pages for distributor
- Create profile update service

**Output**: Distributor can complete onboarding in 5 minutes

---

#### 4.3 Store Manager Onboarding
```
Step 1: Store Overview → Show store details & campaigns
```

**Files:**
- Create onboarding page
- Fetch store & campaign data

**Output**: Manager sees their store info immediately

---

#### 4.4 Staff Onboarding
```
Step 1: Redemption Training → Show tutorial
Step 2: Redemption Panel Ready → Can start scanning
```

**Files:**
- Create training page
- Create redemption panel page

**Output**: Staff can start redemption immediately

---

### Phase 3: Security & Advanced Features (1.5 weeks)
**Goal**: Enterprise security features

**Tasks:**

#### 5.1 Two-Factor Authentication (Super Admin Only)
- Generate TOTP secret
- QR code for authenticator apps
- Backup codes generation
- Verify 6-digit code on login

**Files:**
- Create `lib/totpService.js`
- Create 2FA setup/manage endpoints

**Output**: Super Admin has 2FA option

---

#### 5.2 Device Binding for Staff
- Generate device ID from user agent + IP
- Allow staff to redeem from whitelisted devices
- Alert on new device login

**Files:**
- Create `lib/deviceService.js`
- Update redemption route

**Output**: Staff can only redeem from trusted devices

---

#### 5.3 Login Alerts & Session Management
- Send email on new login
- Show active sessions
- Allow revoke sessions
- Max 3 sessions per user

**Files:**
- Create session management service
- Create `app/settings/devices/page.js`

**Output**: Users can monitor and control active sessions

---

#### 5.4 Rate Limiting Enhanced
- Implement Redis-based rate limiting
- Login attempts: 5/min per account
- OTP attempts: 3 per OTP
- OTP sending: 1/min per phone
- API calls: 100/min per user

**Files:**
- Update `middleware/rateLimiter.js`
- Add rate limit service

**Output**: All endpoints protected from brute force

---

### Phase 4: Activity Logging & Monitoring (1 week)
**Goal**: Complete audit trail

**Tasks:**

#### 6.1 Activity Logging System
- Log all user actions:
  - Login/logout
  - Permission denials
  - Data changes
  - Configuration changes
  - Admin actions

**Files:**
- Create `services/auditService.js`
- Add logging to all key endpoints

---

#### 6.2 Activity Dashboard
- View activity logs with filters
- Search by user, action, date
- Export to CSV
- Real-time admin alerts

**Files:**
- Create `app/admin/activity-logs/page.js`

**Output**: Complete audit trail for compliance

---

### Phase 5: Testing & Optimization (1 week)
**Goal**: Production-ready system

**Tasks:**

#### 7.1 Comprehensive Testing
- Unit tests for all services
- Integration tests for auth flows
- E2E tests for critical paths
- Security vulnerability scanning

**Output**: >80% test coverage

---

#### 7.2 Performance Optimization
- Cache permission lookups (Redis)
- Cache account data (Redis)
- Optimize DB queries
- Add database query monitoring

**Output**: <100ms latency on auth checks

---

#### 7.3 Documentation
- API documentation (OpenAPI/Swagger)
- User guides for each role
- Admin onboarding guide
- Security best practices

**Output**: Complete documentation

---

## Implementation Sequence (Recommended Order)

### Week 1-2: Phase 0 (Database)
- Create all collections
- Set up indexes
- Create migrations

### Week 3-4: Phase 1A (Core Auth)
- OTP service
- Password hashing
- Google OAuth
- JWT tokens
- Account status

### Week 5-6: Phase 1B (Permissions)
- Permission system
- Permission middleware
- Business/Store hierarchy

### Week 7-8: Phase 2A (Invites)
- Invite service
- Accept flow
- Invite dashboard

### Week 9-10: Phase 2B (Onboarding)
- Admin onboarding
- Distributor onboarding
- Manager onboarding
- Staff onboarding

### Week 11-12: Phase 3-5 (Security + Testing)
- 2FA, device binding, sessions
- Activity logging
- Testing & optimization

---

## Risk Mitigation

### Critical Risks
| Risk | Mitigation |
|------|-----------|
| Account migration (old to new schema) | Create migration script, test on backup, rollback plan |
| Breaking existing functionality | Feature flags for gradual rollout, keep old system running |
| OTP provider outages | Fallback to password auth |
| Performance degradation | Cache heavily, load test at each phase |
| Security vulnerabilities | Security audit, penetration testing before launch |

### Mitigation Strategy
1. Run new auth system parallel to old system for 2 weeks
2. Use feature flags to control which auth method each user uses
3. Gradual rollout: 10% → 50% → 100%
4. Monitor error rates and performance at each step
5. Keep rollback script ready at all times

---

## Success Metrics

After implementation, measure:
- **Login success rate**: Target >99%
- **Onboarding completion rate**: Target >85%
- **Auth latency**: Target <100ms
- **Security incidents**: Target 0
- **Test coverage**: Target >80%
- **User satisfaction**: Target >4.5/5 for onboarding UX

---

## Resource Requirements

**Backend Developer**: 1 FTE (8-10 weeks)
**Frontend Developer**: 0.5 FTE (8-10 weeks for UI)
**QA/Tester**: 0.5 FTE (concurrent)
**DevOps**: 0.25 FTE (deployment, monitoring)
**Product Manager**: 0.25 FTE (requirements, decisions)

**Total: ~800-1000 hours of development**

---

## Deployment Strategy

### Pre-Deployment
- [ ] Code review by 2+ engineers
- [ ] Security audit (internal + external)
- [ ] Load testing (1000 concurrent users)
- [ ] Backup entire database
- [ ] Prepare rollback script
- [ ] Notify support team
- [ ] Create deployment runbook

### Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Manual regression testing
- [ ] Performance benchmarking
- [ ] Deploy to production (off-peak hours)
- [ ] Monitor error rates & latency
- [ ] Scale infrastructure as needed

### Post-Deployment
- [ ] Monitor for 24 hours continuously
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Document lessons learned
- [ ] Celebrate successful launch! 🎉

---

## Next Steps

**Option A (Recommended)**: Start with Phase 0 & 1A immediately
- Setup database schema this week
- Implement OTP + JWT next week
- Have basic auth working in 2 weeks

**Option B**: Full planning first
- Refine requirements with stakeholders
- Create detailed technical spec for each phase
- Plan resource allocation
- Set up development environment

**Option C**: MVP approach
- Implement only Phase 0 + 1A + 2A
- Launch with OTP + Invite
- Add onboarding flows in Phase 2
- Add security features later

**Which approach interests you?**
