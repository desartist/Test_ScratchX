# 🔧 API BACKEND VALIDATION & INTEGRATION PLAN

**Status:** Phase 5 - API Testing & Database Integration Validation  
**Date:** May 26, 2026  
**Focus:** Backend APIs only (No UI/React Design)

---

## 📊 CURRENT STATUS

### Test Results Summary
- **Total Tests:** 137
- **Passing:** 123 ✅
- **Failing:** 14 ⚠️ (MongoDB Memory Server timeout - infrastructure issue, not API logic)
- **Test Suites:** 12 total (10 passing, 2 failing)

### Build Status
- **Compilation:** ✅ Successful
- **React Errors:** ✅ Fixed (all 26 files updated)
- **API Routes:** ✅ 50+ endpoints implemented

---

## 🎯 API ENDPOINTS INVENTORY

### Authentication APIs (8 endpoints)
```
POST   /api/auth/register              - User registration
POST   /api/auth/login                 - Email/Password login
POST   /api/auth/password-login        - Alternative password login
POST   /api/auth/password-signup       - Password signup
POST   /api/auth/password-reset        - Reset forgotten password
POST   /api/auth/password-reset-request - Request password reset
POST   /api/auth/otp-send              - Send OTP
POST   /api/auth/otp-verify            - Verify OTP
POST   /api/auth/logout                - Logout user
GET    /api/auth/me                    - Get current user
POST   /api/auth/refresh               - Refresh auth token
GET    /api/auth/google                - Google OAuth redirect
GET    /api/auth/google-callback       - Google OAuth callback
```

### Store Management APIs (6 endpoints)
```
GET    /api/stores                     - List all stores
POST   /api/stores                     - Create new store
GET    /api/stores/[id]                - Get store details
PUT    /api/stores/[id]                - Update store
DELETE /api/stores/[id]                - Delete store
GET    /api/stores/[id]/inventory      - Get store inventory
POST   /api/stores/[id]/inventory      - Update store inventory
```

### Campaign Management APIs (8 endpoints)
```
GET    /api/campaigns                  - List campaigns
POST   /api/campaigns                  - Create campaign
GET    /api/campaigns/[id]             - Get campaign details
PUT    /api/campaigns/[id]             - Update campaign
DELETE /api/campaigns/[id]             - Delete campaign
POST   /api/campaigns/[id]/assign      - Assign campaign to store
POST   /api/campaign/create            - Alternative create
GET    /api/campaign_range             - Get campaign ranges
```

### Inventory Management APIs (7 endpoints)
```
GET    /api/inventory/status           - Get inventory status
POST   /api/inventory/allocate         - Allocate inventory
GET    /api/inventory/history          - Get allocation history
GET    /api/ranges                     - List ranges
POST   /api/ranges                     - Create range
GET    /api/ranges/[id]                - Get range details
PUT    /api/ranges/[id]                - Update range
```

### Redemption APIs (6 endpoints)
```
POST   /api/redemptions                - Redeem coupon/scratch
GET    /api/redemptions/history        - Get redemption history
POST   /api/redemptions/reverse        - Reverse redemption
GET    /api/redemptions/stats          - Get redemption stats
GET    /api/scan                       - Scan QR code
```

### Analytics APIs (6 endpoints)
```
GET    /api/dashboard/super-admin      - Super Admin dashboard
GET    /api/dashboard/admin            - Distributor dashboard
GET    /api/dashboard/retailer         - Merchant dashboard
GET    /api/dashboard/manager          - Manager dashboard
GET    /api/analytics/inventory        - Inventory analytics
GET    /api/analytics/redemptions      - Redemption analytics
```

### Admin & Payment APIs (7 endpoints)
```
GET    /api/admin/merchants            - List merchants
GET    /api/admin/distributors         - List distributors
POST   /api/admin/seed                 - Seed test data
GET    /api/payment/create-order       - Create payment order
POST   /api/payment/verify             - Verify payment
POST   /api/payment/webhook            - Payment webhook
GET    /api/subscription/plans         - Get subscription plans
```

### User & Organization APIs (6 endpoints)
```
GET    /api/user                       - Get user profile
GET    /api/merchant                   - Get merchant info
GET    /api/merchant/managers          - List managers
POST   /api/subscription/assign        - Assign subscription
GET    /api/subscription/current       - Get current subscription
POST   /api/distributor/merchants      - List distributor's merchants
```

---

## ✅ VALIDATION CHECKLIST

### Phase 5A: Authentication Flow Testing
- [ ] **POST /api/auth/register** - Create new user
  - [ ] Valid input creates user in DB
  - [ ] Validation errors return 400
  - [ ] Duplicate email returns 409
  
