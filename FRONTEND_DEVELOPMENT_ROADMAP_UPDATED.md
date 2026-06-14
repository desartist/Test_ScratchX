# 🎯 FRONTEND DEVELOPMENT ROADMAP - INCREMENTAL UPDATE

> **Status:** Phase 4-5 - Completing Frontend API Integration  
> **Date:** May 26, 2026  
> **Approach:** UPDATE existing pages + CREATE only missing pages  
> **Modern UI:** Professional, Responsive, Accessible Design

---

## 📊 CURRENT COMPLETION STATUS

### ✅ ALREADY CREATED (26 Pages/Components)

#### Authentication Pages (6/8 DONE)
- ✅ `/auth/login` - **UPDATE:** Modern login UI with Google + OTP options
- ✅ `/auth/signup` - **UPDATE:** Link to register page
- ✅ `/auth/register` - **UPDATE:** Modern registration UI
- ✅ `/auth/otp` - **UPDATE:** OTP request page
- ✅ `/auth/otp/verify` - **UPDATE:** OTP verification page
- ✅ `/auth/reset-password` - **UPDATE:** Password reset page
- ⏳ `/auth/reset-password/confirm` - **CREATE:** Confirmation page (NEW)
- ⏳ `/auth/google-callback` - **ALREADY EXISTS** (backend route)

#### Dashboard Pages (8/8 DONE)
- ✅ `/dashboard` - **UPDATE:** Add role-based dashboard routing
- ✅ `/dashboard/layout` - **UPDATE:** Enhance navigation & sidebar
- ✅ `/dashboard/campaigns` - **UPDATE:** Connect to campaign APIs
- ✅ `/dashboard/campaign/[id]` - **UPDATE:** Connect to campaign detail API
- ✅ `/dashboard/billing` - **UPDATE:** Connect to subscription APIs
- ✅ `/dashboard/billing/plans` - **UPDATE:** Connect to plans API
- ✅ `/dashboard/billing/checkout` - **UPDATE:** Connect to payment APIs
- ✅ Various other pages - **UPDATE:** Connect to respective APIs

#### Feature Pages (12+ DONE)
- ✅ `/dashboard/stores` - **UPDATE:** List, Create, Edit stores
- ✅ `/dashboard/analytics` - **UPDATE:** Dashboard analytics
- ✅ `/dashboard/redemptions` - **UPDATE:** Redemption tracking
- ✅ `/dashboard/team` - **UPDATE:** Team management
- ✅ `/dashboard/campaigns/setup-range` - **UPDATE:** Campaign ranges

#### Components (15+ DONE)
- ✅ `AuthContext.js` - **UPDATE:** Add token refresh logic
- ✅ `AuthProvider.js` - **UPDATE:** Improve session management
- ✅ `LoginForm.js` - **✨ UPDATED:** Modern UI with validation
- ✅ `SignupForm.js` - **UPDATE:** Modern registration UI
- ✅ `ProtectedRoute.js` - **DONE:** Route protection working
- ✅ Multiple dashboard components - **UPDATE:** Add real data binding
- ✅ Shared components (forms, buttons, etc.) - **UPDATE:** Modern styling

---

## 🔄 PHASE 1: AUTHENTICATION - UPDATE & ENHANCE (Days 1-2)

### 1.1 UPDATE: Login Page (`/auth/login`)
- **Status:** ✅ Page exists | ⏳ Update styling
- **File:** `app/auth/login/page.js`
- **Component:** `components/auth/LoginForm.js`
- **Modern Styling:** `components/auth/LoginForm.module.css`
- **Updates Needed:**
  - ✅ Apply modern CSS module styling
  - ✅ Add password strength indicator
  - ✅ Add "Remember me" checkbox
  - ✅ Add Google OAuth button
  - ✅ Add OTP alternative login option
  - ✅ Improve error messaging
  - ✅ Add success feedback (checkmarks on valid fields)
  - ✅ Responsive mobile design
