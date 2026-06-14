# Phase 6: Campaign Store Snapshot Migration - Execution Guide

**Status**: Ready for Execution  
**Date**: June 3, 2026  
**Purpose**: Backfill existing campaigns with store snapshots from CampaignStoreMapping

---

## Executive Summary

This guide provides step-by-step instructions for executing the migration script that converts existing campaign-store relationships from the separate CampaignStoreMapping collection into embedded snapshots within campaign documents.

**Expected Outcome**: All campaigns with store assignments will have complete, immutable store snapshots with historical data and audit trail.

---

## Pre-Migration Requirements

### ✅ Code Deployment Requirements
- [ ] **Phase 1-5 code deployed** to production/staging
  - Schema updates (assignedStores array)
  - Service layer methods
  - API endpoints
  - Frontend components
  - QR validation updates

### ✅ System Requirements
- [ ] **MongoDB** running and accessible
- [ ] **Node.js 18+** installed
- [ ] **Environment variables** configured:
  - `MONGODB_URI` - Connection string
  - `NODE_ENV` - Set to 'production' or 'staging'
  
### ✅ Data Requirements
- [ ] **Existing campaigns** in database (will be checked during migration)
- [ ] **CampaignStoreMapping records** with active/paused status
- [ ] **Store documents** with location data (latitude/longitude)

### ✅ Verification Requirements
- [ ] **Database backup** taken before migration
- [ ] **Read-only replica** available for testing
- [ ] **Monitor access** to track migration progress

---

## Pre-Migration Checklist

### 1. Verify Data Integrity

```bash
# Connect to MongoDB and run these queries
db.campaigns.countDocuments({})                    # Total campaigns
db.campaignStoreMappings.countDocuments({})       # Total mappings
db.stores.countDocuments({})                       # Total stores
db.stores.countDocuments({latitude: {$exists: true}})  # Stores with location
```

**Expected Results**:
- `campaigns` count ≥ 1
- `campaignStoreMappings` count ≥ 1  
- `stores` count ≥ `campaignStoreMappings` count
- Stores with location should be ≥ 95%

### 2. Verify Pre-Migration State

```javascript
// Check campaigns don't have snapshots yet
db.campaigns.findOne(
  {assignedStores: {$exists: true, $ne: []}},
  {campaignName: 1, assignedStores: 1}
)
// Should return null or very few documents (unlikely to have existing snapshots)
```

### 3. Create Database Backup

```bash
# Using mongodump (recommended)
mongodump \
  --uri="mongodb://..." \
  --out=./backup-$(date +%Y%m%d-%H%M%S)

# Or using MongoDB Atlas
# Use the "Back Up Now" button in the Atlas console
```

**Store backup location safely**: Cloud storage or external drive

### 4. Test on Staging First

**MANDATORY**: Always test on staging environment before production

```bash
# 1. Restore backup to staging database
# 2. Run migration script on staging
# 3. Verify all snapshots created correctly
# 4. Test campaign operations (assign, remove, view detail)
# 5. Verify QR validation works with snapshots
# 6. Check performance improvements
# 7. Confirm no data loss
```

---

## Migration Execution

### Step 1: Verify Environment

```bash
# Check you're in the project directory
pwd
# Should show: .../coupon_campaigns

# Verify Node.js
node --version
# Should be v18.0.0 or higher

# Verify environment variables
echo $MONGODB_URI
echo $NODE_ENV
# Both should be set correctly
```

### Step 2: Run Migration Script

```bash
# Execute the migration script
node scripts/migrate-campaign-stores.js

# The script will:
# 1. Connect to MongoDB
# 2. Find all campaigns
# 3. For each campaign:
#    - Query CampaignStoreMapping records
#    - Fetch Store documents
#    - Create snapshots with all data
#    - Validate location data
#    - Embed in campaign.assignedStores
# 4. Report detailed statistics
```

### Step 3: Monitor Progress

**The script outputs progress in real-time**:

```
=== Campaign Store Snapshot Migration ===
Connecting to database...
✓ Connected to database

Finding campaigns to migrate...
Found 150 campaigns

[1/150] ✓ Campaign "Summer Sale" migrated with 3 store snapshots
[2/150] ✓ Campaign "Flash Deal" migrated with 2 store snapshots
[3/150] ✓ Campaign "Holiday Special" already migrated
[4/150] ⚠ Store abc123 not found (possibly deleted)
...
[150/150] ✓ Campaign "Clearance" migrated with 5 store snapshots

=== Migration Summary ===
Total campaigns processed: 150
Campaigns already migrated: 0
Campaigns with stores: 145
Total snapshots created: 487
Stores not found: 2
Errors: 0

✓ Migration complete
```

### Step 4: Understand Exit Codes

