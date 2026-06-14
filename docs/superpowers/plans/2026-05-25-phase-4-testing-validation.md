# Phase 4: Testing & Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive unit, integration, and API testing for the QR Coupon/Scratch Card platform covering all services, APIs, frontend components, and role-based access control.

**Architecture:** Three-tier testing approach — unit tests for business logic isolation, integration tests for API contracts and data flow, RBAC tests for permission enforcement. Mock data generators provide realistic test scenarios. Postman collection enables manual verification and edge-case discovery.

**Tech Stack:** Jest (testing framework), Supertest (HTTP assertions), MongoDB Memory Server (isolated database), Mock-aware Mongoose (mocking ORM), Node's crypto (test data generation)

---

## File Structure

**Test Configuration:**
- Create: `jest.config.js` - Jest configuration for test environment
- Create: `__tests__/setup.js` - Global test utilities, mock data generators, database setup/teardown

**Unit Tests:**
- Create: `__tests__/unit/services/storeService.test.js` - Store service method tests
- Create: `__tests__/unit/services/campaignService.test.js` - Campaign service tests
- Create: `__tests__/unit/services/redemptionService.test.js` - Redemption service tests
- Create: `__tests__/unit/services/inventoryService.test.js` - Inventory service tests
- Create: `__tests__/unit/lib/permissions.test.js` - Permission system and role hierarchy tests
- Create: `__tests__/unit/lib/errors.test.js` - Custom error class tests

**Integration Tests:**
- Create: `__tests__/integration/api/stores.test.js` - Store API endpoints (CRUD, authorization)
- Create: `__tests__/integration/api/campaigns.test.js` - Campaign API endpoints (create, assign, list)
- Create: `__tests__/integration/api/inventory.test.js` - Inventory allocation and adjustment tests
- Create: `__tests__/integration/api/redemptions.test.js` - Redemption endpoints (single, bulk, history, reverse)
- Create: `__tests__/integration/api/analytics.test.js` - Analytics query tests (merchant, campaign, store levels)
- Create: `__tests__/integration/rbac.test.js` - Role-based access control across all endpoints
- Create: `__tests__/integration/workflow.test.js` - End-to-end workflow tests (allocation → redemption → analytics)

**Test Data & Utilities:**
- Create: `__tests__/fixtures/auth.fixture.js` - Auth token generation and test users
- Create: `__tests__/fixtures/testHelpers.js` - API assertion helpers

**Documentation:**
- Create: `postman/QR-Coupon-Platform.postman_collection.json` - Postman API collection
- Create: `docs/TESTING.md` - Test documentation and running instructions
- Create: `docs/PERFORMANCE_BENCHMARKS.md` - Performance test results and baselines

---

### Task 1: Setup Jest Configuration & Test Infrastructure

**Files:**
- Create: `jest.config.js`
- Create: `__tests__/setup.js`
- Modify: `package.json` - Add test scripts and dependencies

**Complete Specification:**

Jest configuration with:
- Node test environment
- Tests in `__tests__/**/*.test.js`
- Coverage for app/api, lib, models
- mongodb-memory-server for isolated database
- 30 second test timeout
- 4 max workers

Test setup file with:
- MongoDB Memory Server startup/shutdown
- Database cleanup between tests
- Global mock user/merchant/store/campaign generators using mongoose.Types.ObjectId()
- Test utilities available as global properties

Package.json updates:
- Install: jest, supertest, mongodb-memory-server, @testing-library/react, @testing-library/jest-dom
- Scripts: test, test:watch, test:coverage, test:unit, test:integration

- [ ] **Step 1: Create Jest configuration file**
- [ ] **Step 2: Create test setup and utilities file**
- [ ] **Step 3: Update package.json with test dependencies and scripts**
- [ ] **Step 4: Run jest to verify setup**
- [ ] **Step 5: Create a simple verification test**
- [ ] **Step 6: Run setup test to verify infrastructure works**
- [ ] **Step 7: Commit test infrastructure**

---

### Task 2: Store Service Unit Tests

**Files:**
- Create: `__tests__/unit/services/storeService.test.js`

**Specification:**

12 unit tests covering:
- createStore: valid data, missing store_code error, invalid pincode error
- getStoresByMerchant: returns all stores, returns empty array
- getStoreById: returns store, throws NotFoundError
- updateStore: updates valid data, throws AuthorizationError for unauthorized merchant
- updateStoreInventory: adds inventory with transaction, prevents removal with insufficient balance
- getStoreInventorySummary: returns correct total/used/remaining/utilization
- canManageStore: returns true for owner/Super_Admin, false for others

All tests use mocked StoreModel and TransactionModel with jest.mock()

- [ ] **Step 1: Write store service test file with all 12 test cases**
- [ ] **Step 2: Run store service unit tests**
- [ ] **Step 3: Verify mock calls and assertions**
- [ ] **Step 4: Commit store service tests**

---

### Task 3: Campaign Service Unit Tests

**Files:**
- Create: `__tests__/unit/services/campaignService.test.js`

**Specification:**