- **Backend Integration:**
  - POST `/api/auth/login` - Email/password login
  - POST `/api/auth/google` - Google OAuth flow
  - GET `/api/auth/me` - Load user profile after login

### 1.2 UPDATE: Sign Up Page (`/auth/signup` or `/auth/register`)
- **Status:** ✅ Page exists | ⏳ Update styling
- **File:** `app/auth/signup/page.js` + `app/auth/register/page.js`
- **Component:** `components/auth/SignupForm.js`
- **Updates Needed:**
  - Update form styling to match login (modern CSS)
  - Add password strength indicator
  - Add role selector dropdown
  - Add phone number with country code selector
  - Add terms & conditions checkbox with link
  - Add real-time validation
  - Add auto-login after successful registration
- **Backend Integration:**
  - POST `/api/auth/register` - User registration
  - POST `/api/auth/password-signup` - Alternative signup

### 1.3 UPDATE: OTP Request Page (`/auth/otp`)
- **Status:** ✅ Page exists | ⏳ Update styling
- **File:** `app/auth/otp/page.js`
- **Component:** `components/auth/OTPRequestForm.js`
- **Updates Needed:**
  - Modern form styling
  - Phone number input with country selector
  - OTP method selector (Email/SMS toggle)
  - Clear instructions
  - Responsive design
- **Backend Integration:**
  - POST `/api/auth/otp-send` - Send OTP to phone

### 1.4 UPDATE: OTP Verification Page (`/auth/otp/verify`)
- **Status:** ✅ Page exists | ⏳ Update styling
- **File:** `app/auth/otp/verify/page.js`
- **Component:** `components/auth/OTPVerifyForm.js`
- **Updates Needed:**
  - 6-digit OTP input with auto-focus between fields
  - Resend button with countdown timer
  - Modern styling
  - Error handling for invalid/expired OTP
- **Backend Integration:**
  - POST `/api/auth/otp-verify` - Verify OTP & login

### 1.5 UPDATE: Password Reset Request (`/auth/reset-password`)
- **Status:** ✅ Page exists | ⏳ Update styling
- **File:** `app/auth/reset-password/page.js`
- **Component:** `components/auth/PasswordResetRequestForm.js`
- **Updates Needed:**
  - Modern form styling
  - Email input with validation
  - Clear messaging about what happens next
- **Backend Integration:**
  - POST `/api/auth/password-reset-request` - Request password reset

### 1.6 CREATE: Password Reset Confirmation (`/auth/reset-password/confirm`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/auth/reset-password/confirm/page.js`
- **Component:** `components/auth/PasswordResetConfirmForm.js`
- **Required:**
  - New password input with strength indicator
  - Confirm password input
  - Submit button
  - Success message
- **Backend Integration:**
  - POST `/api/auth/password-reset` - Confirm password reset with token

### 1.7 UPDATE: Auth Context (`components/auth/AuthContext.js`)
- **Status:** ✅ Exists | ⏳ Enhancement needed
- **Updates Needed:**
  - Add token refresh logic (POST `/api/auth/refresh`)
  - Implement auto-logout on token expiry
  - Add session persistence
  - Better error handling
  - Add user role detection

---

## 👤 PHASE 2: ROLE-BASED DASHBOARDS - UPDATE (Days 3-5)

### 2.1 UPDATE: Dashboard Home (`/dashboard`)
- **Status:** ✅ Page exists | ⏳ Update with role detection
- **File:** `app/(dashboard)/dashboard/page.js`
- **Updates Needed:**
  - Add role-based dashboard routing
  - Integrate GET `/api/dashboard/super-admin` for Super Admin
  - Integrate GET `/api/dashboard/admin` for Distributor
  - Integrate GET `/api/dashboard/retailer` for Merchant
  - Integrate GET `/api/dashboard/manager` for Manager
  - Add real-time data loading
  - Add error handling and loading states
  - Responsive dashboard layout