```bash
echo $?
# 0 = Success (no errors)
# 1 = Migration completed with errors
```

**If exit code is 1**: Check error log and re-run to continue from unprocessed campaigns

---

## Post-Migration Validation

### 1. Verify Snapshot Creation

```javascript
// Check campaigns have snapshots
db.campaigns.find(
  {assignedStores: {$exists: true, $ne: []}},
  {campaignName: 1, "assignedStores.storeName": 1}
).limit(5)

// Should return campaigns with assignedStores array
```

### 2. Verify Snapshot Structure

```javascript
// Check a single campaign's snapshot structure
db.campaigns.findOne(
  {assignedStores: {$ne: []}},
  {campaignName: 1, assignedStores: 1}
)

// Expected structure:
{
  _id: ObjectId(...),
  campaignName: "Campaign Name",
  assignedStores: [
    {
      storeId: ObjectId(...),
      storeName: "Store Name",
      storeCode: "SC-CODE",
      address: "123 Main St",
      city: "City",
      state: "State",
      pincode: "123456",
      contactPerson: "John Doe",
      contactNumber: "9876543210",
      latitude: 23.1815,
      longitude: 72.6313,
      allocated_scratch_cards: 1000,
      used_scratch_cards: 250,
      redeemed_scratch_cards: 100,
      remaining_scratch_cards: 650,
      assignedAt: ISODate("2026-06-03T10:30:00Z"),
      assignedBy: ObjectId(...),
      status: "active",
      lastModified: ISODate("2026-06-03T10:30:00Z"),
      lastModifiedBy: ObjectId(...)
    }
  ]
}
```

### 3. Verify Data Completeness

```javascript
// Check all snapshots have required fields
db.campaigns.aggregate([
  {$match: {assignedStores: {$ne: []}}},
  {$unwind: "$assignedStores"},
  {$group: {
    _id: null,
    missingStoreName: {$sum: {$cond: ["$assignedStores.storeName", 0, 1]}},
    missingLatitude: {$sum: {$cond: ["$assignedStores.latitude", 0, 1]}},
    missingLongitude: {$sum: {$cond: ["$assignedStores.longitude", 0, 1]}},
    missingStatus: {$sum: {$cond: ["$assignedStores.status", 0, 1]}}
  }}
])

// All counts should be 0
```

### 4. Verify Inventory Accuracy

```javascript
// Check inventory counts are preserved
db.campaigns.aggregate([
  {$match: {assignedStores: {$ne: []}}},
  {$unwind: "$assignedStores"},
  {$group: {
    _id: null,
    totalAllocated: {$sum: "$assignedStores.allocated_scratch_cards"},
    totalUsed: {$sum: "$assignedStores.used_scratch_cards"},
    totalRedeemed: {$sum: "$assignedStores.redeemed_scratch_cards"}
  }}
])

// Cross-check with CampaignStoreMapping counts
db.campaignStoreMappings.aggregate([
  {$group: {
    _id: null,
    totalAllocated: {$sum: "$allocated_scratch_cards"},
    totalUsed: {$sum: "$used_scratch_cards"},
    totalRedeemed: {$sum: "$redeemed_scratch_cards"}
  }}
])

// Counts should match
```

### 5. Verify Location Data

```javascript
// Check all snapshots have valid coordinates
db.campaigns.aggregate([
  {$match: {assignedStores: {$ne: []}}},
  {$unwind: "$assignedStores"},
  {$match: {
    $or: [
      {"assignedStores.latitude": {$exists: false}},
      {"assignedStores.longitude": {$exists: false}},
      {"assignedStores.latitude": null},
      {"assignedStores.longitude": null}
    ]
  }},
  {$count: "missingLocation"}
])

// Count should be 0
```

### 6. Compare with Legacy Data

```javascript
// Count mappings vs snapshots
const mappingCount = db.campaignStoreMappings.countDocuments({status: {$in: ["active", "paused"]}})
const snapshotCount = db.campaigns.aggregate([
  {$unwind: "$assignedStores"},
  {$match: {"assignedStores.status": "active"}},
  {$count: "total"}
])

// Counts should be similar (some mappings may reference deleted stores)
```

---

## Functional Testing

### Test 1: Campaign Detail Page

```
1. Navigate to campaign detail page
2. Verify "Assigned Stores" section shows stores
3. Verify store information matches snapshots:
   - Store Name
   - Store Code
   - City/State
4. Verify location coordinates are present
5. Verify inventory counts are correct
```

**Expected**: All store data loads from embedded snapshots (no Store collection queries)

### Test 2: Store Assignment Modal

```
1. Click "Assign Stores" button
2. Select stores and enter quantity
3. Click "Assign"
4. Verify stores added to the list
5. Verify snapshot created with current data
```

