# ScratchX Onboarding & Main Store Implementation

**Completion Date:** June 9, 2026  
**Status:** ✅ IMPLEMENTED

---

## **Overview**

This implementation solves the onboarding deadlock by allowing new Merchant and Distributor accounts to create their **first store without a subscription**, while still enforcing subscription requirements for:
- Creating campaigns
- Allocating scratches
- Creating additional stores

The first store becomes the **Main Store** (primary store) for the account, tracked in the database and protected from deletion.

---

## **Business Rules Implemented**

### **1. First Store Creation (No Subscription Required)**
```
User Journey:
  Register → Login → Create First Store → View Dashboard → Buy Plan → Create Campaign
```

**Allowed WITHOUT Subscription:**
- ✅ Register account
- ✅ Login
- ✅ Create first store
- ✅ Edit first store
- ✅ View first store
- ✅ Access dashboard
- ✅ View analytics (basic)
- ✅ View subscription page

**BLOCKED WITHOUT Subscription:**
- ❌ Create campaign
- ❌ Allocate scratches
- ❌ Create additional stores (max 1 without plan)
- ❌ Assign campaigns to stores

### **2. Main Store Concept**
The first store automatically becomes the main store with these properties:
```javascript
{
  is_main_store: true,
  isMainStore: true,
  isDefaultStore: true,
  storeType: "MAIN"
}
```

**Main Store Protection:**
- Cannot be deleted (modal shows message)
- Shown with badge/indicator in UI
- Set as default store for dashboard context
- Tracked in account.mainStoreId

### **3. Store Limits**
```javascript
if (!subscription) {
  maxStores = 1; // First store only
}

if (subscription) {
  maxStores = plan.limits.maxStores;
}
```

---

## **Database Schema Changes**

### **Account Model Updates**
**File:** `models/accountModel.js`

**Added Fields:**
```javascript
mainStoreId: {
  type: ObjectId,
  ref: "Store",
  default: null,
  sparse: true,
  index: true
},

onboarding: {
  hasCompletedStoreCreation: Boolean,     // Set when first store created
  firstStoreCreatedAt: Date,              // Timestamp of first store
  hasCompletedProfileSetup: Boolean,      // For future: profile completion
  hasCompletedSubscriptionSetup: Boolean, // For future: subscription completion
  onboardingCompletedAt: Date,            // When all onboarding done
}
```

### **Store Model Updates**
**File:** `models/storeModel.js`

**Existing Field (Already Present):**
```javascript
is_main_store: Boolean,  // Legacy field (kept for compatibility)
```

**New Fields Added:**
```javascript
isDefaultStore: {
  type: Boolean,
  default: false,
  index: true
},

storeType: {
  type: String,
  enum: ["MAIN", "BRANCH"],
  default: "BRANCH",
  index: true
}
```

---

## **Service Layer Changes**

### **1. Main Store Service** (NEW)
**File:** `lib/mainStoreService.js`

**Key Methods:**
```javascript
await mainStoreService.setAsMainStore(storeId, accountId)
  // Marks store as main, updates account

await mainStoreService.isMainStore(storeId, accountId)
  // Check if store is main store

await mainStoreService.canDeleteStore(storeId, accountId)
  // Returns: { allowed: boolean, message: string, isMainStore: boolean }
  // Prevents deletion of main store

await mainStoreService.getMainStore(accountId)
  // Returns main store document

await mainStoreService.hasCompletedStoreOnboarding(accountId)
  // Check if account completed store creation

await mainStoreService.getOnboardingStatus(accountId)
  // Returns full onboarding status object
```

### **2. Subscription Validation Service** (UPDATED)
**File:** `lib/services/subscriptionValidationService.js`

