# Phase 1: Subscription Infrastructure Implementation Guide

## ✅ WHAT WAS BUILT

### 1. Enhanced SubscriptionPlan Model
**File**: `models/subscriptionPlanModel.js`

Features:
- 5 subscription tiers: Trial, Starter, Growth, Professional, Enterprise
- Comprehensive limits (stores, campaigns, scratch cards, scans, team)
- 30+ boolean feature flags
- Database indexes for efficient querying
- Hierarchical tier system

```javascript
// Example plan structure
{
  name: "Growth",
  limits: {
    maxStores: 10,
    maxCampaigns: 20,
    maxScratchCardsPerMonth: 100000,
    // ...
  },
  features: {
    canCreateCampaign: true,
    canUseMultiStore: true,
    canExportReports: true,
    // ...
  }
}
```

### 2. SubscriptionUsage Model
**File**: `models/subscriptionUsageModel.js`

Tracks:
- Real-time usage metrics per merchant
- Quota enforcement (stores, campaigns, scans, etc.)
- Alert generation for quota warnings
- Monthly billing period tracking
- Reset functionality for monthly cycles

### 3. Feature Gating Service
**File**: `lib/subscriptionAccessGuard.js`

Core functions:
- `checkPlanAccess(merchantId, featureName)` - Check if feature is enabled
- `checkQuotaLimit(merchantId, limitName, amount)` - Check remaining quota
- `getSubscriptionDetails(merchantId)` - Get full subscription + usage + alerts
- `incrementUsageMetric(merchantId, metric, amount)` - Track usage
- `resetMonthlyUsage(merchantId)` - Reset monthly counters

### 4. Feature Gating Middleware
**File**: `lib/middleware/subscriptionGate.js`

Middleware:
- `requireFeature(featureName, options)` - Gate API endpoint by feature
- `requireAnyFeature(featureNames)` - Gate by multiple features
- `isFeatureEnabled(plan, featureName)` - Check locally
- `isWithinQuota(usage, plan, limit, amount)` - Check quota locally

### 5. Subscription Plans Seed Data
**File**: `lib/seeds/subscriptionPlans.js`

Default plans:
- Trial: 14-day free trial (1 store, 1 campaign, limited features)
- Starter: 1 store, basic analytics, team management
- Growth: 10 stores, advanced features, real-time analytics (RECOMMENDED)
- Professional: 50 stores, unlimited everything, API access
- Enterprise: Unlimited, custom pricing, dedicated support

---

## 🚀 HOW TO USE

### Step 1: Seed Plans to Database

Run once to create default subscription plans:

```javascript
// In an admin endpoint or seed script
import { seedSubscriptionPlans } from "@/lib/seeds/subscriptionPlans";

const result = await seedSubscriptionPlans();
console.log(result); // { success: true, count: 5, plans: [...] }
```

### Step 2: Assign Subscription to Merchant

When merchant signs up or upgrades:

```javascript
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import SubscriptionUsage from "@/models/subscriptionUsageModel";

// Get plan
const plan = await SubscriptionPlan.findOne({ name: "Starter" });

// Create subscription
const subscription = new Subscription({
  merchantId,
  planId: plan._id,
  status: "trial", // or "active"
  billingCycle: "monthly",
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
});
await subscription.save();

// Create usage record
const usage = new SubscriptionUsage({
  subscriptionId: subscription._id,
  merchantId,
  billingPeriod: {
    startDate: subscription.currentPeriodStart,
    endDate: subscription.currentPeriodEnd,
  },
});
await usage.save();
```

### Step 3: Gate API Endpoints by Feature

Wrap endpoint handlers:

```javascript
// app/api/campaigns/route.js
import { requireFeature } from "@/lib/middleware/subscriptionGate";

const handler = async (req, res) => {
  // Your campaign creation logic
  const campaign = await createCampaign(req.body);
  return Response.json({ success: true, data: campaign });
};

export const POST = requireFeature("canCreateCampaign", {
  quota: "maxCampaigns",
  quotaAmount: 1,
  quotaErrorMessage: "Campaign limit",
})(handler);
```

### Step 4: Check Feature Access in Handler

Access subscription info injected by middleware:

