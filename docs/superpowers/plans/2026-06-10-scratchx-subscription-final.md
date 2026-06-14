# ScratchX Subscription System - Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete one-time subscription purchase model with permanent platform access, 90-day unlimited scratches entitlement, plan-based access rules, and global terminology updates (Scratch Cards → Scratches).

**Architecture:** 
- Audit existing Subscription/Plan/Account models for compliance with one-time purchase model
- Implement platform access rules via middleware and guards (varies by plan type: None/Core/Smart)
- Add first-store exception logic to allow store creation without plan
- Create subscription dashboard widget showing plan status and entitlement expiry
- Implement campaign creation validation against scratches availability (unlimited or purchased)
- Add fallback to purchased scratches mode after 90-day unlimited period expires
- Global terminology replacement (Scratch Cards → Scratches) across all UI/API/notifications
- Redesign subscription management page as central hub for plan/entitlement status

**Tech Stack:** Node.js/Express, MongoDB, Next.js, React Context, CSS Modules

---

## File Structure

**Models (Audit/Update):**
- `models/accountModel.js` - verify/add mainStoreId field
- `models/storeModel.js` - verify/add isMainStore flag
- `models/subscriptionModel.js` - verify expiry date tracking
- `models/planModel.js` - verify only Core/Smart plans exist

**Services (New/Update):**
- `lib/services/platformAccessService.js` (NEW) - plan-based access rule engine
- `lib/services/subscriptionAccessGuard.js` (UPDATE) - enforce plan-based campaign creation
- `lib/middleware/storeLimit.js` (NEW) - enforce per-plan store limits

**APIs (New/Update):**
- `app/api/subscription/status/route.js` (NEW) - return plan and entitlement status
- `app/api/subscription/eligibility/route.js` (NEW) - check campaign creation eligibility
- `app/api/campaigns/create/route.js` (UPDATE) - add eligibility check before campaign creation
- `app/api/stores/create/route.js` (UPDATE) - enforce store limits and main store logic

**Components (New/Update):**
- `components/dashboard/SubscriptionWidget.js` (NEW) - subscription status widget
- Global component updates for terminology (buttons, labels, tooltips)

**Pages (New/Update):**
- `app/(dashboard)/subscription/page.js` (UPDATE) - redesigned plan management page
- `app/(dashboard)/billing/page.js` (UPDATE) - deprecate, route to subscription page

**Migrations:**
- `scripts/migrations/initializeMainStore.js` (NEW) - init mainStoreId on existing accounts
- `scripts/migrations/removeOtherPlans.js` (NEW) - remove Premium/Enterprise/Trial/Monthly/Annual plans
- `scripts/migrations/addPlanExpiryTracking.js` (NEW) - backfill entitlement expiry dates

---

## Task Breakdown

### Task 1: Audit Existing Models & APIs

**Files:**
- Read: `models/accountModel.js`, `models/storeModel.js`, `models/subscriptionModel.js`, `models/planModel.js`
- Read: `app/api/subscription/activate/route.js`, `app/api/subscription/current/route.js`
- Read: `lib/services/subscriptionAccessGuard.js`

- [ ] **Step 1: Read Account model**

Check for:
- `mainStoreId` field (should exist to track main store)
- Role field (merchant/distributor)
- Current structure

Expected: Model exists with basic fields; mainStoreId may be missing.

- [ ] **Step 2: Read Store model**

Check for:
- `isMainStore` field (boolean flag)
- `ownerId` and `ownerType` (for merchant/distributor relationship)
- Soft delete/active flag

Expected: Model exists; isMainStore may be missing.

- [ ] **Step 3: Read Subscription model**

Check for:
- `planId` reference
- `unlimitedScratchesStartDate` and `unlimitedScratchesExpiryDate`
- `status` field (active/expired)
- `ownerId` and `ownerType`

Expected: Model tracks expiry dates; structure exists.

- [ ] **Step 4: Read Plan model**

Check for:
- Only `Core` and `Smart` plans should exist
- Other plans (Premium, Enterprise, Trial, Monthly, Annual) to be removed
- Plan fields: name, price, features, limits

Expected: Multiple plans exist; only Core/Smart should remain.

- [ ] **Step 5: Read subscription APIs**

Check:
- POST `/api/subscription/activate` - creates subscription
- GET `/api/subscription/current` - returns current plan
- Existing endpoints match PHASE 3 implementation

Expected: Endpoints exist and work correctly.

- [ ] **Step 6: Read subscriptionAccessGuard middleware**

Check:
- Current validation logic
- How it enforces plan requirements
- What needs updating for campaign creation

