import { NextResponse } from 'next/server';
import Account from '@/models/accountModel';
import jwtService from '@/lib/jwtService';
import googleAuthService from '@/lib/googleAuthService';
import { connectDB } from '@/lib/connectDB';
import Session from '@/models/sessionModel';
import { createHmac } from 'crypto';
import { ROLE_HOME } from '@/lib/permissions';
import { createSession, enforceDeviceLimit } from '@/lib/services/sessionManagementService';
import { getLocationFromIP } from '@/lib/services/geolocationService';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth error
    if (error) {
      return NextResponse.redirect(`/auth/login?error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect('/auth/login?error=invalid_request');
    }

    // Verify CSRF state
    const cookieState = request.cookies.get('oauth_state')?.value;
    if (!cookieState || cookieState !== state) {
      return NextResponse.redirect('/auth/login?error=invalid_state');
    }

    // Exchange code for tokens
    const tokens = await googleAuthService.exchangeCodeForTokens(code);
    const userInfo = await googleAuthService.getUserInfo(tokens.access_token);

    // Check if user is admin (Google Workspace domain validation)
    // For now, allow all Google accounts. Add domain check for production.
    // Example: if (!userInfo.email.endsWith('@yourcompany.com')) {
    //   return NextResponse.redirect('/auth/login?error=unauthorized_domain');
    // }

    // Find or create account
    let account = await Account.findOne({ googleId: userInfo.id });

    if (!account) {
      // Check if email already exists
      const existingEmail = await Account.findOne({ email: userInfo.email });
      if (existingEmail) {
        return NextResponse.redirect('/auth/login?error=email_already_registered');
      }

      // Create new account via Google
      account = new Account({
        email: userInfo.email,
        firstName: userInfo.given_name || '',
        lastName: userInfo.family_name || '',
        googleId: userInfo.id,
        isEmailVerified: userInfo.verified_email,
        emailVerifiedAt: userInfo.verified_email ? new Date() : null,
        role: 'Super_Admin', // Google OAuth defaults to Super_Admin
        source: 'Google_OAuth',
        status: 'active', // Google users are auto-verified
      });

      // Generate placeholder phone (required field)
      account.phone = `google_${userInfo.id.substring(0, 10)}`;

      await account.save();
    } else {
      // Update last login
      account.lastLoginAt = new Date();
      account.lastLoginIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      account.loginAttempts = 0; // Reset failed login attempts on successful login
      await account.save();
    }

    // Create session with device tracking
    let session = null;
    try {
      let userAgent = request.headers.get('user-agent') ||
                      request.headers.get('User-Agent') ||
                      '';
      let ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('X-Forwarded-For') ||
               'unknown';

      userAgent = String(userAgent).trim();
      ip = String(ip).trim().split(',')[0];

      const location = await getLocationFromIP(ip);
      session = await createSession(account._id, account.role, ip, userAgent, location);

      // Enforce 3-device limit
      await enforceDeviceLimit(account._id, 3);
    } catch (err) {
      console.error('[GOOGLE-LOGIN] Session creation error:', err);
      // Fallback to old session creation if new method fails
      session = await Session.create({
        accountId: account._id,
        role: account.role,
      });
    }

    if (!process.env.COOKIE_SECRET) {
      console.error("[GOOGLE-LOGIN] CRITICAL: COOKIE_SECRET environment variable is not set!");
      return NextResponse.redirect('/auth/login?error=server_error');
    }

    const sessionToken = createHmac('sha256', process.env.COOKIE_SECRET)
      .update(session._id.toString())
      .digest('hex');

    console.log('[GOOGLE-LOGIN] Session token generated for account:', account._id);

    // Generate JWT tokens
    const jwtTokens = jwtService.createTokenPair(account);

    // Build redirect URL to dashboard
    const dashboardUrl = new URL('/dashboard', request.url);

    const response = NextResponse.redirect(dashboardUrl);

    // In development, use 'lax' sameSite for easier testing. In production use 'strict'
    const sameSiteValue = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';

    // Set session cookie (httpOnly — carries the actual session proof)
    response.cookies.set('authToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: sameSiteValue,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    console.log('[GOOGLE-LOGIN] authToken cookie set (sameSite:', sameSiteValue, ')');

    // Set role cookie (NOT httpOnly — readable by middleware for role-based routing)
    response.cookies.set('accountRole', account.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: sameSiteValue,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    console.log('[GOOGLE-LOGIN] accountRole cookie set');

    // Clear OAuth state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect('/auth/login?error=callback_failed');
  }
}