10 unit tests covering:
- createCampaign: valid data, missing campaignName error, end_date before start_date error
- assignCampaignToStores: assigns to multiple stores, campaign not found error, exceeds inventory error
- getCampaignsByStore: returns campaigns for store, returns empty array
- getCampaignInventorySummary: calculates utilization correctly
- getCampaignInventoryStatus: returns detailed status with store breakdown

All tests use mocked CampaignModel and CampaignStoreMappingModel

- [ ] **Step 1: Write campaign service unit tests**
- [ ] **Step 2: Run campaign service tests**
- [ ] **Step 3: Verify campaign assignment logic**
- [ ] **Step 4: Commit campaign service tests**

---

### Task 4: Redemption Service Unit Tests

**Files:**
- Create: `__tests__/unit/services/redemptionService.test.js`

**Specification:**

10 unit tests covering:
- redeemScratchCard: completes successfully, validates campaign active/not expired, validates allocation exists, prevents duplicate redemptions
- bulkRedeemScratchCards: redeems multiple with success count, handles partial failures
- getCampaignRedemptionHistory: returns history for campaign
- reverseRedemption: reverses completed redemption, throws error if not found

All tests use mocked RedemptionModel, CampaignModel, CampaignStoreMappingModel, TransactionModel

- [ ] **Step 1: Write redemption service unit tests**
- [ ] **Step 2: Run redemption service tests**
- [ ] **Step 3: Verify redemption validation logic**
- [ ] **Step 4: Commit redemption service tests**

---

### Task 5: Inventory Service Unit Tests

**Files:**
- Create: `__tests__/unit/services/inventoryService.test.js`

**Specification:**

10 unit tests covering:
- allocateToCampaign: allocates and creates transaction, throws error if exceeds total
- allocateToStore: allocates from campaign to store, throws error if exceeds allocation
- getCampaignInventoryStatus: returns total/allocated/used/redeemed/remaining with utilization
- getStoreInventoryStatus: returns store inventory stats
- getAllocationHistory: returns history, supports filtering by action type

- [ ] **Step 1: Write inventory service unit tests**
- [ ] **Step 2: Run inventory service tests**
- [ ] **Step 3: Verify inventory constraint validation**
- [ ] **Step 4: Commit inventory service tests**

---

### Task 6: Stores API Integration Tests

**Files:**
- Create: `__tests__/integration/api/stores.test.js`
- Create: `__tests__/fixtures/auth.fixture.js`

**Specification:**

15 integration tests covering:
- POST /api/stores: creates with valid data (201), rejects missing store_code (400), rejects invalid pincode (400), rejects unauthenticated (401), rejects non-Merchant role (403)
- GET /api/stores: lists all for merchant with pagination, filters by status
- GET /api/stores/:id: returns store, returns 404 for not found, returns 403 if user doesn't own store
- PATCH /api/stores/:id: updates store, rejects invalid pincode
- PATCH /api/stores/:id/inventory: adds/removes inventory, rejects if insufficient balance

Uses real database (mongodb-memory-server) and JWT token authentication

- [ ] **Step 1: Create auth fixture for JWT token generation**
- [ ] **Step 2: Write stores API integration tests with proper HTTP assertions**
- [ ] **Step 3: Run stores API tests**
- [ ] **Step 4: Verify API contract compliance**
- [ ] **Step 5: Commit stores API tests**

---

### Task 7: Campaigns API Integration Tests

**Files:**
- Create: `__tests__/integration/api/campaigns.test.js`

**Specification:**

8 integration tests covering:
- POST /api/campaigns/:campaignId/assign: assigns to multiple stores (200), returns 404 if campaign not found, handles stores not owned by merchant (400), rejects if assignment exceeds inventory (400), prevents duplicate assignments (400)
- GET /api/campaigns/:campaignId: returns campaign details with allocations (200)

- [ ] **Step 1: Write campaigns API integration tests**
- [ ] **Step 2: Run campaigns API tests**
- [ ] **Step 3: Commit campaigns API tests**

---

### Task 8: Inventory API Integration Tests

**Files:**
- Create: `__tests__/integration/api/inventory.test.js`

**Specification:**

6 integration tests covering:
- PATCH /api/inventory/allocate: allocates to campaign and to store, rejects invalid type (400)
- GET /api/inventory/status: returns status for merchant/campaign/store, rejects if missing required query params (400)
- GET /api/inventory/history: returns history with pagination, supports action type filtering

- [ ] **Step 1: Write inventory API integration tests**
- [ ] **Step 2: Run inventory API tests**
- [ ] **Step 3: Commit inventory API tests**

---

### Task 9: Redemptions API Integration Tests

**Files:**
- Create: `__tests__/integration/api/redemptions.test.js`

**Specification:**

12 integration tests covering:
- POST /api/redemptions: redeems single card (200), redeems bulk (200), handles partial failures, rejects if campaign expired (400), rejects if not allocated to store (400), prevents duplicate redemptions (400)
- GET /api/redemptions/history: returns history for campaign with pagination
- GET /api/redemptions/stats: returns redemption statistics (total, rate)
- POST /api/redemptions/reverse: reverses redemption (200), returns 404 if not found

