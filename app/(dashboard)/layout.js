import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Store from '@/models/storeModel';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }) {
  await connectDB();

  const cookieStore = await cookies();
  const user = await getLoginToken();

  if (!user) {
    // Route through the logout endpoint (not straight to /auth/login) so the
    // stale authToken/sessionId cookies actually get cleared. Otherwise
    // middleware still sees a present authToken on /auth/login and bounces
    // the browser right back to /merchant-overview — an infinite loop.
    redirect('/api/auth/logout');
  }

  const role = user?.role || 'Merchant';
  const merchantHasStore = cookieStore.get('merchantHasStore')?.value;

  // Store-ownership onboarding gate only applies to Merchant accounts — every
  // other role (Super_Admin, Distributor, Manager, etc.) naturally has zero
  // stores of their own and must never be stripped of the sidebar/header for it.
  let hasStore = true;
  if (role === 'Merchant') {
    // Verify store ownership directly against the DB whenever cookie isn't
    // definitively '1' (handles stuck '0' cookies after store creation, and
    // missing cookies from OAuth).
    hasStore = merchantHasStore === '1';
    if (!hasStore) {
      try {
        const count = await Store.countDocuments({
          merchant_id: user._id,
          isDeleted: { $ne: true },
          status: { $ne: 'deleted' },
        });
        hasStore = count > 0;
      } catch {
        hasStore = false;
      }
    }
  }

  // Render without sidebar/header so the onboarding UI is clean
  if (!hasStore) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
        {children}
      </div>
    );
  }

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  );
}