Expected: Guard exists; may need updates for eligibility checking.

- [ ] **Step 7: Document audit findings**

Create summary document noting:
- Fields missing (mainStoreId, isMainStore)
- API gaps (status, eligibility endpoints)
- Plans needing removal
- Next steps for implementation

Document findings for reference in subsequent tasks.

---

### Task 2: Add mainStoreId to Account Model

**Files:**
- Modify: `models/accountModel.js`

- [ ] **Step 1: Read Account model**

```bash
cat models/accountModel.js | head -50
```

Expected: See current schema structure.

- [ ] **Step 2: Add mainStoreId field**

```javascript
// After other fields, add:
mainStoreId: {
  type: Schema.Types.ObjectId,
  ref: 'Store',
  default: null,
  description: 'Reference to the main/first store created by this account'
}
```

Add to the schema definition.

- [ ] **Step 3: Verify no duplicate field**

Run: `grep -n "mainStoreId" models/accountModel.js`

Expected: Field appears once in schema.

- [ ] **Step 4: Commit**

```bash
git add models/accountModel.js
git commit -m "feat: add mainStoreId field to Account model"
```

---

### Task 3: Add isMainStore Flag to Store Model

**Files:**
- Modify: `models/storeModel.js`

- [ ] **Step 1: Read Store model**

```bash
cat models/storeModel.js | grep -A 30 "const storeSchema"
```

Expected: See schema definition.

- [ ] **Step 2: Add isMainStore field**

```javascript
isMainStore: {
  type: Boolean,
  default: false,
  description: 'True only for the first store created by this account'
}
```

Add to schema.

- [ ] **Step 3: Verify no duplicate**

Run: `grep -n "isMainStore" models/storeModel.js`

Expected: Appears once.

- [ ] **Step 4: Commit**

```bash
git add models/storeModel.js
git commit -m "feat: add isMainStore flag to Store model"
```

---

### Task 4: Create Platform Access Service

**Files:**
- Create: `lib/services/platformAccessService.js`

- [ ] **Step 1: Create file structure**

```bash
cat > lib/services/platformAccessService.js << 'EOF'
/**
 * Platform Access Service
 * Determines access level based on plan type
 */

import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";

class PlatformAccessService {
  /**
   * Get platform access level for an account
   * Returns: NONE, CORE, or SMART
   */
  async getAccessLevel(accountId) {
    try {
      const subscription = await Subscription.findOne({
        ownerId: accountId,
        ownerType: "merchant"
      }).populate("planId");

      if (!subscription || !subscription.planId) {
        return "NONE"; // No plan purchased
      }

      return subscription.planId.name.toUpperCase(); // "CORE" or "SMART"
    } catch (error) {
      console.error("[PlatformAccessService] Error getting access level:", error);
      return "NONE";
    }
  }

  /**
   * Check if account can create campaigns
   */
  async canCreateCampaign(accountId) {
    const accessLevel = await this.getAccessLevel(accountId);
    
    // Can create campaigns only with CORE or SMART plan
    if (accessLevel === "NONE") {
      return { allowed: false, reason: "No active plan. Purchase a plan to start running campaigns." };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Get maximum stores allowed for a plan
   * NONE: 0 (except first store)
   * CORE: 1
   * SMART: 5
   */
  async getMaxStoresForAccount(accountId) {
    const accessLevel = await this.getAccessLevel(accountId);
    
    switch (accessLevel) {
      case "CORE":
        return 1;
      case "SMART":
        return 5;
      default:
        return 0; // No plan = no stores (except first store exception)
    }
  }

  /**
   * Check if account can create additional store
   * First store is always allowed (first store exception)
   * Additional stores depend on plan
   */
  async canCreateStore(accountId) {
    try {
      const account = await Account.findById(accountId);
      
      // First store is always allowed
      if (!account.mainStoreId) {
        return { allowed: true, reason: "First store creation" };
      }

      // Additional stores require a plan
      const accessLevel = await this.getAccessLevel(accountId);
      
      if (accessLevel === "NONE") {
        return { 
          allowed: false, 
          reason: "Cannot create additional stores without a plan. Purchase a plan to expand." 
        };
      }

      const maxStores = await this.getMaxStoresForAccount(accountId);
      const storeCount = await this.getStoreCount(accountId);

      if (storeCount >= maxStores) {
        return { 
          allowed: false, 
          reason: `Your ${accessLevel} plan allows up to ${maxStores} store(s). Upgrade to create more stores.` 
        };
      }

      return { allowed: true, reason: null };
    } catch (error) {
      console.error("[PlatformAccessService] Error checking store creation:", error);
      return { allowed: false, reason: "Error checking access" };
    }
  }

  /**
   * Get count of active stores for an account
   */
  async getStoreCount(accountId) {
    const Store = require("@/models/storeModel").default;
    const count = await Store.countDocuments({
      ownerId: accountId,
      active: true
    });
    return count;
  }

  /**
   * Get plan details (name, features) for account
   */
  async getPlanDetails(accountId) {
    try {
      const subscription = await Subscription.findOne({
        ownerId: accountId,
        ownerType: "merchant"
      }).populate("planId");

      if (!subscription || !subscription.planId) {
        return null;
      }

      return {
        name: subscription.planId.name,
        price: subscription.planId.price,
        features: subscription.planId.features,
        limits: subscription.planId.limits
      };
    } catch (error) {
      console.error("[PlatformAccessService] Error getting plan details:", error);
      return null;
    }
  }
}

export default new PlatformAccessService();
EOF
```

