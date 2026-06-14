# FILES INVENTORY - IMPLEMENTATION REFERENCE

**Project:** QR Coupon Campaigns | Scratch Card Management  
**Last Updated:** May 26, 2026  
**Purpose:** Quick reference for all files to modify and create  

---

## SUMMARY STATISTICS

| Category | Count | Status |
|----------|-------|--------|
| **Files to Modify** | 12 | Existing files needing updates |
| **New Pages to Create** | 18 | New page.js files |
| **New Components to Create** | 18 | Reusable components |
| **New CSS Modules to Create** | 16 | Styling files |
| **New Service Classes to Create** | 4 | Backend API wrappers |
| **New Test Files to Create** | 8 | Unit & integration tests |
| **TOTAL NEW FILES** | 64 | Files to be created |
| **TOTAL MODIFIED FILES** | 12 | Files to be updated |

---

## PART 1: FILES TO MODIFY (12 files)

### 1. Pages to Update

#### Dashboard Pages

| File Path | Current Status | Update Required | Notes |
|-----------|---|---|---|
| `app/(dashboard)/stores/page.js` | PLACEHOLDER | Replace with functional list | Show store table, CRUD buttons |
| `app/(dashboard)/campaigns/page.js` | PLACEHOLDER | Replace with functional list | Show campaign table, filters, analytics link |
| `app/(dashboard)/dashboard/page.js` | EXISTS | Update role-specific dashboards | Verify dashboard components render correctly |
| `app/(dashboard)/analytics/page.js` | PLACEHOLDER | Create analytics dashboard | KPI cards, charts |
| `app/(dashboard)/settings/page.js` | PLACEHOLDER | Create settings interface | User profile, preferences |

### 2. Service Files to Verify/Update

| File Path | Current Status | Update Required | Methods Needed |
|-----------|---|---|---|
| `lib/storeService.js` | EXISTS | Verify methods complete | getStores, getStoreById, createStore, updateStore, deleteStore |
| `lib/campaignService.js` | EXISTS | Verify methods complete | getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign |
| `lib/inventoryService.js` | EXISTS | Verify/add methods | allocateScratchCards, getInventory, trackInventoryMovement |
| `lib/redemptionService.js` | EXISTS | Verify/add methods | scanQRCode, validateRedemption, processRedemption, getRedemptions |
| `lib/analyticsService.js` | EXISTS | Verify/add methods | getCampaignMetrics, getRedemptionMetrics, getRevenueMetrics |
| `lib/settingsService.js` | EXISTS | Verify/add methods | updateProfile, changePassword, getTeamMembers |
| `lib/apiClient.js` | EXISTS | No changes | Already handles token refresh and requests |

### 3. Component Files to Update

| File Path | Current Status | Update Required | Notes |
|-----------|---|---|---|
| `components/dashboards/DashboardLayout.js` | EXISTS | Verify navigation sidebar | Add links to all implemented pages |
| `components/auth/AuthContext.js` | EXISTS | No changes | Already provides auth state |
| `components/common/FormInput.js` | EXISTS | No changes | Already handles validation display |

---

## PART 2: NEW FILES TO CREATE (64 files)

### PHASE 1: Core Components (6 new files)

#### Components

```
components/common/
├── DataTable.js                 [NEW - 120 lines]
├── DataTable.module.css         [NEW - 80 lines]
├── Pagination.js                [NEW - 60 lines]
├── SearchInput.js               [NEW - 50 lines]
├── Modal.js                     [NEW - 80 lines]
└── Modal.module.css             [NEW - 60 lines]
```

**New Component Files:**
1. `components/common/DataTable.js`
2. `components/common/DataTable.module.css`
3. `components/common/Pagination.js`
4. `components/common/SearchInput.js`
5. `components/common/Modal.js`
6. `components/common/Modal.module.css`

---

### PHASE 2: Store Management (8 new files)

#### Pages

```
app/(dashboard)/
├── stores/
│   ├── page.js                          [MODIFY]
│   ├── page.module.css                  [NEW - if not exists]
│   ├── create/
│   │   ├── page.js                      [NEW]
│   │   └── page.module.css              [NEW]
│   └── [id]/
│       ├── edit/
│       │   ├── page.js                  [NEW]
│       │   └── page.module.css          [NEW]
│       └── page.js                      [NEW]
│           └── page.module.css          [NEW]
```

