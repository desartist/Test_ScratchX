# Campaign Store Snapshot Pattern Implementation Guide

## Overview

This document describes the migration from separate Campaign-Store mapping to **embedded store snapshots** in campaign documents. This change improves performance, ensures historical data consistency, and eliminates dependency on the Store collection at runtime.

## Architecture Changes

### Before (Legacy)
```
Campaign Document
    ↓ (contains storeId reference)
CampaignStoreMapping Collection
    ↓ (references store)
Store Collection
    ↓
Store Details
```
**Problems**: 3 collections involved, store changes affect campaign, no history

### After (New)
```
Campaign Document
    ↓ (contains assignedStores array)
    └─→ Store Snapshot 1
    └─→ Store Snapshot 2
    └─→ Store Snapshot 3
```
**Benefits**: Single document, immutable snapshots, complete history, no Store dependency

## Database Schema

### Campaign.assignedStores Array

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,                    // Reference for updates only
  
  // Store snapshot (captured at assignment time)
  storeName: String,
  storeCode: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  contactPerson: String,
  contactNumber: String,
  
  // Location snapshot (critical for QR validation)
  latitude: Number,
  longitude: Number,
  
  // Inventory tracking per assignment
  allocated_scratch_cards: Number,
  used_scratch_cards: Number,
  redeemed_scratch_cards: Number,
  remaining_scratch_cards: Number,
  
  // Assignment metadata
  assignedAt: Date,
  assignedBy: ObjectId,
  
  // Status management (soft delete)
  status: 'active' | 'removed',
  
  // Audit trail
  lastModified: Date,
  lastModifiedBy: ObjectId
}
```

## API Changes

### 1. Assign Stores to Campaign

**Endpoint**: `POST /api/campaigns/[id]/assign`

**Request Body**:
```javascript
{
  storeIds: ["store-id-1", "store-id-2"],
  quantityPerStore: 1000
}
```

**Response**:
```javascript
{
  success: true,
  data: {
    successful: [
      {
        storeId: "...",
        storeName: "Bhuj Main Store",
        allocated: 1000,
        snapshot: { /* full store snapshot */ }
      }
    ],
    failed: [],
    summary: { total: 2, success: 2, failed: 0 }
  }
}
```

**What Changed**:
- Now creates embedded snapshots in `campaign.assignedStores`
- Snapshot includes all store information at assignment time
- Returns full snapshot data in response

### 2. Remove Store from Campaign (NEW)

**Endpoint**: `DELETE /api/campaigns/[id]/stores/[storeId]`

**Response**:
```javascript
{
  success: true,
  message: "Store removed from campaign",
  assignment: { /* updated assignment with status: 'removed' */ }
}
```

**What Changed**:
- Soft deletes the assignment (marks as `status: 'removed'`)
- Preserves historical record for audit trail
- Can be reversed if needed

### 3. Get Campaign Detail

**Endpoint**: `GET /api/campaigns/[id]`

**What Changed**:
- Returns `campaign.assignedStores` array directly
- No separate query to CampaignStoreMapping needed
- No Store collection lookup required

```javascript
// Old approach (still in code):
const storeAllocations = await CampaignStoreMapping.find(...)
  .populate('store_id', 'store_name city...')

// New approach (in updated getCampaignDetail):
const assignedStores = campaign.assignedStores.filter(s => s.status === 'active')
```

### 4. Get Store Count

**Optimized Query**:
```javascript
// Before: Required subquery
const storeCount = await CampaignStoreMapping.countDocuments({
  campaign_id: campaignId,
  status: 'active'
});

// After: Direct array length
const storeCount = campaign.assignedStores.filter(s => s.status === 'active').length;
```

## Service Layer

### New CampaignService Methods

#### `assignCampaignToStores(campaignId, storeIds, quantityPerStore, assignedBy)`

Creates embedded store snapshots in campaign document.

```javascript
const result = await CampaignService.assignCampaignToStores(
  campaignId,
  ['store-1', 'store-2'],
  1000,
  userId
);