**Expected**: New assignments create snapshots with all store information

### Test 3: Store Removal

```
1. Click delete button on a store
2. Click "Remove Store" in confirmation modal
3. Verify store removed from list
4. Verify status marked as 'removed' (check DB)
```

**Expected**: Assignment marked as 'removed' (soft delete), not deleted

### Test 4: QR Validation

```
1. Simulate customer QR scan
   POST /api/customer/participate
   {
     campaignId,
     storeId,
     customerLatitude: 23.1815,
     customerLongitude: 72.6313,
     ...other fields
   }
2. Verify location validation uses snapshot location
3. Move to different location (outside 2km)
4. Try again - should fail with distance error
```

**Expected**: Validation uses snapshot location (at assignment time), not current store location

### Test 5: Location Verify Endpoint

```bash
# Test with campaignId (preferred)
curl -X POST http://localhost:3000/api/customer/location-verify \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-id",
    "storeId": "store-id",
    "customerLatitude": 23.1815,
    "customerLongitude": 72.6313
  }'

# Should return:
{
  "success": true,
  "data": {
    "verified": true,
    "distance": 150,
    "allowedRadius": 2000,
    "storeName": "Store Name",
    "validationMethod": "snapshot",
    "snapshotUsed": true
  }
}
```

**Expected**: Returns snapshot-based validation result

---

## Performance Verification

### 1. Query Performance

```javascript
// Before migration (with CampaignStoreMapping queries)
// 3+ queries per campaign detail page

// After migration (with snapshots)
// 1 query per campaign detail page

// Verify improvement:
db.campaigns.find({assignedStores: {$ne: []}}).explain("executionStats")
// Should show single document scan
```

### 2. API Response Time

```bash
# Measure campaign detail API response time
time curl -X GET "http://localhost:3000/api/campaigns/{id}" \
  -H "x-user-id: user-id" \
  -H "x-user-role: Merchant"

# Expected: < 200ms (was ~500-800ms before)
```

### 3. Campaign List Load Time

```bash
# Measure campaign list API response time
time curl -X GET "http://localhost:3000/api/campaigns" \
  -H "x-user-id: user-id" \
  -H "x-user-role: Merchant"

# Expected: < 500ms for 100+ campaigns
```

---

## Rollback Procedure

### If Migration Fails

```bash
# 1. Stop the migration script (Ctrl+C)
# 2. Check error log for details
# 3. Run migration again (resumes from where it stopped)
#    - Script automatically skips already-migrated campaigns
#    - Can be run multiple times safely
```

### If Major Issues Occur

```bash
# 1. Restore backup
mongorestore \
  --uri="mongodb://..." \
  ./backup-2026-06-03-143022

# 2. Deploy previous version of code
#    - Removes new snapshot code
#    - Reverts to CampaignStoreMapping queries

# 3. Investigate issue
# 4. Fix and re-deploy Phase 1-5 code
# 5. Run migration again
```

**Migration is non-destructive**: 
- ✅ CampaignStoreMapping data untouched
- ✅ Can re-run migration safely
- ✅ Can rollback without data loss

---

## Monitoring During Migration

### Real-Time Progress

```bash
# In one terminal: Run migration
node scripts/migrate-campaign-stores.js

# In another terminal: Monitor collection sizes
watch -n 5 'mongo --eval "
  print(\"Campaigns: \" + db.campaigns.countDocuments({}));
  print(\"With snapshots: \" + db.campaigns.countDocuments({assignedStores: {\\$ne: []}}));
  print(\"Mappings: \" + db.campaignStoreMappings.countDocuments({}));
"'
```

### Error Monitoring

```bash
# Check for errors during migration
tail -f migration-error.log

# Filter specific error types
grep -i "store not found" migration-error.log | wc -l
grep -i "missing location" migration-error.log | wc -l
```

---

## Post-Migration Checklist

### Immediate (Day 1)

- [ ] Migration script completed successfully
- [ ] No unprocessed campaigns remaining
- [ ] All snapshots have required fields
- [ ] Location data validated
- [ ] Inventory counts match
- [ ] Campaign detail pages load correctly
- [ ] QR validation works with snapshots
- [ ] Frontend shows store data from snapshots

### Short-term (Week 1)

- [ ] Monitor API response times
- [ ] Check for any error patterns
- [ ] Verify database query patterns (no Store lookups)
- [ ] Test on mobile devices
- [ ] User acceptance testing (UAT)

### Monitoring (Week 2-4)

- [ ] Track migration-related errors
- [ ] Monitor QR validation accuracy
- [ ] Verify campaign operations stable
- [ ] Collect performance metrics
- [ ] Get stakeholder sign-off

### Cleanup (Month 2)

- [ ] Archive CampaignStoreMapping (Phase 7)
- [ ] Remove legacy code paths
- [ ] Update documentation
- [ ] Train support team

