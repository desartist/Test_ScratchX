# Component Manifest - ScratchX Application

**Date:** 2026-06-04  
**Version:** 1.0  
**Purpose:** Complete inventory of reusable components for Figma alignment

---

## 1. CORE LAYOUT COMPONENTS (Wrappers)

### 1.1 DashboardLayout
- **Path:** `components/dashboards/DashboardLayout.js`
- **Purpose:** Main dashboard wrapper for authenticated users
- **Props:** `role` (string), `children` (ReactNode)
- **Used By:** All dashboard pages
- **Features:** Sidebar nav, role-based routing, header
- **Styling:** Uses drawer + page content layout
- **Notes:** Manages drawer open/close state

### 1.2 AuthLayout
- **Path:** `components/layouts/AuthLayout.js`
- **Purpose:** Auth page wrapper (login, signup, reset)
- **Props:** `children` (ReactNode)
- **Used By:** All auth pages
- **Features:** Centered form layout, footer
- **Styling:** Minimal, centered container
- **Notes:** Mobile-optimized (430px max-width)

### 1.3 AdminDashboard
- **Path:** `components/dashboards/AdminDashboard.js`
- **Purpose:** Admin-specific dashboard layout
- **Props:** `children` (ReactNode)
- **Used By:** Admin-only pages
- **Features:** Admin-specific navigation
- **Status:** Implemented, minimal styling

### 1.4 ManagerDashboard
- **Path:** `components/dashboards/ManagerDashboard.js`
- **Purpose:** Manager-specific dashboard
- **Props:** `children` (ReactNode)
- **Used By:** Manager pages
- **Status:** Implemented

### 1.5 RetailerDashboard
- **Path:** `components/dashboards/RetailerDashboard.js`
- **Purpose:** Retailer-specific layout
- **Props:** `children` (ReactNode)
- **Used By:** Retailer pages
- **Status:** Implemented

---

## 2. FORM COMPONENTS

### 2.1 FormInput
- **Path:** `components/common/FormInput.js`
- **Purpose:** Text input field wrapper
- **Props:**
  ```javascript
  {
    label: string,
    type: string ('text', 'email', 'password', 'number'),
    placeholder: string,
    value: string,
    onChange: function,
    error: string,
    disabled: boolean,
    required: boolean
  }
  ```
- **Features:** Error display, validation feedback
- **Styling:** Modern input with focus states
- **Used By:** All forms (login, signup, campaign creation, etc.)

### 2.2 FormButton
- **Path:** `components/common/FormButton.js`
- **Purpose:** Form submission button
- **Props:**
  ```javascript
  {
    text: string,
    onClick: function,
    disabled: boolean,
    loading: boolean,
    variant: 'primary' | 'secondary',
    size: 'small' | 'medium' | 'large'
  }
  ```
- **Features:** Loading state, disabled state
- **Styling:** Orange primary, gray secondary
- **Used By:** Form submission buttons across app

### 2.3 FormError
- **Path:** `components/common/FormError.js`
- **Purpose:** Error message display
- **Props:** `message` (string)
- **Styling:** Red text, warning icon
- **Used By:** Form validation feedback

### 2.4 FormSuccess
- **Path:** `components/common/FormSuccess.js`
- **Purpose:** Success message display
- **Props:** `message` (string)
- **Styling:** Green text, checkmark icon
- **Used By:** Form success feedback

### 2.5 OTPInput
- **Path:** `components/auth/OTPInput.js`
- **Purpose:** OTP digit input field
- **Props:**
  ```javascript
  {
    length: number (default 6),
    onChange: function,
    value: string,
    disabled: boolean
  }
  ```
- **Features:** Auto-focus next field, paste support
- **Styling:** Bordered boxes in a row
- **Used By:** OTP verification pages

### 2.6 SearchInput
- **Path:** `components/common/SearchInput.js`
- **Purpose:** Search box with icon
- **Props:**
  ```javascript
  {
    placeholder: string,
    value: string,
    onChange: function,
    onClear: function
  }
  ```
- **Features:** Clear button on input
- **Styling:** Lucide search icon
- **Used By:** Campaign search, store search