// result.successful contains snapshots
```

#### `removeStoreFromCampaign(campaignId, storeId, removedBy)`

Soft deletes a store assignment.

```javascript
const result = await CampaignService.removeStoreFromCampaign(
  campaignId,
  storeId,
  userId
);

// result.assignment has status: 'removed'
```

#### `getAssignedStoresSnapshot(campaignId, includeRemoved = false)`

Retrieves store snapshots with filter option.

```javascript
const stores = await CampaignService.getAssignedStoresSnapshot(campaignId);
// Returns array of active store snapshots
```

#### `getStoreCountByCampaign(campaignId)`

Optimized single-document query for store count.

```javascript
const count = await CampaignService.getStoreCountByCampaign(campaignId);
```

## Migration

### Running the Migration Script

The migration script backfills existing campaigns with store snapshots from the CampaignStoreMapping collection.

```bash
# From project root
node scripts/migrate-campaign-stores.js
```

**What it does**:
1. Finds all campaigns
2. Queries CampaignStoreMapping for each campaign
3. Creates store snapshots with current store data
4. Embeds snapshots in `campaign.assignedStores`
5. Preserves all inventory tracking data

**Safety features**:
- Skips already-migrated campaigns
- Validates store location data
- Handles deleted stores gracefully
- Reports detailed error messages
- Non-destructive (doesn't delete old mappings)

**Output example**:
```
=== Campaign Store Snapshot Migration ===

[1/50] ✓ Campaign "Summer Sale" (id) migrated with 3 store snapshots
[2/50] ✓ Campaign "Flash Deal" (id) already migrated
[3/50] ⚠ Store abc not found (possibly deleted)
...

=== Migration Summary ===
Total campaigns processed: 50
Campaigns already migrated: 5
Campaigns with stores: 42
Total snapshots created: 127
Stores not found: 2
Errors: 0

✓ Migration complete
```

## QR Validation Compatibility

### Customer QR Scan Flow

When a customer scans a QR code:

```javascript
// 1. Get campaign
const campaign = await Campaign.findById(campaignId);

// 2. Find store snapshot (no Store collection lookup needed!)
const storeSnapshot = campaign.assignedStores.find(
  s => s.storeId.toString() === storeId.toString() && s.status === 'active'
);

// 3. Use snapshot location for validation
if (storeSnapshot) {
  const distance = calculateDistance(
    customerLocation,
    { lat: storeSnapshot.latitude, lon: storeSnapshot.longitude }
  );
  
  if (distance < 100) { // 100m radius
    // Location validation passed - uses historical location data
  }
}
```

**Key Benefits**:
- Location data is immutable (captured at assignment)
- If store moves, old campaigns still validate correctly
- No external Store collection dependency

## Backward Compatibility

### CampaignStoreMapping (Deprecated)

The `CampaignStoreMapping` model is maintained for backward compatibility:

- Old API calls still work via the legacy assignment flow
- Migration script preserves mapping data (doesn't delete)
- Both old and new code can coexist during transition

**Recommendation**: Keep mappings until all consumers are updated, then archive.

## Performance Impact

### Query Count Reduction

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Get campaign detail | 3 queries | 1 query | 66% reduction |
| Get store count | 2 queries | 1 query | 50% reduction |
| List campaigns | N + (N × M) | N | Eliminates secondary queries |

### Document Size Impact

- **Campaign document**: ~5KB per store snapshot (acceptable for ~100 stores max)
- **Index size**: Minimal (only on storeId and status)
- **Query performance**: Improved (no joins, array filters)

## Frontend Changes

### Campaign Card Component

Before:
```javascript
// Required separate query for store count
const stores = await CampaignStoreMapping.find({ campaign_id })
const storeCount = stores.length;
```

After:
```javascript
// Direct from campaign
const storeCount = campaign.assignedStores.filter(s => s.status === 'active').length;
```

### Campaign Detail Page

Before:
```javascript
// Fetched from separate collection
const storeAllocations = await CampaignStoreMapping.find()
  .populate('store_id');