### 2.2 UPDATE: Dashboard Layout (`app/(dashboard)/layout.js`)
- **Status:** ✅ Layout exists | ⏳ Enhanced navigation
- **Updates Needed:**
  - Create responsive sidebar with role-based menu items
  - Add top navigation bar with user profile + logout
  - Add notifications dropdown
  - Mobile hamburger menu
  - Dark mode toggle (optional)
  - Breadcrumb navigation
  - Role badge display

### 2.3 UPDATE: Super Admin Dashboard Component
- **Status:** ✅ Component exists | ⏳ Connect to APIs
- **File:** `components/dashboards/SuperAdminDashboard.js`
- **Updates Needed:**
  - System metrics widget (total users, stores, campaigns, revenue)
  - Active campaigns chart
  - Top performers list (by revenue)
  - Recent activity feed
  - Quick action buttons
  - Pagination support
- **Backend Integration:**
  - GET `/api/dashboard/super-admin` - All metrics
  - GET `/api/admin/merchants` - List merchants
  - GET `/api/admin/distributors` - List distributors

### 2.4 UPDATE: Distributor Dashboard Component
- **Status:** ✅ Component exists | ⏳ Connect to APIs
- **File:** `components/dashboards/AdminDashboard.js`
- **Updates Needed:**
  - My merchants widget
  - Merchant performance table
  - Collective revenue chart
  - Commission tracking
  - Store management overview
- **Backend Integration:**
  - GET `/api/dashboard/admin` - Distributor metrics
  - GET `/api/distributor/merchants` - My merchants
  - GET `/api/merchant` - Individual merchant data

### 2.5 UPDATE: Merchant Dashboard Component
- **Status:** ✅ Component exists (RetailerDashboard.js) | ⏳ Connect to APIs
- **File:** `components/dashboards/RetailerDashboard.js`
- **Updates Needed:**
  - My stores widget (quick list with status)
  - Active campaigns widget
  - Inventory summary (total, used, remaining)
  - Redemption metrics (today, week, month)
  - Revenue chart
  - Store selector dropdown
  - Quick action buttons
- **Backend Integration:**
  - GET `/api/dashboard/retailer` - Merchant metrics
  - GET `/api/stores` - List user's stores
  - GET `/api/campaigns` - List campaigns
  - GET `/api/redemptions/stats` - Redemption statistics

### 2.6 UPDATE: Manager Dashboard Component
- **Status:** ✅ Component exists | ⏳ Connect to APIs
- **File:** `components/dashboards/ManagerDashboard.js`
- **Updates Needed:**
  - Live redemption feed (real-time)
  - Campaign status widget
  - Today's metrics
  - Store performance widget
  - Read-only dashboard (no edit permissions)
- **Backend Integration:**
  - GET `/api/dashboard/manager` - Manager metrics
  - GET `/api/redemptions/history` - Redemption feed
  - GET `/api/campaigns` - View only

---

## 🏪 PHASE 3: STORE MANAGEMENT - CREATE & UPDATE (Days 6-7)

### 3.1 UPDATE: Stores List (`/dashboard/stores`)
- **Status:** ✅ Page exists | ⏳ Full API integration
- **File:** `app/(dashboard)/stores/page.js`
- **Required Components:**
  - StoresTable (sortable, filterable)
  - CreateStoreButton
  - FilterBar
  - SearchBar
  - Pagination
- **Updates Needed:**
  - Connect to GET `/api/stores`
  - Add search/filter functionality
  - Add delete action (with confirmation)
  - Add edit navigation
  - Loading & error states
  - Empty state message
- **Backend Integration:**
  - GET `/api/stores` - List all merchant's stores
  - DELETE `/api/stores/[id]` - Delete store
  - GET `/api/stores/[id]/inventory` - Quick inventory view

### 3.2 CREATE: Create Store (`/dashboard/stores/create`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/stores/create/page.js`
- **Required Form Fields:**
  - store_name (text)
  - store_code (text, auto-generate option)
  - address (text)
  - city (select dropdown)
  - state (select dropdown)
  - pincode (number)
  - contact_person (text)
  - phone (text with validation)
  - email (text with validation)
