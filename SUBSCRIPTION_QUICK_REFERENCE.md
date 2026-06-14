# ScratchX Subscription System - Quick Reference Guide

## 📋 FILE STRUCTURE

```
coupon_campaigns/
├── models/
│   ├── subscriptionPlanModel.js ✅ Phase 1
│   ├── subscriptionUsageModel.js ✅ Phase 1
│   └── paymentModel.js ✅ Phase 1
│
├── lib/
│   ├── subscriptionAccessGuard.js ✅ Phase 1
│   ├── seeds/
│   │   └── subscriptionPlans.js ✅ Phase 1
│   └── middleware/
│       └── subscriptionGate.js ✅ Phase 1
│
├── app/api/
│   ├── subscription/
│   │   ├── usage/route.js ✅ Phase 2
│   │   ├── details/route.js ✅ Phase 2
│   │   ├── assign/route.js ✅ Phase 3
│   │   └── plans/route.js ✅ Phase 4
│   └── payment/
│       ├── create-order/route.js ✅ Phase 3
│       └── webhook/route.js ✅ Phase 3
│
├── components/subscription/
│   ├── SubscriptionCard.js ✅ Phase 2
│   └── SubscriptionCard.module.css ✅ Phase 2
│
└── app/(dashboard)/
    ├── subscription/
    │   └── page.js ✅ Phase 2
    └── billing/
        ├── upgrade/
        │   ├── page.js ✅ Phase 4
        │   └── upgrade.module.css ✅ Phase 4
        ├── success/
        │   ├── page.js ✅ Phase 4
        │   └── success.module.css ✅ Phase 4
        └── failure/
            ├── page.js ✅ Phase 4
            └── failure.module.css ✅ Phase 4
```

---

## 🔗 API ENDPOINTS

### **Subscription APIs**

```bash
# Get current subscription usage metrics
GET /api/subscription/usage
Header: Authorization: Bearer token
Response: { subscription, plan, usage, alerts, daysRemaining, percentageUsed }

# Get detailed subscription info with upgrade path
GET /api/subscription/details
Header: Authorization: Bearer token
Response: { subscription, plan, quotaSummary, features, usage, upgrade }

# Fetch all available subscription plans
GET /api/subscription/plans
No auth required
Response: { success, data: [ { name, price, limits, features, ... }, ... ] }

# Assign plan to merchant (Admin only)
POST /api/subscription/assign
Header: Authorization: Bearer token
Body: { planName, billingCycle }
Response: { subscription, plan, usage }
```

### **Payment APIs**

```bash
# Create Razorpay payment order
POST /api/payment/create-order
Header: Authorization: Bearer token
Body: { planName, billingCycle }
Response: { orderId, amount, razorpayKeyId, paymentId }

# Handle Razorpay webhooks (HMAC verified)
POST /api/payment/webhook
Body: Razorpay webhook payload
Header: X-Razorpay-Signature: HMAC-SHA256 signature
Response: { success, message } (always 200)
```

---

## 🎯 KEY ROUTES

### **User-Facing Routes**

```
/billing/upgrade              → Pricing page with all plans
/billing/success              → Payment success confirmation
/billing/failure              → Payment failure & troubleshooting
/subscription                 → Full subscription details & features
```

### **Component Usage**

```javascript
// Add subscription card to dashboard
import SubscriptionCard from '@/components/subscription/SubscriptionCard';

<SubscriptionCard />

// In any page, check subscription
const response = await fetch('/api/subscription/usage');
const { data } = await response.json();

// Check if feature available
if (data.plan.features.canExportReports) {
  showExportButton();
}

// Check quota
if (data.percentageUsed.Campaigns.percentage >= 80) {
  showWarningAlert();
}
```

---

## 📊 5-TIER PRICING TABLE

