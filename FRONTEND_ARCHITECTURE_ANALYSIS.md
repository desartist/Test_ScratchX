# FRONTEND ARCHITECTURE ANALYSIS

**Project:** QR Coupon Campaigns | Scratch Card Management  
**Analysis Date:** May 26, 2026  
**Framework:** Next.js 16.2.3 + React 19.2.4  
**Status:** Existing architecture with placeholder pages needing implementation  

---

## 1. FOLDER STRUCTURE & ORGANIZATION

```
coupon_campaigns/
├── app/                          # Next.js App Router (App Directory)
│   ├── (auth)/                   # Auth group layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── signup/
│   │   ├── reset-password/
│   │   └── otp/
│   ├── (dashboard)/              # Dashboard group layout (Protected)
│   │   ├── dashboard/            # Main dashboard (role-based)
│   │   ├── stores/               # PLACEHOLDER - needs implementation
│   │   ├── campaigns/            # PLACEHOLDER - needs implementation
│   │   ├── campaign/
│   │   ├── campaigns/create
│   │   ├── campaigns/setup-range
│   │   ├── scratch-allocation/
│   │   ├── scratch-economy/
│   │   ├── analytics/
│   │   ├── billing/
│   │   ├── redemptions/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── team/
│   │   ├── layout.js             # Dashboard layout wrapper
│   │   └── ...other pages
│   ├── api/                      # API routes (backend)
│   │   ├── auth/
│   │   ├── stores/
│   │   ├── campaigns/
│   │   └── ...other endpoints
│   ├── (client)/                 # Client-facing pages (non-authenticated)
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Home page
│   └── globals.css              # Global styles
│
├── components/
│   ├── auth/                     # Authentication components
│   │   ├── AuthContext.js        # Context provider
│   │   ├── AuthProvider.js       # Provider wrapper
│   │   ├── LoginForm.js
│   │   ├── SignupForm.js
│   │   ├── ProtectedRoute.js
│   │   └── ...other auth forms
│   ├── common/                   # Reusable form components
│   │   ├── FormInput.js          # Text input with styling
│   │   ├── FormButton.js         # Button component
│   │   ├── FormError.js          # Error display
│   │   ├── FormSuccess.js        # Success message
│   │   └── ...other forms
│   ├── dashboards/               # Dashboard components
│   │   ├── DashboardLayout.js    # Main layout wrapper
│   │   ├── SuperAdminDashboard.js
│   │   ├── AdminDashboard.js     # Distributor dashboard
│   │   ├── RetailerDashboard.js  # Merchant dashboard
│   │   ├── ManagerDashboard.js
│   │   ├── shared/               # Shared dashboard widgets
│   │   │   ├── ActiveCampaignsCard.js
│   │   │   ├── ScratchInventoryCard.js
│   │   │   ├── CustomerInsightsCard.js
│   │   │   ├── NavIcons.js       # Icon components
│   │   │   ├── DashboardLoading.js
│   │   │   └── StatCard.js
│   │   └── Dashboard.module.css
│   ├── layouts/                  # Layout wrappers
│   │   ├── AuthLayout.js
│   │   └── DashboardLayout.js    # (different from above)
│   └── ...other component groups
│
├── lib/                          # Backend services & utilities
│   ├── apiClient.js              # Fetch-based HTTP client
│   ├── tokenService.js           # Token management
│   ├── authService.js            # Auth logic
│   ├── campaignService.js        # Campaign operations
│   ├── storeService.js           # Store operations
│   ├── inventoryService.js       # Inventory management
│   ├── redemptionService.js      # Redemption logic
│   ├── dashboardService.js       # Dashboard data
│   ├── errors.js                 # Custom error classes
│   ├── permissions.js            # RBAC logic
│   ├── jwtService.js             # JWT utilities
│   ├── otpService.js             # OTP handling
│   └── ...other services
│
├── models/                       # MongoDB models (backend)
│   ├── accountModel.js
│   ├── storeModel.js
│   ├── campaignModel.js
│   ├── scratchCardTransactionModel.js
│   └── ...other models
│
├── __tests__/                    # Jest test files
│   ├── unit/
│   └── integration/
│
├── public/                       # Static assets
│
├── styles/                       # Global styles
│
├── .env.local                    # Environment variables
├── .babelrc                      # Babel configuration
├── jest.config.js                # Jest configuration
├── tsconfig.json                 # TypeScript config (if used)
├── next.config.js                # Next.js configuration
└── package.json                  # Dependencies
```

---

## 2. EXISTING PAGES & THEIR STATUS

### ✅ FULLY IMPLEMENTED PAGES

1. **Authentication Pages** - All implemented with API integration
   - `/auth/login` - Login with email/password
   - `/auth/signup` - User signup
   - `/auth/register` - Registration form
   - `/auth/reset-password` - Password reset
   - `/auth/otp` - OTP login