```javascript
const handler = async (req, context) => {
  // req.subscriptionInfo = { allowed: true, plan: {...}, subscription: {...} }
  // req.quotaInfo = { allowed: true, remaining: 5, limit: 10, ... }

  const plan = req.subscriptionInfo.plan;
  console.log(`User is on ${plan.name} plan`);

  if (req.quotaInfo) {
    console.log(`Campaigns remaining: ${req.quotaInfo.remaining}`);
  }

  // Your handler logic...
};
```

### Step 5: Track Usage When Actions Happen

Update usage metrics:

```javascript
import { incrementUsageMetric } from "@/lib/subscriptionAccessGuard";

// When campaign is created:
await incrementUsageMetric(merchantId, "metrics.totalCampaignsCreated", 1);
await incrementUsageMetric(merchantId, "metrics.activeCampaigns", 1);

// When QR is scanned:
await incrementUsageMetric(merchantId, "metrics.totalScans", 1);

// When scratch card is redeemed:
await incrementUsageMetric(merchantId, "metrics.scratchCardsRedeemed", 1);
```

---

## 📋 EXAMPLE: Adding Feature Gate to Existing Endpoint

### Before (Current Code)
```javascript
// app/api/campaigns/route.js
export async function POST(request) {
  const body = await request.json();
  const merchantId = request.headers.get("x-user-id");
  
  // Validate
  if (!merchantId) return error(400, "Merchant ID required");
  
  // Create campaign
  const campaign = await createCampaign(merchantId, body);
  
  return success(campaign);
}
```

### After (With Feature Gating)
```javascript
// app/api/campaigns/route.js
import { requireFeature } from "@/lib/middleware/subscriptionGate";

async function handler(request, context) {
  const body = await request.json();
  const merchantId = request.headers.get("x-user-id");
  
  // Validate
  if (!merchantId) return error(400, "Merchant ID required");
  
  // Feature access already checked by middleware!
  const plan = request.subscriptionInfo.plan;
  const remaining = request.quotaInfo?.remaining;
  
  // Create campaign
  const campaign = await createCampaign(merchantId, body);
  
  // Track usage
  await incrementUsageMetric(merchantId, "metrics.totalCampaignsCreated", 1);
  
  return success(campaign);
}

export const POST = requireFeature("canCreateCampaign", {
  quota: "maxCampaigns",
  quotaAmount: 1,
})(handler);
```

---

## 🎯 PRIORITY ENDPOINTS TO GATE (Next Steps)

These should be wrapped with `requireFeature()`:

**Campaign Management:**
- `POST /api/campaigns` → requireFeature("canCreateCampaign", quota: "maxCampaigns")
- `PUT /api/campaigns/[id]` → requireFeature("canCreateCampaign")
- `POST /api/campaigns/[id]/duplicate` → requireFeature("canDuplicateCampaign")
- `POST /api/campaigns/[id]/schedule` → requireFeature("canScheduleCampaign")

**Store Management:**
- `POST /api/stores` → requireFeature("canAddStore", quota: "maxStores")
- `POST /api/stores/[id]/assign-campaigns` → requireFeature("canUseMultiStore")

**Analytics:**
- `GET /api/analytics/*` → requireFeature("canViewAnalytics")
- `POST /api/reports/export` → requireFeature("canExportReports")

**Integrations:**
- `POST /api/integrations/whatsapp` → requireFeature("canUseWhatsAppIntegration")
- `POST /api/integrations/api-key` → requireFeature("canUseAPI")

**Team:**
- `POST /api/team/managers` → requireFeature("canAddManagers")
- `POST /api/team/staff` → requireFeature("canAddStaff")

---

## 📊 MONITORING & ALERTS

Get subscription details with usage + alerts:

```javascript
import { getSubscriptionDetails } from "@/lib/subscriptionAccessGuard";

const details = await getSubscriptionDetails(merchantId);

// details.alerts contains quota warnings
// [{
//   type: "warning",
//   metric: "Campaigns",
//   message: "Campaign usage at 80% of limit",
//   currentUsage: 8,
//   limit: 10,
//   percentage: 80
// }]

// Use in dashboard to show alerts to merchant
```

---

## 🔄 MONTHLY RESET SCHEDULE

Create a cron job to reset monthly usage:

