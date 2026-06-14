# 🎯 Frontend Development Roadmap

> **Status:** Phase 4-5 - Frontend API Integration & Component Development  
> **Date:** May 26, 2026  
> **Focus:** Complete frontend pages and components integrated with 50+ backend APIs  
> **Target Roles:** Super_Admin, Distributor, Merchant, Manager

---

## 📋 ROADMAP OVERVIEW

This roadmap maps every backend API endpoint to its corresponding frontend page/component. The frontend is organized by:
- **Role-based dashboards** (Super_Admin, Distributor, Merchant, Manager)
- **Feature modules** (Authentication, Stores, Campaigns, Inventory, Redemptions, Analytics, Admin)
- **Shared components** (Forms, Tables, Charts, Modals)

---

## 🏗️ FRONTEND ARCHITECTURE

### Directory Structure
```
app/
├── (auth)/                      # Authentication flows
│   ├── login/
│   ├── register/
│   ├── otp-request/
│   ├── otp-verify/
│   └── reset-password/
│
├── (dashboard)/                 # Protected dashboard routes
│   ├── layout.js
│   ├── page.js                  # Role-based dashboard home
│   ├── stores/                  # Store management
│   ├── campaigns/               # Campaign management
│   ├── redemptions/             # Redemption tracking
│   ├── inventory/               # Inventory management
│   ├── analytics/               # Analytics & reports
│   ├── billing/                 # Payment & subscription
│   ├── admin/                   # Super admin controls
│   └── team/                    # Team/Manager controls
│
components/
├── auth/                        # Auth components
├── dashboards/                  # Role-based dashboard layouts
├── forms/                       # Reusable form components
├── tables/                      # Data tables
├── charts/                      # Analytics charts
├── modals/                      # Reusable modals
├── layouts/                     # Layout wrappers
└── shared/                      # Utility components
```

---

## 🔐 PHASE 1: AUTHENTICATION & CORE SETUP (Days 1-2)

### Pages to Build

#### 1. Login Page
- **Route:** `/auth/login`
- **Backend APIs:** `POST /api/auth/login`, `POST /api/auth/otp-send`
- **Components Needed:**
  - LoginForm (email + password)
  - OTPToggle (switch between password and OTP)
  - ErrorDisplay
  - RememberMe checkbox
- **Data Flow:**
  - User enters credentials → POST /api/auth/login → Receive token
  - Store token in localStorage/context
  - Redirect to dashboard based on role
- **Form Validation:**
  - Email format validation
  - Password presence
  - Client-side validation before submission

#### 2. OTP Request Page
- **Route:** `/auth/otp`
- **Backend APIs:** `POST /api/auth/otp-send`
- **Components Needed:**
  - PhoneInputForm
  - OTPMethodSelector (Email/SMS)
  - ResendTimer
- **Data Flow:**
  - User enters phone → POST /api/auth/otp-send → Receive OTP sent confirmation
  - Display resend timer (60 seconds)
  - Navigate to OTP verification page

#### 3. OTP Verify Page
- **Route:** `/auth/otp/verify?phone={phone}`
- **Backend APIs:** `POST /api/auth/otp-verify`
- **Components Needed:**
  - OTPInput (6-digit input, auto-focus)
  - ResendButton (with timer)
  - BackButton (to phone request)
- **Data Flow:**
  - User enters 6-digit OTP → POST /api/auth/otp-verify → Receive token
  - Auto-redirect to dashboard
- **Error Handling:**
  - Invalid OTP
  - Expired OTP (resend prompt)
  - Rate limiting

#### 4. Registration Page
- **Route:** `/auth/register`
- **Backend APIs:** `POST /api/auth/register`
- **Components Needed:**
  - RegistrationForm (email, password, name, phone, role selection)
  - PasswordStrengthIndicator
  - TermsAcceptance
  - RoleSelector
- **Data Flow:**
  - User fills form → POST /api/auth/register → Receive token + role
  - Auto-login (token saved)
  - Redirect to dashboard or role-selection page
- **Validation:**
  - Email not already registered
  - Password: 8+ chars, 1 uppercase, 1 number, 1 special char
  - Phone: valid Indian format

#### 5. Password Reset Pages
- **Route (1):** `/auth/reset-password/request`
- **Backend APIs:** `POST /api/auth/password-reset-request`
- **Components:** EmailInputForm, SubmitButton
- **Data Flow:**
  - User enters email → POST /api/auth/password-reset-request
  - Show confirmation: "Check your email for reset link"
  - Backend sends reset link (via email/SMS)

- **Route (2):** `/auth/reset-password/confirm?token={token}`
- **Backend APIs:** `POST /api/auth/password-reset`
- **Components:** PasswordInputForm, NewPasswordInput, ConfirmPasswordInput
- **Data Flow:**
  - User enters new password → POST /api/auth/password-reset → Redirect to login

### Shared Authentication Components