### 2.7 LoginForm
- **Path:** `components/auth/LoginForm.js`
- **Purpose:** Complete login form
- **Features:** Email/password fields, submit button, forgot password link
- **Used By:** Login page
- **Integration:** AuthContext for form submission

### 2.8 SignupForm
- **Path:** `components/auth/SignupForm.js`
- **Purpose:** Complete registration form
- **Features:** Name, email, password fields, terms checkbox
- **Used By:** Signup page
- **Validation:** Email format, password strength

### 2.9 OTPVerifyForm
- **Path:** `components/auth/OTPVerifyForm.js`
- **Purpose:** OTP verification form
- **Features:** OTPInput component, resend button
- **Used By:** OTP verify page
- **Integration:** Countdown timer for resend

### 2.10 OTPVerifyContent
- **Path:** `components/auth/OTPVerifyContent.js`
- **Purpose:** OTP verification wrapper
- **Features:** Instructions, form, resend logic
- **Used By:** OTP page layout

### 2.11 PasswordResetForm
- **Path:** `components/auth/PasswordResetForm.js`
- **Purpose:** Password reset form
- **Features:** New password, confirm password fields
- **Used By:** Password reset page

### 2.12 PasswordResetRequestForm
- **Path:** `components/auth/PasswordResetRequestForm.js`
- **Purpose:** Request password reset
- **Features:** Email field
- **Used By:** Password reset request page

### 2.13 OTPRequestForm
- **Path:** `components/auth/OTPRequestForm.js`
- **Purpose:** Request OTP form
- **Features:** Phone/email field
- **Used By:** OTP request page

### 2.14 CampaignForm
- **Path:** `components/campaigns/CampaignForm.js`
- **Purpose:** Campaign creation/edit form
- **Features:** Multiple form fields for campaign setup
- **Used By:** New campaign, campaign edit pages

### 2.15 StoreForm
- **Path:** `components/stores/StoreForm.js`
- **Purpose:** Store creation/edit form
- **Features:** Store name, location, contact fields
- **Used By:** Store create, store edit pages

### 2.16 InventoryForm
- **Path:** `components/inventory/InventoryForm.js`
- **Purpose:** Inventory allocation form
- **Features:** Quantity, store selection fields
- **Used By:** Inventory allocation page

---

## 3. CARD COMPONENTS

### 3.1 CampaignCard
- **Path:** `components/dashboard/CampaignCard.js`
- **Purpose:** Campaign summary card
- **Props:**
  ```javascript
  {
    campaignId: string,
    name: string,
    status: 'active' | 'inactive' | 'completed',
    stores: number,
    scratches: number,
    redeemed: number,
    onClick: function
  }
  ```
- **Features:** Status badge, quick stats
- **Styling:** White card, hover effect
- **Used By:** Campaign list page

### 3.2 StatCard
- **Path:** `components/dashboard/StatCard.js`
- **Purpose:** Statistics display card
- **Props:**
  ```javascript
  {
    title: string,
    value: string | number,
    icon: ReactNode,
    trend: 'up' | 'down',
    trendValue: number
  }
  ```
- **Features:** Trend indicator, icon
- **Styling:** Card layout with icon on left
- **Used By:** Dashboard pages, analytics

### 3.3 StoreCard
- **Path:** `components/stores/StoreCard.js`
- **Purpose:** Store summary card
- **Props:**
  ```javascript
  {
    storeId: string,
    name: string,
    location: string,
    campaigns: number,
    status: 'active' | 'inactive',
    onClick: function
  }
  ```
- **Features:** Location badge, quick actions
- **Used By:** Store list page

### 3.4 RewardPreviewCard
- **Path:** `components/dashboard/RewardPreviewCard.js`
- **Purpose:** Reward preview in campaign card
- **Features:** Shows available rewards
- **Used By:** Campaign details

### 3.5 BillingRangeCard
- **Path:** `components/dashboard/BillingRangeCard.js`
- **Purpose:** Billing information card
- **Features:** Plan info, pricing
- **Used By:** Billing page

### 3.6 StatsCard
- **Path:** `components/stores/StatsCard.js`
- **Purpose:** Store statistics card
- **Features:** Stat display with numbers
- **Used By:** Store detail page

---