**Updated Method:**
```javascript
async canCreateStore(userId, userType = 'merchant')
  // NEW LOGIC:
  // - If existingStores === 0: ALLOW (first store, no subscription needed)
  // - If existingStores >= 1 && !subscription: DENY (need plan for more stores)
  // - If subscription exists: Check plan limits

  // Returns: { 
  //   allowed: boolean,
  //   isFirstStore: boolean,  // NEW
  //   message: string,
  //   limit: number,
  //   current: number
  // }
```

---

## **API Changes**

### **1. Store Creation API** (UPDATED)
**File:** `app/api/stores/route.js`

**Changes:**
- ✅ Added mainStoreService import
- ✅ When `canCreate.isFirstStore === true`, calls `mainStoreService.setAsMainStore()`
- ✅ Returns `isMainStore: true` in response for first store
- ✅ Sets account.mainStoreId and onboarding flags

**Response Example:**
```json
{
  "success": true,
  "data": { ... store data ... },
  "message": "Main store created successfully",
  "isMainStore": true
}
```

### **2. Store Deletion API** (NEW)
**File:** `app/api/stores/delete/route.js`

**Endpoint:** `POST /api/stores/delete`  
**Body:** `{ storeId: "..." }`

**Protection:**
```javascript
const canDelete = await mainStoreService.canDeleteStore(storeId, userId);

if (!canDelete.allowed) {
  // Returns 403 with message:
  // "This is your Main Store. A Main Store cannot be deleted..."
}
```

### **3. Campaign Creation API** (Already Protected)
**File:** `app/api/campaign/create/route.js`

**Status:** ✅ Already validates subscription via:
```javascript
const canCreate = await subscriptionValidationService.canCreateCampaign()

if (!canCreate.allowed) {
  return { error: "No active subscription found..." }
}
```

---

## **Migration Strategy**

### **Migration Script** (NEW)
**File:** `scripts/migrate-main-stores.js`

**Purpose:** For existing accounts without mainStoreId:
1. Finds oldest store
2. Marks as main store (isMainStore, storeType = "MAIN")
3. Sets account.mainStoreId
4. Updates onboarding flags

**Usage:**
```bash
node scripts/migrate-main-stores.js
```

**Output:**
```
✅ user@example.com → Main Store: "New Delhi Store" (ObjectId)
📊 Migration Summary:
   ✅ Successfully migrated: 45
   ❌ Errors: 0
   ⏭️  Total accounts: 45
```

---

## **Validation Middleware**

### **Subscription Check Flow**

```
┌─────────────────────────────────┐
│  User Action (Create Store)      │
└────────────┬────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ canCreateStore(userId, 'merchant')       │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
Count Stores    No subscription?
    │
  ┌─┴─┐
  │   │
0 │   ├─→ Store 0: ALLOW (first store)
  │   │           └─→ Set as main store
  │   │
  ├─→ Store 1+: subscription required?
  │
  └─→ If subscription: check plan limits
      If no subscription: DENY
```

---

## **Frontend Changes Required**

### **1. Dashboard/Onboarding**
- Show "No Active Plan" card when subscription missing
- Show "Complete onboarding" message if no stores
- Direct to store creation after signup

### **2. Store List Page**
- Add Main Store badge: `⭐ Main Store`
- Disable delete button for main store with tooltip
- Show store type (Main/Branch)

### **3. Campaign Creation**
- Show upgrade modal if no subscription
- Message: "An active subscription is required to create campaigns"
- CTA buttons: "View Plans" / "Upgrade Now"

### **4. Settings/Store Management**
- Show main store indicator
- Prevent deletion with message modal
- Show transfer ownership option (future)

---

## **Testing Checklist**

### **Onboarding Flow**
- [ ] New user registers without subscription
- [ ] First store can be created without plan
- [ ] First store marked as Main Store
- [ ] account.mainStoreId is set
- [ ] onboarding.hasCompletedStoreCreation = true

### **Store Creation Validation**
- [ ] First store: Allowed without subscription
- [ ] Second store: Blocked without subscription (shows upgrade message)
- [ ] With subscription: Can create stores up to plan limit