| Feature | Trial | Starter | Growth | Professional | Enterprise |
|---------|-------|---------|--------|--------------|------------|
| **Price** | Free | ₹499/mo | ₹1,499/mo | ₹4,999/mo | Custom |
| **Duration** | 14 days | Monthly | Monthly | Monthly | Custom |
| **Stores** | 1 | 1 | 10 | 50 | ∞ |
| **Campaigns** | 1 | 3 | 20 | ∞ | ∞ |
| **Scratch Cards/mo** | 1K | 10K | 100K | ∞ | ∞ |
| **Scans/month** | ∞ | 50K | ∞ | ∞ | ∞ |
| **Analytics** | ✗ | ✓ | ✓ Real-time | ✓ Advanced | ✓ AI |
| **API Access** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Custom Domain** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **Dedicated Support** | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 🔐 FEATURE FLAGS (30+)

### **Enabled by Tier**

```
Trial:        canCreateCampaign, canAddStore
Starter:      + canViewAnalytics, canUseEmailIntegration
Growth:       + canViewRealTimeAnalytics, canExportReports, 
              canUseMultiStore, canUseWhatsAppIntegration
Professional: + canUseAPI, canUseCustomDomain, canAddManagers,
              canScheduleReports, canUseWebhooks
Enterprise:   All features + canUseAI, canUsePredictiveAnalytics
```

---

## 💳 PAYMENT FLOW

```
1. User clicks "Choose Plan" on /billing/upgrade
   ↓
2. Frontend calls POST /api/payment/create-order
   ↓
3. Backend creates Razorpay order (in paise)
   ↓
4. Frontend initializes Razorpay popup
   ↓
5. User enters card & confirms payment
   ↓
6. Razorpay sends webhook to /api/payment/webhook
   ↓
7. Backend verifies HMAC signature
   ↓
8. Backend creates Subscription & SubscriptionUsage
   ↓
9. Frontend redirects to /billing/success
   ↓
10. User sees confirmation & can use new plan
```

---

## 🚀 QUICK START

### **1. Seed Subscription Plans**

```bash
# In MongoDB, run this seed
node -e "require('./lib/seeds/subscriptionPlans').seedSubscriptionPlans()"

# Or manually insert in MongoDB:
# Collection: subscriptionplans
# See: lib/seeds/subscriptionPlans.js for structure
```

### **2. Configure Razorpay**

```env
# .env.local
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
```

### **3. Set Up Webhook**

```
Razorpay Dashboard → Settings → Webhooks
URL: https://yourdomain.com/api/payment/webhook
Events: payment.authorized, payment.captured, payment.failed
Active: YES
```

### **4. Test Trial Plan**

```javascript
// Try assigning trial plan to user
fetch('/api/subscription/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planName: 'Trial',
    billingCycle: 'monthly'
  })
});
```

---

## 📈 USAGE TRACKING

### **Metrics Tracked**

```
- totalStoresCreated
- activeCampaigns
- scratchCardsGenerated
- scratchCardsRedeemed
- totalScans
- totalParticipations
- uniqueCustomers
- teamMembers
- managers
- reportsGenerated
- apiCallsUsed
```

### **Increment Metric**

```javascript
// In any API handler
import { incrementUsageMetric } from '@/lib/subscriptionAccessGuard';

// Called after action completes
await incrementUsageMetric(merchantId, 'metrics.activeCampaigns', 1);
```

### **Auto Alerts**

```
At 80% usage  → Warning alert (yellow)
At 95% usage  → Critical alert (red)

Example:
- "Campaigns: 19/20 (95%) - Approaching limit"
```

---

## 🧪 TESTING COMMANDS

### **Test Get Plans**
```bash
curl -X GET http://localhost:3000/api/subscription/plans
```

### **Test Usage API**
```bash
curl -X GET http://localhost:3000/api/subscription/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Create Order**
```bash
curl -X POST http://localhost:3000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"planName":"Growth","billingCycle":"monthly"}'
```

---

## 🎨 STYLING

### **Color Tokens**

```css
/* Primary Colors */
--color-primary: #ef9e1b (Orange)
--color-navy: #010f44 (Dark Blue)
--color-success: #0a8905 (Green)
--color-warning: #ffc107 (Yellow)
--color-error: #ff6b6b (Red)

/* Backgrounds */
--bg-light: #f9f9f9
--bg-dark: #1a1a1a
--bg-card: #ffffff (light) / #1a1a1a (dark)