## 4. TABLE & DATA COMPONENTS

### 4.1 DataTable
- **Path:** `components/common/DataTable.js`
- **Purpose:** Generic data table renderer
- **Props:**
  ```javascript
  {
    columns: Array<{key, label, render?}>,
    data: Array<object>,
    onRowClick: function,
    loading: boolean,
    empty: string
  }
  ```
- **Features:** Sortable columns (optional), responsive
- **Styling:** Striped rows, hover effect
- **Used By:** All data listing pages

### 4.2 UserTable
- **Path:** `components/dashboards/shared/UserTable.js`
- **Purpose:** User listing table
- **Features:** Name, email, role, status columns
- **Used By:** User management pages

### 4.3 Pagination
- **Path:** `components/common/Pagination.js`
- **Purpose:** Page navigation
- **Props:**
  ```javascript
  {
    currentPage: number,
    totalPages: number,
    onPageChange: function
  }
  ```
- **Features:** Previous/Next buttons, page numbers
- **Used By:** All paginated lists

### 4.4 CampaignStoresTable
- **Path:** `app/(dashboard)/campaign/[id]/components/CampaignStoresTable.js`
- **Purpose:** Campaign assigned stores table
- **Features:** Store name, location, status, remove button
- **Used By:** Campaign details page

---

## 5. MODAL & OVERLAY COMPONENTS

### 5.1 Modal
- **Path:** `components/common/Modal.js`
- **Purpose:** Generic modal wrapper
- **Props:**
  ```javascript
  {
    isOpen: boolean,
    onClose: function,
    title: string,
    children: ReactNode,
    size: 'small' | 'medium' | 'large',
    actions: Array<{label, onClick}>
  }
  ```
- **Features:** Backdrop overlay, close button, action buttons
- **Styling:** White modal with shadow

### 5.2 AssignStoresModal
- **Path:** `app/(dashboard)/campaign/[id]/components/AssignStoresModal.js`
- **Purpose:** Modal to assign stores to campaign
- **Features:** Store list with checkboxes, save button
- **Used By:** Campaign details page
- **Styling:** Module CSS: `AssignStoresModal.module.css`

### 5.3 RemoveStoreModal
- **Path:** `app/(dashboard)/campaign/[id]/components/RemoveStoreModal.js`
- **Purpose:** Confirmation modal to remove store
- **Features:** Warning message, confirm/cancel buttons
- **Used By:** Campaign details page
- **Styling:** Module CSS: `RemoveStoreModal.module.css`

### 5.4 AllocateScratchModal
- **Path:** `app/(dashboard)/campaign/[id]/components/AllocateScratchModal.js`
- **Purpose:** Modal to allocate scratch cards
- **Features:** Quantity input, stores selection, allocate button
- **Used By:** Campaign details page
- **Styling:** Module CSS: `AllocateScratchModal.module.css`

### 5.5 DeleteCampaignModal
- **Path:** `app/(dashboard)/campaign/[id]/components/DeleteCampaignModal.js`
- **Purpose:** Confirmation modal for campaign deletion
- **Features:** Warning, confirm/cancel buttons
- **Used By:** Campaign details page
- **Styling:** Module CSS: `DeleteCampaignModal.module.css`

### 5.6 ConfirmStatusModal
- **Path:** `app/(dashboard)/campaign/[id]/components/ConfirmStatusModal.js`
- **Purpose:** Confirm campaign status change
- **Features:** Status message, confirm/cancel
- **Used By:** Campaign status actions

### 5.7 CampaignLaunchModal
- **Path:** `app/(dashboard)/range/[id]/components/CampaignLaunchModal.js`
- **Purpose:** Modal for launching campaign
- **Features:** Launch confirmation, schedule date
- **Used By:** Range page

### 5.8 StoreDeleteModal
- **Path:** `components/stores/StoreDeleteModal.js`
- **Purpose:** Store deletion confirmation
- **Features:** Warning message, confirm/cancel
- **Used By:** Store management

---

## 6. STATUS & BADGE COMPONENTS