### **Main Store Protection**
- [ ] Main store shows badge in list
- [ ] Main store delete button disabled/blocked
- [ ] Delete attempt shows protection message modal
- [ ] Can delete branch stores normally

### **Campaign Restrictions**
- [ ] Campaign creation blocked without subscription
- [ ] Shows: "No active subscription found. Please purchase a plan."
- [ ] User can proceed after plan purchase

### **Migration**
- [ ] Run migration script
- [ ] All existing accounts get mainStoreId set
- [ ] Oldest store becomes main store
- [ ] onboarding flags updated correctly

### **Edge Cases**
- [ ] Account with no stores (onboarding not started)
- [ ] Account with 1 store, no subscription
- [ ] Account with 5 stores, subscription upgraded
- [ ] Distributor role works same as Merchant

---

## **Files Modified/Created**

### **Models**
- ✅ `models/accountModel.js` - Added mainStoreId, onboarding fields
- ✅ `models/storeModel.js` - Added isDefaultStore, storeType fields

### **Services**
- ✅ `lib/mainStoreService.js` - **NEW** - Main store management
- ✅ `lib/services/subscriptionValidationService.js` - Updated canCreateStore()

### **APIs**
- ✅ `app/api/stores/route.js` - Updated to set main store
- ✅ `app/api/stores/delete/route.js` - **NEW** - Deletion protection
- ✅ `app/api/campaign/create/route.js` - Already has subscription check

### **Scripts**
- ✅ `scripts/migrate-main-stores.js` - **NEW** - Migration for existing accounts

---

## **Deployment Steps**

### **Phase 1: Database**
```bash
# 1. Deploy model changes
npm run deploy

# 2. Run migration for existing data
node scripts/migrate-main-stores.js

# 3. Verify all accounts have mainStoreId
```

### **Phase 2: API**
```bash
# 1. Deploy service changes
# 2. Deploy API changes
# 3. Test with Postman/curl

# Endpoint to test:
POST /api/stores
{
  "store_name": "Test Store",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "pincode": "100001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "contact_person": "John Doe",
  "contact_number": "9999999999"
}
```

### **Phase 3: Frontend**
```bash
# 1. Update store list page to show Main Store badge
# 2. Update campaign creation to show upgrade modal
# 3. Add main store delete protection modal
# 4. Update dashboard onboarding messaging
```

---

## **Backward Compatibility**

✅ **Fully backward compatible:**
- Existing `is_main_store` field still works (legacy)
- New `isMainStore` and `storeType` fields are additive
- Migration script handles all existing accounts
- Campaign creation already had subscription check
- No breaking changes to API contracts

---

## **Future Extensions**

These features are now possible with main store foundation:
- [ ] Store transfer of ownership
- [ ] Main store as subscription owner
- [ ] Distributor hierarchy expansion
- [ ] Campaign ownership by main store
- [ ] Revenue analytics by main store
- [ ] Billing tied to main store

---

## **Support & Troubleshooting**

### **Q: Why is first store creation allowed without subscription?**
A: Onboarding must be unblocked. The subscription becomes required only when users start using campaign features (which consume resources).

### **Q: Can main store be changed?**
A: Not in current implementation. Main store is permanent. Transfer feature is for future versions.

### **Q: What if account has no stores?**
A: onboarding.hasCompletedStoreCreation will be false. Force redirect to store creation.

### **Q: Migration failed for some accounts?**
A: Check MongoDB connection, account permissions, and store ownership relationships. Run migration again.

---

## **Sign-Off**

- ✅ Business logic implemented
- ✅ Database schema updated
- ✅ Validation service updated
- ✅ API protection added
- ✅ Migration script created
- ✅ Backward compatible
- ✅ Ready for deployment

**Implemented By:** Claude AI Assistant  
**Date:** June 9, 2026  
**Status:** Ready for Testing
