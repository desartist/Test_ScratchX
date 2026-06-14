import React from 'react';
import DashboardLayout from '@/components/dashboards/DashboardLayout';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import Store from '@/models/storeModel';

async function getUser() {
  try {
    const cookieStore = await cookies();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: {
        cookie: cookieStore.toString(),
      },
      credentials: 'include',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function checkMerchantStore(userId) {
  try {
    await connectDB();
    const storeCount = await Store.countDocuments({ merchant_id: userId });
    return storeCount > 0;
  } catch (error) {
    console.error('Error checking merchant stores:', error);
    return true; // Allow access on error to prevent blocking
  }
}

export default async function Layout({ children }) {
  const user = await getUser();
  const role = user?.role || 'Merchant';

  // NOTE: Store check removed from layout to prevent redirect loops
  // Each page (campaigns, stores list) will do its own validation
  // This allows /stores/create to be accessible without infinite redirects

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  );
}