```javascript
// lib/cron/reset-monthly-usage.js
import { resetMonthlyUsage } from "@/lib/subscriptionAccessGuard";
import Subscription from "@/models/subscriptionModel";

export async function resetMonthlyUsageJob() {
  try {
    // Find all active subscriptions
    const subscriptions = await Subscription.find({
      status: { $in: ["trial", "active"] },
    });

    let resetCount = 0;
    for (const sub of subscriptions) {
      await resetMonthlyUsage(sub.merchantId);
      resetCount++;
    }

    console.log(`✅ Reset usage for ${resetCount} merchants`);
  } catch (error) {
    console.error("❌ Error resetting monthly usage:", error);
  }
}
```

Schedule this to run on the 1st of each month.

---

## 🧪 TESTING

### Test 1: Check Feature Access
```javascript
import { checkPlanAccess } from "@/lib/subscriptionAccessGuard";

const access = await checkPlanAccess(merchantId, "canCreateCampaign");
console.log(access.allowed); // true/false
console.log(access.reason); // Why it was denied
```

### Test 2: Check Quota Limit
```javascript
import { checkQuotaLimit } from "@/lib/subscriptionAccessGuard";

const quota = await checkQuotaLimit(merchantId, "maxCampaigns", 1);
console.log(quota.allowed); // true/false
console.log(quota.remaining); // How many left
```

### Test 3: Get Full Details
```javascript
import { getSubscriptionDetails } from "@/lib/subscriptionAccessGuard";

const details = await getSubscriptionDetails(merchantId);
console.log(details.plan.name); // "Growth"
console.log(details.usage.metrics.activeCampaigns); // 5
console.log(details.alerts); // []
```

---

## ⚠️ IMPORTANT NOTES

### 1. Backward Compatibility
- Existing merchants without subscriptions will FAIL checks
- Need migration: assign default subscription to all existing merchants
- Recommended: assign "Growth" plan to all existing merchants (temporary)

### 2. Performance
- Subscription lookups hit database
- Add Redis caching for plans (static data)
- Cache usage metrics for 5-10 seconds

### 3. Trial Period Handling
```javascript
// Check if trial expired
if (subscription.status === "trial" && subscription.trialEndsAt < new Date()) {
  // Trial expired - either:
  // 1. Downgrade to Free tier
  // 2. Ask for payment
  // 3. Block access
}
```

---

## 📁 FILES CREATED/MODIFIED

**Created:**
- ✅ `models/subscriptionUsageModel.js` - New usage tracking model
- ✅ `lib/subscriptionAccessGuard.js` - Core feature gating logic
- ✅ `lib/middleware/subscriptionGate.js` - Express-style middleware
- ✅ `lib/seeds/subscriptionPlans.js` - Default plans seed data

**Modified:**
- ✅ `models/subscriptionPlanModel.js` - Enhanced with features + limits

**To Update (Next Phase):**
- ⏳ `app/api/campaigns/route.js` - Add requireFeature()
- ⏳ `app/api/stores/route.js` - Add requireFeature()
- ⏳ `app/api/analytics/*` - Add requireFeature()
- ⏳ Plus all other protected endpoints

---

## 🎓 QUICK REFERENCE

```javascript
// Feature Check
const { checkPlanAccess } = require("@/lib/subscriptionAccessGuard");
await checkPlanAccess(merchantId, "canCreateCampaign");

// Quota Check
const { checkQuotaLimit } = require("@/lib/subscriptionAccessGuard");
await checkQuotaLimit(merchantId, "maxCampaigns", 1);

// Middleware
const { requireFeature } = require("@/lib/middleware/subscriptionGate");
export const POST = requireFeature("canCreateCampaign", { quota: "maxCampaigns" })(handler);

// Track Usage
const { incrementUsageMetric } = require("@/lib/subscriptionAccessGuard");
await incrementUsageMetric(merchantId, "metrics.activeCampaigns", 1);

// Get Details
const { getSubscriptionDetails } = require("@/lib/subscriptionAccessGuard");
const details = await getSubscriptionDetails(merchantId);
```

---

## 📞 NEXT STEPS

After Phase 1, Phase 2-3 will:
1. ✅ Create subscription management APIs (assign, upgrade, downgrade)
2. ✅ Build usage tracking dashboard
3. ✅ Add quota warning alerts
4. ✅ Create payment integration (Razorpay)
5. ✅ Implement distributor commission tracking

Phase 1 provides the foundation. All feature gating depends on these models & services.
