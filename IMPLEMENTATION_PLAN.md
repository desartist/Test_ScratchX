# FRONTEND IMPLEMENTATION PLAN
## QR Coupon Campaigns | Scratch Card Management Platform

**Project:** QR Coupon/Scratch Card Management  
**Framework:** Next.js 16.2.3 + React 19.2.4  
**Date Created:** May 26, 2026  
**Total Phases:** 8 (Sequential)  
**Estimated Duration:** 14-21 days  

---

## IMPLEMENTATION STRATEGY

### Core Principles
1. **Reuse existing pages** - Update placeholder pages instead of recreating
2. **Follow existing patterns** - Use apiClient, services, form components, CSS Modules throughout
3. **Role-based development** - Implement per-role features (Super_Admin → Distributor → Merchant → Manager)
4. **Service-first architecture** - All API calls go through lib/services
5. **Test-driven approach** - Write tests alongside components
6. **Frequent commits** - Commit after each logical feature

### Code Patterns to Follow

**Pattern 1: Page with Data Fetching**
```jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { storeService } from '@/lib/storeService';
import styles from './page.module.css';

export default function StorePage() {
  const { account } = useAuthContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await storeService.getStores();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  );
}
```

**Pattern 2: Form Component**
```jsx
'use client';
import { useState } from 'react';
import FormInput from '@/components/common/FormInput';
import FormButton from '@/components/common/FormButton';
import FormError from '@/components/common/FormError';
import { storeService } from '@/lib/storeService';
import styles from './CreateStoreForm.module.css';

export default function CreateStoreForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Store name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await storeService.createStore(formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}
      
      <FormInput
        label="Store Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        error={errors.name}
      />
      
      <FormInput
        label="Location"
        value={formData.location}
        onChange={(e) => setFormData({...formData, location: e.target.value})}
        error={errors.location}
      />
      
      <FormButton type="submit" loading={loading}>
        Create Store
      </FormButton>
    </form>
  );
}
```

**Pattern 3: API Service**
```javascript
import { apiClient } from './apiClient';

class StoreService {
  async getStores() {
    return apiClient.get('/api/stores');
  }

  async getStoreById(id) {
    return apiClient.get(`/api/stores/${id}`);
  }

  async createStore(data) {
    return apiClient.post('/api/stores', data);
  }

  async updateStore(id, data) {
    return apiClient.put(`/api/stores/${id}`, data);
  }

  async deleteStore(id) {
    return apiClient.delete(`/api/stores/${id}`);
  }
}

export const storeService = new StoreService();
```

---

## PHASE 1: CORE TABLE & LIST COMPONENTS (Days 1-2)

### Objective
Create reusable table components used across all pages for displaying lists.

### Files to Create

**1. `components/common/DataTable.js`**
- Reusable table component with sorting, pagination, filtering
- Props: columns, data, loading, onRowClick
- Features: Header sorting, row selection, pagination controls

**2. `components/common/DataTable.module.css`**
- Professional table styling
- Hover effects, selected row highlighting
- Responsive grid layout

**3. `components/common/Pagination.js`**
- Pagination controls component
- Props: currentPage, totalPages, onPageChange
- Features: Previous/Next buttons, page indicator

**4. `components/common/SearchInput.js`**
- Search/filter input component
- Props: placeholder, value, onChange
- Features: Clear button, debounced search

**5. `components/common/Modal.js`**
- Reusable modal/dialog component
- Props: isOpen, title, children, onClose, footer
- Features: Backdrop click to close, keyboard escape

**6. `components/common/Modal.module.css`**
- Modal styling with overlay and animations

### Code to Implement