```
components/auth/
├── LoginForm.js              # Reusable login form
├── OTPInput.js              # 6-digit OTP input with auto-focus
├── PasswordResetForm.js     # Password reset form
├── PasswordStrengthIndicator.js
├── RoleSelector.js          # Role selection dropdown
├── TermsCheckbox.js
├── AuthLayout.js            # Centered auth page layout
└── ProtectedRoute.js        # Route protection wrapper (ALREADY EXISTS)
```

### Authentication Context Setup
- **File:** `context/AuthContext.js`
- **State Management:**
  - `isAuthenticated` (boolean)
  - `currentUser` (object: id, email, name, role, phone)
  - `authToken` (JWT)
  - `isLoading` (boolean)
  - `login(email, password)` → POST /api/auth/login
  - `logout()` → POST /api/auth/logout
  - `refreshToken()` → POST /api/auth/refresh
  - `loadUserProfile()` → GET /api/auth/me

---

## 👤 PHASE 2: ROLE-BASED DASHBOARDS (Days 3-5)

### Dashboard Layout (Shared)
- **File:** `app/(dashboard)/layout.js`
- **Components:**
  - Sidebar (role-based menu items)
  - TopBar (user profile, notifications, logout)
  - ProtectedRoute wrapper
  - Mobile-responsive navigation

### Super Admin Dashboard
- **Route:** `/dashboard` (with role detection)
- **Backend APIs:**
  - `GET /api/dashboard/super-admin`
  - `GET /api/admin/merchants`
  - `GET /api/admin/distributors`
  - `GET /api/analytics/inventory`
  - `GET /api/analytics/redemptions`

- **Dashboard Components:**
  - SystemMetrics (total users, stores, campaigns, revenue)
  - ActiveCampaignsWidget
  - TopPerformersList (merchants by revenue)
  - RedemptionTrendsChart
  - RecentActivityFeed
  - QuickActionsPanel

- **Menu Items:**
  - Merchants Management
  - Distributors Management
  - System Settings
  - Analytics & Reports
  - Audit Logs