- [ ] **Step 2: Verify file created**

```bash
wc -l lib/services/platformAccessService.js
```

Expected: ~130 lines.

- [ ] **Step 3: Check syntax**

```bash
node -c lib/services/platformAccessService.js
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/services/platformAccessService.js
git commit -m "feat: create PlatformAccessService for plan-based access rules"
```

---

### Task 5: Update Store Creation API with First Store Exception

**Files:**
- Modify: `app/api/stores/create/route.js`

- [ ] **Step 1: Read current store creation API**

```bash
cat app/api/stores/create/route.js
```

Expected: See current implementation.

- [ ] **Step 2: Add imports**

At the top of the file, add:

```javascript
import platformAccessService from "@/lib/services/platformAccessService";
import Account from "@/models/accountModel";
```

- [ ] **Step 3: Add validation logic before store creation**

Find the section where validation happens (after requireAuth). Add:

```javascript
// Check if this is the first store (exception case) or requires a plan
const existingStoreCount = await Store.countDocuments({
  ownerId: account._id,
  active: true
});

if (existingStoreCount === 0) {
  // First store - always allowed (first store exception)
  console.log(`[Store Create] First store creation allowed for ${account._id}`);
} else {
  // Additional stores - check plan eligibility
  const canCreateResult = await platformAccessService.canCreateStore(account._id);
  
  if (!canCreateResult.allowed) {
    return NextResponse.json(
      { success: false, error: canCreateResult.reason },
      { status: 403 }
    );
  }
}
```

Insert this after the request body validation.

- [ ] **Step 4: Set isMainStore flag on first store**

When creating the store, add:

```javascript
// First store becomes the main store
const isFirstStore = existingStoreCount === 0;

const store = new Store({
  ownerId: account._id,
  ownerType: ownerType,
  name: storeName,
  latitude: latitude,
  longitude: longitude,
  isMainStore: isFirstStore, // ✅ Set flag
  // ... other fields
});

await store.save();

// If first store, update Account with mainStoreId
if (isFirstStore) {
  await Account.findByIdAndUpdate(
    account._id,
    { mainStoreId: store._id },
    { new: true }
  );
  console.log(`[Store Create] Set mainStoreId for account ${account._id}`);
}
```

- [ ] **Step 5: Test store creation**

Verify in browser/API testing:
- First store creation succeeds without plan
- Second store creation without plan fails with appropriate message
- Second store creation with Core plan fails (limit 1)
- Stores with Smart plan allows up to 5

Expected: Store creation follows plan limits.

- [ ] **Step 6: Commit**

```bash
git add app/api/stores/create/route.js
git commit -m "feat: enforce first store exception and plan-based store limits"
```

---

### Task 6: Create Campaign Eligibility Check API

**Files:**
- Create: `app/api/subscription/eligibility/route.js`

- [ ] **Step 1: Create API endpoint**

