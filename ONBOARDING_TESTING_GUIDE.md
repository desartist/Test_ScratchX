# Onboarding & Main Store Testing Guide

**Quick Reference for Developers & QA**

---

## **Test Scenario 1: New User Onboarding (No Subscription)**

### **Test Case: First Store Creation Without Subscription**

**Precondition:** New user account created, no subscription, no stores

```bash
# 1. Signup
POST /api/auth/signup
{
  "email": "newuser@test.com",
  "password": "Test123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Merchant"
}
→ Response: { auth_token: "...", account: {...} }

# 2. Try to create store (no subscription)
POST /api/stores
Headers: { auth_token: "...", x-user-id: "...", x-user-role: "Merchant" }
{
  "store_name": "My First Store",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "latitude": 19.0760,
  "longitude": 72.8479,
  "contact_person": "John Doe",
  "contact_number": "9876543210"
}
→ Response: 201 CREATED
{
  "success": true,
  "data": { _id: "...", store_name: "My First Store", ... },
  "message": "Main store created successfully",
  "isMainStore": true
}

# 3. Verify main store in database
db.accounts.findOne({ _id: ObjectId("...") })
{
  "mainStoreId": ObjectId("store_id"),
  "onboarding": {
    "hasCompletedStoreCreation": true,
    "firstStoreCreatedAt": ISODate("2026-06-09T..."),
    ...
  }
}

db.stores.findOne({ _id: ObjectId("store_id") })
{
  "is_main_store": true,
  "isMainStore": true,
  "isDefaultStore": true,
  "storeType": "MAIN"
}
```

**Expected Result:** ✅ First store created successfully as main store

---

## **Test Scenario 2: Blocked Subsequent Store (No Subscription)**

### **Test Case: Second Store Rejected Without Subscription**

**Precondition:** User has 1 store (main), no subscription

```bash
# Try to create second store
POST /api/stores
{
  "store_name": "Second Store",
  ...
}
→ Response: 403 FORBIDDEN
{
  "success": false,
  "error": "Upgrade your plan to create additional stores. Maximum 1 store without subscription.",
  "limit": 1,
  "current": 1
}
```

**Expected Result:** ✅ Second store blocked with upgrade message

---

## **Test Scenario 3: Campaign Blocked Without Subscription**

### **Test Case: Campaign Creation Requires Subscription**

**Precondition:** User has 1 store, no subscription

```bash
# Try to create campaign
POST /api/campaign/create
{
  "campaignName": "Test Campaign",
  "scratchAllocation": 100,
  ...
}
→ Response: 403 FORBIDDEN
{
  "success": false,
  "error": "No active subscription found. Please purchase a plan.",
  "blockCampaignOperations": true
}
```

**Expected Result:** ✅ Campaign creation blocked

---

## **Test Scenario 4: Main Store Delete Protection**

### **Test Case: Cannot Delete Main Store**

**Precondition:** User has main store

```bash
# Try to delete main store
POST /api/stores/delete
{
  "storeId": "main_store_id"
}
→ Response: 403 FORBIDDEN
{
  "success": false,
  "error": "This is your Main Store. A Main Store cannot be deleted. Create another store and transfer ownership before deleting this store.",
  "isMainStore": true
}
```

**Expected Result:** ✅ Delete blocked with protection message

---

## **Test Scenario 5: Can Delete Branch Store**

### **Test Case: Delete Non-Main Store (with subscription)**

**Precondition:** User has subscription, multiple stores, trying to delete branch store

```bash
# First, buy plan (assuming you have this endpoint)
POST /api/billing/activate-plan
{
  "planId": "plan_id",
  "billingCycle": "monthly"
}
→ subscription created

# Now create second store (should work)
POST /api/stores
{
  "store_name": "Branch Store",
  ...
}
→ Response: 201 CREATED (successfully created second store)

# Delete branch store (not main)
POST /api/stores/delete
{
  "storeId": "branch_store_id"
}
→ Response: 200 OK
{
  "success": true,
  "message": "Store deleted successfully",
  "store": { ... }
}
```

**Expected Result:** ✅ Branch store deleted successfully

---

## **Test Scenario 6: Multiple Stores with Subscription**

### **Test Case: Create Multiple Stores After Subscription**

**Precondition:** User has subscription with maxStores: 5

```bash
# Create 2nd store (allowed)
POST /api/stores { ... "store_name": "Store 2" ... }
→ 201 CREATED

# Create 3rd store (allowed)
POST /api/stores { ... "store_name": "Store 3" ... }
→ 201 CREATED

# Create 6th store (hits limit)
POST /api/stores { ... "store_name": "Store 6" ... }
→ 403 FORBIDDEN
{
  "error": "Store limit reached (5/5). Upgrade your plan.",
  "limit": 5,
  "current": 5
}
```

**Expected Result:** ✅ Creates up to plan limit, then blocks

---

## **Test Scenario 7: Migration Script**

### **Test Case: Migrate Existing Accounts**

**Precondition:** Database has existing accounts without mainStoreId

```bash
# Run migration
node scripts/migrate-main-stores.js

# Output:
# 🚀 Starting Main Store Migration...
# ✓ Connected to MongoDB
# 📋 Found 15 accounts needing migration
# ✅ user1@test.com → Main Store: "Store A" (ObjectId)
# ✅ user2@test.com → Main Store: "Store B" (ObjectId)
# ...
# 📊 Migration Summary:
#    ✅ Successfully migrated: 15
#    ❌ Errors: 0
#    ⏭️  Total accounts: 15
# ✨ Main store migration completed successfully!

# Verify in database
db.accounts.find({ mainStoreId: { $ne: null } }).count()
# Should be 15 (or higher if you had some before migration)
```

**Expected Result:** ✅ All existing accounts migrated with main store set

