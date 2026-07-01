import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboards/DashboardLayout';

export const dynamic = 'force-dynamic';

async function getUser(cookieHeader) {
  try {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      credentials: 'include',
    });
    if (res.status === 401) return { unauthorized: true };
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export default async function Layout({ children }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const user = await getUser(cookieHeader);

  if (!user || user.unauthorized) {
    redirect('/auth/login');
  }

  const role = user?.role || 'Merchant';
  const merchantHasStore = cookieStore.get('merchantHasStore')?.value;

  // Verify store ownership via API whenever cookie isn't definitively '1'
  // (handles stuck '0' cookies after store creation, and missing cookies from OAuth)
  let hasStore = merchantHasStore === '1';
  if (!hasStore) {
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
      const res = await fetch(`${base}/api/stores`, {
        headers: { cookie: cookieHeader },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        hasStore = Array.isArray(data.stores) ? data.stores.length > 0 : false;
      }
    } catch {
      hasStore = false;
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