### Distributor Dashboard
- **Route:** `/dashboard` (role-based)
- **Backend APIs:**
  - `GET /api/dashboard/admin`
  - `GET /api/distributor/merchants`
  - `GET /api/merchant` (each merchant's data)
  - `GET /api/analytics/redemptions`

- **Dashboard Components:**
  - MyMerchantsWidget (card list of assigned merchants)
  - MerchantPerformanceTable
  - CollectiveRevenueChart
  - StoresUnderManagementWidget
  - QuickAssignCampaignButton

- **Menu Items:**
  - My Merchants
  - Campaigns Overview
  - Redemption Analytics
  - Payment & Settlement

### Merchant Dashboard
- **Route:** `/dashboard` (role-based)
- **Backend APIs:**
  - `GET /api/dashboard/retailer`
  - `GET /api/stores`
  - `GET /api/campaigns`
  - `GET /api/redemptions/history`
  - `GET /api/analytics/inventory`

- **Dashboard Components:**
  - MyStoresWidget (quick store list)
  - ActiveCampaignsWidget (current campaigns)
  - InventorySummaryWidget (total coupons, used, remaining)
  - RedemptionMetricsWidget (today, this week, this month)
  - RevenueChart
  - StoreSelectorDropdown (switch between stores)

- **Menu Items:**
  - My Stores
  - Campaigns
  - Coupons & Inventory
  - Redemptions
  - Reports & Analytics

### Manager Dashboard
- **Route:** `/dashboard` (role-based)
- **Backend APIs:**
  - `GET /api/dashboard/manager`
  - `GET /api/merchant/managers`
  - `GET /api/campaigns`
  - `GET /api/redemptions/history`

- **Dashboard Components:**
  - LiveRedemptionFeed (real-time redemptions)
  - CampaignStatusWidget
  - TodayMetricsWidget
  - StorePerformanceWidget (filtered by store)
  - (Read-only - limited edit permissions)

- **Menu Items:**
  - Live Activity
  - My Campaigns (view-only)
  - Store Performance
  - My Reports

---

## 🏪 PHASE 3: STORE MANAGEMENT (Days 6-7)

### Pages to Build

#### Stores List Page
- **Route:** `/dashboard/stores`
- **Backend APIs:**
  - `GET /api/stores` (list all merchant's stores)
  - `DELETE /api/stores/[id]` (on delete action)
  - `GET /api/stores/[id]/inventory` (for quick view)

- **Components:**
  - StoresTable (sortable, filterable)
    - Columns: Store Code, Name, City, Contact, Status, Inventory Count, Actions
    - Actions: View, Edit, Delete, ViewInventory
  - CreateStoreButton (→ Create page)
  - FilterBar (by city, state, status)
  - SearchBar

- **Data Flow:**
  - Page loads → GET /api/stores
  - User clicks Create → Navigate to /dashboard/stores/create
  - User clicks Edit → Navigate to /dashboard/stores/[id]/edit
  - User clicks Delete → Show confirmation → DELETE /api/stores/[id]

#### Create Store Page
- **Route:** `/dashboard/stores/create`
- **Backend APIs:** `POST /api/stores`

- **Components:**
  - StoreForm
    - Fields: store_name, store_code, address, city, state, pincode, contact_person, phone, email
    - Validation: Required fields, phone format, email format, pincode format
    - SubmitButton, CancelButton

- **Data Flow:**
  - User fills form → POST /api/stores → Success message → Redirect to /dashboard/stores
  - Error → Display validation errors

#### Store Details Page
- **Route:** `/dashboard/stores/[id]`
- **Backend APIs:**
  - `GET /api/stores/[id]` (store details)
  - `GET /api/stores/[id]/inventory` (inventory status)
  - `PUT /api/stores/[id]` (for edit)

- **Components:**
  - StoreInfoCard (display: name, code, address, contact, created_at)
  - InventorySummaryWidget
    - Shows: Total allocated, Used, Remaining, Available
    - Breakdown by campaign
  - EditStoreButton (→ edit form)
  - AssignCampaignButton (→ campaign assign modal)
  - RecentRedemptionsWidget (last 10 redemptions at this store)

#### Update Store Page
- **Route:** `/dashboard/stores/[id]/edit`
- **Backend APIs:** `PUT /api/stores/[id]`

- **Components:**
  - StoreForm (pre-filled with current data)
  - SubmitButton, CancelButton

#### Store Inventory Page
- **Route:** `/dashboard/stores/[id]/inventory`
- **Backend APIs:**
  - `GET /api/stores/[id]/inventory` (current status)
  - `GET /api/inventory/history` (transaction history)
  - `POST /api/stores/[id]/inventory` (add inventory)

- **Components:**
  - InventoryStatusWidget
    - Grid showing: Total, Used, Remaining, Available
    - Breakdown by campaign
  - AddInventoryForm
    - Fields: campaign_id, quantity, description
    - POST /api/stores/[id]/inventory
  - InventoryTransactionTable
    - Columns: Date, Campaign, Quantity, Type (Add/Redeem), Store, User
    - Sortable, filterable, paginated
  - ExportButton (CSV export of history)

---

## 🎯 PHASE 4: CAMPAIGN MANAGEMENT (Days 8-10)

### Pages to Build

#### Campaigns List Page
- **Route:** `/dashboard/campaigns`
- **Backend APIs:**
  - `GET /api/campaigns` (list campaigns)
  - `DELETE /api/campaigns/[id]` (on delete)
  - `GET /api/campaign_range` (for status display)

- **Components:**
  - CampaignsTable
    - Columns: Campaign Code, Name, Status, Start Date, End Date, Total Coupons, Used, Remaining, Actions
    - Actions: View, Edit, Assign to Store, Delete, ViewRanges
  - CreateCampaignButton (→ create page)
  - FilterBar (by status: draft, active, ended, paused)
  - SearchBar
  - StatusBadge component

- **Data Flow:**
  - Page loads → GET /api/campaigns
  - User clicks Create → Navigate to /dashboard/campaigns/create
  - User clicks Assign → Navigate to /dashboard/campaigns/[id]/assign
  - User clicks Delete → Confirmation → DELETE /api/campaigns/[id]

#### Create Campaign Page
- **Route:** `/dashboard/campaigns/create`
- **Backend APIs:** `POST /api/campaigns`

- **Components:**
  - CampaignForm (PARTIALLY EXISTS - needs completion)
    - Fields:
      - campaign_name (text)
      - campaign_code (text, auto-generate option)
      - description (textarea)
      - start_date (date picker)
      - end_date (date picker)
      - total_coupons (number)
      - discount_percent (number, 0-100)
      - terms (textarea)
      - status (select: draft, active, paused)
    - Validation:
      - Required fields
      - End date > start date
      - Total coupons > 0
      - Discount: 0-100
    - Submit → POST /api/campaigns
  - StepIndicator (Step 1: Campaign Details → Step 2: Setup Ranges)
  - NextButton (proceed to setup-range)

#### Setup Campaign Range Page
- **Route:** `/dashboard/campaigns/setup-range?campaignId={id}`
- **Backend APIs:** `POST /api/campaign_range`

- **Components:**
  - RangeForm
    - Fields:
      - range_start (number)
      - range_end (number)
      - denomination (number - coupon value)
      - description (text)
    - Validation:
      - range_end > range_start
      - Denomination > 0
    - Submit → POST /api/campaign_range
  - MultipleRangesSupport (allow adding multiple ranges)
  - RangesPreview (shows all added ranges)
  - SubmitButton (Complete campaign creation)

#### Campaign Details Page
- **Route:** `/dashboard/campaigns/[id]`
- **Backend APIs:**
  - `GET /api/campaigns/[id]`
  - `GET /api/campaign_range`
  - `GET /api/redemptions/stats` (for campaign stats)

- **Components:**
  - CampaignInfoCard
    - Display: name, code, description, dates, status
    - Status badge
    - Edit button
  - CampaignStatsWidget
    - Grid: Total Coupons, Allocated, Used, Available, Success Rate
  - CampaignRangesTable
    - Columns: Range Start, Range End, Denomination, Quantity, Used, Available
    - Total row
  - StoresAssignedWidget (list of stores this campaign is assigned to)
  - RedemptionMetricsChart

#### Assign Campaign to Store
- **Route:** `/dashboard/campaigns/[id]/assign`
- **Backend APIs:**
  - `POST /api/campaigns/[id]/assign`
  - `GET /api/stores` (to list available stores)

- **Components:**
  - AssignForm
    - StoreSelector (dropdown/multi-select)
    - QuantityInput (how many coupons to allocate)
    - Submit button
  - StoreList (already assigned stores, with option to remove)
  - AssignmentHistoryTable (past assignments, current status)

#### Update Campaign Page
- **Route:** `/dashboard/campaigns/[id]/edit`
- **Backend APIs:** `PUT /api/campaigns/[id]`

- **Components:**
  - CampaignForm (pre-filled, some fields read-only based on status)

---

## 💰 PHASE 5: REDEMPTION & INVENTORY MANAGEMENT (Days 11-13)

### Pages to Build

#### Redemptions List Page
- **Route:** `/dashboard/redemptions`
- **Backend APIs:**
  - `GET /api/redemptions/history`
  - `GET /api/redemptions/stats`
  - `POST /api/redemptions/reverse` (on reverse action)

- **Components:**
  - RedemptionsTable
    - Columns: Date, QR Code, Store, Campaign, Amount, Customer, Status, Actions
    - Actions: View, Reverse, Download Receipt
    - Sortable, filterable (by date range, store, campaign, status)
  - RedemptionStatsWidget (Total Redeemed, Success Rate, Today's Volume)
  - FilterPanel
    - Date range picker
    - Store filter
    - Campaign filter
    - Status filter
  - ExportButton (CSV/PDF)
  - ReverseButton (with confirmation modal)

- **Data Flow:**
  - Page loads → GET /api/redemptions/history + GET /api/redemptions/stats
  - User filters → Refetch with filter params
  - User clicks Reverse → Show confirmation → POST /api/redemptions/reverse
  - Success → Update table, show notification

#### Redemption Details Page
- **Route:** `/dashboard/redemptions/[id]`
- **Backend APIs:**
  - `GET /api/redemptions/[id]` (via redemption details endpoint)
  - `GET /api/scan` (for QR info)

- **Components:**
  - RedemptionInfoCard
    - Display: QR Code, Campaign, Store, Amount, Date, Customer (if available), Status
    - Show QR code image (generate from QR code value)
  - AuditTrailWidget (timestamps, user who redeemed, location)
  - ReverseButton (if eligible)
  - ReceiptDownloadButton

#### Inventory Management Page
- **Route:** `/dashboard/inventory`
- **Backend APIs:**
  - `GET /api/inventory/status`
  - `GET /api/inventory/history`
  - `POST /api/inventory/allocate`

- **Components:**
  - InventorySummaryGrid
    - Cards: Total Coupons, Allocated, Used, Remaining, Available
    - Percentage indicators
  - AllocationForm
    - Store selector
    - Campaign selector
    - Quantity input
    - Submit → POST /api/inventory/allocate
  - AllocationHistoryTable
    - Columns: Date, Store, Campaign, Quantity, Allocated By, Status
    - Sortable, filterable, paginated
  - InventoryAlerts
    - Low stock warning
    - Expiring coupons
  - ExportButton

#### QR Scan/Redemption Interface (Point of Sale)
- **Route:** `/dashboard/redemptions/scan`
- **Backend APIs:**
  - `GET /api/scan` (validate QR code)
  - `POST /api/redemptions` (redeem coupon)

- **Components:**
  - QRScannerInput
    - Text input (for manual entry)
    - Camera input (optional - use HTML5 camera API or barcode scanner library)
  - ScanResultWidget
    - Shows: Campaign, Coupon Value, Store (pre-filled)
    - Confirm redemption button
  - RedemptionConfirmation
    - POST /api/redemptions with scanned QR code
    - Show success/failure with clear messaging
  - ErrorHandling
    - Invalid QR code
    - Already redeemed
    - Campaign not active
    - Store not assigned to campaign
  - RedemptionRecept (print or email)

---

## 📊 PHASE 6: ANALYTICS & REPORTS (Days 14-15)

### Pages to Build

#### Analytics Dashboard
- **Route:** `/dashboard/analytics`
- **Backend APIs:**
  - `GET /api/dashboard/{role}` (depending on user role)
  - `GET /api/analytics/inventory`
  - `GET /api/analytics/redemptions`

- **Components:**
  - DateRangeSelector (for all charts)
  - KPICardsRow
    - Revenue, Redemptions, Avg Value, Growth %
  - RedemptionTrendChart (line chart - daily redemptions)
  - TopCampaignsChart (bar chart - by revenue)
  - StorePerformanceChart (bar chart - by redemptions)
  - InventoryUtilizationChart (pie chart - allocated vs available)
  - RedemptionSuccessRateWidget
  - DownloadReportButton (PDF/CSV)

#### Inventory Analytics Page
- **Route:** `/dashboard/analytics/inventory`
- **Backend APIs:** `GET /api/analytics/inventory`

- **Components:**
  - InventoryTrendChart (line chart - over time)
  - StockLevelsByStoreChart (bar chart)
  - UtilizationRateCard
  - AllocationBreakdownChart (pie chart - by campaign)
  - ExpiringCouponsAlert
  - InventoryForecastWidget

#### Redemption Analytics Page
- **Route:** `/dashboard/analytics/redemptions`
- **Backend APIs:** `GET /api/analytics/redemptions`

- **Components:**
  - VolumeChart (daily/weekly/monthly redemptions)
  - SuccessRateMetrics
  - AverageRedemptionValueCard
  - TopPerformingStoresTable
  - TopPerformingCampaignsTable
  - PeakHoursChart (heatmap - time of day)
  - ConversionFunnelChart

#### Custom Reports Page
- **Route:** `/dashboard/reports`
- **Backend APIs:**
  - `GET /api/analytics/redemptions`
  - `GET /api/analytics/inventory`

- **Components:**
  - ReportTypeSelector (predefined templates)
  - CustomFilterBuilder
    - Date range
    - Stores
    - Campaigns
    - Metrics (which KPIs to include)
  - ReportPreview
  - ExportButton (PDF/Excel)
  - ScheduleReportButton (email on schedule)

---

## 💳 PHASE 7: BILLING & SUBSCRIPTION (Days 16-17)

### Pages to Build

#### Billing Dashboard
- **Route:** `/dashboard/billing`
- **Backend APIs:**
  - `GET /api/subscription/current`
  - `GET /api/subscription/plans`
  - `GET /api/payment/create-order` (for upgrade)

- **Components:**
  - CurrentPlanCard
    - Display: Plan name, price, features, renewal date
    - Upgrade button, Cancel button
  - UsageMetrics (based on subscription tier)
    - Coupons used / Limit
    - Stores / Limit
    - Campaigns / Limit
    - Redemptions / Limit
  - BillingHistoryTable
    - Columns: Date, Invoice, Amount, Status, Download link
    - Sortable, paginated

#### Plans & Pricing Page
- **Route:** `/dashboard/billing/plans`
- **Backend APIs:** `GET /api/subscription/plans`

- **Components:**
  - PricingCardsGrid
    - Cards: Plan name, price, features list, selected indicator, CTA button
    - CompareButton (show feature comparison)
  - FeatureComparisonTable
  - CTAButtons
    - Current plan: Manage
    - Other plans: Upgrade / Downgrade

#### Checkout Page
- **Route:** `/dashboard/billing/checkout`
- **Backend APIs:**
  - `POST /api/payment/create-order`
  - `POST /api/payment/verify`

- **Components:**
  - OrderSummary
    - Plan selected, price, billing period, features
  - PaymentForm
    - Name, Email, Phone
    - Address (optional)
    - PaymentMethod selector (Credit Card, UPI, Netbanking)
  - PaymentGatewayIntegration (Razorpay, PayPal, etc.)
  - OrderConfirmation
    - Success message
    - Invoice download link
    - Next steps

---

## 👥 PHASE 8: ADMIN & TEAM MANAGEMENT (Days 18-19)

### Pages to Build (Super Admin & Distributor Only)

#### Merchants Management (Super Admin)
- **Route:** `/dashboard/admin/merchants`
- **Backend APIs:**
  - `GET /api/admin/merchants`
  - `PUT /api/merchants/[id]` (status updates)
  - `DELETE /api/merchants/[id]`

- **Components:**
  - MerchantsTable
    - Columns: ID, Name, Email, Phone, Stores Count, Status, Joined Date, Actions
    - Actions: View, Edit, Suspend, Delete, AssignManager
  - FilterBar (by status, joined date)
  - CreateMerchantButton (manual creation for testing)

#### Distributors Management (Super Admin)
- **Route:** `/dashboard/admin/distributors`
- **Backend APIs:**
  - `GET /api/admin/distributors`
  - PUT/DELETE endpoints (similar to merchants)

- **Components:**
  - DistributorsTable
  - FilterBar
  - CreateDistributorButton

#### My Merchants (Distributor)
- **Route:** `/dashboard/merchants`
- **Backend APIs:** `GET /api/distributor/merchants`

- **Components:**
  - MerchantsCardGrid
    - Card per merchant: name, email, stores count, status
    - Quick actions: View, Message
  - AssignCampaignTomultipleMerchantsModal

#### Team/Managers Page
- **Route:** `/dashboard/team` or `/dashboard/managers`
- **Backend APIs:**
  - `GET /api/merchant/managers`
  - `POST /api/merchant/managers` (add manager)
  - `DELETE /api/merchant/managers/[id]` (remove)

- **Components:**
  - ManagersTable
    - Columns: Name, Email, Phone, Access Level, Stores Assigned, Status, Actions
    - Actions: Edit, Remove
  - AddManagerForm
    - Email input
    - RoleSelector
    - StoresAssignment
    - Submit button
  - AccessPermissionsPanel (define what managers can do)

---

## 🔒 PHASE 9: SECURITY & AUTHORIZATION (Days 20-21)

### Role-Based Access Control Implementation

#### Component Protection
```
components/auth/ProtectedRoute.js (ALREADY EXISTS)
├── Check user role
├── Check required permissions
└── Conditionally render component or deny access
```

#### Page Protection
```
app/(dashboard)/layout.js
├── Wrap all dashboard pages with ProtectedRoute
├── Check authentication status
└── Redirect to login if not authenticated
```

#### API Call Protection
```
lib/api/axiosConfig.js
├── Add Authorization header (JWT token)
├── Refresh token on 401
├── Redirect to login on 403 (unauthorized)
└── Handle errors gracefully
```

#### Permission Matrix
```
Super_Admin:   All pages, all actions
Distributor:   Merchants, Campaigns, Redemptions, Settings
Merchant:      Stores, Campaigns (own), Redemptions, Analytics, Billing
Manager:       Redemptions (view), Analytics (view), Live Activity (view-only)
```

---

## 🔄 PHASE 10: API INTEGRATION LAYER (Days 22-23)

### API Service Files

#### Authentication Service
```
lib/api/auth.js
├── login(email, password)
├── register(userData)
├── logout()
├── verifyOTP(phone, otp)
├── sendOTP(phone)
├── resetPassword(email)
└── refreshToken()
```

#### Stores Service
```
lib/api/stores.js
├── listStores()
├── getStore(storeId)
├── createStore(data)
├── updateStore(storeId, data)
├── deleteStore(storeId)
├── getStoreInventory(storeId)
└── addStoreInventory(storeId, data)
```

#### Campaigns Service
```
lib/api/campaigns.js
├── listCampaigns(filters)
├── getCampaign(campaignId)
├── createCampaign(data)
├── updateCampaign(campaignId, data)
├── deleteCampaign(campaignId)
├── assignCampaignToStore(campaignId, storeId, quantity)
├── getCampaignRanges(campaignId)
└── createCampaignRange(campaignId, data)
```

#### Redemptions Service
```
lib/api/redemptions.js
├── scanQRCode(qrCode)
├── redeemCoupon(data)
├── getRedemptionHistory(filters)
├── getRedemptionStats()
├── reverseRedemption(redemptionId)
└── getRedemptionDetails(redemptionId)
```

#### Inventory Service
```
lib/api/inventory.js
├── getInventoryStatus()
├── getInventoryHistory(filters)
├── allocateInventory(data)
└── getInventoryAnalytics()
```

#### Analytics Service
```
lib/api/analytics.js
├── getDashboard(role)
├── getRedemptionAnalytics(filters)
├── getInventoryAnalytics(filters)
└── generateReport(reportType, filters)
```

#### Payments Service
```
lib/api/payments.js
├── createPaymentOrder(subscriptionPlanId)
├── verifyPayment(orderId, paymentData)
├── getPaymentHistory()
└── downloadInvoice(invoiceId)
```

#### Admin Service
```
lib/api/admin.js
├── getMerchants()
├── getDistributors()
├── getSeedData()
└── getDashboardData()
```

### HTTP Client Setup
```
lib/api/client.js
├── Base Axios instance
├── Request interceptor (add auth token)
├── Response interceptor (handle errors, token refresh)
├── Error handling (standard response format)
└── Rate limiting (optional)
```

---

## 📱 PHASE 11: FORMS & VALIDATION (Days 24-25)

### Reusable Form Components

```
components/forms/
├── TextInput.js               # Standard text input with validation
├── PasswordInput.js           # Password with strength indicator
├── EmailInput.js             # Email with validation
├── PhoneInput.js             # Phone with country code
├── DatePickerInput.js        # Date selection
├── SelectInput.js            # Dropdown select
├── MultiSelectInput.js       # Multi-select dropdown
├── TextAreaInput.js          # Large text area
├── NumericInput.js           # Number input with min/max
├── CheckboxGroup.js          # Multiple checkboxes
├── RadioGroup.js             # Radio button group
├── FormGroup.js              # Label + Input wrapper
├── FormErrors.js             # Error display
└── SubmitButton.js           # Standard submit button
```

### Validation Schema (using Zod or Yup)

```
lib/validation/
├── authSchemas.js            # Login, register, OTP validation
├── storeSchemas.js           # Store CRUD validation
├── campaignSchemas.js        # Campaign validation
├── redemptionSchemas.js      # Redemption validation
└── subscriptionSchemas.js    # Billing validation
```

---

## 📊 PHASE 12: SHARED COMPONENTS & UTILITIES (Days 26-27)

### Data Display Components

```
components/tables/
├── DataTable.js              # Generic data table with sorting/filtering
├── TableHeader.js
├── TableRow.js
├── Pagination.js
└── ColumnFilter.js

components/charts/
├── LineChart.js              # Trend charts
├── BarChart.js               # Comparison charts
├── PieChart.js               # Distribution charts
├── AreaChart.js              # Stacked area charts
└── HeatmapChart.js           # Time-based heatmaps

components/modals/
├── ConfirmationModal.js      # Delete/action confirmation
├── FormModal.js              # Form in modal
├── InfoModal.js              # Information display
└── SuccessModal.js           # Success message
```

### Utility Hooks

```
hooks/
├── useApi.js                 # API data fetching with caching
├── useForm.js                # Form state management
├── useAuth.js                # Authentication state
├── usePagination.js          # Pagination logic
├── useLocalStorage.js        # Local storage persistence
└── useDebounce.js            # Debounce hook
```

---

## 🎨 PHASE 13: STYLING & RESPONSIVE DESIGN (Days 28-29)

### CSS Modules Structure

```
styles/
├── variables.module.css      # Colors, sizes, fonts
├── globals.css               # Global styles
├── layout.module.css         # Layout styles
├── forms.module.css          # Form styles
└── responsive.module.css     # Media queries
```

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Component Styling Approach
- Use CSS Modules for component-scoped styles
- Use globals.css for base styles
- Use Tailwind classes (if added) for utilities
- All components must be mobile-first responsive

---

## 🧪 PHASE 14: TESTING & QA (Days 30-31)

### Unit Tests

```
__tests__/
├── components/
│   ├── auth/
│   ├── forms/
│   ├── tables/
│   └── modals/
├── hooks/
│   ├── useApi.test.js
│   ├── useForm.test.js
│   └── useAuth.test.js
├── lib/
│   ├── validation.test.js
│   └── formatters.test.js
└── pages/
    ├── auth/
    ├── dashboard/
    └── admin/
```

### Integration Tests
- Test complete user flows
- Test API integration
- Test form submissions
- Test error handling

### Manual Testing Checklist
```
Authentication:
- [ ] Login with email/password
- [ ] Login with OTP
- [ ] Register new user
- [ ] Reset forgotten password
- [ ] Logout

Stores:
- [ ] Create store
- [ ] List stores
- [ ] View store details
- [ ] Edit store
- [ ] Delete store
- [ ] View store inventory

Campaigns:
- [ ] Create campaign
- [ ] Create campaign ranges
- [ ] Assign campaign to store
- [ ] View campaign details
- [ ] Update campaign

Redemptions:
- [ ] Scan QR code
- [ ] Redeem coupon
- [ ] View redemption history
- [ ] Reverse redemption

Analytics:
- [ ] View dashboard (all roles)
- [ ] View redemption analytics
- [ ] View inventory analytics
- [ ] Export reports

Admin:
- [ ] View merchants list
- [ ] View distributors list
- [ ] Manage team members
```

---

## 📋 IMPLEMENTATION PRIORITY & SEQUENCE

### Week 1: Foundation (Days 1-5)
1. **Day 1-2:** Auth pages + context setup (PHASE 1)
2. **Day 3-5:** Role-based dashboards (PHASE 2)

### Week 2: Core Features (Days 6-10)
3. **Day 6-7:** Store management (PHASE 3)
4. **Day 8-10:** Campaign management (PHASE 4)

### Week 3: Operations (Days 11-15)
5. **Day 11-13:** Redemptions + Inventory (PHASE 5)
6. **Day 14-15:** Analytics & Reports (PHASE 6)

### Week 4: Advanced Features (Days 16-19)
7. **Day 16-17:** Billing & Subscription (PHASE 7)
8. **Day 18-19:** Admin & Team management (PHASE 8)

### Week 5: Integration & Polish (Days 20-25)
9. **Day 20-21:** Security & Authorization (PHASE 9)
10. **Day 22-23:** API Integration layer (PHASE 10)
11. **Day 24-25:** Forms & Validation (PHASE 11)

### Week 6: Completion (Days 26-31)
12. **Day 26-27:** Shared components & utilities (PHASE 12)
13. **Day 28-29:** Styling & Responsive (PHASE 13)
14. **Day 30-31:** Testing & QA (PHASE 14)

---

## 🔗 API ENDPOINTS TO FRONTEND MAPPING

### Authentication (8 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| POST /api/auth/register | LoginPage, RegisterPage | User registration |
| POST /api/auth/login | LoginPage | Email/password login |
| POST /api/auth/otp-send | OTPRequestPage | Send OTP |
| POST /api/auth/otp-verify | OTPVerifyPage | Verify OTP & login |
| POST /api/auth/logout | TopBar, ProtectedRoute | User logout |
| GET /api/auth/me | AuthContext, DashboardLayout | Load user profile |
| POST /api/auth/password-reset-request | PasswordResetRequestPage | Request reset |
| POST /api/auth/password-reset | PasswordResetConfirmPage | Confirm reset |

### Stores (6 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/stores | StoresListPage | List stores |
| POST /api/stores | CreateStorePage | Create store |
| GET /api/stores/[id] | StoreDetailsPage | View store |
| PUT /api/stores/[id] | EditStorePage | Update store |
| DELETE /api/stores/[id] | StoresListPage | Delete store |
| GET /api/stores/[id]/inventory | StoreInventoryPage | View inventory |

### Campaigns (8 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/campaigns | CampaignsListPage | List campaigns |
| POST /api/campaigns | CreateCampaignPage | Create campaign |
| GET /api/campaigns/[id] | CampaignDetailsPage | View campaign |
| PUT /api/campaigns/[id] | EditCampaignPage | Update campaign |
| DELETE /api/campaigns/[id] | CampaignsListPage | Delete campaign |
| POST /api/campaigns/[id]/assign | AssignCampaignPage | Assign to store |
| POST /api/campaign_range | SetupRangePage | Create ranges |
| GET /api/campaign_range | CampaignDetailsPage | View ranges |

### Inventory (7 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/inventory/status | InventoryPage, Dashboard | Status overview |
| POST /api/inventory/allocate | InventoryPage | Allocate inventory |
| GET /api/inventory/history | InventoryPage | Transaction history |
| GET /api/ranges | CampaignRangesTable | List ranges |
| POST /api/ranges | SetupRangePage | Create range |
| GET /api/ranges/[id] | RangeDetailsPage | View range |
| PUT /api/ranges/[id] | EditRangePage | Update range |

### Redemptions (6 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| POST /api/redemptions | ScanRedemptionPage | Redeem coupon |
| GET /api/redemptions/history | RedemptionsListPage | View history |
| POST /api/redemptions/reverse | RedemptionsListPage | Reverse redemption |
| GET /api/redemptions/stats | RedemptionStatsWidget | Statistics |
| GET /api/scan | ScanRedemptionPage | Validate QR code |
| GET /api/redemptions/[id] | RedemptionDetailsPage | View details |

### Analytics (6 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/dashboard/super-admin | SuperAdminDashboard | SA metrics |
| GET /api/dashboard/admin | DistributorDashboard | Distributor metrics |
| GET /api/dashboard/retailer | MerchantDashboard | Merchant metrics |
| GET /api/dashboard/manager | ManagerDashboard | Manager metrics |
| GET /api/analytics/inventory | InventoryAnalyticsPage | Inventory trends |
| GET /api/analytics/redemptions | RedemptionAnalyticsPage | Redemption trends |

### Admin & Payments (7 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/admin/merchants | MerchantsManagementPage | List merchants |
| GET /api/admin/distributors | DistributorsManagementPage | List distributors |
| POST /api/admin/seed | Testing only | Seed test data |
| POST /api/payment/create-order | CheckoutPage | Create order |
| POST /api/payment/verify | CheckoutPage | Verify payment |
| POST /api/payment/webhook | Backend only | Payment webhook |
| GET /api/subscription/plans | PlansPage | Get plans |

### User & Organization (6 endpoints)
| Endpoint | Page/Component | Used For |
|----------|----------------|----------|
| GET /api/user | AuthContext | Get user profile |
| GET /api/merchant | MerchantDashboard | Get merchant info |
| GET /api/merchant/managers | TeamPage | List managers |
| POST /api/subscription/assign | CheckoutPage | Assign subscription |
| GET /api/subscription/current | BillingPage | Current subscription |
| GET /api/distributor/merchants | MyMerchantsPage | List merchants |

---

## ✅ COMPLETION CHECKLIST

### Week 1 Milestone
- [ ] All 5 auth pages built and integrated
- [ ] AuthContext working with login/logout
- [ ] ProtectedRoute preventing unauthorized access
- [ ] All 4 role-based dashboards built
- [ ] Dashboard data loading from APIs

### Week 2 Milestone
- [ ] Store CRUD fully implemented
- [ ] Campaign CRUD fully implemented
- [ ] Campaign ranges support
- [ ] Campaign-to-store assignment working

### Week 3 Milestone
- [ ] QR scanning and redemption working
- [ ] Inventory management functional
- [ ] All analytics pages showing real data
- [ ] Export functionality working

### Week 4 Milestone
- [ ] Billing pages complete
- [ ] Payment integration working (test mode)
- [ ] Admin pages complete
- [ ] Team management working

### Week 5 Milestone
- [ ] RBAC enforced on all pages
- [ ] All 50+ APIs integrated
- [ ] Form validation working
- [ ] Error handling complete

### Week 6 Milestone
- [ ] All components styled and responsive
- [ ] Mobile, tablet, desktop layouts working
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] Ready for production deployment

---

## 📞 CRITICAL SUCCESS FACTORS

1. **Follow API Contract:** Every frontend page must match the backend API response structure exactly
2. **Token Management:** Store JWT token securely, refresh automatically on 401
3. **Error Handling:** Every API call must have error handling and user feedback
4. **Loading States:** Show loading spinners/skeletons while fetching data
5. **Validation:** Client-side validation before API calls, server validation errors displayed to user
6. **Role-Based Rendering:** Always check user role before showing sensitive features
7. **Responsive Design:** Test on mobile, tablet, desktop at each phase
8. **Performance:** Optimize API calls, implement caching where appropriate
9. **Accessibility:** Follow WCAG guidelines, proper form labels, alt text for images
10. **Documentation:** Maintain inline code comments explaining complex logic

---

**Next Step:** Begin Phase 1 - Build authentication pages with full API integration

**Estimated Duration:** 6 weeks (31 days)  
**Team Size:** 2-3 frontend engineers  
**Owner:** Frontend Development Lead
