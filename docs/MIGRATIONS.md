# Database Migrations

This document describes the database migration scripts for the final subscription system setup. These migrations should be run in order when deploying the subscription system.

## Overview

The migration scripts handle:
1. Cleaning up unused subscription plans
2. Initializing main store references for existing accounts
3. Backfilling expiry date tracking for unlimited scratches

## Running Migrations

### Prerequisites

- Node.js installed
- MongoDB connection configured via `MONGODB_URI` environment variable
- All models synced with database

### Running All Migrations in Order

```bash
# 1. Remove non-Core/Smart plans
node scripts/migrations/removeOtherPlans.js

# 2. Initialize main store references
node scripts/migrations/initializeMainStore.js

# 3. Backfill expiry tracking for unlimited scratches
node scripts/migrations/addPlanExpiryTracking.js
```

## Individual Migrations

### 1. Remove Other Plans

**File:** `scripts/migrations/removeOtherPlans.js`

**Purpose:** Removes Premium, Enterprise, Trial, Monthly, Annual plans from the database. Only Core and Smart plans remain.

**What it does:**
- Finds all subscription plans NOT named "Core" or "Smart"
- Deletes them from the database
- Lists remaining plans for verification

**When to run:** 
- After seeding Core and Smart plans
- Before any account activations

**Exit codes:**
- 0: Success
- 1: Error

**Example output:**
```
[Migration] Starting: Remove non-Core/Smart plans...
[Migration] Connected to database
[Migration] ✓ Deleted 5 plan(s)
[Migration] Remaining plans:
  - ScratchX Core (isActive: true)
  - ScratchX Smart (isActive: true)
[Migration] ✓ Migration complete
```

### 2. Initialize Main Store

**File:** `scripts/migrations/initializeMainStore.js`

**Purpose:** Sets `mainStoreId` on accounts and `isMainStore` flag on their first store.

**What it does:**
- Iterates through all accounts
- For each account without a `mainStoreId`:
  - Finds their first active store (by creation date)
  - Updates account with `mainStoreId` reference
  - Sets `is_main_store: true` on the store
- Skips accounts that already have a `mainStoreId` set

**When to run:**
- After account creation
- Before billing/plan activation
- Can be run multiple times (idempotent)

**Exit codes:**
- 0: Success
- 1: Error

**Example output:**
```
[Migration] Starting: Initialize mainStoreId...
[Migration] Connected to database
[Migration] Found 42 account(s)
[Migration] Skipping account 60d5ec49c1... - already has mainStoreId
[Migration] ✓ Updated account 60d5ec49c2... with mainStore 60d5ec49c3...
[Migration] ✓ Updated 5 account(s), skipped 37 account(s)
[Migration] ✓ Migration complete
```

### 3. Add Plan Expiry Tracking

**File:** `scripts/migrations/addPlanExpiryTracking.js`

**Purpose:** Backfills `unlimitedScratches.validUntil` dates for existing subscriptions.

**What it does:**
- Finds subscriptions with missing or null `unlimitedScratches.validUntil`
- For each subscription:
  - Sets `grantedAt` to `purchaseDate` or `createdAt` (if not already set)
  - Calculates `validUntil` as 90 days from `grantedAt`
  - Calculates `daysRemaining`
  - Sets `isActive` based on status and validity period
  - Updates the subscription

**When to run:**
- After subscription records exist in database
- Before expiry checking is enabled in app
- Can be run multiple times (updates existing records)

**Exit codes:**
- 0: Success
- 1: Error

**Example output:**
```
[Migration] Starting: Backfill expiry dates for unlimited scratches...
[Migration] Connected to database
[Migration] Found 3 subscription(s) needing expiry backfill
[Migration] ✓ Updated subscription 60d5ec49c1...
  - Granted: 2026-06-01T10:00:00.000Z
  - Valid Until: 2026-08-30T10:00:00.000Z
  - Days Remaining: 81
  - Active: true
[Migration] ✓ Updated 3 subscription(s)
[Migration] ✓ Migration complete
```

## Troubleshooting

### Connection Errors

If migrations fail to connect:

1. Check `MONGODB_URI` environment variable is set
2. Verify MongoDB is running
3. Check network connectivity to MongoDB server

```bash
# Test connection
echo "db.version()" | mongosh $MONGODB_URI
```

### Model Not Found

If you see "Cannot find module" errors:

1. Ensure you're running from the project root directory
2. Check all model files exist in `models/` directory
3. Verify `lib/connectDB.js` exists

### Partial Migrations

If a migration partially completes:

1. Check the logs to see what succeeded
2. Re-run the migration (most are idempotent)
3. Verify results with direct database queries

```bash
# Example: Check remaining plans
mongosh $MONGODB_URI
> db.subscriptionplans.find({}, {name: 1})
```

## Data Safety

All migrations:
- Log all changes to stdout
- Exit with error codes on failure
- Can be re-run safely (mostly idempotent)
- Do NOT require database backups before running

However, it's recommended to:
1. Test migrations on a development database first
2. Verify results after running each migration
3. Check application logs for any side effects

## Verification After Migration

### Verify plans were cleaned up
```bash
mongosh $MONGODB_URI
> db.subscriptionplans.count()        # Should be 2
> db.subscriptionplans.distinct('name')  # Should be ["Core", "Smart"]
```

### Verify main stores are set
```bash
mongosh $MONGODB_URI
> db.accounts.countDocuments({mainStoreId: {$exists: true}})  # Should match account count
> db.stores.countDocuments({is_main_store: true})  # Should match main accounts
```

### Verify expiry dates are backfilled
```bash
mongosh $MONGODB_URI
> db.subscriptions.countDocuments({'unlimitedScratches.validUntil': {$exists: true}})
> db.subscriptions.findOne({'unlimitedScratches.validUntil': {$exists: true}})
```

## Related Files

- `scripts/seed-subscription-plans.js` - Seeds Core and Smart plans
- `scripts/seed-test-accounts.js` - Creates test accounts with subscriptions
- `models/subscriptionPlanModel.js` - Plan schema definition
- `models/accountModel.js` - Account schema with mainStoreId field
- `models/storeModel.js` - Store schema with is_main_store field
- `models/subscriptionModel.js` - Subscription schema with unlimitedScratches tracking

## Additional Notes

- Migrations use ES modules (import/export)
- All logs are prefixed with `[Migration]` for easy filtering
- Exit codes follow standard conventions (0 = success, 1 = error)
- Migrations handle missing/null values gracefully
