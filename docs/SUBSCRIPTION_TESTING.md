# Subscription System Testing Checklist

Complete end-to-end testing checklist for the subscription system implementation. This document covers all features, edge cases, and verification points for the Core and Smart subscription plans.

---

## 1. Platform Access Rules (8 items)

### User Without Plan
- [ ] User without any subscription can create their first store (onboarding)
- [ ] User without any subscription **cannot** create a campaign
- [ ] User without any subscription **cannot** create a second store
- [ ] Error message when attempting campaign creation: "No active subscription found. Please purchase a plan."
- [ ] Error message when attempting second store: "Upgrade your plan to create additional stores. Maximum 1 store without subscription."

### User With Core Plan
- [ ] User with Core plan can create exactly 1 store (the main store)
- [ ] User with Core plan can create campaigns (with purchased scratches or after 90-day unlimited)
- [ ] User with Core plan **cannot** create a second store
- [ ] Error message: "Core plan limited to 1 store. Upgrade to Smart plan for multiple stores."

### User With Smart Plan
- [ ] User with Smart plan can create up to 5 stores total (1 main + 4 extra)
- [ ] User with Smart plan can create campaigns
- [ ] User with Smart plan **cannot** create 6th store
- [ ] Error message for exceeding limit: "Smart plan limited to 5 stores (1 main + 4 extra). Upgrade for more."

---

## 2. Entitlement System (6 items)

### Unlimited Scratches (90-Day Benefit)
- [ ] Plan purchase automatically grants 90-day unlimited scratches
- [ ] Dashboard widget shows unlimited scratches status and remaining days
- [ ] After 90 days, unlimited scratches show as EXPIRED
- [ ] Expired notification appears in dashboard widget
- [ ] Calendar countdown shows correct days remaining (90, 89, ... 1)

### Purchased Scratches
- [ ] Purchased scratches count displays correctly in subscription status
- [ ] Campaign creation allowed when scratches are available (after 90-day expiry)
- [ ] Campaign creation blocked when no scratches remain
- [ ] User can purchase additional scratches to extend availability
- [ ] Scratch consumption correctly tracked per campaign

### Campaign Eligibility
- [ ] `GET /api/subscription/eligibility` returns `{ canCreateCampaign: true }` for eligible users
- [ ] `GET /api/subscription/eligibility` returns `{ canCreateCampaign: false, reason: "..." }` for ineligible users
- [ ] Campaign creation blocked if user has 0 remaining scratches and no unlimited benefit

---

## 3. API Endpoints (4 items)

### Status Endpoint
- [ ] `GET /api/subscription/status` returns correct `plan` field ("Core" or "Smart")
- [ ] `GET /api/subscription/status` returns `hasActivePlan: true` when subscribed
- [ ] `GET /api/subscription/status` returns `hasActivePlan: false` when no subscription
- [ ] Response includes `unlimitedScratches`, `remainingDays`, and `scratchRemaining` fields

### Eligibility Endpoint
- [ ] `GET /api/subscription/eligibility` returns campaign creation eligibility status
- [ ] `GET /api/subscription/eligibility` includes store creation eligibility
- [ ] Eligibility changes correctly after plan purchase

### Plans Endpoint
- [ ] `GET /api/subscription/plans` returns only "Core" and "Smart" plans
- [ ] Premium, Enterprise, Trial, Monthly, Annual plans are **not** returned
- [ ] Each plan includes correct pricing and features
- [ ] Plan limits (`maxStores`, `maxCampaigns`) are accurate

### Activation Endpoint
- [ ] `POST /api/subscription/activate` creates subscription with status "active"
- [ ] Subscription automatically gets `90-day unlimited scratches`
- [ ] `unlimitedScratches.validUntil` is set to 90 days from activation
- [ ] `unlimitedScratches.isActive` is true immediately after activation

---

## 4. Dashboard & UI (8 items)

### Subscription Widget
- [ ] Dashboard loads SubscriptionWidget without console errors
- [ ] Widget displays "No Plan" message when user has no subscription
- [ ] Widget displays current plan name (Core or Smart) when subscribed
- [ ] Widget shows unlimited scratches status: "Unlimited Scratches" or "Unlimited Scratches - Expires in X days"
- [ ] Widget displays "Unlimited Scratches - EXPIRED" after 90 days
- [ ] Widget shows remaining days countdown (89 days, 88 days, etc.)
- [ ] Widget includes "Manage Plan" button that links to subscription page
- [ ] Widget includes "Purchase Scratches" button (when unlimited expired)