- [ ] **POST /api/auth/login** - Login with credentials
  - [ ] Correct credentials return auth token
  - [ ] Invalid credentials return 401
  - [ ] Token is stored in database
  
- [ ] **POST /api/auth/otp-send** - Send OTP
  - [ ] OTP generated and stored in DB
  - [ ] Email/SMS sent (or logged)
  - [ ] Rate limiting enforced
  
- [ ] **POST /api/auth/otp-verify** - Verify OTP
  - [ ] Correct OTP marks user as verified
  - [ ] Invalid OTP returns error
  - [ ] Expired OTP rejected
  
- [ ] **GET /api/auth/me** - Get current user
  - [ ] Authenticated user gets profile
  - [ ] Unauthenticated request returns 401
  - [ ] Profile includes all user fields

- [ ] **POST /api/auth/logout** - Logout
  - [ ] Token blacklisted (if implemented)
  - [ ] Session cleared
  - [ ] User can't access protected routes

### Phase 5B: Store Management Testing
- [ ] **POST /api/stores** - Create store
  - [ ] Valid data creates store in DB
  - [ ] Store assigned to correct merchant
  - [ ] Validation enforces required fields
  
- [ ] **GET /api/stores** - List stores
  - [ ] Merchant sees only their stores
  - [ ] Super Admin sees all stores
  - [ ] Pagination works if implemented
  
- [ ] **GET /api/stores/[id]** - Get store details
  - [ ] Returns complete store information
  - [ ] Authorization checks merchant ownership
  - [ ] 404 for non-existent store
  
- [ ] **POST /api/stores/[id]/inventory** - Update inventory
  - [ ] Add inventory creates transaction record
  - [ ] Balance updated correctly
  - [ ] Audit log created
  
- [ ] **GET /api/stores/[id]/inventory** - Get inventory status
  - [ ] Returns total, used, remaining, available
  - [ ] Calculations are accurate
  - [ ] Historical data accessible

### Phase 5C: Campaign Management Testing
- [ ] **POST /api/campaigns** - Create campaign
  - [ ] Valid data creates campaign
  - [ ] Campaign linked to correct merchant
  - [ ] Start/end dates validated
  
- [ ] **GET /api/campaigns** - List campaigns
  - [ ] Returns only user's campaigns (role-based)
  - [ ] Filter by status works
  - [ ] Sorting by date works
  
- [ ] **POST /api/campaigns/[id]/assign** - Assign to store
  - [ ] Campaign assigned to store
  - [ ] Inventory allocated
  - [ ] Redemption started
  
- [ ] **GET /api/campaign_range** - Get ranges
  - [ ] Returns all ranges for campaign
  - [ ] QR codes generated for each range
  - [ ] Range details complete

### Phase 5D: Redemption Testing
- [ ] **POST /api/redemptions** - Redeem coupon
  - [ ] Valid QR code redeems item
  - [ ] Inventory decremented
  - [ ] Transaction recorded
  - [ ] Cannot redeem twice
  
- [ ] **GET /api/redemptions/history** - Redemption history
  - [ ] All redemptions returned
  - [ ] Merchant sees only their redemptions
  - [ ] Date filters work
  
- [ ] **POST /api/redemptions/reverse** - Reverse redemption
  - [ ] Reversal recorded
  - [ ] Inventory restored
  - [ ] Original transaction linked
  
- [ ] **GET /api/scan** - QR code scan
  - [ ] Valid QR returns coupon details
  - [ ] Invalid QR returns 404
  - [ ] Redemption not yet started returns error

### Phase 5E: Analytics Testing
- [ ] **GET /api/dashboard/super-admin** - Super Admin dashboard
  - [ ] Returns all system metrics
  - [ ] Data calculations correct
  - [ ] Performance acceptable (< 2s)
  
- [ ] **GET /api/dashboard/retailer** - Merchant dashboard
  - [ ] Returns merchant's data only
  - [ ] Shows campaigns, inventory, redemptions
  - [ ] Calculations accurate
  
- [ ] **GET /api/analytics/redemptions** - Redemption analytics
  - [ ] Success rate calculated correctly
  - [ ] Revenue metrics accurate
  - [ ] Trends data available
  
- [ ] **GET /api/analytics/inventory** - Inventory analytics
  - [ ] Utilization % correct
  - [ ] Stock levels accurate
  - [ ] Alerts generated for low stock

### Phase 5F: Role-Based Access Control Testing
- [ ] **Super_Admin role**
  - [ ] Can access all endpoints
  - [ ] Can view all merchants/stores/campaigns
  - [ ] Can create/edit/delete for anyone
  
