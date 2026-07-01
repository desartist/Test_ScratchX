import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import Store from '@/models/storeModel';
import otpService from '@/lib/otpService';
import jwtService from '@/lib/jwtService';
import Session from '@/models/sessionModel';
import { ROLE_HOME } from '@/lib/permissions';
import { createSession, enforceDeviceLimit } from '@/lib/services/sessionManagementService';
import { getLocationFromIP } from '@/lib/services/geolocationService';
import { setAuthSession } from '@/lib/setAuthSession';

export async function POST(request) {
  try {
    await connectDB();

    const { phone, code, email, role = 'Merchant', firstName, lastName } = await request.json();

    // Validate inputs
    if (!phone || !code) {
      return Response.json(
        { success: false, error: 'Missing required fields: phone, code' },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return Response.json(
        { success: false, error: 'Invalid OTP format' },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpDoc = await otpService.verifyOTP(phone, code);

    // Find or create account
    let account = await Account.findOne({ phone });

    if (!account) {
      // New account signup
      if (!email || otpDoc.purpose !== 'Signup') {
        return Response.json(
          { success: false, error: 'Email required for new signup' },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingEmail = await Account.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return Response.json(
          { success: false, error: 'Email already registered' },
          { status: 409 }
        );
      }

      // Create new account
      account = new Account({
        phone,
        email: email.toLowerCase(),
        role,
        status: 'pending', // Require email verification
        firstName,
        lastName,
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
        source: 'OTP_Signup',
      });

      await account.save();

      return Response.json(
        {
          success: true,
          message: 'Account created. Please verify your email.',
          account: {
            id: account._id,
            email: account.email,
            phone: account.phone,
            role: account.role,
            status: account.status,
          },
          requiresEmailVerification: true,
        },
        { status: 201 }
      );
    } else {
      // Existing account login
      if (account.status === 'suspended' || account.status === 'deactivated') {
        return Response.json(
          { success: false, error: 'Your account is not active' },
          { status: 403 }
        );
      }

      if (account.status === 'pending') {
        return Response.json(
          { success: false, error: 'Your account is pending. Please verify your email.' },
          { status: 403 }
        );
      }

      // Mark phone as verified if not already
      if (!account.isPhoneVerified) {
        account.isPhoneVerified = true;
        account.phoneVerifiedAt = new Date();
      }

      // Update login info
      account.lastLoginAt = new Date();
      account.loginAttempts = 0;
      await account.save();

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
        console.error('[OTP-LOGIN] Session creation error:', err);
        // Fallback to old session creation if new method fails
        session = await Session.create({
          accountId: account._id,
          role: account.role,
        });
      }

      // Use the unified setAuthSession function
      await setAuthSession(account, session);

      // Also create JWT tokens for API use
      const tokens = jwtService.createTokenPair(account);

      // Check if merchant has stores
      let redirectTo = ROLE_HOME[account.role] ?? '/dashboard';

      if (account.role === 'Merchant') {
        const storeCount = await Store.countDocuments({ merchant_id: account._id });
        if (storeCount === 0) {
          redirectTo = '/stores/create';
        }
      }

      return Response.json(
        {
          success: true,
          message: 'Login successful',
          ...tokens,
          account: {
            id: account._id,
            email: account.email,
            phone: account.phone,
            role: account.role,
            status: account.status,
            firstName: account.firstName,
            lastName: account.lastName,
          },
          redirectTo,
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error('OTP Verification Error:', err);

    if (err.message.includes('Invalid OTP') || err.message.includes('expired')) {
      return Response.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }

    if (err.message.includes('Maximum attempts')) {
      return Response.json(
        { success: false, error: err.message },
        { status: 429 }
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