#### Components

```
components/stores/
├── StoreForm.js                 [NEW]
├── StoreForm.module.css         [NEW]
├── StoreDeleteModal.js          [NEW]
└── StoreList.js                 [NEW - if needed]
```

**New Files:**
1. `app/(dashboard)/stores/page.module.css`
2. `app/(dashboard)/stores/create/page.js`
3. `app/(dashboard)/stores/create/page.module.css`
4. `app/(dashboard)/stores/[id]/page.js`
5. `app/(dashboard)/stores/[id]/page.module.css`
6. `app/(dashboard)/stores/[id]/edit/page.js`
7. `app/(dashboard)/stores/[id]/edit/page.module.css`
8. `components/stores/StoreForm.js`
9. `components/stores/StoreForm.module.css`
10. `components/stores/StoreDeleteModal.js`

**Total: 10 files**

---

### PHASE 3: Campaign Management (14 new files)

#### Pages

```
app/(dashboard)/campaigns/
├── page.js                              [MODIFY]
├── page.module.css                      [NEW]
├── create/
│   ├── page.js                          [NEW - multi-step]
│   └── page.module.css                  [NEW]
├── [id]/
│   ├── page.js                          [NEW - detail view]
│   ├── page.module.css                  [NEW]
│   ├── edit/
│   │   ├── page.js                      [NEW]
│   │   └── page.module.css              [NEW]
│   └── analytics/
│       ├── page.js                      [NEW]
│       └── page.module.css              [NEW]
```

#### Components

```
components/campaigns/
├── CampaignForm.js              [NEW]
├── CampaignForm.module.css      [NEW]
├── CampaignAnalyticsChart.js    [NEW]
├── CampaignStatus.js            [NEW]
└── CampaignFilters.js           [NEW]
```

**New Files:**
1. `app/(dashboard)/campaigns/page.module.css`
2. `app/(dashboard)/campaigns/create/page.js`
3. `app/(dashboard)/campaigns/create/page.module.css`
4. `app/(dashboard)/campaigns/[id]/page.js`
5. `app/(dashboard)/campaigns/[id]/page.module.css`
6. `app/(dashboard)/campaigns/[id]/edit/page.js`
7. `app/(dashboard)/campaigns/[id]/edit/page.module.css`
8. `app/(dashboard)/campaigns/[id]/analytics/page.js`
9. `app/(dashboard)/campaigns/[id]/analytics/page.module.css`
10. `components/campaigns/CampaignForm.js`
11. `components/campaigns/CampaignForm.module.css`
12. `components/campaigns/CampaignAnalyticsChart.js`
13. `components/campaigns/CampaignStatus.js`
14. `components/campaigns/CampaignFilters.js`

**Total: 14 files**

---

### PHASE 4: Scratch Card Inventory (8 new files)

#### Pages

```
app/(dashboard)/scratch-inventory/
├── page.js                              [NEW]
├── page.module.css                      [NEW]
├── allocate/
│   ├── page.js                          [NEW]
│   └── page.module.css                  [NEW]
└── tracking/
    ├── page.js                          [NEW]
    └── page.module.css                  [NEW]
```

#### Components

```
components/inventory/
├── InventoryForm.js             [NEW]
├── InventoryForm.module.css     [NEW]
├── InventoryTracking.js         [NEW]
└── InventoryTracking.module.css [NEW]
```

**New Files:**
1. `app/(dashboard)/scratch-inventory/page.js`
2. `app/(dashboard)/scratch-inventory/page.module.css`
3. `app/(dashboard)/scratch-inventory/allocate/page.js`
4. `app/(dashboard)/scratch-inventory/allocate/page.module.css`
5. `app/(dashboard)/scratch-inventory/tracking/page.js`
6. `app/(dashboard)/scratch-inventory/tracking/page.module.css`
7. `components/inventory/InventoryForm.js`
8. `components/inventory/InventoryForm.module.css`
9. `components/inventory/InventoryTracking.js`
10. `components/inventory/InventoryTracking.module.css`

**Total: 10 files**

---

### PHASE 5: Scratch Card Redemption (10 new files)

#### Pages

```
app/(dashboard)/redemptions/
├── page.js                              [NEW]
├── page.module.css                      [NEW]
├── scan/
│   ├── page.js                          [NEW]
│   └── page.module.css                  [NEW]
└── [id]/
    ├── page.js                          [NEW - detail]
    └── page.module.css                  [NEW]
```