2. **Dashboard Pages** - Role-based dashboards implemented
   - `/dashboard` - Main dashboard (routes to role-specific dashboard)
   - Super Admin, Distributor, Merchant, Manager dashboards

3. **Other Pages** - Multiple pages created
   - `/billing`, `/billing/plans`, `/billing/checkout`
   - `/campaign`, `/campaigns/create`, `/campaigns/setup-range`
   - `/analytics`, `/reports`, `/settings`, `/support`, `/team`

### ⏳ PLACEHOLDER PAGES (Need Real Implementation)

1. **`/stores`** - PLACEHOLDER
   - File: `app/(dashboard)/stores/page.js`
   - Status: Just shows "This is a placeholder page"
   - Needs: Full store management UI with CRUD operations

2. **`/campaigns`** - PLACEHOLDER
   - File: `app/(dashboard)/campaigns/page.js`
   - Status: Just shows "This is a placeholder page"
   - Needs: Campaign list, create, edit, analytics

3. **`/scratch-allocation`** - PLACEHOLDER (likely)
   - Needs: Inventory allocation UI

4. **`/redemptions`** - Likely placeholder
   - Needs: Redemption tracking and QR scanning

---

## 3. EXISTING COMPONENTS & PATTERNS

### 3.1 Form Components (Reusable)

Located in `components/common/`:

```
✅ FormInput.js           // Text input with styling
✅ FormButton.js          // Button with loading state
✅ FormError.js           // Error message display
✅ FormSuccess.js         // Success message display
```

**Pattern:**
```javascript
<FormInput
  label="Email"
  type="email"
  value={value}
  onChange={handleChange}
  error={errorMessage}
  placeholder="..."
/>
```

### 3.2 Dashboard Widgets (Reusable)

Located in `components/dashboards/shared/`:

```
✅ StatCard.js                   // KPI card component
✅ ActiveCampaignsCard.js         // Campaign widget
✅ ScratchInventoryCard.js        // Inventory widget
✅ CustomerInsightsCard.js        // Analytics widget
✅ DashboardLoading.js            // Skeleton/loading
✅ NavIcons.js                    // Icon set
✅ UserTable.js                   // Table component
```

### 3.3 Layouts

```
✅ DashboardLayout.js       // Main dashboard wrapper with sidebar
✅ AuthLayout.js            // Auth page wrapper
✅ Root Layout              // HTML structure
```

**DashboardLayout Features:**
- Role-based navigation items
- Sidebar with icons
- User profile avatar
- Logout functionality
- Responsive (mobile hamburger)

---

## 4. STATE MANAGEMENT

### Current Approach: React Context API

**Location:** `components/auth/AuthContext.js`

```javascript
// Auth context provides:
- account (user object with role)
- isAuthenticated (boolean)
- isLoading (boolean)
- login() - function
- logout() - function
- error - error message
```

**Pattern:** Used via `useAuthContext()` hook in all protected pages

**⚠️ NOTE:** No Redux/Zustand/other state management library.  
Simple Context API for auth state only.  
Other data fetched directly from API endpoints.

---

## 5. API CLIENT & HTTP LAYER

### File: `lib/apiClient.js`

**Features:**
- Fetch-based (not Axios)
- Automatic token refresh on 401
- Redirect to login on token expiry
- JWT Bearer token in Authorization header

**Usage Pattern:**
```javascript
// Direct fetch calls in components
const response = await fetch('/api/endpoint', {
  credentials: 'include',
});

// OR using apiClient
const response = await apiClient.get('/api/endpoint');
const response = await apiClient.post('/api/endpoint', data);
const response = await apiClient.put('/api/endpoint', data);
const response = await apiClient.delete('/api/endpoint');
```

### Token Management: `lib/tokenService.js`

- `getAccessToken()` - Get JWT from localStorage
- `setAccessToken()` - Save JWT
- `getRefreshToken()` - Get refresh token
- `clearTokens()` - Clear on logout

---

## 6. BACKEND SERVICES (Frontend-facing)

Located in `lib/`, these are **NOT** Node.js backend services, but **Frontend utility services** that:
- Encapsulate API calls
- Handle data transformation
- Provide business logic wrappers

### Available Services:

```javascript
// campaignService.js
- createCampaign()
- getCampaigns()
- getCampaignById()
- updateCampaign()
- deleteCampaign()
- assignStores()
- getCampaignRanges()

// storeService.js
- createStore()
- getStores()
- getStoreById()
- updateStore()
- deleteStore()
- getStoreInventory()
- addInventory()

// inventoryService.js
- allocateInventory()
- getInventoryStatus()
- getInventoryHistory()
- getInventoryAnalytics()

// redemptionService.js
- redeemScratchCard()
- getRedemptionHistory()
- getRedemptionStats()
- reverseRedemption()

// dashboardService.js
- getDashboardData()
- getAnalytics()
```

