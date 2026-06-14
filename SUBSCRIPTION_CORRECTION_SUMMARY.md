# SCRATCHX SUBSCRIPTION SYSTEM - CORRECTION IMPLEMENTATION SUMMARY

## ✅ COMPLETED CHANGES

### 1. SCHEMA CHANGES

#### Subscription Model (models/subscriptionModel.js)
**ADDED:**
```javascript
planType: {
  type: String,
  enum: ["CORE", "SMART"],
  required: true,
}
```
- Enables quick plan type identification without populating planId

#### Account Model (models/accountModel.js)
**ADDED:**
```javascript
activePlan: {
  type: String,
  enum: ["CORE", "SMART", null],
  default: null,
},
subscriptionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subscription',
  default: null,
},
subscriptionStartDate: {
  type: Date,
  default: null,
},
subscriptionEndDate: {
  type: Date,
  default: null,
},
scratchExpiryDate: {
  type: Date,
  default: null,
}
```
- Tracks current plan and subscription dates
- mainStoreId already existed

#### Store Model (models/storeModel.js)
**VERIFIED - NO CHANGES NEEDED:**
- is_main_store: already exists
- isExtraStore: already exists
- extraStoreFee: already exists

---

### 2. API CHANGES

#### GET /api/subscription/plans (CRITICAL UPDATE)
**File:** app/api/subscription/plans/route.js

