import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import Store from '@/models/storeModel';
import Subscription from '@/models/subscriptionModel';
import passwordService from '@/lib/passwordService';
import jwtService from '@/lib/jwtService';
import { setAuthSession } from '@/lib/setAuthSession';
import { ROLE_HOME } from '@/lib/permissions';
import { createSession, enforceDeviceLimit } from '@/lib/services/sessionManagementService';
import { getLocationFromIP } from '@/lib/services/geolocationService';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const account = await Account.findOne({ email: normalizedEmail }).select('+password');

    if (!account) {
      return Response.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!account.password) {
      return Response.json(
        {
          success: false,
          error: 'This account does not use password login. Try OTP or reset your password.',
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await passwordService.comparePassword(password, account.password);

    if (!isPasswordValid) {
      account.loginAttempts = (account.loginAttempts || 0) + 1;
      account.lastFailedLoginAt = new Date();
      await account.save();

      return Response.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (account.status === 'suspended') {
      return Response.json(
        { success: false, error: 'Your account is suspended. Please contact support.' },
        { status: 403 }
      );
    }

    if (account.status === 'deactivated') {
      return Response.json(
        { success: false, error: 'Your account has been deactivated.' },
        { status: 403 }
      );
    }

    account.loginAttempts = 0;
    account.lastLoginAt = new Date();
    account.lastLoginIP =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (account.status === 'pending') {
      account.status = 'active';
    }

    await account.save();

    // ===== CREATE SESSION WITH DEVICE TRACKING =====
    let session = null;
    try {
      // Extract device info from request headers
      let userAgent = req.headers.get('user-agent') ||
                      req.headers.get('User-Agent') ||
                      req.headers.get('USER-AGENT') ||
                      '';

      let ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('X-Forwarded-For') ||
               req.headers.get('x-real-ip') ||
               req.headers.get('X-Real-IP') ||
               'unknown';

      userAgent = String(userAgent).trim();
      ip = String(ip).trim().split(',')[0];

      console.log('[PASSWORD-LOGIN] User Agent:', userAgent.substring(0, 50) + '...');
      console.log('[PASSWORD-LOGIN] IP:', ip);

      // Get location from IP
      const location = await getLocationFromIP(ip);
      console.log('[PASSWORD-LOGIN] Location:', location);

      // Create session with device tracking
      session = await createSession(account._id, account.role, ip, userAgent, location);
      console.log('[PASSWORD-LOGIN] Session created:', session._id);

      // Enforce 3-device limit
      await enforceDeviceLimit(account._id, 3);
    } catch (err) {
      console.error('[PASSWORD-LOGIN] Session creation error:', err);
      // Don't fail login if session creation fails, just log it
    }

    // Set cookies using the pre-created session
    await setAuthSession(account, session);

    const { accessToken, refreshToken, expiresIn } = jwtService.createTokenPair(account);

    // Always redirect to dashboard; set merchantHasStore cookie so middleware
    // can gate /stores/create without a DB round-trip on every request.
    const redirectTo = ROLE_HOME[account.role] ?? '/dashboard';

    if (account.role === 'Merchant') {
      const [storeCount, subscription] = await Promise.all([
        Store.countDocuments({ merchant_id: account._id }),
        Subscription.findOne({
          ownerId: account._id,
          ownerType: 'merchant',
          status: { $in: ['trial', 'active', 'past_due'] },
        }).lean(),
      ]);
      const cookieStore = await cookies();
      const sameSiteValue = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
      const cookieOpts = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: sameSiteValue,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      };
      cookieStore.set('merchantHasStore', storeCount > 0 ? '1' : '0', cookieOpts);
      cookieStore.set('merchantHasSub', subscription ? '1' : '0', cookieOpts);
    }

    // Login notification (fire-and-forget)
    try {
      const Notification = (await import('@/models/notificationModel')).default;
      await Notification.create({
        ownerId: account._id,
        ownerType: account.role?.toLowerCase().includes('distributor') ? 'distributor' : 'merchant',
        type: 'system_alert',
        title: '👋 New login detected',
        message: `You signed in on ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        severity: 'low',
        read: false,
      });
    } catch (_) {}

    return Response.json(
      {
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        expiresIn,
        account: {
          id: account._id.toString(),
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          phone: account.phone,
          role: account.role,
          status: account.status,
          lastLoginAt: account.lastLoginAt,
          createdAt: account.createdAt,
        },
        redirectTo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password login error:', error);

    return Response.json(
      {
        success: false,
        error: error.message || 'Login failed. Please try again.',
      },
      { status: 500 }
    );
  }
}