**Pattern:** Services use `apiClient` internally to make HTTP calls

---

## 7. AUTHENTICATION & AUTHORIZATION

### Authentication Flow:
1. User logs in at `/auth/login`
2. Backend returns JWT token
3. Token stored in localStorage
4. Token added to all API requests
5. On 401, token is refreshed automatically

### RBAC Implementation:
- **Roles:** Super_Admin, Distributor, Merchant, Manager
- **Navigation:** `DashboardLayout.js` shows role-specific menu items
- **Route Protection:** `ProtectedRoute` wrapper prevents unauthorized access

**Navigation Items by Role:**
```
Super_Admin:
  - Dashboard, Distributors, Retailers, Scratch Economy, 
    Revenue Analytics, Campaign Intelligence, Studio Governance

Distributor (Admin):
  - Dashboard, Retailers, Scratch Allocation, Campaigns,
    Analytics, Support, Settings

Merchant (Retailer):
  - Dashboard, Campaigns, Customers, Analytics, Stores,
    Studio, Settings, Support, Billing, Subscription, Team

Manager:
  - Dashboard, Assigned Stores, Live Activity, Analytics (read-only)
```

---

## 8. STYLING SYSTEM

### CSS Modules (Preferred)

All components use `.module.css` files:
- `LoginForm.module.css`
- `DashboardLayout.module.css`
- `Dashboard.module.css`
- etc.

### Global Styles:
- `app/globals.css` - Global reset & base styles
- `app/layout.module.css` - Root layout styles

