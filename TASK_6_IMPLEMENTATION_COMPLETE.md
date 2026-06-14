# Task 6 Implementation Complete

## Objective
Enforce plan-based store creation rules and implement first store exception for the POST /api/stores/create endpoint.

## Changes Made

### File Modified
`app/api/stores/route.js`

### Key Changes

#### 1. Added Required Imports
```javascript
import platformAccessService from '@/lib/services/platformAccessService';
import Account from '@/models/accountModel';
import Store from '@/models/storeModel';
```

#### 2. First Store Exception Logic
```javascript
// Count existing active stores
const existingStoreCount = await Store.countDocuments({
  merchant_id: userId,
  isDeleted: { $ne: true }
});

// FIRST STORE EXCEPTION: Always allowed
let canCreate = { allowed: true, isFirstStore: true };

// SUBSEQUENT STORES: Require plan check
if (existingStoreCount > 0) {
  canCreate = await platformAccessService.canCreateStore(userId);
  if (!canCreate.allowed) {
    return NextResponse.json({ ... }, { status: 403 });
  }
}
```

#### 3. Set Store Flags and Update Account
```javascript
const isFirstStore = existingStoreCount === 0;

// Create store with proper flags
const store = await StoreService.createStore(
  merchantId,
  {
    // ... other fields ...
    is_main_store: isFirstStore,
    isMainStore: isFirstStore,
    isDefaultStore: isFirstStore,
    storeType: isFirstStore ? 'MAIN' : 'BRANCH',
  },
  userId
);

// Update Account with mainStoreId only for first store
if (isFirstStore) {
  await Account.findByIdAndUpdate(userId, {
    mainStoreId: store._id,
    'onboarding.hasCompletedStoreCreation': true,
    'onboarding.firstStoreCreatedAt': new Date(),
  }, { new: true });
}
```

#### 4. Clear Error Messages
The endpoint now returns 403 with specific error reasons:
- "Cannot create additional stores without a plan" (for no subscription)
- "Your CORE plan allows up to 1 store(s)" (for CORE plan limit)
- "Your SMART plan allows up to 5 store(s)" (for SMART plan limit)

## Validation: Testing Scenarios

### Scenario 1: First Store Without Plan
**Status**: ✅ ALLOWED
- `existingStoreCount === 0` → first store exception triggered
- Sets `isMainStore: true`, `storeType: 'MAIN'`
- Updates `Account.mainStoreId`
- Returns 201 with `isFirstStore: true`, `isMainStore: true`

### Scenario 2: Second Store Without Plan
**Status**: ✅ BLOCKED (403)
- `existingStoreCount > 0` → plan check required
- `platformAccessService.canCreateStore()` returns `allowed: false`
- Error message: "Cannot create additional stores without a plan"

### Scenario 3: Second Store with CORE Plan
**Status**: ✅ BLOCKED (403)
- `existingStoreCount > 0` → plan check required
- CORE plan limit is 1
- `platformAccessService.canCreateStore()` returns `allowed: false`
- Error message: "Your CORE plan allows up to 1 store(s)"

### Scenario 4: Stores 1-5 with SMART Plan
**Status**: ✅ ALLOWED
- First store: `existingStoreCount === 0` → first store exception
- Stores 2-5: `existingStoreCount > 0` BUT within SMART plan limit (5)
- `platformAccessService.canCreateStore()` returns `allowed: true`
- Returns 201 with appropriate `isExtraStore` and `extraStoreFee` flags

### Scenario 5: Sixth Store with SMART Plan
**Status**: ✅ BLOCKED (403)
- `existingStoreCount === 5` → exceeds SMART plan limit
- `platformAccessService.canCreateStore()` returns `allowed: false`
- Error message: "Your SMART plan allows up to 5 store(s)"

## Service Layer Integration

### PlatformAccessService (Used for subsequent stores)
- `canCreateStore(accountId)` checks store count via `Store.countDocuments()`
- Returns `allowed: true/false` with clear reasons
- Enforces CORE (1 store) and SMART (5 stores) limits
- Located in: `lib/services/platformAccessService.js`

### SubscriptionValidationService (Kept for backward compatibility)
- Previously used validation logic
- Still available in the codebase
- Can be deprecated in future refactoring
- Located in: `lib/services/subscriptionValidationService.js`

### MainStoreService (Utility service)
- Already in place for main store operations
- Used to mark first store as main
- Located in: `lib/mainStoreService.js`

## Implementation Details

### Store Model Fields Used
- `merchant_id`: Links store to merchant/account
- `is_main_store`: Boolean flag (primary store marker)
- `isMainStore`: Boolean flag (alternative marker)
- `isDefaultStore`: Boolean flag (default store marker)
- `storeType`: Enum ('MAIN' or 'BRANCH')

### Account Model Fields Updated
- `mainStoreId`: Reference to the main store
- `onboarding.hasCompletedStoreCreation`: Set to true on first store
- `onboarding.firstStoreCreatedAt`: Timestamp of first store creation

## Response Format

### Success Response (201)
```json
{
  "success": true,
  "data": { /* store object */ },
  "message": "Main store created successfully" | "Store created successfully",
  "isMainStore": true | false,
  "isFirstStore": true | false
}
```

### Error Response (403)
```json
{
  "success": false,
  "error": "Cannot create additional stores without a plan...",
  "details": {
    "existingStores": 1,
    "reason": "..."
  }
}
```

## Logging

Proper debug logging in place:
```
[Store Create] First store for account {userId} - always allowed
[Store Create] Set mainStoreId for account {userId} to store {storeId}
[Store Create] Error updating account mainStoreId: {error}
```

## No Breaking Changes

- Existing store data structure unchanged
- All existing stores continue to work
- First store exception is backward compatible
- Error responses are clear and informative
- Optional features (extra store fee) preserved

## Deployment Notes

- No database migrations required
- No schema changes
- Fully backward compatible
- Can be deployed immediately
- No changes to existing store data on deployment

## Commit Information

**Commit Hash**: 6c12dea48
**Message**: feat: enforce first store exception and plan-based store limits

## Files Changed

1. `app/api/stores/route.js` - Core implementation
2. No other files modified
3. No database migrations required
4. No schema changes