**CHANGES:**
- ✅ Removed Premium plan entirely
- ✅ Returns ONLY Core and Smart plans
- ✅ Correct pricing: Core ₹2,099 (90 days), Smart ₹2,999 (90 days)
- ✅ Removed artificial limits (no maxCampaigns, maxScratchCardsPerMonth)
- ✅ Campaigns and Scratches are UNLIMITED while subscription active
- ✅ Core: maxStores = 1
- ✅ Smart: maxStores = 5 (1 main + 4 extra @ ₹199 each)
- ✅ Hardcoded plans (no database lookup) for reliability
- ✅ Public endpoint (NO auth required)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "plan_core",
      "name": "Core",
      "planType": "CORE",
      "displayName": "ScratchX Core",
      "description": "Perfect for single store operations",
      "tier": 1,
      "recommended": false,
      "duration": 90,
      "price": {
        "base": 2099,
        "withGST": 2477
      },
      "features": { /* detailed features */ },
      "limits": {
        "maxStores": 1,
        "additionalStores": 0,
        "additionalStorePrice": 0
      }
    },
    {
      "_id": "plan_smart",
      "name": "Smart",
      "planType": "SMART",
      "displayName": "ScratchX Smart",
      "description": "Ideal for growing businesses with multiple stores",
      "tier": 2,
      "recommended": true,
      "duration": 90,
      "price": {
        "base": 2999,
        "withGST": 3539,
        "extraStore": 199,
        "extraStoreWithGST": 235
      },
      "features": { /* detailed features */ },
      "limits": {
        "maxStores": 5,
        "mainStores": 1,
        "additionalStores": 4,
        "additionalStorePrice": 199
      }
    }
  ]
}
```

---

### 3. BILLING PAGE REDESIGN

**File:** app/(dashboard)/billing/page.js (NEW)
**CSS:** app/(dashboard)/billing/billing.module.css (NEW)

**FEATURES:**
- ✅ Displays CORE and SMART plans side-by-side
- ✅ Correct pricing: ₹2,099 (Core) and ₹2,999 (Smart)
- ✅ Shows GST calculation (18%)
- ✅ Store limits clearly displayed
- ✅ Feature comparison table
- ✅ "RECOMMENDED" badge on Smart plan
- ✅ CTA buttons (Get Core / Start with Smart)
- ✅ FAQ section
- ✅ Dark mode support
- ✅ Mobile responsive
- ✅ Professional design matching ScratchX brand

---

## 📋 PENDING CHANGES (NEXT STEPS)

### 4. SEED DATA UPDATES
**File:** seeds/ or database seed files

**REQUIRED:**
1. Delete plan_premium from SubscriptionPlan collection
2. Update plan_core:
   - name: "Core"
   - displayName: "ScratchX Core"
   - price: { monthly: 2099, annual: null }
   - duration: 90 days
   - limits: { maxStores: 1 }
3. Update plan_smart:
   - name: "Smart"
   - displayName: "ScratchX Smart"
   - price: { monthly: 2999, annual: null }
   - duration: 90 days
   - limits: { maxStores: 5 }

---

### 5. VALIDATION MIDDLEWARE UPDATES
**File:** lib/services/subscriptionValidationService.js

**REQUIRED CHANGES:**

#### canCreateStore() Function
```javascript
async canCreateStore(merchantId, planName) {
  const allStores = await Store.countDocuments({ merchant_id: merchantId });
  const isCORE = planName.toLowerCase().includes('core');
  const isSMART = planName.toLowerCase().includes('smart');

  // CORE: max 1 store
  if (isCORE && allStores >= 1) {
    return {
      allowed: false,
      reason: 'CORE plan allows only 1 store. Upgrade to SMART for multiple stores.'
    };
  }

  // SMART: max 5 stores (1 main + 4 extra)
  if (isSMART && allStores >= 5) {
    // Check if marked as extra store
    const mainStore = await Store.findOne({ merchant_id: merchantId, is_main_store: true });
    const existingStores = allStores - 1; // Exclude main store
    
    if (existingStores >= 4) {
      return {
        allowed: false,
        reason: 'SMART plan allows max 4 extra stores. Additional stores cost ₹199 each.',
        canCreateAsExtraStore: true,
        extraStoreFee: 199,
        extraStoreWithGST: 235
      };
    }
  }

  return { allowed: true };
}
```

#### First Store Rule
- Without subscription: ALLOW first store creation
- First store created: set is_main_store = true
- Update Account.mainStoreId = store._id

---

### 6. DASHBOARD UPDATES

#### dashboardService.js
**REQUIRED:**
- Map subscription.planType to activePlan in Account
- Calculate daysRemaining for subscription expiry
- Show expiry alerts at 30/15/7/3/1 days before expiry
- Block campaign creation if subscription expired
- Block additional store creation if subscription expired

**Dashboard Banner:**
```
STATUS: "Your subscription expires in X days"
- 30+ days: Info (blue)
- 15-30 days: Warning (yellow)
- 7-15 days: Urgent (orange)
- 1-7 days: Critical (red)
- 0 days: EXPIRED (red) - Block operations
```

---

### 7. FIRST STORE RULE IMPLEMENTATION

**Without Subscription:**
- ✅ ALLOW: Signup, Login, Settings
- ✅ ALLOW: Create First Store
- ❌ BLOCK: Campaign Creation
- ❌ BLOCK: Campaign Activation
- ❌ BLOCK: Scratch Allocation
- ❌ BLOCK: Additional Store Creation

**First Store Created:**
- is_main_store = true
- Account.mainStoreId = store._id

---

### 8. STORE LIMIT VALIDATIONS

**CORE Plan:**
- Max: 1 store
- All stores: is_main_store = true, isExtraStore = false, extraStoreFee = 0
- Block: Additional store creation after 1 store created

**SMART Plan:**
- Max 5 included stores: 1 main + 4 extra
- Beyond 5 stores: Mark as isExtraStore = true, extraStoreFee = ₹199
- Auto-billing for extra stores at ₹199 each
- Allow unlimited extra stores (charged per store)

---

### 9. SUBSCRIPTION EXPIRY HANDLING

**Before Expiry (Show Alerts):**
- 30 Days: Info notification
- 15 Days: Warning notification
- 7 Days: Urgent notification
- 3 Days: Critical notification
- 1 Day: Critical notification
- 0 Days: EXPIRED

**After Expiry (Block Operations):**
- ✅ ALLOW: Login, View Reports, View Dashboard
- ❌ BLOCK: Campaign Creation
- ❌ BLOCK: Campaign Activation
- ❌ BLOCK: Campaign Assignment
- ❌ BLOCK: Scratch Allocation
- ❌ BLOCK: Additional Store Creation
- Message: "Your subscription has expired. Renew your plan to continue running campaigns."

---

### 10. TERMINOLOGY UPDATES

**Replace Everywhere:**
- "Scratch Cards" → "Scratches"
- "Scratch Card Records" → "Scratch Records"
- "Scratch Allocation" → "Scratch Allocation"

**Locations:**
- APIs
- Database labels
- Dashboard
- Campaigns page
- Notifications
- Billing page
- Settings page
- Analytics page

---

## 🔄 MIGRATION NOTES

### Database Migration
1. Ensure SubscriptionPlan collection has only Core and Smart
2. Delete plan_premium from collection
3. Add planType field to existing Subscription documents
4. Add new fields to Account documents:
   - activePlan
   - subscriptionId
   - subscriptionStartDate
   - subscriptionEndDate
   - scratchExpiryDate

### Code Migration
1. Update all validations to use planType instead of plan name matching
2. Remove Premium plan references from:
   - Seed files
   - Comparison tables
   - UI components
   - API responses
3. Update store creation flow to respect max store limits
4. Update campaign creation to check subscription status

### Testing Checklist
- [ ] Plans API returns only CORE and SMART
- [ ] Correct pricing displayed (₹2,099 and ₹2,999)
- [ ] Billing page shows both plans
- [ ] Core plan allows 1 store, blocks 2nd
- [ ] Smart plan allows 5 stores, charges ₹199 for extras
- [ ] Subscription expiry blocks campaign creation
- [ ] All terminology changed to "Scratches"
- [ ] Dashboard shows plan and expiry countdown
- [ ] Alerts appear at 30/15/7/3/1 days

---

## 📊 BEFORE vs AFTER

### BEFORE (INCORRECT)
- Core: ₹2,999 monthly (WRONG)
- Smart: ₹4,999 monthly (WRONG)
- Premium: ₹9,999 monthly (SHOULD NOT EXIST)
- Per-month scratch limits (WRONG)
- Campaigns per plan (WRONG)

### AFTER (CORRECT)
- Core: ₹2,099 / 90 days (✓ CORRECT)
- Smart: ₹2,999 / 90 days (✓ CORRECT)
- NO Premium (✓ CORRECT)
- Unlimited scratches while active (✓ CORRECT)
- Unlimited campaigns while active (✓ CORRECT)
- Store limits enforced: CORE 1, SMART 5 (✓ CORRECT)