#### Components

```
components/redemptions/
├── QRScanner.js                 [NEW]
├── QRScanner.module.css         [NEW]
├── RedemptionForm.js            [NEW]
├── RedemptionForm.module.css    [NEW]
└── RedemptionHistory.js         [NEW]
```

**New Files:**
1. `app/(dashboard)/redemptions/page.js`
2. `app/(dashboard)/redemptions/page.module.css`
3. `app/(dashboard)/redemptions/scan/page.js`
4. `app/(dashboard)/redemptions/scan/page.module.css`
5. `app/(dashboard)/redemptions/[id]/page.js`
6. `app/(dashboard)/redemptions/[id]/page.module.css`
7. `components/redemptions/QRScanner.js`
8. `components/redemptions/QRScanner.module.css`
9. `components/redemptions/RedemptionForm.js`
10. `components/redemptions/RedemptionForm.module.css`
11. `components/redemptions/RedemptionHistory.js`

**Total: 11 files**

---

### PHASE 6: Analytics & Reporting (10 new files)

#### Pages

```
app/(dashboard)/
├── analytics/
│   ├── page.js                          [NEW]
│   ├── page.module.css                  [NEW]
│   └── campaigns/
│       ├── page.js                      [NEW]
│       └── page.module.css              [NEW]
└── reports/
    ├── page.js                          [NEW]
    └── page.module.css                  [NEW]
```

#### Components

```
components/analytics/
├── AnalyticsChart.js            [NEW]
├── AnalyticsChart.module.css    [NEW]
├── ReportBuilder.js             [NEW]
├── ReportBuilder.module.css     [NEW]
└── MetricsCard.js               [NEW]
```

**New Files:**
1. `app/(dashboard)/analytics/page.js`
2. `app/(dashboard)/analytics/page.module.css`
3. `app/(dashboard)/analytics/campaigns/page.js`
4. `app/(dashboard)/analytics/campaigns/page.module.css`
5. `app/(dashboard)/reports/page.js`
6. `app/(dashboard)/reports/page.module.css`
7. `components/analytics/AnalyticsChart.js`
8. `components/analytics/AnalyticsChart.module.css`
9. `components/analytics/ReportBuilder.js`
10. `components/analytics/ReportBuilder.module.css`
11. `components/analytics/MetricsCard.js`

**Total: 11 files**

---

### PHASE 7: Settings & Configuration (8 new files)

#### Pages

```
app/(dashboard)/settings/
├── page.js                              [NEW]
├── page.module.css                      [NEW]
├── password/
│   ├── page.js                          [NEW]
│   └── page.module.css                  [NEW]
└── team/
    ├── page.js                          [NEW]
    └── page.module.css                  [NEW]
```

#### Components

```
components/settings/
├── SettingsForm.js              [NEW]
├── SettingsForm.module.css      [NEW]
└── PasswordForm.js              [NEW]
```

**New Files:**
1. `app/(dashboard)/settings/page.js`
2. `app/(dashboard)/settings/page.module.css`
3. `app/(dashboard)/settings/password/page.js`
4. `app/(dashboard)/settings/password/page.module.css`
5. `app/(dashboard)/settings/team/page.js`
6. `app/(dashboard)/settings/team/page.module.css`
7. `components/settings/SettingsForm.js`
8. `components/settings/SettingsForm.module.css`
9. `components/settings/PasswordForm.js`

**Total: 9 files**

---

### PHASE 8: Testing (8 new files)

```
tests/
├── unit/
│   ├── campaignService.test.js          [NEW]
│   ├── storeService.test.js             [NEW]
│   ├── inventoryService.test.js         [NEW]
│   └── redemptionService.test.js        [NEW]
└── integration/
    ├── campaigns.integration.test.js    [NEW]
    ├── stores.integration.test.js       [NEW]
    ├── inventory.integration.test.js    [NEW]
    └── redemption.integration.test.js   [NEW]
```

**New Files:**
1. `tests/unit/campaignService.test.js`
2. `tests/unit/storeService.test.js`
3. `tests/unit/inventoryService.test.js`
4. `tests/unit/redemptionService.test.js`
5. `tests/integration/campaigns.integration.test.js`
6. `tests/integration/stores.integration.test.js`
7. `tests/integration/inventory.integration.test.js`
8. `tests/integration/redemption.integration.test.js`

