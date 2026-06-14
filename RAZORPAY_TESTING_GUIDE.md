# Razorpay Integration - Testing Guide

## Environment Setup

### Verify Configuration
```bash
# Check Razorpay keys are loaded
echo $RAZORPAY_KEY_ID
echo $RAZORPAY_KEY_SECRET
echo $NEXT_PUBLIC_RAZORPAY_KEY_ID
```

All three should have values (test keys starting with `rzp_test_`)

### Start Application
```bash
npm run dev
```

Visit http://localhost:3000 or http://localhost:3001 depending on your setup

## Test 1: Order Creation

### Steps
1. Log in to merchant account
2. Navigate to `/billing/plans` (or `/billing`)
3. Select a plan (e.g., "Single Store" or "Multi-Store")
4. Click "Select Plan" button
5. Verify you're on checkout page with plan details
6. Review pricing:
   - Base Price
   - GST (18%)
   - Total Amount
7. Click "Confirm & Activate" button

### Expected Results
- Order creation starts (button shows loading state)
- No page navigation yet (payment modal coming)
- Check browser console for no errors
- Check server logs for: `✓ [Razorpay Order] Created order order_xxx for plan xxx`

### Check Database
```javascript
// In MongoDB shell or MongoDB Compass
db.payments.findOne({ status: "created" }, { sort: { createdAt: -1 } })

// Should show:
{
  _id: ObjectId("..."),
  merchantId: ObjectId("..."),
  planId: ObjectId("..."),
  amount: 2099,
  tax: 378,
  totalAmount: 2477,
  currency: "INR",
  paymentGateway: "razorpay",
  gatewayOrderId: "order_...",
  status: "created",
  paymentMethod: "razorpay",
  metadata: { planName: "Single Store", planType: "CORE" },
  createdAt: ISODate("2026-06-10T10:30:00Z")
}
```

## Test 2: Razorpay Modal Opens

### Prerequisites
- Completed Test 1 (Order Created)

### Expected Results
After clicking "Confirm & Activate", a modal should appear showing:
- ScratchX branding
- Plan name and description
- Amount in INR (₹2,477 for example)
- Merchant email pre-filled
- Payment methods (Cards, UPI, etc.)

### If Modal Doesn't Appear
**Check:**
1. Browser console for errors
2. Razorpay script loaded: Open DevTools > Application > Scripts > search "checkout.razorpay.com"
3. Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` in browser (DevTools > Application > Variables)
4. Check server logs for order creation errors

## Test 3: Successful Payment

### Test Card Details
**Card Number:** 4111 1111 1111 1111
**Expiry:** Any future date (e.g., 12/25)
**CVV:** Any 3 digits (e.g., 123)
**Name:** Any name

### Steps
1. Modal is open (from Test 2)
2. Enter card details above
3. Click "Pay" button

### Expected Results
- Modal processes payment briefly
- Modal closes automatically
- Success screen appears: "Plan Activated!"
- Page shows: "Your {Plan} plan is now active for lifetime"
- "Redirecting to dashboard..." message

### Verify Subscription Created
```javascript
// In MongoDB
db.subscriptions.findOne({ 
  merchantId: ObjectId("your_merchant_id") 
}, { sort: { createdAt: -1 } })

// Should show:
{
  _id: ObjectId("..."),
  ownerId: ObjectId("..."),
  ownerType: "merchant",
  merchantId: ObjectId("..."),
  planId: ObjectId("..."),
  planType: "CORE",
  status: "active",
  billingCycle: "one-time",
  purchaseDate: ISODate("2026-06-10T10:30:00Z"),
  unlimitedScratches: {
    isActive: true,
    grantedAt: ISODate("2026-06-10T10:30:00Z"),
    validUntil: ISODate("2026-09-08T10:30:00Z"),  // 90 days later
    scratchValidityType: "quarterly"
  },
  createdAt: ISODate("2026-06-10T10:30:00Z")
}
```

### Verify Payment Updated
```javascript
// In MongoDB - Payment should have payment details
db.payments.findOne({ gatewayOrderId: "order_xxx" })