- [ ] **Step 1: Write redemptions API integration tests**
- [ ] **Step 2: Run redemptions API tests**
- [ ] **Step 3: Commit redemptions API tests**

---

### Task 10: Analytics API Integration Tests

**Files:**
- Create: `__tests__/integration/api/analytics.test.js`

**Specification:**

11 integration tests covering:
- GET /api/analytics/inventory: returns merchant/campaign/store inventory analytics (200), includes campaign and store breakdowns for merchant level, rejects invalid type (400)
- GET /api/analytics/redemptions: returns merchant/campaign/store redemption analytics (200), includes top campaigns/stores for merchant level, supports date range filtering

- [ ] **Step 1: Write analytics API integration tests**
- [ ] **Step 2: Run analytics API tests**
- [ ] **Step 3: Commit analytics API tests**

---

### Task 11: Role-Based Access Control Tests

**Files:**
- Create: `__tests__/integration/rbac.test.js`

**Specification:**

15 RBAC tests covering all 6 roles (Super_Admin, Distributor, Merchant, Manager, Store_Manager, Store_Staff):
- Store management: Merchant creates (201), Store_Staff cannot (403), Manager cannot (403)
- Campaign assignment: Merchant/Manager can, Store_Manager cannot (403)
- Redemptions: Store_Staff/Store_Manager can redeem, Merchant cannot (403)
- Analytics: All authenticated roles can access
- Cross-merchant isolation: Merchant cannot access other merchants' stores (403)
- Distributor can only manage assigned merchants

- [ ] **Step 1: Write RBAC tests covering all 6 roles**
- [ ] **Step 2: Run RBAC tests**
- [ ] **Step 3: Verify role hierarchy enforcement**
- [ ] **Step 4: Commit RBAC tests**

---

### Task 12: Create Postman Collection for Manual Testing

**Files:**
- Create: `postman/QR-Coupon-Platform.postman_collection.json`

**Specification:**

Complete Postman collection with:
- Authentication folder: Login request that auto-sets auth_token variable
- Stores folder: Create, List, Get, Update, Adjust Inventory requests
- Campaigns folder: Assign to stores, Get details requests
- Inventory folder: Allocate, Status (all types), History requests
- Redemptions folder: Redeem (single/bulk), History, Stats, Reverse requests
- Analytics folder: Inventory and Redemption analytics (all types)
- Environment variables: base_url, auth_token, merchant_id, store_id, campaign_id, redemption_id
- Pre-request scripts for token handling
- Tests for response validation

- [ ] **Step 1: Create Postman collection structure**
- [ ] **Step 2: Save Postman collection file**
- [ ] **Step 3: Create README for Postman collection usage**
- [ ] **Step 4: Commit Postman collection**

---

### Task 13: Performance Benchmarking & Load Testing

**Files:**
- Create: `__tests__/performance/benchmarks.test.js`
- Create: `docs/PERFORMANCE_BENCHMARKS.md`

**Specification:**

Performance benchmarks:
- Bulk redemption of 100 items: < 5 seconds
- Analytics aggregation query: < 2 seconds
- Inventory status lookup: < 500ms
- Campaign assignment to 50 stores: < 3 seconds
- Bulk operation error handling for 1000+ items

Create performance documentation with baseline expectations and optimization recommendations

- [ ] **Step 1: Create performance test file**
- [ ] **Step 2: Run performance tests**
- [ ] **Step 3: Create performance documentation**
- [ ] **Step 4: Commit performance tests**

---

### Task 14: Test Coverage Report & Documentation

**Files:**
- Create: `docs/TESTING.md`

**Specification:**

Comprehensive testing documentation with:
- How to run tests (all, unit only, integration only, watch mode, coverage)
- Test structure overview (55 unit + 52 integration + 15 RBAC + 3 performance = 125+ tests)
- Test data generators available
- Postman collection setup instructions
- CI/CD integration example
- Debugging test commands
- Test quality checklist
- Coverage goals (> 80%)

- [ ] **Step 1: Generate coverage report**
- [ ] **Step 2: Create testing documentation**
- [ ] **Step 3: Commit testing documentation**

---

### Task 15: Final Test Run & Validation Report

**Files:**
- Create: `test-report.txt` (artifact)

**Specification:**

Final validation:
- Run complete test suite with coverage
- Verify 125+ tests passing
- Verify > 80% code coverage
- Verify all RBAC tests passing
- Verify performance benchmarks within limits
- Create validation summary
- Final commit

- [ ] **Step 1: Run complete test suite**
- [ ] **Step 2: Verify test results**
- [ ] **Step 3: Create validation summary**
- [ ] **Step 4: Final commit**

---

## Summary

**Total Tasks:** 15
**Total Tests to Write:** 125+
**Unit Tests:** 55
**Integration Tests:** 52
**RBAC Tests:** 15
**Performance Benchmarks:** 3

**Deliverables:**
- Jest configuration with in-memory MongoDB
- Comprehensive test suite covering all services and APIs
- Role-based access control validation
- Performance benchmarks
- Postman collection for manual testing
- Complete testing documentation