**Total: 8 files**

---

## COMPLETE FILE SUMMARY TABLE

| Phase | Category | Files | Type |
|-------|----------|-------|------|
| 1 | Core Components | 6 | New |
| 2 | Store Pages | 7 | New |
| 2 | Store Components | 3 | New |
| 3 | Campaign Pages | 9 | New |
| 3 | Campaign Components | 5 | New |
| 4 | Inventory Pages | 6 | New |
| 4 | Inventory Components | 4 | New |
| 5 | Redemption Pages | 6 | New |
| 5 | Redemption Components | 5 | New |
| 6 | Analytics Pages | 6 | New |
| 6 | Analytics Components | 5 | New |
| 7 | Settings Pages | 6 | New |
| 7 | Settings Components | 3 | New |
| 8 | Tests | 8 | New |
| **TOTAL** | | **92 NEW** | |
| | Modifications | 12 | Modify |

---

## FILE CREATION ORDER

### Week 1: Foundation (Days 1-2)
**Dependency Order for Phase 1:**
1. DataTable.module.css
2. DataTable.js (requires DataTable.module.css)
3. Pagination.js
4. SearchInput.js
5. Modal.module.css
6. Modal.js (requires Modal.module.css)

### Week 2: Core Features (Days 3-8)
1. **Day 3-4: Store Management**
   - StoreForm.module.css
   - StoreForm.js
   - StoreDeleteModal.js
   - Update stores/page.js
   - Create stores/create/page.js
   - Create stores/[id]/edit/page.js
   - Create stores/[id]/page.js

2. **Day 5-6: Campaign Management**
   - CampaignForm.module.css
   - CampaignForm.js
   - CampaignAnalyticsChart.js
   - CampaignFilters.js
   - Update campaigns/page.js
   - Create campaigns/create/page.js
   - Create campaigns/[id]/edit/page.js
   - Create campaigns/[id]/analytics/page.js

3. **Day 7-8: Inventory**
   - InventoryForm.module.css
   - InventoryForm.js
   - InventoryTracking.module.css
   - InventoryTracking.js
   - Create scratch-inventory pages (4 files)

### Week 3: Advanced Features (Days 9-12)
4. **Day 9: Redemption**
   - QRScanner components
   - RedemptionForm components
   - Redemption pages (3 page directories)

5. **Day 10-11: Analytics**
   - AnalyticsChart components
   - ReportBuilder components
   - Analytics pages (2 page directories)
   - Reports page

6. **Day 12: Settings**
   - SettingsForm components
   - Settings pages (3 page directories)

### Week 4: Testing & Polish (Day 13-14)
7. **Day 13: Testing**
   - Write unit tests
   - Write integration tests

8. **Day 14: Polish**
   - Bug fixes
   - Performance optimization
   - Documentation

---

## DEPENDENCY MATRIX

### Required Before Any Implementation
- [x] apiClient.js functional
- [x] AuthContext.js working
- [x] All services in lib/ created
- [x] DashboardLayout functional
- [x] FormInput/FormButton/FormError components

### Blocking Dependencies
- DataTable must exist before: stores/page.js, campaigns/page.js
- Modal must exist before: create/edit pages
- All service methods must exist before: pages using them
- AuthContext must work before: any protected page

### Phase Dependencies
1. Phase 1 (Components) - No dependencies
2. Phase 2 (Stores) - Requires Phase 1
3. Phase 3 (Campaigns) - Requires Phase 1
4. Phase 4 (Inventory) - Requires Phase 1
5. Phase 5 (Redemption) - Requires Phase 1, 4
6. Phase 6 (Analytics) - Requires Phase 3
7. Phase 7 (Settings) - Requires Phase 1
8. Phase 8 (Testing) - Requires all other phases

---

## CHECKLIST FOR IMPLEMENTATION START

Before beginning Phase 1, verify:
- [ ] IMPLEMENTATION_PLAN.md reviewed and approved
- [ ] FILES_INVENTORY.md reviewed
- [ ] All existing services verified in lib/
- [ ] DashboardLayout.js ready
- [ ] AuthContext.js functional
- [ ] apiClient.js tested with sample requests
- [ ] CSS Modules working in components
- [ ] Next.js dev server running without errors
- [ ] Backend APIs verified and accessible

---