### 6.1 StatusBadge (Campaign Level)
- **Path:** `app/(dashboard)/campaign/[id]/components/StatusBadge.js`
- **Purpose:** Campaign status indicator
- **Props:**
  ```javascript
  {
    status: 'active' | 'inactive' | 'completed' | 'draft',
    size: 'small' | 'medium'
  }
  ```
- **Styling:** Module CSS: `StatusBadge.module.css`
- **Colors:** Green (active), Gray (inactive), Blue (completed)

### 6.2 StatusBadge (Campaigns Level)
- **Path:** `app/(dashboard)/campaigns/components/StatusBadge.js`
- **Purpose:** Status badge for campaign list
- **Purpose:** Same as above (slightly different styling)

### 6.3 Badge
- **Path:** `components/dashboard/Badge.js`
- **Purpose:** Generic badge component
- **Props:**
  ```javascript
  {
    label: string,
    variant: 'success' | 'warning' | 'error' | 'info',
    size: 'small' | 'medium' | 'large'
  }
  ```
- **Used By:** Various components for status indication

---

## 7. CUSTOMER COMPONENTS

### 7.1 ScratchCard
- **Path:** `components/customer/ScratchCard.js`
- **Purpose:** Interactive scratch card animation
- **Features:**
  - Canvas-based scratch effect
  - Reveal animation
  - Animation completion callback
- **Props:**
  ```javascript
  {
    scratchCardId: string,
    rewardText: string,
    onRevealed: function,
    disabled: boolean
  }
  ```
- **Used By:** Customer scratch card pages

### 7.2 LocationStatus
- **Path:** `components/customer/LocationStatus.js`
- **Purpose:** GPS location verification UI
- **Features:**
  - Location request button
  - Verification status indicator
  - Distance display (when verified)
- **Props:**
  ```javascript
  {
    status: 'idle' | 'verifying' | 'verified' | 'error',
    distance: number,
    storeName: string,
    onLocationRequest: function,
    error: string
  }
  ```
- **Used By:** Scan page, participate page

### 7.3 CountdownTimer
- **Path:** `components/customer/CountdownTimer.js`
- **Purpose:** Countdown timer display
- **Features:** Displays remaining time, completes callback
- **Props:**
  ```javascript
  {
    expiryDate: string | Date,
    onExpired: function
  }
  ```
- **Used By:** Scratch card expiry display

---

## 8. DASHBOARD COMPONENTS

### 8.1 CampaignCard (Dashboard)
- **Path:** `components/dashboard/CampaignCard.js`
- **Purpose:** Dashboard campaign card
- **Features:** Stats, status, quick actions
- **Used By:** Dashboard page

### 8.2 CampaignFilter
- **Path:** `components/dashboard/CampaignFilter.js`
- **Purpose:** Filter campaigns by status
- **Props:**
  ```javascript
  {
    activeFilter: string,
    onFilterChange: function
  }
  ```
- **Filters:** Active, Inactive, Low Scratches, Completed
- **Used By:** Campaign list page

### 8.3 CampaignSearch
- **Path:** `components/dashboard/CampaignSearch.js`
- **Purpose:** Search campaigns by name
- **Props:**
  ```javascript
  {
    value: string,
    onChange: function
  }
  ```
- **Used By:** Campaign list page

### 8.4 CampaignActionsMenu
- **Path:** `components/dashboard/CampaignActionsMenu.js`
- **Purpose:** Campaign action menu (edit, delete, etc.)
- **Props:**
  ```javascript
  {
    campaignId: string,
    onEdit: function,
    onDelete: function,
    onViewAnalytics: function
  }
  ```
- **Used By:** Campaign list cards

### 8.5 CampaignQRCodeCard
- **Path:** `components/dashboard/CampaignQRCodeCard.js`
- **Purpose:** Display QR code for campaign
- **Features:** QR code rendering, download button
- **Used By:** Campaign details page

### 8.6 ScratchAllocationBar
- **Path:** `components/dashboard/ScratchAllocationBar.js`
- **Purpose:** Visual progress bar for scratch allocation
- **Props:**
  ```javascript
  {
    allocated: number,
    total: number,
    used: number
  }
  ```
- **Features:** Stacked bar showing allocation, usage, remaining
- **Used By:** Campaign details page

