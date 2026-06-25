import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import Session from '@/models/sessionModel';
import { connectDB } from '@/lib/connectDB';

const COOKIE_NAMES = ['authToken', 'refreshToken', 'sessionId', 'accountId', 'accountRole', 'userEmail'];

// GET /api/auth/logout — clear all auth cookies and redirect to login.
// Used by the server layout when a session is invalid (user not in DB).
export async function GET() {
  const response = NextResponse.redirect(
    new URL('/auth/login', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
    { status: 302 }
  );
  for (const name of COOKIE_NAMES) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' });
  }
  return response;
}
import tokenBlacklist from '@/lib/tokenBlacklist';
import jwtService from '@/lib/jwtService';

export async function POST(request) {
  try {
    await connectDB();

    let accessToken = null;
    let refreshToken = null;
    try {
      const body = await request.json();
      accessToken = body.accessToken || null;
      refreshToken = body.refreshToken || null;
    } catch {
      // body may be empty — that's fine, we'll still clear the cookie session
    }

    // Blacklist access token (15 minute expiry)
    if (accessToken) {
      await tokenBlacklist.addToBlacklist(accessToken, 900);
    }

    // Blacklist refresh token (7 day expiry)
    if (refreshToken) {
      await tokenBlacklist.addToBlacklist(refreshToken, 604800);
    }

    // Also clean up session cookie if it exists
    const cookieStore = await cookies();
    const cookie = cookieStore.get('authToken');

    if (cookie?.value) {
      const hashedToken = cookie.value;
      const sessions = await Session.find({});

      for (const session of sessions) {
        const expectedHash = createHmac('sha256', process.env.COOKIE_SECRET)
          .update(session._id.toString())
          .digest('hex');

        if (expectedHash === hashedToken) {
          await Session.findByIdAndDelete(session._id);
          break;
        }
      }
    }

    // Clear cookies
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout successful',
        redirectTo: '/auth/login',
      },
      { status: 200 }
    );

    response.cookies.delete('authToken');
    response.cookies.delete('refreshToken');
    response.cookies.delete('accountRole');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