- **Validation:**
  - Required fields marked
  - Phone format validation
  - Email format validation
  - Pincode format for India
- **Backend Integration:**
  - POST `/api/stores` - Create store
  - Success → Redirect to `/dashboard/stores`

### 3.3 CREATE: Store Details (`/dashboard/stores/[id]`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/stores/[id]/page.js`
- **Required Components:**
  - StoreInfoCard (display mode)
  - InventorySummaryWidget
  - EditButton → `/dashboard/stores/[id]/edit`
  - AssignCampaignButton → modal
  - RecentRedemptionsWidget (last 10)
- **Backend Integration:**
  - GET `/api/stores/[id]` - Store details
  - GET `/api/stores/[id]/inventory` - Inventory status

### 3.4 CREATE: Edit Store (`/dashboard/stores/[id]/edit`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/stores/[id]/edit/page.js`
- **Required:**
  - Pre-filled store form
  - Submit button
  - Cancel button
- **Backend Integration:**
  - PUT `/api/stores/[id]` - Update store
  - Success → Redirect to store details

### 3.5 CREATE: Store Inventory (`/dashboard/stores/[id]/inventory`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/stores/[id]/inventory/page.js`
- **Required Components:**
  - InventoryStatusWidget (total, used, remaining, available)
  - AddInventoryForm
  - InventoryTransactionTable
  - ExportButton
- **Backend Integration:**
  - GET `/api/stores/[id]/inventory` - Current status
  - GET `/api/inventory/history` - Transaction history
  - POST `/api/stores/[id]/inventory` - Add inventory

---

## 🎯 PHASE 4: CAMPAIGN MANAGEMENT - CREATE & UPDATE (Days 8-10)

### 4.1 UPDATE: Campaigns List (`/dashboard/campaigns`)
- **Status:** ✅ Page exists | ⏳ API integration
- **File:** `app/(dashboard)/campaigns/page.js`
- **Updates Needed:**
  - Connect to GET `/api/campaigns`
  - Add filters (by status: draft, active, ended, paused)
  - Add search functionality
  - Add delete action
  - Add pagination
  - Loading & error states
- **Backend Integration:**
  - GET `/api/campaigns` - List campaigns
  - DELETE `/api/campaigns/[id]` - Delete campaign

### 4.2 UPDATE: Create Campaign (`/dashboard/campaigns/create`)
- **Status:** ✅ Page exists | ⏳ Form completion
- **File:** `app/(dashboard)/campaigns/create/page.js`
- **Updates Needed:**
  - Complete CampaignForm component
  - Form fields:
    - campaign_name
    - campaign_code (auto-generate option)
    - description
    - start_date
    - end_date
    - total_coupons
    - discount_percent (0-100)
    - terms
    - status (draft, active, paused)
  - Validation
  - Step indicator (Step 1: Campaign Details)
  - Next button → `/dashboard/campaigns/setup-range`
- **Backend Integration:**
  - POST `/api/campaigns` - Create campaign

### 4.3 UPDATE: Setup Campaign Range (`/dashboard/campaigns/setup-range`)
- **Status:** ✅ Page exists | ⏳ Complete implementation
- **File:** `app/(dashboard)/campaigns/setup-range/page.js`
- **Updates Needed:**
  - RangeForm component
  - Fields:
    - range_start (number)
    - range_end (number)
    - denomination (coupon value)
    - description
  - Support multiple ranges
  - RangesPreview
  - Submit button
- **Backend Integration:**
  - POST `/api/campaign_range` - Create ranges
  - Success → Complete campaign creation

### 4.4 CREATE: Campaign Details (`/dashboard/campaigns/[id]`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/campaigns/[id]/page.js`
- **Required Components:**
  - CampaignInfoCard
  - CampaignStatsWidget (coupons, allocated, used, available)
  - CampaignRangesTable
  - StoresAssignedWidget
  - RedemptionMetricsChart