// Should show:
{
  status: "success",
  gatewayPaymentId: "pay_xxx",
  gatewaySignature: "9ef4dffbfd84f1318f6739...",
  subscriptionId: ObjectId("..."),
  completedAt: ISODate("2026-06-10T10:30:00Z")
}
```

### Verify Account Updated
```javascript
// In MongoDB
db.accounts.findOne({ _id: ObjectId("your_merchant_id") })

// Should show:
{
  activePlan: "CORE",
  subscriptionId: ObjectId("..."),
  planPurchaseDate: ISODate("2026-06-10T10:30:00Z")
}
```

### Check Server Logs
Look for:
```
✓ [Razorpay Order] Created order order_xxx for plan Single Store
✓ [Payment Verified] CORE plan activated for merchant 507f...
```

## Test 4: Failed Payment

### Test Card for Declined Payment
**Card Number:** 4000 0000 0000 0002
**Expiry:** Any future date
**CVV:** Any 3 digits

### Steps
1. Start new checkout from Test 1
2. Enter failed payment card details
3. Click "Pay"

### Expected Results
- Modal shows error or declines payment
- Modal closes
- Error message appears: "Payment verification failed"
- No subscription created
- Can retry payment

### Verify Payment Status
```javascript
// In MongoDB
db.payments.findOne({ status: "failed" }, { sort: { createdAt: -1 } })

// Should show:
{
  status: "failed",
  gatewayPaymentId: "pay_xxx",
  gatewaySignature: "signature_if_available"
}
```

### Important: Subscription Should NOT Be Created
```javascript
// Count should match previous - no new subscription
db.subscriptions.count()
```

## Test 5: Multiple Payment Attempts

### Scenario
Same merchant attempts to buy plan multiple times

### Steps
1. Complete successful payment (Test 3)
2. Go back to `/billing/plans`
3. Try to purchase same plan again
4. Complete another successful payment

### Expected Results
- First payment: Subscription created
- Second payment: 
  - New order created
  - Payment verified successfully
  - Old subscription cancelled
  - New subscription created with new purchase date
  - No duplicate subscriptions

### Verify in Database
```javascript
// Old subscription should be cancelled
db.subscriptions.findOne({ 
  merchantId: ObjectId("your_id"),
  status: "cancelled"
})

// New subscription should be active
db.subscriptions.findOne({ 
  merchantId: ObjectId("your_id"),
  status: "active",
  planId: ObjectId("plan_id")
})

// Both payments should exist
db.payments.find({ merchantId: ObjectId("your_id") }).count()
// Should be 2
```

## Test 6: Plan Validation

### Test Case 6A: Invalid Plan ID
1. Manually visit: `/billing/checkout?planId=invalid&planName=Test`
2. Click confirm
3. Expected: Error "Plan not found"

### Test Case 6B: Free Plan (if exists)
1. Create a free plan in database
2. Try to purchase
3. Expected: Error "Cannot create payment for free plans"

### Test Case 6C: Missing Plan ID
1. Visit `/billing/checkout` without planId parameter
2. Expected: Error "Invalid plan selected" (before confirmation)

## Test 7: Signature Verification

### Manual Test (Advanced)
Send invalid signature to verification endpoint:

```bash
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "invalid_signature_12345"
  }'
```

Expected Response:
```json
{
  "success": false,
  "error": "Invalid payment signature"
}
```

## Test 8: Authentication Check

### Test Case 8A: Without Authentication
```bash
curl -X POST http://localhost:3000/api/subscription/activate \
  -H "Content-Type: application/json" \
  -d '{ "planId": "507f1f77bcf86cd799439011" }'