### Subscription Management Page
- [ ] Subscription page loads without errors at `/dashboard/billing/`
- [ ] Page shows current plan badge/pill with plan name
- [ ] Page displays plan comparison (Core vs Smart features)
- [ ] "Upgrade Plan" button appears for users on Core plan
- [ ] Plan pricing and features display correctly
- [ ] All UI labels use "Scratches" terminology (not "Scratch Cards")

### Terminology Updates
- [ ] All UI text updated from "Scratch Card" → "Scratch"
- [ ] All plurals updated from "Scratch Cards" → "Scratches"
- [ ] API responses use "Scratch" terminology
- [ ] Toast notifications and alerts use "Scratch" terminology
- [ ] Tooltips and help text use "Scratch" terminology

---

## 5. First Store Exception (5 items)

### Main Store Designation
- [ ] First store created is automatically marked as `isMainStore: true`
- [ ] Account gets `mainStoreId` reference pointing to main store
- [ ] Main store has `is_main_store: true` in database
- [ ] Store list in UI indicates main store with a badge or label

### Main Store Protection
- [ ] User **cannot** delete the main store
- [ ] Error message when attempting deletion: "Cannot delete main store"
- [ ] Second store can only be created with active subscription
- [ ] Additional stores after main store can be deleted
- [ ] Switching plans does not affect main store status

---

## 6. Database Migrations (4 items)

### Remove Non-Core/Smart Plans
- [ ] Migration `removeOtherPlans.js` removes Premium plan
- [ ] Migration removes Enterprise plan
- [ ] Migration removes Trial plan
- [ ] Migration removes Monthly/Annual plans
- [ ] Only Core and Smart plans remain after migration
- [ ] Database query returns exactly 2 plans: Core and Smart

### Initialize Main Store
- [ ] Migration `initializeMainStore.js` sets `mainStoreId` on all accounts
- [ ] All accounts without `mainStoreId` get it populated
- [ ] First store of each account marked with `is_main_store: true`
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Existing `mainStoreId` values are not overwritten

### Add Plan Expiry Tracking
- [ ] Migration `addPlanExpiryTracking.js` backfills `unlimitedScratches.validUntil`
- [ ] All subscriptions get calculated `validUntil` dates (90 days from grant date)
- [ ] `unlimitedScratches.isActive` is set based on validity period
- [ ] `daysRemaining` field is calculated correctly
- [ ] Migration handles missing/null values gracefully

---

## 7. Global Terminology (4 items)

### UI Label Updates
- [ ] Search "Scratch Card" in codebase - no results (all replaced with "Scratch")
- [ ] Search "Scratch Cards" in codebase - only appears in comments/docs
- [ ] Campaign creation form uses "Scratches" label
- [ ] Store details page uses "Scratches" in all relevant places

### API Response Consistency
- [ ] API responses use "Scratch" terminology in field names
- [ ] Notification messages use "Scratch" terminology
- [ ] Error messages use "Scratch" terminology
- [ ] Dashboard widget uses "Scratches" in all text

### Documentation Updates
- [ ] All .md documentation files use "Scratch" terminology
- [ ] Comments in code use "Scratch" terminology
- [ ] Tooltip content uses "Scratch" terminology

---

## 8. Notifications & Expiry (4 items)

### Expiry Reminders
- [ ] Expiry warning notification sent 30 days before expiry
- [ ] Expiry warning notification sent 14 days before expiry
- [ ] Expiry warning notification sent 7 days before expiry
- [ ] Expiry warning notification sent 3 days before expiry
- [ ] Expiry warning notification sent 1 day before expiry
- [ ] Final expiry notification sent on day 91 (when expired)

### Dashboard Alerts
- [ ] Dashboard shows expiry banner when unlimited scratches near expiry
- [ ] Dashboard banner disappears after expiry
- [ ] Toasts/alerts appear for scratch-related actions
- [ ] Toast messages are clear and actionable

---

## 9. Edge Cases (4 items)

### Plan Upgrades
- [ ] User can switch from Core to Smart plan
- [ ] Switching plans resets the 90-day unlimited scratches counter
- [ ] User can switch back to Core plan (with confirmation)
- [ ] Store count is validated during plan downgrade (Smart to Core)

### Campaign Creation Timing
- [ ] User can create campaign on day 90 (last day of unlimited benefit)
- [ ] Campaign creation fails on day 91+ without purchased scratches
- [ ] User can purchase scratches before day 91 and continue
- [ ] Scratch consumption continues correctly after unlimited expiry

### Without Purchased Scratches
- [ ] User without purchased scratches and expired unlimited cannot create campaign
- [ ] Error message guides user to purchase scratches
- [ ] Purchase scratches page is accessible from error message
- [ ] User can immediately create campaign after scratch purchase

