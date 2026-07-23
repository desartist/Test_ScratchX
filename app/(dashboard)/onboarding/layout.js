import React from 'react';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OnboardingLayout({ children }) {
  await connectDB();

  const user = await getLoginToken();

  if (!user) {
    // Route through the logout endpoint (not straight to /auth/login) so the
    // stale authToken/sessionId cookies actually get cleared. Otherwise
    // middleware still sees a present authToken on /auth/login and bounces
    // the browser right back to /merchant-overview — an infinite loop.
    redirect('/api/auth/logout');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      {children}
    </div>
  );
}
