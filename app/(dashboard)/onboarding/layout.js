import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
  } catch {
    return null;
  }
}

export default async function OnboardingLayout({ children }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const user = await getUser(cookieHeader);

  if (!user || user.unauthorized) {
    redirect('/auth/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      {children}
    </div>
  );
}