```jsx
// DataTable.js
'use client';
import { useState } from 'react';
import styles from './DataTable.module.css';

export default function DataTable({ 
  columns, 
  data, 
  loading = false,
  onRowClick,
  onEdit,
  onDelete 
}) {
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortOrder === 'asc' ? 
      (aVal > bVal ? 1 : -1) : 
      (aVal < bVal ? 1 : -1);
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIdx, startIdx + rowsPerPage);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th 
                key={col.field}
                onClick={() => handleSort(col.field)}
                className={styles.sortable}
              >
                {col.label}
                {sortField === col.field && (
                  <span className={styles.sortIcon}>
                    {sortOrder === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            ))}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, idx) => (
            <tr 
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={styles.row}
            >
              {columns.map(col => (
                <td key={col.field}>
                  {col.render ? col.render(row[col.field], row) : row[col.field]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className={styles.actions}>
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className={styles.editBtn}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>{currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### Files to Modify
None for this phase.

### Testing
- Test DataTable with sample data
- Test sorting on each column
- Test pagination controls
- Test search filtering

---

## PHASE 2: STORE MANAGEMENT PAGES (Days 3-4)

### Objective
Implement complete store CRUD operations. Update existing placeholder page.

### Files to Modify

**1. `app/(dashboard)/stores/page.js`**
- Replace placeholder with functional store list page
- Features: Table display, create button, edit/delete actions
- Pattern: Use DataTable component from Phase 1

**2. `lib/storeService.js`**
- Verify all CRUD methods exist
- Methods: getStores, getStoreById, createStore, updateStore, deleteStore

### Files to Create

**1. `app/(dashboard)/stores/create/page.js`**
- New page for creating stores
- Form with validation
- Redirect to stores list on success

**2. `app/(dashboard)/stores/[id]/edit/page.js`**
- Edit store details
- Pre-fill form with existing data
- Update and redirect

**3. `app/(dashboard)/stores/[id]/page.js`**
- Store detail view
- Show all store information
- Delete button with confirmation

**4. `components/stores/StoreForm.js`**
- Reusable form for create/edit
- Props: storeData, onSubmit, loading
- Fields: name, location, email, phone, address

**5. `components/stores/StoreForm.module.css`**
- Form styling

**6. `components/stores/StoreDeleteModal.js`**
- Confirmation modal for deletion
- Props: store, onConfirm, onCancel

### Implementation Steps

```jsx
// app/(dashboard)/stores/page.js
'use client';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { storeService } from '@/lib/storeService';
import DataTable from '@/components/common/DataTable';
import Modal from '@/components/common/Modal';
import StoreForm from '@/components/stores/StoreForm';
import styles from './page.module.css';

