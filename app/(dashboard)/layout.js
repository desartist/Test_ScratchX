import React from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

async function getUser() {
  try {
    const cookieStore = await cookies();
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookieStore.toString() },
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
  const user = await getUser();

  if (!user || user.unauthorized) {
    // Redirect to the GET logout handler which clears all cookies then
    // redirects to /auth/login — avoids the middleware bounce-back loop.
    redirect('/api/auth/logout');
  }

  const role = user?.role || 'Merchant';

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  );
}