---

## Troubleshooting

### Issue: Migration Stops Mid-way

**Symptoms**: Script exits before processing all campaigns

**Solution**:
1. Check error messages in console
2. Verify MongoDB connection
3. Re-run script - it will resume from last unprocessed campaign

### Issue: Missing Location Data

**Symptoms**: "Store location not configured" errors

**Solution**:
```javascript
// Find stores without location
db.stores.find({
  $or: [
    {latitude: {$exists: false}},
    {longitude: {$exists: false}}
  ]
})

// Update stores with location
db.stores.updateMany(
  {latitude: {$exists: false}},
  {$set: {
    latitude: 0,
    longitude: 0
  }}
)
```

### Issue: Some Snapshots Missing

**Symptoms**: Campaign has fewer snapshots than CampaignStoreMapping records

**Solution**:
```javascript
// Find campaigns with missing snapshots
db.campaigns.aggregate([
  {$lookup: {
    from: "campaignStoreMappings",
    localField: "_id",
    foreignField: "campaign_id",
    as: "mappings"
  }},
  {$project: {
    campaignName: 1,
    snapshotCount: {$size: "$assignedStores"},
    mappingCount: {$size: "$mappings"}
  }},
  {$match: {
    $expr: {$ne: ["$snapshotCount", "$mappingCount"]}
  }}
])

// Re-run migration (will add missing snapshots)
```

### Issue: Performance Regression

**Symptoms**: Campaign queries slower than expected

**Solution**:
```javascript
// Check indexes are created
db.campaigns.getIndexes()

// Should show indexes:
// - assignedStores.storeId
// - assignedStores.status
// - assignedStores.assignedAt
// - merchantId + assignedStores.status

// If missing, create them manually:
db.campaigns.createIndex({"assignedStores.storeId": 1})
db.campaigns.createIndex({"assignedStores.status": 1})
```

---

## Success Criteria

### ✅ Migration Successful When:

1. **Data Completeness**
   - All campaigns processed without errors
   - All snapshots have required fields
   - All location data present
   - Inventory counts preserved

2. **Functionality**
   - Campaign detail pages load correctly
   - Store information displays accurately
   - QR validation works with snapshots
   - Store assignment/removal works
   - Frontend shows no errors

3. **Performance**
   - Campaign detail API < 200ms
   - Campaign list API < 500ms
   - No Store collection queries in campaign operations
   - Index usage confirmed in execution plans

4. **Data Integrity**
   - No data loss
   - CampaignStoreMapping unchanged
   - Rollback possible if needed
   - Audit trail complete

---

## Timeline

**Estimated Migration Time**: 15-30 minutes for 100-500 campaigns

```
├─ Pre-migration checks: 5 minutes
├─ Create backup: 5 minutes
├─ Run migration: 10-20 minutes
├─ Post-migration validation: 10 minutes
├─ Functional testing: 15 minutes
└─ Sign-off: 5 minutes

Total: 45 minutes to 1 hour
```

---

## Post-Migration Operations

### New Campaign Workflow
```
Merchant creates campaign
  ↓
Merchant assigns stores
  ↓
Snapshots created with all store data
  ↓
Campaign ready for customers
  ✓ Uses snapshots (no Store dependency)
```

### Updated Campaign Workflow
```
Merchant views campaign detail
  ↓
System loads campaign with embedded snapshots
  ↓
Frontend displays store information
  ↓
Merchant can assign/remove stores
  ↓
Changes reflected in snapshots
  ✓ Single document operation
```

---

## Next Steps After Migration

### Phase 7: Cleanup
1. Monitor for issues (1-4 weeks)
2. Archive CampaignStoreMapping
3. Remove legacy code paths
4. Update documentation
5. Train support team

### Phase 8: Optimization
1. Fine-tune snapshot size
2. Optimize indexes
3. Monitor performance
4. Gather metrics

---

## Contact & Support

### Issues During Migration
- [ ] Check this troubleshooting guide
- [ ] Review migration error logs
- [ ] Contact database team
- [ ] Prepare rollback backup

### Post-Migration Questions
- [ ] Review documentation
- [ ] Check API responses
- [ ] Verify snapshot structure
- [ ] Test functionality

---

## Sign-Off

**Migration Executor**: ________________  
**Date**: ________________  
**Status**: ☐ Successful ☐ Partial ☐ Rolled Back  
**Notes**: ________________________________________________

**Approver**: ________________  
**Approval Date**: ________________

---

**This guide is complete and ready for Phase 6 execution.**  
**Expected completion**: 45 minutes to 1 hour  
**Risk level**: Low (non-destructive, reversible)  
**Success criteria**: All snapshots created, zero data loss, operations functional