```

Expected: 401 Unauthorized

### Test Case 8B: With Invalid Token
```bash
curl -X POST http://localhost:3000/api/subscription/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{ "planId": "507f1f77bcf86cd799439011" }'
```

Expected: 401 Unauthorized

## Browser DevTools Tests

### Console Check
DevTools > Console should have no errors. May see warnings about CRLF conversion (Windows-related, harmless).

### Network Tab Check
1. Open DevTools > Network
2. Complete payment
3. Should see:
   - POST to `/api/subscription/activate` (200 status, order created)
   - POST to `/api/payment/verify` (200 status, subscription created)
4. Response headers should have proper CORS headers

### Storage Check
DevTools > Application > Cookies:
- Should see auth/session cookies
- No sensitive data in local/session storage

## Error Scenarios Testing

### Scenario 1: Network Error During Order Creation
1. Open DevTools > Network
2. Add offline mode or slow 3G
3. Click "Confirm & Activate"
4. Expected: Error message about network, can retry

### Scenario 2: Network Error During Verification
1. Razorpay modal opens successfully
2. Enter valid card and pay
3. Network fails after payment but before verification
4. Expected: Error message, payment in database but subscription not created yet
5. Manual verification endpoint call should work when network recovers

### Scenario 3: Stale Payment Record
1. Manually delete payment record from MongoDB after order creation
2. Try to verify payment
3. Expected: "Payment record not found" error
4. Subscription not created

## Performance Tests

### Load Test Order Creation
Create 10 orders rapidly:
```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/subscription/activate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer token" \
    -d '{ "planId": "507f1f77bcf86cd799439011" }' &
done
```

Expected: All succeed, no race conditions, unique order IDs

## Cleanup After Testing

### Remove Test Payment Records
```javascript
// In MongoDB
db.payments.deleteMany({ 
  createdAt: { $gte: ISODate("2026-06-10T00:00:00Z") },
  status: "failed"
})
```

### Reset Test Account
```javascript
// In MongoDB
db.accounts.updateOne(
  { _id: ObjectId("test_merchant_id") },
  { $unset: { activePlan: "", subscriptionId: "" } }
)

db.subscriptions.deleteMany({
  merchantId: ObjectId("test_merchant_id")
})
```

## Troubleshooting

### Issue: Modal doesn't appear
- **Check:** Razorpay script loaded in Network tab
- **Check:** NEXT_PUBLIC_RAZORPAY_KEY_ID in Environment Variables
- **Fix:** Hard refresh (Ctrl+Shift+R)
- **Fix:** Check console for script load error

### Issue: "Invalid payment signature"
- **Check:** RAZORPAY_KEY_SECRET in .env matches actual secret
- **Check:** Order ID and payment ID are correct
- **Fix:** Regenerate test keys from Razorpay dashboard

### Issue: Subscription not created after payment
- **Check:** Server logs for verification errors
- **Check:** Database payment record has correct gatewayPaymentId
- **Check:** Plan exists and has planType metadata
- **Fix:** Check RAZORPAY_KEY_SECRET matches payment gateway

### Issue: Payment modal opens but payment fails
- **Check:** Test card number is correct (4111...)
- **Check:** Expiry date is in future
- **Check:** Razorpay account is in test mode
- **Fix:** Verify keys are test keys (start with rzp_test_)

## Razorpay Dashboard

### View Test Payments
1. Log in to https://dashboard.razorpay.com
2. Select test mode (top left)
3. Go to Payments section
4. Search by order ID or payment ID
5. View payment details and status

### View Test Orders
1. Log in to dashboard
2. Go to Orders section
3. Search by order ID
4. View order details including notes

## Summary Checklist

- [ ] Test 1: Order Creation - PASS
- [ ] Test 2: Modal Opens - PASS
- [ ] Test 3: Successful Payment - PASS
- [ ] Test 4: Failed Payment - PASS
- [ ] Test 5: Multiple Attempts - PASS
- [ ] Test 6: Plan Validation - PASS
- [ ] Test 7: Signature Verification - PASS
- [ ] Test 8: Authentication - PASS
- [ ] Browser DevTools - PASS
- [ ] Error Scenarios - PASS
- [ ] Production Keys Ready - (Set before deployment)
