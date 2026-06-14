# Role-Based Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create role-specific dashboards for Super_Admin, Admin (Distributor), Retailer (Merchant), and Manager with tailored data views, metrics, and actions based on user role and responsibilities.

**Architecture:** 
- **Backend:** Separate API endpoints per role returning filtered/aggregated data specific to user's scope (Super_Admin sees system-wide, Admin sees their merchants, Retailer sees their operations, Manager sees their staff)
- **Frontend:** Role-based component selection with shared dashboard layout framework; protected routes redirect to role-appropriate dashboard
- **Data models:** Leverage existing Account/Transaction models with role-based queries; add Dashboard/Metrics endpoints
- **Authentication:** Uses existing JWT + AuthContext; adds role-based route protection and data scoping

**Tech Stack:** Next.js 16.2.3, React 19.2.4, CSS Modules, MongoDB/Mongoose, JavaScript

**Role Hierarchy:**
```
Super_Admin (system administrator)
  ↓ manages
  Admin/Distributor (manages multiple retailers)
    ↓ manages
    Retailer/Merchant (manages staff & customers)
      ↓ manages  
      Manager (manages day-to-day operations)
```

---

## File Structure

### Backend API Routes
- `app/api/dashboard/super-admin/route.js` - System-wide metrics and user management
- `app/api/dashboard/admin/route.js` - Distributor metrics and merchant management
- `app/api/dashboard/retailer/route.js` - Sales, inventory, staff, customer data
- `app/api/dashboard/manager/route.js` - Operations, staff, transactions data
- `lib/dashboardService.js` - Dashboard data aggregation and filtering logic

### Frontend Dashboard Components
- `components/dashboards/DashboardLayout.js` - Shared dashboard wrapper (sidebar, header, role-based nav)
- `components/dashboards/SuperAdminDashboard.js` - Super admin dashboard
- `components/dashboards/AdminDashboard.js` - Distributor dashboard
- `components/dashboards/RetailerDashboard.js` - Retailer/Merchant dashboard
- `components/dashboards/ManagerDashboard.js` - Manager dashboard
- `components/dashboards/shared/` - Shared dashboard widgets (StatCard, Chart, DataTable, etc.)

### Dashboard Pages & Routing
- `app/(dashboard)/dashboard/page.js` - Main dashboard page (role-aware entry point)
- `app/(dashboard)/layout.js` - Dashboard layout wrapper
- `middleware.js` - Protect dashboard routes and role-based access

### Styles
- `components/dashboards/DashboardLayout.module.css`
- `components/dashboards/Dashboard.module.css`
- `components/dashboards/shared/StatCard.module.css`

---

## Implementation Tasks

### Task 1: Create Role-Based Route Protection Middleware

**Files:**
- Create: `middleware.js`

- [ ] **Step 1: Create middleware to protect dashboard routes**

```javascript
import { NextResponse } from 'next/server';
import { jwtService } from '@/lib/jwtService';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify token is valid (basic check)
    try {
      const decoded = jwtService.verifyToken(token);
      
      // Add user role to request headers for route handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-role', decoded.role);
      requestHeaders.set('x-user-id', decoded.accountId);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
```

- [ ] **Step 2: Commit middleware**

```bash
git add middleware.js
git commit -m "feat: add role-based route protection middleware"
```

---

### Task 2: Create Dashboard Service (Backend Data Layer)

**Files:**
- Create: `lib/dashboardService.js`

- [ ] **Step 1: Create dashboard service with role-based data aggregation**