- **Backend Integration:**
  - GET `/api/campaigns/[id]` - Campaign details
  - GET `/api/campaign_range` - Ranges for this campaign
  - GET `/api/redemptions/stats` - Campaign stats

### 4.5 CREATE: Assign Campaign (`/dashboard/campaigns/[id]/assign`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/campaigns/[id]/assign/page.js`
- **Required Components:**
  - AssignForm with StoreSelector
  - QuantityInput
  - StoreList (already assigned)
  - AssignmentHistoryTable
- **Backend Integration:**
  - POST `/api/campaigns/[id]/assign` - Assign to store
  - GET `/api/stores` - Available stores

### 4.6 CREATE: Edit Campaign (`/dashboard/campaigns/[id]/edit`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/campaigns/[id]/edit/page.js`
- **Required:**
  - Pre-filled campaign form
  - Some fields read-only based on status
- **Backend Integration:**
  - PUT `/api/campaigns/[id]` - Update campaign

---

## 💰 PHASE 5: REDEMPTIONS & INVENTORY - CREATE & UPDATE (Days 11-13)

### 5.1 CREATE: Redemptions List (`/dashboard/redemptions`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/redemptions/page.js`
- **Required Components:**
  - RedemptionsTable (sortable, filterable)
  - RedemptionStatsWidget
  - FilterPanel (date range, store, campaign, status)
  - ExportButton
- **Columns in Table:**
  - Date | QR Code | Store | Campaign | Amount | Customer | Status | Actions
- **Backend Integration:**
  - GET `/api/redemptions/history` - All redemptions
  - GET `/api/redemptions/stats` - Statistics
  - POST `/api/redemptions/reverse` - Reverse redemption

### 5.2 CREATE: Redemption Details (`/dashboard/redemptions/[id]`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/redemptions/[id]/page.js`
- **Required Components:**
  - RedemptionInfoCard (QR, campaign, store, amount, date)
  - AuditTrailWidget
  - ReverseButton
  - ReceiptDownloadButton
- **Backend Integration:**
  - GET `/api/redemptions/[id]` - Redemption details
  - GET `/api/scan` - QR code info

### 5.3 CREATE: Inventory Management (`/dashboard/inventory`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/inventory/page.js`
- **Required Components:**
  - InventorySummaryGrid (cards)
  - AllocationForm
  - AllocationHistoryTable
  - InventoryAlerts
  - ExportButton
- **Backend Integration:**
  - GET `/api/inventory/status` - Current status
  - GET `/api/inventory/history` - Transaction history
  - POST `/api/inventory/allocate` - Allocate inventory

### 5.4 CREATE: QR Scan/Redemption (`/dashboard/redemptions/scan`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/redemptions/scan/page.js`
- **Required Components:**
  - QRScannerInput (text + optional camera)
  - ScanResultWidget
  - RedemptionConfirmation
  - ReceiptPrint/Email
- **Features:**
  - Manual QR entry
  - Camera scanning (optional)
  - Real-time validation
  - Error handling
- **Backend Integration:**
  - GET `/api/scan` - Validate QR code
  - POST `/api/redemptions` - Redeem coupon

---

## 📊 PHASE 6: ANALYTICS & REPORTS - CREATE & UPDATE (Days 14-15)

### 6.1 UPDATE: Analytics Dashboard (`/dashboard/analytics`)
- **Status:** ✅ Page exists | ⏳ Add real charts
- **File:** `app/(dashboard)/analytics/page.js`
- **Required Components:**
  - DateRangeSelector
  - KPICardsRow (Revenue, Redemptions, Avg Value, Growth %)
  - RedemptionTrendChart
  - TopCampaignsChart
  - StorePerformanceChart
  - InventoryUtilizationChart
  - DownloadReportButton