### Colors & Design System:
- Defined in CSS custom properties (CSS variables)
- Primary color: Blue (#3b82f6)
- No Tailwind CSS currently used

### Styling Pattern:
```javascript
import styles from './Component.module.css';

export default function Component() {
  return <div className={styles.container}>...</div>;
}
```

---

## 9. FORM PATTERNS & VALIDATION

### Form Component Pattern:

```javascript
'use client';
import React, { useState } from 'react';
import FormInput from '@/components/common/FormInput';
import FormButton from '@/components/common/FormButton';
import FormError from '@/components/common/FormError';

export default function MyForm() {
  const [formData, setFormData] = useState({ field: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!formData.field) newErrors.field = 'Required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Submit failed');
      // Success handling
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <FormError message={error} />}
      <FormInput
        label="Field"
        value={formData.field}
        onChange={(e) => setFormData({...formData, field: e.target.value})}
        error={errors.field}
      />
      <FormButton type="submit" isLoading={loading}>
        Submit
      </FormButton>
    </form>
  );
}
```

### Validation Pattern:
- Client-side validation in form component
- Error state management (errors object)
- Display via `FormError` component
- Server validates and returns errors

---

## 10. DATA FETCHING PATTERN

### Direct Fetch (Most Common):

```javascript
'use client';
import React, { useEffect, useState } from 'react';

export default function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch Data = async () => {
      try {
        const response = await fetch('/api/endpoint', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data</div>;

  return <div>{/* Render data */}</div>;
}
```

### Using Service Classes:

```javascript
import { campaignService } from '@/lib/campaignService';

const campaigns = await campaignService.getCampaigns();
const campaign = await campaignService.getCampaignById(id);
```

---

## 11. TABLE/LIST COMPONENTS

### UserTable Component:

Located in `components/dashboards/shared/UserTable.js`

Features:
- Displays tabular data
- Responsive design
- Action buttons (edit, delete, view)
- Pagination support (likely)

**Pattern:**
```javascript
<UserTable
  data={data}
  columns={['name', 'email', 'status']}
  actions={['edit', 'delete']}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

## 12. LOADING & ERROR STATES

### Loading States:
- `DashboardLoading` component in shared folder
- Skeleton loading patterns
- Loading spinner in form buttons

### Error Handling:
- `FormError` component for form errors
- `error` div styled with red background
- Error toasts (if implemented)
- Console error logging

### Empty States:
- `<div>No data available</div>` pattern
- Custom empty state components

---

## 13. HOOKS & UTILITIES

### Existing Hooks:
- `useAuthContext()` - Get auth state
- `useRouter()` - Navigation (Next.js)
- `usePathname()` - Current path (Next.js)
- Standard React hooks: `useState`, `useEffect`, `useCallback`

### No Custom Hooks Yet:
- No data fetching hooks (useFetch)
- No form hooks (useForm)
- No pagination hooks
- Opportunity to create these for reusability

---

## 14. ENVIRONMENT VARIABLES

### Setup:
`.env.local` file in root directory

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Access Pattern:
```javascript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

---

## 15. DEPENDENCIES & LIBRARIES

### Key Dependencies:
- **next**: 16.2.3 (Framework)
- **react**: 19.2.4 (UI)
- **lucide-react**: 1.14.0 (Icons - NOT MUCH USED YET)
- **react-qr-code**: 2.0.18 (QR code generation)
- **qrcode**: 1.5.4 (QR code library)
- **mongoose**: 9.4.1 (Database ORM)
- **jsonwebtoken**: 9.0.3 (JWT handling)
- **bcrypt**: 6.0.0 (Password hashing)

### Dev Dependencies:
- **jest**: 30.4.2 (Testing)
- **@testing-library/react**: 16.1.0 (React testing)
- **eslint**: 9 (Code linting)
- **babel**: 7.x (Transpiling)

---

## 16. TESTING SETUP

### Test Framework: Jest

**Test Files Location:** `__tests__/` directory

**Test Scripts:**
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

### Current Test Status:
- Unit tests exist for services
- Integration tests exist for APIs
- Good coverage established

---

## 17. TYPESCRIPT SUPPORT

**Status:** Not actively used (`.js` files, not `.ts`)

**However:**
- `tsconfig.json` exists (may be configured)
- Could be enabled for type safety
- But existing codebase is JavaScript

---

## 18. ICON SYSTEM

### Lucide Icons Used:
Located in `components/dashboards/shared/NavIcons.js`

Exported icons:
- `IconDashboard`
- `IconChart`
- `IconStore`
- `IconUsers`
- `IconSettings`
- `IconLogout`
- `IconReceipt`
- `IconWallet`

**Usage:**
```javascript
import { IconDashboard } from './shared/NavIcons';

<IconDashboard size={24} />
```

---

## 19. RESPONSIVE DESIGN

### Current Approach:
- CSS Media Queries in `.module.css` files
- Breakpoints defined in individual component styles
- Mobile-first approach (likely)
- Sidebar collapses on mobile (hamburger menu in DashboardLayout)

### Breakpoints (Inferred):
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 20. ACCESSIBILITY

**Status:** Basic accessibility in place
- Form labels associated with inputs
- ARIA attributes (likely)
- Semantic HTML
- Focus management in forms
- Error announcements in forms

---

## SUMMARY TABLE

| Category | Status | Notes |
|----------|--------|-------|
| **Framework** | ✅ Ready | Next.js 16.2.3 + React 19 |
| **HTTP Client** | ✅ Ready | Fetch-based with token refresh |
| **State Management** | ✅ Ready | Context API for auth |
| **Service Layer** | ✅ Ready | Backend services in lib/ |
| **Form Components** | ✅ Ready | FormInput, FormButton, FormError |
| **Dashboard Layout** | ✅ Ready | Role-based navigation |
| **Auth & RBAC** | ✅ Ready | Login, RBAC, role-based pages |
| **Styling System** | ✅ Ready | CSS Modules + global styles |
| **Testing Setup** | ✅ Ready | Jest + testing libraries |
| **Error Handling** | ✅ Ready | Error display components |
| **Loading States** | ✅ Ready | Loading component available |
| **Icons** | ✅ Ready | Lucide icons configured |
| **Responsive Design** | ✅ Ready | Mobile-friendly layouts |
| | | |
| **Store Pages** | ❌ PLACEHOLDER | Need full CRUD implementation |
| **Campaign Pages** | ❌ PLACEHOLDER | Need full CRUD implementation |
| **Redemption Pages** | ❓ Likely placeholder | Need implementation |
| **Inventory Pages** | ❓ Likely placeholder | Need implementation |
| **Tables/Lists** | ⚠️ Basic | UserTable exists, may need enhancement |
| **Charts/Analytics** | ❓ Unknown | May need charting library |

---

## IMPLEMENTATION ROADMAP

### What Already Works:
1. ✅ Authentication system
2. ✅ Dashboard layout & navigation
3. ✅ Role-based routing
4. ✅ Basic form components
5. ✅ API client with token refresh
6. ✅ Backend services

### What Needs Implementation:
1. Store management pages (CRUD)
2. Campaign management pages (CRUD + analytics)
3. Scratch inventory allocation pages
4. Scratch redemption pages (QR scanning)
5. Analytics/charts views
6. Tables with pagination, sorting, filtering
7. Modal/dialog components for create/edit
8. Toast/notification system
9. Advanced hooks (useFetch, useForm, usePagination)
10. Additional shared components

### Implementation Strategy:
1. **Reuse existing patterns** - Follow DashboardLayout, form component, and service patterns
2. **Extend services** - Add more methods to existing service classes
3. **Create new pages** - Replace placeholders with full implementations
4. **Add new components** - Create tables, modals, cards as needed
5. **Follow conventions** - CSS Modules, Context API, service layer approach
6. **Maintain consistency** - Same styling, naming, and code style throughout

---

**Next Step:** Provide implementation plan and code for each required feature module.