```javascript
import Account from '@/models/accountModel';

class DashboardService {
  /**
   * Get Super Admin dashboard data
   * Shows: total users, merchants, distributors, system metrics
   */
  async getSuperAdminDashboard() {
    try {
      const totalUsers = await Account.countDocuments();
      const totalDistributors = await Account.countDocuments({ role: 'Distributor' });
      const totalMerchants = await Account.countDocuments({ role: 'Merchant' });
      const totalManagers = await Account.countDocuments({ role: 'Manager' });
      
      const activeUsers = await Account.countDocuments({ status: 'active' });
      const pendingUsers = await Account.countDocuments({ status: 'pending' });
      
      // Recent registrations
      const recentUsers = await Account.find()
        .select('email firstName lastName role status createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      return {
        totalUsers,
        activeUsers,
        pendingUsers,
        roleCounts: {
          distributors: totalDistributors,
          merchants: totalMerchants,
          managers: totalManagers,
        },
        recentUsers,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Super Admin dashboard: ${error.message}`);
    }
  }

  /**
   * Get Admin (Distributor) dashboard data
   * Shows: their merchants, sales, commission metrics
   */
  async getAdminDashboard(adminId) {
    try {
      const admin = await Account.findById(adminId);
      if (!admin || admin.role !== 'Distributor') {
        throw new Error('Unauthorized: Not a distributor');
      }

      // Get merchants under this distributor
      const merchants = await Account.find({ createdBy: adminId }).select(
        'email firstName lastName phone status createdAt'
      );

      const merchantCount = merchants.length;
      const activeMetmerchants = merchants.filter(m => m.status === 'active').length;

      return {
        distributorName: `${admin.firstName} ${admin.lastName}`,
        merchantCount,
        activeMerchants: activeMetmerchants,
        pendingMerchants: merchantCount - activeMetmerchants,
        merchants,
        commissionRate: admin.profile?.commissionRate || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Admin dashboard: ${error.message}`);
    }
  }

  /**
   * Get Retailer (Merchant) dashboard data
   * Shows: staff, sales, customers, inventory
   */
  async getRetailerDashboard(merchantId) {
    try {
      const merchant = await Account.findById(merchantId);
      if (!merchant || merchant.role !== 'Merchant') {
        throw new Error('Unauthorized: Not a merchant');
      }

      // Get staff under this merchant
      const staff = await Account.find({ createdBy: merchantId }).select(
        'email firstName lastName phone role status createdAt'
      );

      const staffCount = staff.length;
      const activeStaff = staff.filter(s => s.status === 'active').length;

      return {
        storeName: merchant.profile?.storeName || 'My Store',
        storeLocation: merchant.profile?.storeLocation,
        staffCount,
        activeStaff,
        staff,
        businessType: merchant.profile?.businessType,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Retailer dashboard: ${error.message}`);
    }
  }

  /**
   * Get Manager dashboard data
   * Shows: operations, staff performance, transactions
   */
  async getManagerDashboard(managerId) {
    try {
      const manager = await Account.findById(managerId);
      if (!manager || manager.role !== 'Manager') {
        throw new Error('Unauthorized: Not a manager');
      }

      // Get the merchant this manager works under
      const merchant = await Account.findById(manager.createdBy);
      
      // Get other staff under same merchant
      const staff = await Account.find({ createdBy: manager.createdBy }).select(
        'email firstName lastName phone role status createdAt'
      );

      return {
        managerName: `${manager.firstName} ${manager.lastName}`,
        merchantName: merchant?.profile?.storeName || 'Store',
        staffCount: staff.length,
        staff,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Manager dashboard: ${error.message}`);
    }
  }
}

export default new DashboardService();
```

- [ ] **Step 2: Commit dashboard service**

```bash
git add lib/dashboardService.js
git commit -m "feat: add dashboard service for role-based data aggregation"
```

---

### Task 3: Create Super Admin Dashboard API Endpoint

**Files:**
- Create: `app/api/dashboard/super-admin/route.js`

- [ ] **Step 1: Create Super Admin dashboard endpoint**

```javascript
import { connectDB } from '@/lib/db';
import dashboardService from '@/lib/dashboardService';

export async function GET(req) {
  try {
    await connectDB();

    const userRole = req.headers.get('x-user-role');
    
    if (userRole !== 'Super_Admin') {
      return Response.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getSuperAdminDashboard();

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Super Admin dashboard error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit Super Admin endpoint**

```bash
git add app/api/dashboard/super-admin/route.js
git commit -m "feat: create super admin dashboard API endpoint"
```

---

### Task 4: Create Admin (Distributor) Dashboard API Endpoint

**Files:**
- Create: `app/api/dashboard/admin/route.js`

- [ ] **Step 1: Create Admin dashboard endpoint**

```javascript
import { connectDB } from '@/lib/db';
import dashboardService from '@/lib/dashboardService';

export async function GET(req) {
  try {
    await connectDB();

    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');

    if (userRole !== 'Distributor') {
      return Response.json(
        { success: false, error: 'Unauthorized: Distributor access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getAdminDashboard(userId);

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit Admin endpoint**

```bash
git add app/api/dashboard/admin/route.js
git commit -m "feat: create admin/distributor dashboard API endpoint"
```

---

### Task 5: Create Retailer (Merchant) Dashboard API Endpoint

**Files:**
- Create: `app/api/dashboard/retailer/route.js`

- [ ] **Step 1: Create Retailer dashboard endpoint**

```javascript
import { connectDB } from '@/lib/db';
import dashboardService from '@/lib/dashboardService';

export async function GET(req) {
  try {
    await connectDB();

    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');

    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Unauthorized: Merchant access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getRetailerDashboard(userId);

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retailer dashboard error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit Retailer endpoint**

```bash
git add app/api/dashboard/retailer/route.js
git commit -m "feat: create retailer/merchant dashboard API endpoint"
```

---

### Task 6: Create Manager Dashboard API Endpoint

**Files:**
- Create: `app/api/dashboard/manager/route.js`

- [ ] **Step 1: Create Manager dashboard endpoint**

```javascript
import { connectDB } from '@/lib/db';
import dashboardService from '@/lib/dashboardService';

export async function GET(req) {
  try {
    await connectDB();

    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');

    if (userRole !== 'Manager') {
      return Response.json(
        { success: false, error: 'Unauthorized: Manager access required' },
        { status: 403 }
      );
    }

    const dashboardData = await dashboardService.getManagerDashboard(userId);

    return Response.json(
      {
        success: true,
        data: dashboardData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Manager dashboard error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit Manager endpoint**

```bash
git add app/api/dashboard/manager/route.js
git commit -m "feat: create manager dashboard API endpoint"
```

---

### Task 7: Create Shared Dashboard Widgets (Frontend)

**Files:**
- Create: `components/dashboards/shared/StatCard.js`
- Create: `components/dashboards/shared/StatCard.module.css`
- Create: `components/dashboards/shared/UserTable.js`
- Create: `components/dashboards/shared/UserTable.module.css`

- [ ] **Step 1: Create StatCard component**

```javascript
// components/dashboards/shared/StatCard.js
'use client';

import styles from './StatCard.module.css';

export default function StatCard({ label, value, icon, color = 'primary' }) {
  return (
    <div className={`${styles.card} ${styles[color]}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <h3 className={styles.value}>{value}</h3>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create StatCard styles**

```css
/* components/dashboards/shared/StatCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  font-size: 24px;
}

.content {
  flex: 1;
}

.label {
  margin: 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.value {
  margin: 4px 0 0 0;
  font-size: 28px;
  font-weight: 600;
  color: #010f44;
}

/* Color variants */
.primary .icon {
  background: rgba(239, 158, 27, 0.1);
  color: #ef9e1b;
}

.success .icon {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.warning .icon {
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
}

.danger .icon {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}
```

- [ ] **Step 3: Create UserTable component**

```javascript
// components/dashboards/shared/UserTable.js
'use client';

import styles from './UserTable.module.css';

export default function UserTable({ title, users, columns }) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id || user.id}>
              <td>{user.email}</td>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.role}</td>
              <td>
                <span className={`${styles.badge} ${styles[user.status]}`}>
                  {user.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create UserTable styles**

```css
/* components/dashboards/shared/UserTable.module.css */
.container {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.title {
  margin: 0;
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: #010f44;
  border-bottom: 1px solid #e5e5e5;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table thead {
  background: #f9f9f9;
}

.table th {
  padding: 12px 20px;
  text-align: left;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #e5e5e5;
}

.table td {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.table tbody tr:hover {
  background: #fafafa;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.active {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.pending {
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
}

.suspended {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.deactivated {
  background: rgba(158, 158, 158, 0.1);
  color: #9e9e9e;
}
```

- [ ] **Step 5: Commit shared components**

```bash
git add components/dashboards/shared/
git commit -m "feat: add shared dashboard widgets (StatCard, UserTable)"
```

---

### Task 8: Create Dashboard Layout Component

**Files:**
- Create: `components/dashboards/DashboardLayout.js`
- Create: `components/dashboards/DashboardLayout.module.css`

- [ ] **Step 1: Create DashboardLayout component**

```javascript
// components/dashboards/DashboardLayout.js
'use client';

import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children, role }) {
  const { account, logout } = useAuthContext();

  const getNavItems = () => {
    const baseItems = [{ label: 'Dashboard', href: '/dashboard' }];
    
    switch (role) {
      case 'Super_Admin':
        return [
          ...baseItems,
          { label: 'All Users', href: '/dashboard/users' },
          { label: 'Analytics', href: '/dashboard/analytics' },
          { label: 'Settings', href: '/dashboard/settings' },
        ];
      case 'Distributor':
        return [
          ...baseItems,
          { label: 'My Merchants', href: '/dashboard/merchants' },
          { label: 'Sales', href: '/dashboard/sales' },
          { label: 'Commission', href: '/dashboard/commission' },
        ];
      case 'Merchant':
        return [
          ...baseItems,
          { label: 'Staff', href: '/dashboard/staff' },
          { label: 'Sales', href: '/dashboard/sales' },
          { label: 'Customers', href: '/dashboard/customers' },
        ];
      case 'Manager':
        return [
          ...baseItems,
          { label: 'Operations', href: '/dashboard/operations' },
          { label: 'Transactions', href: '/dashboard/transactions' },
        ];
      default:
        return baseItems;
    }
  };

  const getRoleLabel = () => {
    const roleMap = {
      Super_Admin: 'Super Admin',
      Distributor: 'Admin',
      Merchant: 'Retailer',
      Manager: 'Manager',
    };
    return roleMap[role] || role;
  };

  const navItems = getNavItems();

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logo}>ScratxchX</h2>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navItem}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={logout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.roleTitle}>{getRoleLabel()} Dashboard</h1>
            <div className={styles.userInfo}>
              <span>{account?.email}</span>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create DashboardLayout styles**

```css
/* components/dashboards/DashboardLayout.module.css */
.container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 280px;
  background: #010f44;
  color: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e5e5;
  overflow-y: auto;
}

.sidebarHeader {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #ef9e1b;
}

.nav {
  flex: 1;
  padding: 16px 0;
}

.navItem {
  display: block;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.navItem:hover {
  background: rgba(239, 158, 27, 0.1);
  color: #ef9e1b;
  border-left-color: #ef9e1b;
}

.sidebarFooter {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logoutBtn {
  width: 100%;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid #f44336;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logoutBtn:hover {
  background: #f44336;
  color: white;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.header {
  background: white;
  border-bottom: 1px solid #e5e5e5;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.headerContent {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.roleTitle {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #010f44;
}

.userInfo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: 200px;
  }

  .nav {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 8px 0;
  }

  .navItem {
    white-space: nowrap;
  }
}
```

- [ ] **Step 3: Commit dashboard layout**

```bash
git add components/dashboards/DashboardLayout.js components/dashboards/DashboardLayout.module.css
git commit -m "feat: add dashboard layout component with role-based navigation"
```

---

### Task 9: Create Super Admin Dashboard Component

**Files:**
- Create: `components/dashboards/SuperAdminDashboard.js`

- [ ] **Step 1: Create Super Admin dashboard component**

```javascript
// components/dashboards/SuperAdminDashboard.js
'use client';

import { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import styles from './Dashboard.module.css';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/super-admin');
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        
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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.empty}>No data available</div>;

  return (
    <div className={styles.dashboard}>
      <section className={styles.statsSection}>
        <h2>System Overview</h2>
        <div className={styles.statsGrid}>
          <StatCard 
            label="Total Users" 
            value={data.totalUsers}
            color="primary"
          />
          <StatCard 
            label="Active Users" 
            value={data.activeUsers}
            color="success"
          />
          <StatCard 
            label="Pending Verification" 
            value={data.pendingUsers}
            color="warning"
          />
          <StatCard 
            label="Distributors" 
            value={data.roleCounts.distributors}
            color="primary"
          />
          <StatCard 
            label="Merchants" 
            value={data.roleCounts.merchants}
            color="primary"
          />
          <StatCard 
            label="Managers" 
            value={data.roleCounts.managers}
            color="primary"
          />
        </div>
      </section>

      <section className={styles.tableSection}>
        <UserTable 
          title="Recent Registrations"
          users={data.recentUsers}
          columns={['Email', 'Name', 'Role', 'Status']}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit Super Admin dashboard component**

```bash
git add components/dashboards/SuperAdminDashboard.js
git commit -m "feat: create super admin dashboard component"
```

---

### Task 10: Create Admin Dashboard Component

**Files:**
- Create: `components/dashboards/AdminDashboard.js`

- [ ] **Step 1: Create Admin dashboard component**

```javascript
// components/dashboards/AdminDashboard.js
'use client';

import { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import styles from './Dashboard.module.css';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/admin');
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        
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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.empty}>No data available</div>;

  return (
    <div className={styles.dashboard}>
      <section className={styles.statsSection}>
        <h2>Your Merchants</h2>
        <div className={styles.statsGrid}>
          <StatCard 
            label="Total Merchants" 
            value={data.merchantCount}
            color="primary"
          />
          <StatCard 
            label="Active Merchants" 
            value={data.activeMerchants}
            color="success"
          />
          <StatCard 
            label="Pending Setup" 
            value={data.pendingMerchants}
            color="warning"
          />
          <StatCard 
            label="Commission Rate" 
            value={`${data.commissionRate}%`}
            color="primary"
          />
        </div>
      </section>

      <section className={styles.tableSection}>
        <UserTable 
          title="Your Merchants"
          users={data.merchants}
          columns={['Email', 'Name', 'Role', 'Status']}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit Admin dashboard component**

```bash
git add components/dashboards/AdminDashboard.js
git commit -m "feat: create admin/distributor dashboard component"
```

---

### Task 11: Create Retailer Dashboard Component

**Files:**
- Create: `components/dashboards/RetailerDashboard.js`

- [ ] **Step 1: Create Retailer dashboard component**

```javascript
// components/dashboards/RetailerDashboard.js
'use client';

import { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import styles from './Dashboard.module.css';

export default function RetailerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/retailer');
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        
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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.empty}>No data available</div>;

  return (
    <div className={styles.dashboard}>
      <section className={styles.statsSection}>
        <h2>Store Overview</h2>
        <div className={styles.storeInfo}>
          <div>
            <h3>{data.storeName}</h3>
            <p>{data.storeLocation}</p>
            <p><strong>Type:</strong> {data.businessType}</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard 
            label="Total Staff" 
            value={data.staffCount}
            color="primary"
          />
          <StatCard 
            label="Active Staff" 
            value={data.activeStaff}
            color="success"
          />
        </div>
      </section>

      <section className={styles.tableSection}>
        <UserTable 
          title="Your Staff"
          users={data.staff}
          columns={['Email', 'Name', 'Role', 'Status']}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit Retailer dashboard component**

```bash
git add components/dashboards/RetailerDashboard.js
git commit -m "feat: create retailer/merchant dashboard component"
```

---

### Task 12: Create Manager Dashboard Component

**Files:**
- Create: `components/dashboards/ManagerDashboard.js`

- [ ] **Step 1: Create Manager dashboard component**

```javascript
// components/dashboards/ManagerDashboard.js
'use client';

import { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import styles from './Dashboard.module.css';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/manager');
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        
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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.empty}>No data available</div>;

  return (
    <div className={styles.dashboard}>
      <section className={styles.statsSection}>
        <h2>Operations Overview</h2>
        <div className={styles.managerInfo}>
          <div>
            <h3>{data.managerName}</h3>
            <p><strong>Store:</strong> {data.merchantName}</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard 
            label="Staff Under Management" 
            value={data.staffCount}
            color="primary"
          />
        </div>
      </section>

      <section className={styles.tableSection}>
        <UserTable 
          title="Staff Members"
          users={data.staff}
          columns={['Email', 'Name', 'Role', 'Status']}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit Manager dashboard component**

```bash
git add components/dashboards/ManagerDashboard.js
git commit -m "feat: create manager dashboard component"
```

---

### Task 13: Create Dashboard Styles

**Files:**
- Create: `components/dashboards/Dashboard.module.css`

- [ ] **Step 1: Create Dashboard module styles**

```css
/* components/dashboards/Dashboard.module.css */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.statsSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.statsSection h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #010f44;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.storeInfo,
.managerInfo {
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
}

.storeInfo h3,
.managerInfo h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #010f44;
}

.storeInfo p,
.managerInfo p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.tableSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tableSection h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #010f44;
}

.loading,
.error,
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
  text-align: center;
  font-size: 16px;
}

.loading {
  color: #666;
}

.error {
  color: #f44336;
  background: rgba(244, 67, 54, 0.05);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 8px;
}

.empty {
  color: #999;
}

@media (max-width: 768px) {
  .statsGrid {
    grid-template-columns: 1fr;
  }

  .dashboard {
    gap: 16px;
  }
}
```

- [ ] **Step 2: Commit dashboard styles**

```bash
git add components/dashboards/Dashboard.module.css
git commit -m "feat: add dashboard component styles"
```

---

### Task 14: Create Main Dashboard Page

**Files:**
- Create: `app/(dashboard)/dashboard/page.js`

- [ ] **Step 1: Create main dashboard page with role routing**

```javascript
// app/(dashboard)/dashboard/page.js
'use client';

import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import RetailerDashboard from '@/components/dashboards/RetailerDashboard';
import ManagerDashboard from '@/components/dashboards/ManagerDashboard';

export default function DashboardPage() {
  const { account, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !account) {
    return <div>Loading...</div>;
  }

  const renderDashboard = () => {
    switch (account.role) {
      case 'Super_Admin':
        return <SuperAdminDashboard />;
      case 'Distributor':
        return <AdminDashboard />;
      case 'Merchant':
        return <RetailerDashboard />;
      case 'Manager':
        return <ManagerDashboard />;
      default:
        return <div>Unknown role: {account.role}</div>;
    }
  };

  return (
    <DashboardLayout role={account.role}>
      {renderDashboard()}
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Commit main dashboard page**

```bash
git add app/\(dashboard\)/dashboard/page.js
git commit -m "feat: create main dashboard page with role-based routing"
```

---

### Task 15: Create Dashboard Layout Wrapper

**Files:**
- Create: `app/(dashboard)/layout.js`

- [ ] **Step 1: Create dashboard route group layout**

```javascript
// app/(dashboard)/layout.js
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata = {
  title: 'Dashboard - ScratxchX',
  description: 'Role-based dashboard',
};

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Commit dashboard layout wrapper**

```bash
git add app/\(dashboard\)/layout.js
git commit -m "feat: add dashboard route group layout"
```

---

### Task 16: Test All Dashboards

**Files:**
- No files created; testing existing implementation

- [ ] **Step 1: Test Super Admin Dashboard**

```bash
# Start the dev server
npm run dev

# In browser, navigate to http://localhost:3000/dashboard
# Login with a Super_Admin account
# Verify dashboard shows:
# - Total users, active users, pending users
# - Role counts (distributors, merchants, managers)
# - Recent registrations table
```

- [ ] **Step 2: Test Admin (Distributor) Dashboard**

```bash
# Login with a Distributor account
# Verify dashboard shows:
# - Total merchants, active merchants, pending merchants
# - Commission rate
# - List of merchants they manage
```

- [ ] **Step 3: Test Retailer (Merchant) Dashboard**

```bash
# Login with a Merchant account
# Verify dashboard shows:
# - Store name, location, business type
# - Staff count, active staff
# - List of staff members
```

- [ ] **Step 4: Test Manager Dashboard**

```bash
# Login with a Manager account
# Verify dashboard shows:
# - Manager name and store
# - Staff under management count
# - List of staff members
```

- [ ] **Step 5: Test Role-Based Access Control**

```bash
# Try accessing dashboard with non-authenticated user
# Should redirect to login

# Login as one role, try accessing other role's API endpoints
# Should return 403 Unauthorized
```

- [ ] **Step 6: Verify Middleware Protection**

```bash
# Try accessing /dashboard without logging in
# Should redirect to login

# Logout and try accessing /dashboard
# Should redirect to login
```

- [ ] **Step 7: Final Integration Test**

```bash
# Create test accounts for each role:
# - Super_Admin account
# - Distributor account with merchants
# - Merchant account with staff
# - Manager account

# Login with each and verify:
# - Correct dashboard displays
# - Data is filtered by role
# - Navigation shows role-appropriate links
# - Logout works

# All tests passing: ready for production
```

---

## Implementation Notes

### Architecture Decisions

1. **Role-Based API Endpoints:** Separate endpoints per role for clear responsibility and scalability
2. **Middleware-Based Protection:** Middleware checks authentication before accessing dashboard routes
3. **Header-Based Role Passing:** Role injected via headers in middleware for API route access
4. **Component Composition:** Shared widgets (StatCard, UserTable) for DRY principle
5. **CSS Modules:** Follows existing project pattern of scoped styling

### Security Considerations

- JWT tokens validated in middleware
- Role checks in every API endpoint
- Data filtering by role (users only see their scope)
- No sensitive data exposed beyond user's role scope

### Future Enhancements

- Add charts/analytics (recharts or similar)
- Add pagination for large tables
- Add filtering and sorting
- Add export functionality
- Add real-time notifications
- Add user/staff management sub-pages
- Add sales/transaction history
- Add inventory management (for retailers)
- Add commission tracking (for distributors)

---

## Specification Coverage Checklist

- ✅ Super Admin dashboard with system metrics
- ✅ Admin (Distributor) dashboard with merchant management
- ✅ Retailer (Merchant) dashboard with staff management
- ✅ Manager dashboard with operations overview
- ✅ Role-based API endpoints
- ✅ Protected dashboard routes
- ✅ Role-based navigation
- ✅ Shared dashboard components
- ✅ CSS styling with design tokens
- ✅ Integration with existing auth system