- **Backend Integration:**
  - GET `/api/dashboard/{role}` - Dashboard data
  - GET `/api/analytics/redemptions` - Detailed analytics
  - GET `/api/analytics/inventory` - Inventory trends

### 6.2 CREATE: Inventory Analytics (`/dashboard/analytics/inventory`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/analytics/inventory/page.js`
- **Required Components:**
  - InventoryTrendChart
  - StockLevelsByStoreChart
  - UtilizationRateCard
  - AllocationBreakdownChart
  - ExpiringCouponsAlert
- **Backend Integration:**
  - GET `/api/analytics/inventory` - Inventory analytics

### 6.3 CREATE: Redemption Analytics (`/dashboard/analytics/redemptions`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/analytics/redemptions/page.js`
- **Required Components:**
  - VolumeChart
  - SuccessRateMetrics
  - AverageRedemptionValueCard
  - TopPerformingStoresTable
  - TopPerformingCampaignsTable
  - PeakHoursChart (heatmap)
- **Backend Integration:**
  - GET `/api/analytics/redemptions` - Redemption analytics

### 6.4 CREATE: Custom Reports (`/dashboard/reports`)
- **Status:** ❌ NEEDS TO BE CREATED
- **File:** `app/(dashboard)/reports/page.js`
- **Required Components:**
  - ReportTypeSelector
  - CustomFilterBuilder
  - ReportPreview
  - ExportButton (PDF/Excel)
- **Backend Integration:**
  - GET `/api/analytics/redemptions`
  - GET `/api/analytics/inventory`

---

## 💳 PHASE 7: BILLING & SUBSCRIPTION - UPDATE (Days 16-17)

### 7.1 UPDATE: Billing Dashboard (`/dashboard/billing`)
- **Status:** ✅ Page exists | ⏳ API integration
- **File:** `app/(dashboard)/billing/page.js`
- **Updates Needed:**
  - CurrentPlanCard
  - UsageMetrics widget
  - BillingHistoryTable
  - Load from API
- **Backend Integration:**
  - GET `/api/subscription/current` - Current subscription
  - GET `/api/subscription/plans` - Available plans

### 7.2 UPDATE: Plans & Pricing (`/dashboard/billing/plans`)
- **Status:** ✅ Page exists (plans) | ⏳ API integration
- **File:** `app/(dashboard)/billing/plans/page.js`
- **Updates Needed:**
  - PricingCardsGrid
  - FeatureComparisonTable
  - CTA buttons (Upgrade/Manage)
- **Backend Integration:**
  - GET `/api/subscription/plans` - List plans

### 7.3 UPDATE: Checkout (`/dashboard/billing/checkout`)
- **Status:** ✅ Page exists | ⏳ Payment integration
- **File:** `app/(dashboard)/billing/checkout/page.js`
- **Updates Needed:**
  - OrderSummary
  - PaymentForm
  - PaymentMethod selector (Card, UPI, Netbanking)
  - Razorpay integration
  - Order confirmation
- **Backend Integration:**
  - POST `/api/payment/create-order` - Create payment order
  - POST `/api/payment/verify` - Verify payment

---

## 👥 PHASE 8: ADMIN & TEAM - CREATE & UPDATE (Days 18-19)

### 8.1 CREATE: Merchants Management (`/dashboard/admin/merchants`)
- **Status:** ❌ NEEDS TO BE CREATED (Super Admin only)
- **File:** `app/(dashboard)/admin/merchants/page.js`
- **Required Components:**
  - MerchantsTable
  - FilterBar
  - CreateMerchantButton
- **Backend Integration:**
  - GET `/api/admin/merchants` - List merchants
  - PUT `/api/merchants/[id]` - Update merchant status
  - DELETE `/api/merchants/[id]` - Delete merchant

### 8.2 CREATE: Distributors Management (`/dashboard/admin/distributors`)
- **Status:** ❌ NEEDS TO BE CREATED (Super Admin only)
- **File:** `app/(dashboard)/admin/distributors/page.js`
- **Required Components:**
  - DistributorsTable
  - FilterBar