### Concurrent Operations
- [ ] Two simultaneous store creation requests are handled correctly
- [ ] Rate limiting prevents abuse of store creation
- [ ] Concurrent campaign creation does not cause duplicate entries
- [ ] Store limits are enforced atomically

---

## 10. Quick Test Flow

### Fast Verification Path

Use this sequence to quickly verify core functionality:

#### Setup (2 minutes)
1. Run `npm run seed:plans` to create Core and Smart plans
2. Run `npm run seed:accounts` to create test accounts with subscriptions
3. Run migrations: `removeOtherPlans`, `initializeMainStore`, `addPlanExpiryTracking`

#### Test Sequence (10 minutes)
1. **No Plan Path:**
   - Create new account
   - Verify first store creation succeeds
   - Verify second store creation fails
   - Verify campaign creation fails

2. **Core Plan Path:**
   - Login with core@test.com account
   - Verify subscription status shows "Core" plan
   - Verify widget shows unlimited scratches remaining days
   - Verify second store creation fails
   - Create campaign (should succeed with unlimited scratches)

3. **Smart Plan Path:**
   - Login with smart@test.com account
   - Verify subscription status shows "Smart" plan
   - Create up to 5 stores (all succeed)
   - Verify 6th store creation fails
   - Create campaign (should succeed)

4. **Expiry Handling:**
   - Manually update subscription to have expired unlimited scratches
   - Verify dashboard shows "EXPIRED" status
   - Verify campaign creation fails without purchased scratches
   - Purchase scratches
   - Verify campaign creation now succeeds

#### API Verification (2 minutes)
```bash
# Check status endpoint
curl http://localhost:3000/api/subscription/status

# Check eligibility endpoint
curl http://localhost:3000/api/subscription/eligibility

# Check plans endpoint
curl http://localhost:3000/api/subscription/plans
```

Expected responses:
- Status: `{ hasActivePlan: true|false, plan: "Core"|"Smart"|null, unlimitedScratches: true|false, remainingDays: number|null }`
- Eligibility: `{ canCreateCampaign: true|false }`
- Plans: Array with exactly 2 plans (Core and Smart)

---

## 11. Testing Best Practices

### Test Data Management
- [ ] Always use test accounts with unique emails (test-TIMESTAMP@example.com)
- [ ] Create fresh subscriptions for each test run (don't reuse)
- [ ] Clean up test data after completing verification
- [ ] Document any custom test scenarios with timestamps

### Database Verification
- [ ] Use MongoDB Compass or mongosh to verify database changes
- [ ] Check that migrations completed successfully before running tests
- [ ] Verify subscription status matches expected state in database
- [ ] Validate plan limits are stored correctly

### Browser DevTools
- [ ] Open Network tab to monitor API calls
- [ ] Check Console for any errors or warnings
- [ ] Verify response payloads match expected schema
- [ ] Monitor for any failed requests or 5xx errors

### CI/CD Integration
- [ ] Run automated tests before manual verification
- [ ] Seed test database consistently in CI pipeline
- [ ] Validate all migrations run successfully in CI
- [ ] Generate test coverage reports for subscription code

---

## 12. Verification Checklist

### Before Deployment
- [ ] All 50+ items in this checklist are completed and verified
- [ ] No console errors or warnings on dashboard
- [ ] All API endpoints return correct responses
- [ ] Database migrations complete without errors
- [ ] Terminology updated globally (no "Scratch Card" references)
- [ ] Main store protection is enforced
- [ ] Plan limits are enforced for all users

### Post-Deployment
- [ ] Monitor error logs for subscription-related issues
- [ ] Verify real users can access their subscriptions
- [ ] Check that existing accounts have `mainStoreId` set
- [ ] Confirm no users are blocked from expected actions
- [ ] Monitor expiry notifications are sending correctly

---

## Related Files

- `lib/services/subscriptionValidationService.js` - Core validation logic
- `lib/services/subscriptionActivationService.js` - Subscription activation logic
- `app/api/subscription/*/` - API endpoints
- `models/subscriptionModel.js` - Database schema
- `models/subscriptionPlanModel.js` - Plan schema
- `components/dashboard/SubscriptionWidget.js` - Dashboard widget
- `scripts/migrations/` - Database migration scripts
- `scripts/seed-subscription-plans.js` - Plan seeding
- `scripts/seed-test-accounts.js` - Test account seeding

---

## Notes

- Timestamp: Created 2026-06-10
- Version: 1.0
- Plans Covered: Core, Smart
- Excluded Plans: Premium, Enterprise, Trial, Monthly, Annual
- Main Store Feature: Required for all accounts
- Unlimited Scratches Duration: 90 days per plan activation
