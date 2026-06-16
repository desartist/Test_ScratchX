import React from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

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

async function getStoreCount(cookieHeader, userId) {
  try {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${base}/api/stores`, {
      headers: {
        cookie: cookieHeader,
        'x-user-id': userId,
        'x-user-role': 'Merchant',
      },
      credentials: 'include',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.total ?? (data.stores?.length ?? 0);
  } catch {
    return 0;
  }
}

export default async function Layout({ children }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const user = await getUser(cookieHeader);

  if (!user || user.unauthorized) {
    redirect('/api/auth/logout');
  }

  const role = user?.role || 'Merchant';

  // Merchants: enforce store setup gate and prevent revisiting the create page once done
  if (role === 'Merchant') {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';

    // Only run when we have a real pathname (RSC re-fetches carry no x-pathname)
    if (pathname) {
      const onCreatePage = pathname.startsWith('/stores/create');
      const storeCount = await getStoreCount(cookieHeader, user.id);

      if (storeCount === 0 && !onCreatePage) {
        // No stores yet — must complete setup first
        redirect('/stores/create');
      } else if (storeCount > 0 && onCreatePage) {
        // Already has stores — send to store list
        redirect('/stores');
      }
    }
  }

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  );
}
