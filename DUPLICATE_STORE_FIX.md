# 🔧 Fix: Duplicate Store Assignment Issue

## Problem

When assigning a store to a campaign, the same store was appearing **twice** in the `assignedStores` array:

```javascript
assignedStores: Array(2)
  0: {storeId: '6a1fd59c...', storeName: 'Test Store', storeCode: 'SC-11A3C5', ...}
  1: {storeId: '6a1fd59c...', storeName: 'Test Store', storeCode: 'SC-11A3C5', ...}  // DUPLICATE!
```

## Root Cause

The `assignCampaignToStores` service method was **not deduplicating the input `storeIds` array**.

If the same `storeId` appeared twice in the request (via double-click, form resubmission, or browser retry), it would be processed **twice**:

```javascript
// If storeIds = ['store-123', 'store-123']
// Both would be processed, creating two identical snapshots
```

## Solution

### 1. **Added Input Deduplication** (campaignService.js)

```javascript
// CRITICAL FIX: Deduplicate storeIds to prevent duplicate assignments
const uniqueStoreIds = [...new Set(storeIds.map(id => id.toString()))];
if (uniqueStoreIds.length < storeIds.length) {
  console.warn(`⚠️ Duplicate storeIds detected. Removed ${storeIds.length - uniqueStoreIds.length} duplicates.`);
}
const storeIdsToProcess = uniqueStoreIds;
```

**What it does:**
- Converts all storeIds to strings
- Uses JavaScript Set to remove duplicates
- Warns in console if duplicates were found
- Processes only unique storeIds

### 2. **Created Cleanup Script**

`scripts/cleanup-duplicate-store-assignments.js` - Removes existing duplicate assignments

## How to Apply the Fix

### Step 1: Update Code

The code has been updated with the deduplication logic. Just rebuild the app:

```bash
npm run dev
# or
npm run build
```

### Step 2: Clean Up Existing Duplicates

Run the cleanup script to remove duplicates from existing campaigns:

```bash
node scripts/cleanup-duplicate-store-assignments.js
```

**Expected Output:**

```
✅ Connected to MongoDB

📊 Found 1 campaigns with assigned stores
⚠️  Campaign 6a1fd5d3818d56b3fa11a3c8: Store 6a1fd59c818d56b3fa11a3c5 assigned 2 times (indices: 0, 1)
   🗑️  Removing duplicate: Test Store (6a1fd59c818d56b3fa11a3c5)
   ✅ Campaign updated. Removed 1 duplicates

============================================================
📋 CLEANUP SUMMARY
============================================================
Total campaigns checked: 1
Campaigns with duplicates: 1
Total duplicate assignments removed: 1
============================================================

✅ Cleanup completed successfully!
```

### Step 3: Verify

Check your campaign in the dashboard:
- Should show only **1 store** instead of 2
- All functionality should work normally

---

## Why This Happened

1. **User submitted form twice** (double-click, form resubmission, etc.)
2. **API received request with duplicate storeId** (e.g., `storeIds: ['store-123', 'store-123']`)
3. **Service processed both** (no deduplication check)
4. **Two identical snapshots created** in the campaign

## Prevention

The fix prevents this in two ways:

1. **Input validation** - Duplicate storeIds are deduplicated before processing
2. **Existing check** - The existing assignment check still prevents adding the same store twice in separate requests

---

## Files Modified

1. **lib/campaignService.js**
   - Added deduplication logic in `assignCampaignToStores` method
   - Line: `const uniqueStoreIds = [...new Set(storeIds.map(id => id.toString()))]`

2. **scripts/cleanup-duplicate-store-assignments.js** (NEW)
   - Finds all campaigns with duplicate assignments
   - Removes duplicates, keeping first assignment
   - Logs detailed report of changes

---

## Testing

### Before Fix

1. Try assigning same store twice (in separate requests):
   - First assign: Should succeed
   - Second assign: Should fail with "Store already assigned"

2. Try submitting form twice:
   - First submit: Creates stores in `assignedStores`
   - Second submit: Would have created duplicates (now prevented)

### After Fix

1. Assigning same store twice in separate requests:
   - First assign: ✅ Succeeds
   - Second assign: ❌ Fails with "Store already assigned" (working as intended)

2. Form resubmission:
   - Duplicates automatically removed: ✅ Clean up happens silently

3. Existing duplicates:
   - Run cleanup script: ✅ All removed

---

## Verification Checklist

- [ ] Run `npm run dev` or `npm run build`
- [ ] Navigate to campaign dashboard
- [ ] Verify store count is correct (should be 1, not 2)
- [ ] Run cleanup script: `node scripts/cleanup-duplicate-store-assignments.js`
- [ ] Check console output for summary
- [ ] Refresh campaign page
- [ ] Verify store list shows only 1 store
- [ ] Try assigning a new store to verify no more duplicates
- [ ] Test location verification with customer scan

---

## Rollback (If Needed)

If you need to revert the changes:

1. **Revert campaignService.js**:
   - Remove the deduplication lines
   - Use original code

2. **No action needed for cleanup script**:
   - It's safe to run multiple times
   - Only removes actual duplicates

---

## Console Warnings

After the fix, if duplicates are submitted, you'll see:

```
⚠️ Duplicate storeIds detected. Removed 1 duplicates.
```

This is **normal** and means the system is working correctly - duplicates are being silently removed.

---

## Summary

✅ **Fixed**: Duplicate store assignments  
✅ **Prevented**: Future duplicates from form resubmission  
✅ **Cleaned**: Existing campaigns with duplicates  
✅ **Safe**: Can be run multiple times without harm