- **Backend Integration:**
  - GET `/api/admin/distributors` - List distributors

### 8.3 CREATE: My Merchants (`/dashboard/merchants`)
- **Status:** ❌ NEEDS TO BE CREATED (Distributor only)
- **File:** `app/(dashboard)/merchants/page.js`
- **Required Components:**
  - MerchantsCardGrid
  - Quick actions per merchant
- **Backend Integration:**
  - GET `/api/distributor/merchants` - My merchants

### 8.4 UPDATE: Team/Managers (`/dashboard/team`)
- **Status:** ✅ Page exists | ⏳ API integration
- **File:** `app/(dashboard)/team/page.js`
- **Updates Needed:**
  - ManagersTable
  - AddManagerForm
  - Remove manager functionality
  - AccessPermissionsPanel
- **Backend Integration:**
  - GET `/api/merchant/managers` - List managers
  - POST `/api/merchant/managers` - Add manager
  - DELETE `/api/merchant/managers/[id]` - Remove manager

---

## 🔒 PHASE 9: SECURITY & AUTHORIZATION - UPDATE (Days 20-21)

### 9.1 UPDATE: Route Protection
- **Status:** ✅ ProtectedRoute exists | ⏳ Enhanced
- **File:** `components/auth/ProtectedRoute.js`
- **Updates Needed:**
  - Role-based page access
  - Permission checking
  - Redirect to login if not authenticated
  - Show 403 if unauthorized

### 9.2 UPDATE: API Client Setup
- **Status:** ⏳ NEEDS TO BE CREATED
- **File:** `lib/api/axiosClient.js`
- **Required:**
  - Axios instance with auth token
  - Request interceptor (add JWT)
  - Response interceptor (handle 401, 403)
  - Auto-refresh token on expiry
  - Error handling

### 9.3 PERMISSION MATRIX ENFORCEMENT
- Super_Admin: All pages + all actions
- Distributor: Merchants, Campaigns, Redemptions, Settings
- Merchant: Stores, Campaigns (own), Redemptions, Analytics, Billing
- Manager: Redemptions (view-only), Analytics (view-only), Live Activity

---

## 🔄 PHASE 10: API SERVICE LAYER - CREATE (Days 22-23)

### 10.1 CREATE: Service Files
```
lib/api/
├── auth.js              # Authentication service
├── stores.js            # Store operations
├── campaigns.js         # Campaign operations
├── redemptions.js       # Redemption operations
├── inventory.js         # Inventory management
├── analytics.js         # Analytics data
├── payments.js          # Payment processing
├── admin.js             # Admin operations
├── client.js            # Axios configuration
└── utils.js             # Helper functions
```

Each service file should have methods matching the API endpoints:
- `listX()` - GET /api/x
- `getX(id)` - GET /api/x/[id]
- `createX(data)` - POST /api/x
- `updateX(id, data)` - PUT /api/x/[id]
- `deleteX(id)` - DELETE /api/x/[id]

---

## 📱 PHASE 11: FORMS & VALIDATION - CREATE & UPDATE (Days 24-25)

### 11.1 CREATE: Validation Schemas
```
lib/validation/
├── authSchemas.js         # Login, register, OTP
├── storeSchemas.js        # Store validation
├── campaignSchemas.js     # Campaign validation
├── redemptionSchemas.js   # Redemption validation
└── subscriptionSchemas.js # Billing validation
```

Use Zod or Yup for validation.

### 11.2 UPDATE: Form Components
- Improve error display
- Add real-time validation
- Add field success indicators
- Add helper text/hints
- Mobile-friendly inputs

---

## 🧩 PHASE 12: SHARED COMPONENTS - CREATE & UPDATE (Days 26-27)