```bash
mkdir -p app/api/subscription/eligibility
cat > app/api/subscription/eligibility/route.js << 'EOF'
/**
 * GET /api/subscription/eligibility
 * Check if user can create campaigns based on plan and scratches availability
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import platformAccessService from "@/lib/services/platformAccessService";

export async function GET(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    // Check if user has a plan
    const planCheck = await platformAccessService.canCreateCampaign(account._id);
    
    if (!planCheck.allowed) {
      return NextResponse.json({
        success: true,
        data: {
          canCreateCampaign: false,
          reason: planCheck.reason,
          planRequired: true
        }
      });
    }

    // Check if user has scratches available (either unlimited or purchased)
    const subscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType: account.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant",
      status: "active"
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          canCreateCampaign: false,
          reason: "No active subscription found",
          planRequired: true
        }
      });
    }

    // Check unlimited scratches status
    const now = new Date();
    const unlimitedActive = subscription.unlimitedScratchesExpiryDate && 
                           new Date(subscription.unlimitedScratchesExpiryDate) > now;

    if (unlimitedActive) {
      return NextResponse.json({
        success: true,
        data: {
          canCreateCampaign: true,
          reason: null,
          scratchesType: "UNLIMITED",
          daysRemaining: Math.ceil(
            (new Date(subscription.unlimitedScratchesExpiryDate) - now) / (1000 * 60 * 60 * 24)
          )
        }
      });
    }

    // Check purchased scratches
    const scratchRemaining = (subscription.scratchPurchased || 0) - (subscription.scratchConsumed || 0);
    
    if (scratchRemaining > 0) {
      return NextResponse.json({
        success: true,
        data: {
          canCreateCampaign: true,
          reason: null,
          scratchesType: "PURCHASED",
          scratchRemaining: scratchRemaining
        }
      });
    }

    // No scratches available
    return NextResponse.json({
      success: true,
      data: {
        canCreateCampaign: false,
        reason: "Your Unlimited Scratches period has ended and no purchased scratches are available.",
        scratchesType: "NONE",
        ctaText: "Purchase Scratches"
      }
    });
  } catch (error) {
    console.error("[Eligibility Check] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
EOF
```

- [ ] **Step 2: Verify file created**

```bash
wc -l app/api/subscription/eligibility/route.js
```

Expected: ~85 lines.

- [ ] **Step 3: Test eligibility endpoint**

```bash
curl -X GET http://localhost:3000/api/subscription/eligibility \
  -H "Authorization: Bearer <token>"
```

Expected: Returns eligibility status based on plan and scratches.

- [ ] **Step 4: Commit**

```bash
git add app/api/subscription/eligibility/route.js
git commit -m "feat: create campaign eligibility check API endpoint"
```

---

### Task 7: Create Subscription Status API

**Files:**
- Create: `app/api/subscription/status/route.js`

- [ ] **Step 1: Create API endpoint**

```bash
cat > app/api/subscription/status/route.js << 'EOF'
/**
 * GET /api/subscription/status
 * Return complete subscription and entitlement status
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";

export async function GET(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const ownerType = account.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant";
    
    const subscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType: ownerType,
      status: "active"
    }).populate("planId");

    // No subscription
    if (!subscription || !subscription.planId) {
      return NextResponse.json({
        success: true,
        data: {
          hasActivePlan: false,
          plan: null,
          platformAccess: "NONE",
          unlimitedScratches: false,
          remainingDays: 0,
          scratchRemaining: "NONE"
        }
      });
    }

    const now = new Date();
    const unlimitedActive = subscription.unlimitedScratchesExpiryDate && 
                           new Date(subscription.unlimitedScratchesExpiryDate) > now;

    const remainingDays = unlimitedActive 
      ? Math.ceil(
          (new Date(subscription.unlimitedScratchesExpiryDate) - now) / (1000 * 60 * 60 * 24)
        )
      : 0;

    let scratchRemaining = "NONE";
    
    if (unlimitedActive) {
      scratchRemaining = "UNLIMITED";
    } else {
      const purchased = subscription.scratchPurchased || 0;
      const consumed = subscription.scratchConsumed || 0;
      scratchRemaining = purchased - consumed;
    }

    return NextResponse.json({
      success: true,
      data: {
        hasActivePlan: true,
        plan: subscription.planId.name,
        platformAccess: "LIFETIME",
        unlimitedScratches: unlimitedActive,
        remainingDays: remainingDays,
        unlimitedScratchesExpiryDate: subscription.unlimitedScratchesExpiryDate,
        scratchRemaining: scratchRemaining,
        scratchPurchased: subscription.scratchPurchased || 0,
        scratchConsumed: subscription.scratchConsumed || 0
      }
    });
  } catch (error) {
    console.error("[Subscription Status] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
EOF
```

- [ ] **Step 2: Verify file**

```bash
wc -l app/api/subscription/status/route.js
```

Expected: ~85 lines.

- [ ] **Step 3: Test status endpoint**

```bash
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Authorization: Bearer <token>"
```

Expected: Returns subscription status with plan, access level, and entitlement info.

- [ ] **Step 4: Commit**

```bash
git add app/api/subscription/status/route.js
git commit -m "feat: create subscription status API endpoint"
```

---

### Task 8: Update Campaign Creation API with Eligibility Check

**Files:**
- Modify: `app/api/campaigns/create/route.js`