/* Text */
--text-primary: #010f44 (light) / #ffffff (dark)
--text-secondary: #666
--text-muted: #999
```

### **Responsive Breakpoints**

```css
Desktop:  1200px+ (3-column layouts)
Tablet:   768px-1199px (2-column)
Mobile:   320px-767px (1-column)
```

---

## 🔄 DATABASE SCHEMAS

### **SubscriptionPlan**
```javascript
{
  name: String,
  displayName: String,
  description: String,
  tier: Number (0-4),
  recommended: Boolean,
  isPublic: Boolean,
  isTrialPlan: Boolean,
  trialDurationDays: Number,
  price: { monthly: Number, annual: Number },
  limits: {
    maxStores: Number,
    maxCampaigns: Number,
    maxScratchCardsPerMonth: Number,
    maxMonthlyScans: Number,
    maxManagersPerAccount: Number
  },
  features: { 30+ boolean flags },
  createdAt: Date,
  updatedAt: Date
}
```

### **Subscription**
```javascript
{
  merchantId: ObjectId,
  planId: ObjectId,
  status: "trial" | "active" | "cancelled" | "expired",
  billingCycle: "monthly" | "annual",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  trialEndsAt: Date (null if not trial),
  cancelledAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **SubscriptionUsage**
```javascript
{
  merchantId: ObjectId,
  billingPeriod: { start: Date, end: Date },
  isActive: Boolean,
  metrics: {
    totalStoresCreated: Number,
    activeCampaigns: Number,
    scratchCardsGenerated: Number,
    scratchCardsRedeemed: Number,
    totalScans: Number,
    totalParticipations: Number,
    uniqueCustomers: Number,
    teamMembers: Number,
    managers: Number,
    reportsGenerated: Number,
    apiCallsUsed: Number
  },
  quotaExceeded: { [limitName]: Boolean },
  alerts: Array<{ type, message, metric, threshold }>,
  resetAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 COMMON TASKS

### **Assign Trial to New User**
```javascript
await fetch('/api/subscription/assign', {
  method: 'POST',
  body: JSON.stringify({ planName: 'Trial', billingCycle: 'monthly' })
});
```

### **Check if Feature Available**
```javascript
const { data } = await fetch('/api/subscription/usage').then(r => r.json());
const canExport = data.plan.features.canExportReports;
```

### **Show Usage Warning**
```javascript
const { percentageUsed } = data;
if (percentageUsed.Campaigns.percentage >= 80) {
  showAlert(`${percentageUsed.Campaigns.current}/${percentageUsed.Campaigns.limit} campaigns used`);
}
```

### **Get Upgrade Options**
```javascript
const { upgrade } = await fetch('/api/subscription/details').then(r => r.json());
console.log(`Upgrade to ${upgrade.displayName} for ₹${upgrade.price.monthly}`);
console.log(`New features: ${upgrade.newFeatures.join(', ')}`);
```

---

## 📞 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Plans not showing | Run seed script: `seedSubscriptionPlans()` |
| Payment webhook not triggering | Register webhook URL in Razorpay dashboard |
| Feature denied with 403 | User needs to upgrade plan |
| Usage not incrementing | Call `incrementUsageMetric()` after action |
| Dark mode colors wrong | Check `@media (prefers-color-scheme: dark)` CSS |
| Mobile layout broken | Check `@media (max-width: 768px)` CSS |
| Trial not expiring | Set up monthly reset cron job |

---

## 📚 DOCUMENTATION FILES

```
SUBSCRIPTION_PHASE1_SUMMARY.md  → Infrastructure details
SUBSCRIPTION_PHASE2_SUMMARY.md  → Usage tracking details
SUBSCRIPTION_SYSTEM_COMPLETE.md → Full system overview
SUBSCRIPTION_QUICK_REFERENCE.md → This file
```

---

## ✅ STATUS

```
✅ Phase 1: Infrastructure      Complete
✅ Phase 2: Usage Tracking      Complete
✅ Phase 3: Payment Integration Complete
✅ Phase 4: Frontend UI         Complete

🚀 PRODUCTION READY
```

---

**Last Updated**: 2026-06-05
**Version**: 1.0 Production Ready
**Support**: support@scratchx.com