### 12.1 Data Display Components
```
components/
├── tables/
│   ├── DataTable.js         # Generic table (sortable, filterable)
│   ├── Pagination.js
│   └── ColumnFilter.js
│
├── charts/
│   ├── LineChart.js
│   ├── BarChart.js
│   ├── PieChart.js
│   └── AreaChart.js
│
├── modals/
│   ├── ConfirmationModal.js
│   ├── FormModal.js
│   └── InfoModal.js
│
└── shared/
    ├── LoadingSpinner.js
    ├── EmptyState.js
    ├── ErrorBoundary.js
    └── Toast.js
```

### 12.2 Utility Hooks
```
hooks/
├── useApi.js              # API data fetching
├── useForm.js             # Form state management
├── useAuth.js             # Auth state
├── usePagination.js       # Pagination logic
└── useLocalStorage.js     # Persistence
```

---

## 🎨 PHASE 13: STYLING & RESPONSIVE - UPDATE (Days 28-29)

### 13.1 Modern CSS Styling
- ✅ LoginForm.module.css - Modern professional UI
- Update all form components to match style
- Update tables with modern styling
- Update modals with modern design
- Update buttons and inputs

### 13.2 Responsive Design
- Mobile-first approach
- Test all pages on:
  - Mobile: 375px
  - Tablet: 768px
  - Desktop: 1280px

### 13.3 CSS Structure
```
styles/
├── variables.module.css  # Colors, sizes, fonts
├── globals.css           # Global styles
├── layout.module.css     # Layout
├── forms.module.css      # Form styles
└── responsive.module.css # Media queries
```

---

## 🧪 PHASE 14: TESTING & QA - CREATE (Days 30-31)

### 14.1 Unit Tests
- Test each component
- Test validation schemas
- Test utility functions

### 14.2 Integration Tests
- Test complete user flows
- Test API integration
- Test error handling

### 14.3 Manual Testing Checklist
- [ ] All auth flows
- [ ] All CRUD operations
- [ ] All filters/searches
- [ ] All role-based pages
- [ ] Responsive on all devices
- [ ] All error scenarios
- [ ] All success scenarios

---

## 📋 QUICK REFERENCE: WHAT EXISTS vs WHAT'S NEW

### ✅ EXISTING (Update Required)
- Authentication pages + components (6 pages)
- Dashboard pages + components (8 pages)
- Basic form components
- Auth context
- Protected routes

### ❌ NEW (Create Required)
- Store management pages (5 pages)
- Campaign management pages (3 pages)
- Redemption pages (3 pages)
- Inventory management (1 page)
- QR scan interface (1 page)
- Analytics pages (3 pages)
- Admin pages (4 pages)
- Service layer (8 files)
- Validation schemas (5 files)
- Shared components (15+ components)
- Advanced charts (4 chart types)
- Utility hooks (5+ hooks)

**Total New Pages: 27**  
**Total Updates: 12**  
**Total New Components: 50+**

---

## 🚀 IMPLEMENTATION PRIORITY

### CRITICAL PATH (Do First)
1. Update auth pages with modern UI
2. Update dashboard + role-based routing
3. Create store management pages
4. Create campaign management pages
5. Create API service layer
6. Connect all pages to APIs

### SECONDARY (Do Next)
7. Create redemption pages
8. Create analytics pages
9. Create admin pages
10. Add validation schemas

### NICE-TO-HAVE (Polish)
11. Create shared components
12. Improve styling
13. Add tests
14. Documentation

---

## ✨ SUCCESS CRITERIA

**Phase Complete When:**
- ✅ All existing pages updated with modern UI
- ✅ All 27 new pages created
- ✅ All API endpoints connected
- ✅ All forms with validation
- ✅ Responsive on all devices
- ✅ Role-based access working
- ✅ 95%+ test coverage
- ✅ Zero console errors
- ✅ Performance acceptable (< 2s page load)
- ✅ Team sign-off

---

**Next Step:** Start Phase 1 - Update authentication pages with modern UI  
**Estimated Duration:** 4-6 weeks (parallel team work possible)  
**Owner:** Frontend Development Team