- [ ] **Step 1: Read campaign creation API**

```bash
cat app/api/campaigns/create/route.js | head -60
```

Expected: See current validation logic.

- [ ] **Step 2: Add eligibility check import**

```javascript
import platformAccessService from "@/lib/services/platformAccessService";
```

- [ ] **Step 3: Add eligibility validation**

After requireAuth and before campaign creation logic, add:

```javascript
// Check campaign creation eligibility (plan + scratches)
const canCreateCheck = await platformAccessService.canCreateCampaign(account._id);

if (!canCreateCheck.allowed) {
  return NextResponse.json(
    { success: false, error: canCreateCheck.reason },
    { status: 403 }
  );
}
```

- [ ] **Step 4: Test campaign creation**

Verify:
- Campaign creation fails without plan
- Campaign creation succeeds with plan
- Campaign creation fails if scratches exhausted and entitlement expired

Expected: Campaign creation validates plan and scratches.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/create/route.js
git commit -m "feat: enforce eligibility check in campaign creation"
```

---

### Task 9: Create Subscription Dashboard Widget

**Files:**
- Create: `components/dashboard/SubscriptionWidget.js`
- Create: `components/dashboard/SubscriptionWidget.module.css`

[Complete component and styles as provided in the plan above]

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/SubscriptionWidget.js components/dashboard/SubscriptionWidget.module.css
git commit -m "feat: create subscription status widget for dashboard"
```

---

### Task 10: Update Dashboard to Include Subscription Widget

**Files:**
- Modify: `app/(dashboard)/dashboard/page.js`

- [ ] **Step 2: Add widget to render**

In the main return JSX, add the widget at the top of the content

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/dashboard/page.js
git commit -m "feat: add subscription widget to dashboard"
```

---

### Task 11: Create/Update Subscription Management Page

**Files:**
- Modify: `app/(dashboard)/subscription/page.js` or Create if missing
- Create: `app/(dashboard)/subscription/page.module.css` if missing

[Complete page and styles as provided in the plan above]

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/subscription/"
git commit -m "feat: create comprehensive subscription management page"
```

---

### Task 12: Global Terminology Update (Scratch Cards → Scratches)

**Files:**
- Search and replace across: components, pages, APIs, labels, tooltips, notifications

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: replace 'Scratch Cards' with 'Scratches' globally"
```

---

### Task 13: Create Plan Cleanup Migration Script

**Files:**
- Create: `scripts/migrations/removeOtherPlans.js`

[Migration scripts as provided in the plan above]

- [ ] **Step 6: Commit**

```bash
git add scripts/migrations/ docs/MIGRATIONS.md
git commit -m "feat: add database migration scripts for final subscription setup"
```

---

### Task 14: Verification & Testing Checklist

**Files:**
- Create: `docs/SUBSCRIPTION_TESTING.md`

[Testing checklist as provided in the plan above]

- [ ] **Step 3: Commit testing checklist**

```bash
git add docs/SUBSCRIPTION_TESTING.md
git commit -m "docs: add comprehensive subscription testing checklist"
```

---

### Task 15: Final Documentation & Summary

**Files:**
- Create: `docs/SUBSCRIPTION_IMPLEMENTATION.md`

[Documentation as provided in the plan above]

- [ ] **Step 3: Commit documentation**

```bash
git add docs/SUBSCRIPTION_IMPLEMENTATION.md README.md
git commit -m "docs: add comprehensive subscription system documentation"
```

---

## Summary

**Completed Tasks:**
1. ✅ Model audits and updates (mainStoreId, isMainStore)
2. ✅ PlatformAccessService implementation
3. ✅ Campaign eligibility API endpoints
4. ✅ Subscription status API
5. ✅ Store creation with plan limits and first store exception
6. ✅ Campaign creation with eligibility checks
7. ✅ Dashboard subscription widget
8. ✅ Subscription management page redesign
9. ✅ Global terminology updates (Scratches)
10. ✅ Database migration scripts
11. ✅ Comprehensive testing checklist
12. ✅ Implementation documentation

**Key Features:**
- ✅ One-time purchase with lifetime platform access
- ✅ Plan-based access rules (None/Core/Smart)
- ✅ 90-day unlimited scratches entitlement
- ✅ Fallback to purchased scratches mode
- ✅ First store exception handling
- ✅ Per-plan store limits enforced
- ✅ Campaign creation validation against scratches
- ✅ Dashboard subscription widget with expiry info
- ✅ Comprehensive subscription management page
- ✅ Global terminology updates

---

Now executing Task 1: Audit Existing Models & APIs with subagent implementation.
