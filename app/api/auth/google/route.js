import { NextResponse } from 'next/server';
import googleAuthService from '@/lib/googleAuthService';

export async function GET(request) {
  try {
    // Generate CSRF state
    const state = googleAuthService.generateState();

    // Store state in cookie for verification (httpOnly, 10 min expiry)
    const response = NextResponse.redirect(
      googleAuthService.getAuthorizationUrl(state)
    );

    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect('/auth/login?error=oauth_failed');
  }
}