### 8.7 ProgressBar
- **Path:** `components/dashboard/ProgressBar.js`
- **Purpose:** Generic progress indicator
- **Props:**
  ```javascript
  {
    value: number (0-100),
    color: string,
    height: string
  }
  ```
- **Used By:** Inventory tracking, analytics

### 8.8 CampaignStatCard
- **Path:** `components/dashboard/CampaignStatCard.js`
- **Purpose:** Campaign statistics card
- **Props:** Campaign stats (redemptions, revenue, etc.)
- **Used By:** Campaign details, analytics

### 8.9 CampaignAnalyticsChart
- **Path:** `components/campaigns/CampaignAnalyticsChart.js`
- **Purpose:** Campaign analytics visualization
- **Features:** Chart (bar/line), date range selection
- **Used By:** Campaign analytics page

### 8.10 QuickStatsBar
- **Path:** `components/dashboard/QuickStatsBar.js`
- **Purpose:** Quick statistics bar at top of dashboard
- **Features:** Shows key metrics
- **Used By:** Dashboard page

### 8.11 CampaignStatusActions
- **Path:** `app/(dashboard)/campaign/[id]/components/CampaignStatusActions.js`
- **Purpose:** Status action buttons for campaign
- **Features:** Launch, pause, complete buttons based on status
- **Used By:** Campaign details page
- **Styling:** Module CSS: `CampaignStatusActions.module.css`

---

## 9. INVENTORY COMPONENTS

### 9.1 InventoryTracking
- **Path:** `components/inventory/InventoryTracking.js`
- **Purpose:** Display inventory tracking info
- **Features:** Stock levels, allocation info
- **Used By:** Inventory pages

---

## 10. DASHBOARD SHARED COMPONENTS

### 10.1 ActiveCampaignsCard
- **Path:** `components/dashboards/shared/ActiveCampaignsCard.js`
- **Purpose:** Card showing active campaigns count
- **Used By:** Admin/Manager dashboards

### 10.2 CustomerInsightsCard
- **Path:** `components/dashboards/shared/CustomerInsightsCard.js`
- **Purpose:** Customer metrics card
- **Used By:** Admin/Manager dashboards

### 10.3 ScratchInventoryCard
- **Path:** `components/dashboards/shared/ScratchInventoryCard.js`
- **Purpose:** Scratch inventory overview
- **Used By:** Admin/Manager dashboards

### 10.4 DashboardLoading
- **Path:** `components/dashboards/shared/DashboardLoading.js`
- **Purpose:** Loading skeleton for dashboard
- **Used By:** Dashboard pages loading state

### 10.5 NavIcons
- **Path:** `components/dashboards/shared/NavIcons.js`
- **Purpose:** Navigation icons mapping
- **Used By:** Sidebar navigation

### 10.6 StatCard
- **Path:** `components/dashboards/shared/StatCard.js`
- **Purpose:** Generic stat card
- **Props:** Title, value, icon
- **Used By:** All dashboards

---

## 11. AUTH COMPONENTS

### 11.1 AuthContext
- **Path:** `components/auth/AuthContext.js`
- **Purpose:** Auth state context provider
- **Provides:** `useAuthContext()` hook
- **Data:**
  ```javascript
  {
    account: {id, email, name, role},
    isLoading: boolean,
    error: string
  }
  ```

### 11.2 AuthProvider
- **Path:** `components/auth/AuthProvider.js`
- **Purpose:** Wraps app with auth context
- **Features:** Loads user on mount, manages session
- **Used By:** Root layout

### 11.3 ProtectedRoute
- **Path:** `components/auth/ProtectedRoute.js`
- **Purpose:** Guards routes for authenticated users
- **Features:** Redirects to login if not authenticated
- **Used By:** Protected page routes

---

## 12. COMPONENT STYLING APPROACH

### Current State
- **CSS Modules:** 50+ `.module.css` files
- **No Design System:** Hardcoded colors per component
- **Inline Styles:** Some components use inline styles
- **Global CSS:** `globals.css` has CSS variables but underutilized

### Issues to Fix
1. **Hardcoded Colors**
   - Replace `#ef9e1b` → `var(--color-primary)`
   - Replace `#010f44` → `var(--color-navy)`
   - Replace all hex values with tokens