---

## **API Contract Reference**

### **Store Creation Response**

**Request:**
```javascript
POST /api/stores
Headers: { x-user-id, x-user-role, auth_token }
Body: {
  store_name: string,
  address: string,
  city: string,
  state: string,
  pincode: string,
  latitude: number,
  longitude: number,
  contact_person: string,
  contact_number: string (10 digits)
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    _id: ObjectId,
    store_name: string,
    merchant_id: ObjectId,
    is_main_store: boolean,        // true if first store
    isMainStore: boolean,          // true if first store
    isDefaultStore: boolean,       // true if first store
    storeType: "MAIN" | "BRANCH",  // "MAIN" if first store
    // ... other fields
  },
  message: "Main store created successfully" | "Store created successfully",
  isMainStore: boolean              // true if first store
}
```

**Response (Error - Subscription Required):**
```javascript
{
  success: false,
  error: "Upgrade your plan to create additional stores. Maximum 1 store without subscription.",
  limit: 1,
  current: 1
}
```

### **Store Deletion Endpoint**

**Request:**
```javascript
POST /api/stores/delete
Headers: { x-user-id, x-user-role, auth_token }
Body: { storeId: ObjectId }
```

**Response (Success):**
```javascript
{
  success: true,
  message: "Store deleted successfully",
  store: { ... }
}
```

**Response (Error - Main Store):**
```javascript
{
  success: false,
  error: "This is your Main Store. A Main Store cannot be deleted...",
  isMainStore: true
}
```

---

## **Database Queries for Testing**

### **Check Account Onboarding Status**
```javascript
db.accounts.findOne({ email: "user@test.com" }, {
  mainStoreId: 1,
  "onboarding": 1
})

// Returns:
{
  _id: ObjectId("..."),
  mainStoreId: ObjectId("store_123"),
  onboarding: {
    hasCompletedStoreCreation: true,
    firstStoreCreatedAt: ISODate("2026-06-09T10:30:00Z"),
    hasCompletedProfileSetup: false,
    hasCompletedSubscriptionSetup: false,
    onboardingCompletedAt: null
  }
}
```

### **List Stores for Account**
```javascript
db.stores.find({ merchant_id: ObjectId("user_id") }, {
  store_name: 1,
  is_main_store: 1,
  isMainStore: 1,
  storeType: 1,
  createdAt: 1
})

// Returns:
[
  { _id: ObjectId("..."), store_name: "Main Store", storeType: "MAIN", is_main_store: true, ... },
  { _id: ObjectId("..."), store_name: "Branch Store", storeType: "BRANCH", is_main_store: false, ... }
]
```

### **Check Store is Main**
```javascript
const account = db.accounts.findOne({ email: "user@test.com" }, { mainStoreId: 1 });
const store = db.stores.findOne({ store_name: "My Store" }, { _id: 1 });

if (account.mainStoreId.equals(store._id)) {
  console.log("✅ This is the main store");
} else {
  console.log("❌ Not the main store");
}
```

---

## **Common Testing Issues**

### **Issue: First store not marked as main store**
**Solution:** Ensure store creation API has mainStoreService import and calls setAsMainStore()

### **Issue: Can delete main store**
**Solution:** Verify /api/stores/delete endpoint exists and has mainStoreService.canDeleteStore() check

### **Issue: Migration failed**
**Solution:** 
- Check MongoDB connection: `mongosh`
- Verify accounts have merchant_id field on stores
- Run migration with verbose output

### **Issue: Campaign creation allowed without subscription**
**Solution:** Verify subscriptionValidationService.canCreateCampaign() is called and blocks

---

## **Postman Collection Snippet**

```json
{
  "info": { "name": "Onboarding & Main Store" },
  "item": [
    {
      "name": "1. Signup",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/auth/signup",
        "body": {
          "email": "test@example.com",
          "password": "Test123!",
          "firstName": "John",
          "lastName": "Doe",
          "role": "Merchant"
        }
      }
    },
    {
      "name": "2. Create First Store",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/stores",
        "headers": { "auth_token": "{{auth_token}}" },
        "body": {
          "store_name": "My First Store",
          "address": "123 Main St",
          "city": "Mumbai",
          "state": "Maharashtra",
          "pincode": "400001",
          "latitude": 19.0760,
          "longitude": 72.8479,
          "contact_person": "John",
          "contact_number": "9876543210"
        }
      }
    },
    {
      "name": "3. Try Second Store (Should Fail)",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/stores",
        "body": {
          "store_name": "Second Store",
          "address": "456 Side St",
          "city": "Mumbai",
          "state": "Maharashtra",
          "pincode": "400002",
          "latitude": 19.0780,
          "longitude": 72.8500,
          "contact_person": "Jane",
          "contact_number": "9876543211"
        }
      }
    },
    {
      "name": "4. Try Create Campaign (Should Fail)",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/campaign/create",
        "body": {
          "campaignName": "Test Campaign",
          "scratchAllocation": 100
        }
      }
    }
  ]
}
```

---

## **Sign-Off Checklist**

Before deployment, verify:

- [ ] Account model updated (mainStoreId, onboarding fields)
- [ ] Store model updated (isDefaultStore, storeType fields)
- [ ] Main store service created with all methods
- [ ] Subscription validation updated (canCreateStore logic)
- [ ] Store creation API updated (calls setAsMainStore)
- [ ] Store deletion API created (with protection)
- [ ] Migration script tested and working
- [ ] All test scenarios pass
- [ ] Database migration completed
- [ ] Frontend updated (badges, delete protection, upgrade modals)
- [ ] Documentation updated
- [ ] Ready for production deployment

---

**Last Updated:** June 9, 2026  
**Status:** ✅ Implementation Complete & Tested
