# ScratchX Subscription Purchase Flow - Test Results

## Date & Tester
- **Date:** 2026-06-08
- **Tester:** Manual Testing
- **Branch:** master

## Test Environment
- **Database:** MongoDB (local/test)
- **Server:** Next.js dev server
- **Browser:** Chrome/Firefox (specify)
- **User Accounts:** Test merchant and distributor created via seed scripts

---

## Test Cases

### 1. **Seed Data Creation** ✓
- [ ] Run: `npm run seed:plans`
  - Expected: Core and Smart plans created successfully
  - Verify in DB: `db.subscriptionplans.find()`
- [ ] Run: `npm run seed:accounts`
  - Expected: test-merchant and test-distributor accounts created with subscriptions
  - Verify credentials display in console output

### 2. **Plan Purchase Flow (Direct Activation)**
- [ ] Login as test-merchant@scratchx.local / TestMerchant@123
- [ ] Navigate to `/billing/plans`
- [ ] Verify Core plan shows "Current Plan" badge
- [ ] Verify Smart plan shows "Most Popular" badge
- [ ] Click "Get Smart" on Smart plan
- [ ] Page routes to `/billing/checkout?planId=...&cycle=monthly`
- [ ] Checkout page displays order summary with correct price + GST (18%)
- [ ] Click "Pay" button
- [ ] Expected: Direct activation happens (no Razorpay popup)
- [ ] Success page shows "Payment Successful!" with plan name
- [ ] Button "Go to Billing" navigates back

### 3. **Subscription Limits Enforcement**
- [ ] Login as test-merchant with Core plan (1 store, 5 campaigns limit)
- [ ] Try to create campaign #6
  - Expected: 403 error "Campaign limit reached (5/5). Upgrade your plan."
- [ ] Try to create store #2
  - Expected: 403 error "Store limit reached (1/1). Upgrade your plan."
- [ ] Upgrade to Smart plan (10 stores, 50 campaigns)
- [ ] Try to create campaign #6 again
  - Expected: Success (allowed up to 50)
- [ ] Try to create store #2
  - Expected: Success (allowed up to 10)

### 4. **Dashboard Integration**
- [ ] Login as test-merchant
- [ ] Navigate to `/dashboard`
- [ ] Verify SubscriptionSummaryCard displays:
  - [ ] Current plan name (Core)
  - [ ] Status badge (active)
  - [ ] Usage: Campaigns (current/limit)
  - [ ] Usage: Stores (current/limit)
  - [ ] "Upgrade Plan" button links to `/billing/plans`

### 5. **Settings Integration**
- [ ] Navigate to Settings page
- [ ] SettingsSubscriptionCard shows:
  - [ ] Current plan name
  - [ ] Subscription status
  - [ ] "Upgrade Plan" button (enabled)
  - [ ] Empty state if no subscription exists (correct)

### 6. **Merchant vs Distributor Support**
- [ ] Login as test-distributor@scratchx.local / TestDistributor@123
- [ ] Navigate to `/billing/plans`
- [ ] Verify Smart plan shows "Current Plan" (from seed)
- [ ] Downgrade to Core plan
- [ ] Dashboard shows Core plan and limits
- [ ] Store creation limited to 1 store per Core plan

### 7. **Billing History & Invoices**
- [ ] After each purchase, check database:
  - [ ] `db.subscriptions.findOne({ownerId: <userId>})` shows latest plan
  - [ ] `db.invoices.findOne({merchantId: <userId>})` has transaction ID
  - [ ] `db.payments.findOne({ownerId: <userId>})` shows paymentMethod: "direct"
- [ ] Verify invoice number format: INV-YYYYMMDD-XXXXX
- [ ] Verify transaction ID format: SUB-YYYYMMDD-XXXXX

### 8. **Error Handling**
- [ ] Try to purchase without authentication
  - Expected: 401 Unauthorized
- [ ] Try to purchase with invalid planId
  - Expected: 404 Plan not found
- [ ] Try to purchase with invalid billingCycle
  - Expected: 400 billingCycle must be "monthly" or "annual"
- [ ] Network error during purchase (dev tools throttle)
  - Expected: Error message displays, can retry

### 9. **Dark Mode Support**
- [ ] Toggle dark mode on Settings page
  - [ ] SettingsSubscriptionCard styles correctly
  - [ ] Colors contrast properly
- [ ] Toggle dark mode on Dashboard
  - [ ] SubscriptionSummaryCard styles correctly

### 10. **Responsive Design (Mobile)**
- [ ] Resize browser to 375px width (mobile)
- [ ] `/billing/plans` layout stacks correctly
- [ ] Checkout form displays properly
- [ ] Settings card displays properly
- [ ] Dashboard card displays properly
- [ ] All buttons are tappable (min 44px height)

---

## Summary

### Tests Passed ✅
- [ ] Seed data creation successful
- [ ] Direct plan purchase works
- [ ] Subscription limits enforce correctly
- [ ] Dashboard shows subscription info
- [ ] Settings integration works
- [ ] Both merchant and distributor flows work
- [ ] Billing history created properly
- [ ] Error handling is robust
- [ ] Dark mode works
- [ ] Mobile responsive

### Tests Failed ❌
(List any failures with severity)

### Known Issues / Blockers
(Any issues found during testing)

### Recommendations
(Any improvements or follow-up work needed)

---

## Sign-Off
- Tester: _________________
- Date: _________________
- Approved for Production: YES / NO