2. **Inconsistent Spacing**
   - Use `var(--spacing-*)` consistently
   - Remove pixel-specific padding/margin

3. **Missing Reusable Patterns**
   - Button base styles
   - Input base styles
   - Card base styles
   - Modal base styles

### Migration Path
1. Create `app/design-tokens.css`
2. Update `globals.css` to import tokens
3. Create base component styles
4. Update all `.module.css` files to use tokens
5. Remove component-specific style duplication

---

## 13. PAGE-SPECIFIC COMPONENTS

### Campaign Pages
- **Campaign List:** CampaignCard, CampaignFilter, CampaignSearch
- **Campaign Details:** StatusBadge, CampaignStoresTable, AllocateScratchModal
- **Campaign Edit:** CampaignForm, various form components
- **Campaign Analytics:** CampaignAnalyticsChart, StatCard

### Store Pages
- **Store List:** StoreCard, StatsCard
- **Store Details:** StoreForm, statistics display
- **Store Edit:** StoreForm, validation feedback

### Customer Pages
- **Scan:** LocationStatus, FormInput, FormButton
- **Participate:** OTPInput, LocationStatus, forms
- **Scratch Reveal:** ScratchCard, CountdownTimer
- **Coupon Redemption:** Reward display, confirmation

---

## 14. COMPONENT DEPENDENCY GRAPH

```
Root (AuthProvider)
├── DashboardLayout
│   ├── Campaign Pages
│   │   ├── CampaignCard
│   │   ├── CampaignFilter
│   │   ├── CampaignSearch
│   │   ├── Modals
│   │   │   ├── AssignStoresModal
│   │   │   ├── AllocateScratchModal
│   │   │   ├── DeleteCampaignModal
│   │   └── Tables
│   │       └── CampaignStoresTable
│   └── Store Pages
│       ├── StoreCard
│       └── StoreForm
├── AuthLayout
│   ├── LoginForm (FormInput, FormButton)
│   ├── SignupForm (FormInput, FormButton)
│   ├── OTPVerifyForm (OTPInput, FormButton)
│   └── PasswordResetForm (FormInput, FormButton)
└── Customer Pages
    ├── ScratchCard (Canvas)
    ├── LocationStatus
    ├── CountdownTimer
    └── FormInput/FormButton
```

---

## 15. COMPONENT PROPS STANDARDIZATION

### Standard Props Patterns

#### Card Components
```javascript
{
  title?: string,
  subtitle?: string,
  icon?: ReactNode,
  onClick?: function,
  className?: string,
  children?: ReactNode
}
```

#### Form Components
```javascript
{
  label?: string,
  value: any,
  onChange: function,
  error?: string,
  disabled?: boolean,
  required?: boolean,
  placeholder?: string
}
```

#### Modal Components
```javascript
{
  isOpen: boolean,
  onClose: function,
  title: string,
  onConfirm: function,
  loading?: boolean,
  error?: string
}
```

---

## 16. MISSING COMPONENTS (Need Creation)

Based on Figma requirements:
- [ ] Breadcrumb component
- [ ] Dropdown/Select component
- [ ] Checkbox component
- [ ] Radio button component
- [ ] Toast notification component
- [ ] Tooltip component
- [ ] Loader/Spinner component
- [ ] Tabs component
- [ ] Accordion component
- [ ] Stepper component
- [ ] Timeline component
- [ ] Avatar component
- [ ] Badge variants component
- [ ] Link component (styled)
- [ ] Divider component

---

## 17. TEST COVERAGE

### Components with Tests
- `ScratchCard.test.js` (basic test exists)
- `components/customer/` (partial coverage)

### Need Test Coverage
- All form components
- All modal components
- All dashboard components
- Data tables
- Status badges

---

## 18. COMPONENT DOCUMENTATION

### Missing Documentation
- Prop type definitions
- Usage examples
- Accessibility notes
- Visual examples (Storybook would help)

### Recommended
- Create Storybook for components
- Document all props with TypeScript (optional)
- Add JSDoc comments to components
- Create component usage guide

---

**Component Manifest Complete**  
**Total Components:** 70+  
**Status:** Ready for Figma alignment  
**Last Updated:** 2026-06-04
