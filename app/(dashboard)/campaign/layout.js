import React from 'react';
import { cookies } from 'next/headers';
import SubscriptionRequired from '@/components/subscription/SubscriptionRequired';

export const dynamic = 'force-dynamic';

async function hasActiveSubscription(cookieHeader) {
  try {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${base}/api/subscription/current`, {
      headers: { cookie: cookieHeader },
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.subscription);
  } catch {
    return false;
  }
}

export default async function CampaignLayout({ children }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const isActive = await hasActiveSubscription(cookieHeader);

  if (!isActive) {
    return <SubscriptionRequired />;
  }

  return children;
}