export default function StoresPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await storeService.getStores();
      setStores(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreate = async (formData) => {
    try {
      await storeService.createStore(formData);
      setIsCreateModalOpen(false);
      fetchStores();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (store) => {
    router.push(`/stores/${store._id}/edit`);
  };

  const handleDelete = async (store) => {
    if (confirm(`Delete store "${store.name}"?`)) {
      try {
        await storeService.deleteStore(store._id);
        fetchStores();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const columns = [
    { field: 'name', label: 'Store Name' },
    { field: 'location', label: 'Location' },
    { field: 'email', label: 'Email' },
    { 
      field: 'status',
      label: 'Status',
      render: (status) => <span className={styles[status]}>{status}</span>
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Store Management</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className={styles.createBtn}
        >
          + Create Store
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <DataTable
        columns={columns}
        data={stores}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isCreateModalOpen}
        title="Create New Store"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <StoreForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
```

### RBAC Considerations
- Super_Admin: Can create/edit/delete all stores
- Distributor: Can only manage their assigned stores
- Merchant/Manager: Read-only access to their store

### Testing
- Create store
- Edit store details
- Delete store
- Verify RBAC permissions
- Test error handling

---

## PHASE 3: CAMPAIGN MANAGEMENT PAGES (Days 5-6)

### Objective
Implement complete campaign CRUD with advanced features.

### Files to Modify

**1. `app/(dashboard)/campaigns/page.js`**
- Replace placeholder with campaign list table
- Features: Filter by status, created date range, creator
- Use DataTable with campaign-specific columns

**2. `lib/campaignService.js`**
- Verify all methods exist
- Methods: getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign

### Files to Create

**1. `app/(dashboard)/campaigns/create/page.js`**
- Multi-step campaign creation
- Step 1: Basic info (name, description, dates)
- Step 2: Rewards configuration
- Step 3: Distribution rules

**2. `app/(dashboard)/campaigns/[id]/edit/page.js`**
- Edit campaign details
- Show current settings

**3. `app/(dashboard)/campaigns/[id]/analytics/page.js`**
- Campaign performance metrics
- Charts: Distribution, Redemption, Revenue
- Filters by date range, location

**4. `components/campaigns/CampaignForm.js`**
- Multi-step form component
- Props: step, campaign, onChange, onNext, onPrev
- Validation per step

**5. `components/campaigns/CampaignForm.module.css`**

**6. `components/campaigns/CampaignAnalyticsChart.js`**
- Chart component for campaign metrics
- Show distribution vs redemption

### Implementation Notes

Campaign model typically includes:
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  startDate: Date,
  endDate: Date,
  status: 'Draft' | 'Active' | 'Completed' | 'Paused',
  rewardType: 'Discount' | 'Cashback' | 'Gift',
  rewardValue: Number,
  rewardUnit: '%' | 'Amount',
  targetAudience: String,
  distributionMethod: 'QR' | 'SMS' | 'Email',
  totalQuantity: Number,
  distributeQuantity: Number,
  redemptionQuantity: Number,
  createdBy: ObjectId,
  createdDate: Date,
  updatedDate: Date
}
```

### Testing
- Create campaign with validation
- Edit campaign settings
- View analytics and charts
- Test status transitions
- Verify creator permissions

---

## PHASE 4: SCRATCH CARD INVENTORY (Days 7-8)

### Objective
Implement scratch card inventory allocation and tracking.

### Files to Modify

**1. `lib/inventoryService.js`**
- Verify service exists with methods:
  - allocateScratchCards
  - getInventory
  - getInventoryByLocation
  - trackInventoryMovement

### Files to Create

**1. `app/(dashboard)/scratch-inventory/page.js`**
- Display inventory levels by location
- Show allocation status

**2. `app/(dashboard)/scratch-inventory/allocate/page.js`**
- Allocate scratch cards to stores/campaigns
- Form: Select campaign, select location, enter quantity

**3. `app/(dashboard)/scratch-inventory/tracking/page.js`**
- View inventory movement history
- Table with movement logs

**4. `components/inventory/InventoryForm.js`**
- Form for allocation
- Validation: sufficient quantity available

**5. `components/inventory/InventoryTracking.js`**
- History table component

### Testing
- Allocate cards to location
- Verify quantity checks
- View movement history
- Test permission checks

---

## PHASE 5: SCRATCH CARD REDEMPTION (Days 9-10)

### Objective
Implement scratch card scanning, validation, and redemption tracking.

### Files to Create

**1. `app/(dashboard)/redemptions/page.js`**
- View all redemptions with filters
- Show: Code, Store, Amount, Date, Status

**2. `app/(dashboard)/redemptions/scan/page.js`**
- QR code scanner interface
- Real-time validation
- Immediate redemption confirmation

**3. `components/redemptions/QRScanner.js`**
- QR code input component
- Can use camera or manual input
- Props: onScan, onError

**4. `components/redemptions/RedemptionForm.js`**
- Form after scanning
- Confirm details before redemption
- Customer info entry

**5. `lib/redemptionService.js`** (if not already exists)
- scanQRCode(code)
- validateRedemption(code)
- processRedemption(data)
- getRedemptions(filters)

### Implementation Notes

Redemption flow:
1. Scanner captures QR code
2. Validate code exists and not used
3. Show card details
4. Confirm customer info
5. Process redemption
6. Show success/failure

### RBAC
- Merchant/Manager: Can scan and redeem
- Distributor: View-only
- Super_Admin: Full access

### Testing
- Scan valid QR code
- Try invalid/used code
- Process redemption
- View redemption history
- Test error scenarios

---

## PHASE 6: ANALYTICS & REPORTING (Days 11-12)

### Objective
Create analytics dashboards and reporting pages.

### Files to Create

**1. `app/(dashboard)/analytics/page.js`**
- Overall platform analytics
- Charts: Total campaigns, Total redeemed, Revenue

**2. `app/(dashboard)/analytics/campaigns/page.js`**
- Campaign-specific metrics
- Distribution vs redemption rates
- Revenue by campaign

**3. `app/(dashboard)/reports/page.js`**
- Generate and download reports
- Filters: Date range, campaign, location

**4. `components/analytics/AnalyticsChart.js`**
- Line/bar chart component
- Props: data, type, title

**5. `components/analytics/ReportBuilder.js`**
- Form to configure reports
- Select metrics, date range, grouping

**6. `lib/analyticsService.js`**
- Methods for fetching analytics data
- getCampaignMetrics(campaignId)
- getRedemptionMetrics(filters)
- getRevenueMetrics(filters)

### Chart Types Needed
- Line charts: Trends over time
- Bar charts: Comparison across categories
- Pie charts: Distribution
- KPI cards: Key metrics

### Testing
- Load analytics page
- Change date ranges
- Export reports
- Verify data accuracy

---

## PHASE 7: SETTINGS & CONFIGURATION (Days 13)

### Objective
Implement user settings and system configuration.

### Files to Create

**1. `app/(dashboard)/settings/page.js`**
- User profile settings
- Account preferences
- Notification settings

**2. `app/(dashboard)/settings/password/page.js`**
- Change password
- Password strength indicator

**3. `app/(dashboard)/settings/team/page.js`** (Super_Admin only)
- Manage team members
- Assign roles
- Deactivate users

**4. `components/settings/SettingsForm.js`**
- Form component for settings

**5. `lib/settingsService.js`**
- updateProfile(data)
- changePassword(oldPassword, newPassword)
- getTeamMembers()
- updateTeamMember(id, data)

### Testing
- Update profile
- Change password validation
- Add/remove team members
- Permission checks

---

## PHASE 8: TESTING & POLISH (Days 14)

### Objective
Write tests, fix bugs, optimize performance.

### Testing Tasks

**1. Unit Tests**
- Test all service methods
- Test form validations
- Test utility functions

**2. Integration Tests**
- Test page flows: Create → List → Edit → Delete
- Test RBAC permissions
- Test error handling

**3. E2E Tests (Optional)
- Test critical user journeys
- Test across different roles

**4. Performance**
- Optimize images
- Lazy load components
- Minimize bundle size

**5. Bug Fixes**
- Fix reported issues
- Edge case handling
- Error scenarios

### Files to Create

**1. `tests/unit/campaignService.test.js`**
**2. `tests/unit/storeService.test.js`**
**3. `tests/integration/campaigns.integration.test.js`**

---

## IMPLEMENTATION CHECKLIST BY PHASE

### Phase 1: Core Components ✓
- [ ] DataTable component
- [ ] Pagination component
- [ ] SearchInput component
- [ ] Modal component
- [ ] Form inputs

### Phase 2: Store Management ✓
- [ ] Update stores/page.js
- [ ] Create stores/create/page.js
- [ ] Create stores/[id]/edit/page.js
- [ ] Create StoreForm component
- [ ] Test create/edit/delete flows

### Phase 3: Campaign Management ✓
- [ ] Update campaigns/page.js
- [ ] Create campaigns/create/page.js (multi-step)
- [ ] Create campaigns/[id]/edit/page.js
- [ ] Create campaigns/[id]/analytics/page.js
- [ ] Create CampaignForm component
- [ ] Test campaign flows

### Phase 4: Inventory Management ✓
- [ ] Create scratch-inventory/page.js
- [ ] Create scratch-inventory/allocate/page.js
- [ ] Create InventoryForm component
- [ ] Test allocation flows

### Phase 5: Redemption ✓
- [ ] Create redemptions/page.js
- [ ] Create redemptions/scan/page.js
- [ ] Create QRScanner component
- [ ] Create RedemptionForm component
- [ ] Test scanning flow

### Phase 6: Analytics ✓
- [ ] Create analytics/page.js
- [ ] Create analytics/campaigns/page.js
- [ ] Create AnalyticsChart component
- [ ] Test data loading

### Phase 7: Settings ✓
- [ ] Create settings/page.js
- [ ] Create settings/password/page.js
- [ ] Create settings/team/page.js
- [ ] Test settings updates

### Phase 8: Testing ✓
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization
- [ ] Bug fixes

---

## DEPENDENCIES & PREREQUISITES

**Before Starting Implementation:**
1. ✓ Verify all backend APIs are working
2. ✓ Test apiClient with sample requests
3. ✓ Confirm AuthContext is functional
4. ✓ Ensure CSS Modules are imported correctly
5. ✓ Review existing service patterns

**External Libraries (Already in package.json):**
- next: 16.2.3
- react: 19.2.4
- (Chart library TBD for analytics)

**Optional Additions (if needed):**
- recharts or chart.js for analytics
- react-qr-reader for QR scanning
- date-fns for date handling

---

## FILE ORGANIZATION SUMMARY

### Files to Modify (12 total)
1. `app/(dashboard)/stores/page.js`
2. `app/(dashboard)/campaigns/page.js`
3. `lib/storeService.js`
4. `lib/campaignService.js`
5. And 8 more existing service/page files

### New Files to Create (48 total)
- 6 new page directories
- 18 new component files
- 6 new CSS module files
- 4 new service files
- 8 test files

### Total New Components
- 12 reusable components
- 15 page-specific components
- 6 form components
- 4 service classes

---

## NEXT STEPS

1. **Approval:** User reviews and approves this implementation plan
2. **Phase 1 Start:** Begin with core components (DataTable, Modal, SearchInput)
3. **Dependency Management:** Create each component following the established patterns
4. **Testing:** After each phase, test thoroughly before proceeding
5. **Commit Frequency:** Commit after each component/page completes

---

## SUCCESS CRITERIA

✓ All 50+ backend APIs have corresponding frontend pages  
✓ All placeholder pages replaced with functional components  
✓ Complete CRUD operations for all entities  
✓ RBAC properly implemented across all pages  
✓ Error handling and loading states on all pages  
✓ Responsive design on mobile, tablet, desktop  
✓ All tests passing  
✓ No console errors or warnings  
✓ Performance metrics within acceptable range  
✓ Full documentation of implemented features  