- [ ] **Distributor role**
  - [ ] Can manage their merchants
  - [ ] Can view merchant campaigns
  - [ ] Cannot access other distributors' data
  
- [ ] **Merchant role**
  - [ ] Can manage their stores
  - [ ] Can create/manage campaigns
  - [ ] Can view only their redemptions
  
- [ ] **Manager role**
  - [ ] Limited to their assigned merchant
  - [ ] Can view but not edit campaigns
  - [ ] Can see live redemption data

### Phase 5G: Data Integrity Testing
- [ ] **Database Constraints**
  - [ ] Duplicate entries prevented
  - [ ] Foreign keys enforced
  - [ ] Required fields validated
  
- [ ] **Transaction Consistency**
  - [ ] Inventory transactions atomic
  - [ ] Redemption creates audit trail
  - [ ] No data loss on failure
  
- [ ] **Error Handling**
  - [ ] Validation errors clear
  - [ ] Database errors handled gracefully
  - [ ] No sensitive info exposed

### Phase 5H: Performance Testing
- [ ] **Response Times**
  - [ ] List endpoints < 2 seconds
  - [ ] Detail endpoints < 1 second
  - [ ] Create/Update < 500ms
  
- [ ] **Database Queries**
  - [ ] No N+1 queries
  - [ ] Indexes used properly
  - [ ] Join operations optimized
  
- [ ] **Concurrent Access**
  - [ ] Multiple users can access simultaneously
  - [ ] Race conditions handled
  - [ ] Session management correct

---

## 🧪 TESTING APPROACH

### Manual Testing with Postman
```bash
# 1. Import Postman Collection
Open Postman > Import > Select: postman/QR-Coupon-Platform.postman_collection.json

# 2. Create Environment Variables
Set: {{base_url}} = http://localhost:3000
Set: {{auth_token}} = (obtained from login response)

# 3. Test Workflow
- Register new user
- Login to get token
- Create store
- Create campaign
- Assign campaign to store
- Scan QR code
- Redeem coupon
- Check analytics
```

### Integration Testing with Real Database
```bash
# 1. Ensure MongoDB is running
mongod --dbpath ./data

# 2. Update .env
MONGODB_URI=mongodb://localhost:27017/qr_coupon_dev

# 3. Seed test data
curl -X POST http://localhost:3000/api/admin/seed

# 4. Run integration tests
npm run test:integration
```

### API Response Validation
All endpoints should return:
```json
{
  "success": true/false,
  "data": { /* response data */ },
  "error": { /* error details if failed */ },
  "timestamp": "2026-05-26T10:30:00Z"
}
```

---

## 🚀 IMMEDIATE ACTION ITEMS

### Today (May 26)
- [ ] Fix MongoDB Memory Server test timeout
- [ ] Run full integration test suite with real database
- [ ] Test all 50 APIs with Postman collection
- [ ] Verify RBAC on all protected endpoints
- [ ] Check database transactions are working

### Tomorrow (May 27)
- [ ] Performance benchmark each API endpoint
- [ ] Test concurrent user scenarios
- [ ] Verify data consistency after failures
- [ ] Document any bugs found
- [ ] Create runbook for API troubleshooting

### This Week (May 27-31)
- [ ] Load test with 100+ concurrent users
- [ ] Test with various data volumes
- [ ] Verify backup/recovery procedures
- [ ] Security audit (SQL injection, CORS, etc.)
- [ ] Final sign-off on API stability

---

## 📋 DEPENDENCY CHECKLIST

### Required Services
- [ ] MongoDB running and accessible
- [ ] Redis (if implementing caching/sessions)
- [ ] SMTP server (for email OTP)
- [ ] Twilio account (for SMS OTP)
- [ ] AWS S3 (if image storage needed)

### Environment Configuration
- [ ] .env file created with all variables
- [ ] Database connection verified
- [ ] API endpoints responding
- [ ] CORS configured correctly
- [ ] Rate limiting in place

### Documentation
- [ ] API documentation complete
- [ ] Error codes documented
- [ ] Authentication flow documented
- [ ] Deployment guide written
- [ ] Troubleshooting guide created

---

## ✨ SUCCESS CRITERIA

✅ **Phase 5 Complete When:**
1. All 50 API endpoints tested and working
2. 137 tests passing (or 95%+ pass rate)
3. RBAC verified on all protected routes
4. No data loss scenarios
5. Performance within acceptable limits (95th percentile < 2s)
6. Database transactions atomic and consistent
7. Error handling comprehensive
8. Documentation complete
9. Team sign-off obtained

---

**Next Step:** Start with Phase 5A - Authentication Flow Testing  
**Estimated Duration:** 3-5 days  
**Owner:** Backend QA & Validation Team