```

After:
```javascript
// Direct from campaign snapshot
const storeAllocations = campaign.assignedStores.filter(s => s.status === 'active');
```

## Data Consistency Guarantees

### Store Changes Don't Affect Campaign

**Scenario**: Store name is updated after assignment

```javascript
// Old approach: Campaign reflects new store name
store.storeName = "Updated Name";
await store.save();

campaign.storeAllocations.map(s => s.store_id).populate() // Shows "Updated Name"

// New approach: Campaign preserves original assignment data
// campaign.assignedStores[0].storeName is ALWAYS "Original Name"
```

### Store Deletion Doesn't Break Campaign

**Scenario**: Store is deleted after assignment

```javascript
// Old approach: Campaign query fails or shows null
await Store.deleteOne({ _id: storeId });

// New approach: Campaign is unaffected
// campaign.assignedStores[0].storeName is still available
// Location data still available for QR validation
```

## Audit Trail

Each store assignment includes:
- `assignedAt`: When the store was assigned
- `assignedBy`: Which user assigned it
- `lastModified`: Last time the assignment was changed
- `lastModifiedBy`: User who last modified it
- `status`: Active or removed (soft delete)

This provides complete audit history for compliance and debugging.

## Troubleshooting

### Issue: Store snapshot missing location data

**Cause**: Store wasn't created with latitude/longitude

**Solution**: Update store with location data
```javascript
const store = await Store.findById(storeId);
store.latitude = 23.1815;
store.longitude = 72.6313;
await store.save();
```

Then reassign to campaign to capture updated location.

### Issue: Snapshot shows old store name

**Expected Behavior**: Snapshots are immutable (they should show old name)

This is intentional! It preserves the historical state at assignment time.

### Issue: Migration reports "Stores not found"

**Cause**: Referenced store was deleted

**Solution**: Review error logs from migration script. Deleted stores are skipped safely.

## Migration Checklist

- [ ] Run migration script: `node scripts/migrate-campaign-stores.js`
- [ ] Verify all campaigns were migrated with `db.campaigns.find({ assignedStores: { $size: 0 } })`
- [ ] Update campaign detail page to use `assignedStores`
- [ ] Update campaign cards to use `assignedStores.length`
- [ ] Update QR validation to use location snapshots
- [ ] Test assignment and removal flows
- [ ] Test QR scan location validation
- [ ] Archive or remove CampaignStoreMapping after transition

## Technical Details

### Index Strategy

Created indexes for common queries:
```javascript
{ 'assignedStores.storeId': 1 }
{ 'assignedStores.status': 1 }
{ 'assignedStores.assignedAt': -1 }
{ merchantId: 1, 'assignedStores.status': 1 }
```

These enable efficient filtering without full array scans.

### Validation Logic

Pre-validate hook ensures:
- Location data is always present
- Inventory consistency per assignment
- No negative scratch card counts
- Proper status values

### Soft Delete Implementation

Instead of removing items from array:
```javascript
// ✅ Correct: Mark as removed
assignment.status = 'removed';

// ❌ Avoid: Deleting from array
campaign.assignedStores = campaign.assignedStores.filter(s => s !== assignment);
```

Benefits:
- Preserves historical record
- Can be reversed if needed
- Maintains all audit data

## Next Steps

1. **Run migration**: `node scripts/migrate-campaign-stores.js`
2. **Update APIs**: Ensure assign/remove endpoints use new methods
3. **Update frontend**: Use `campaign.assignedStores` instead of separate queries
4. **Test thoroughly**: Verify QR validation, campaigns, and store removals
5. **Monitor performance**: Watch for improvements in campaign page load times

---

**Questions?** Refer to the implementation analysis document for architectural details.
