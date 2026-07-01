import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import jwtService from '@/lib/jwtService';
import tokenBlacklist from '@/lib/tokenBlacklist';

export async function POST(request) {
  try {
    await connectDB();

    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return Response.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwtService.verifyRefreshToken(refreshToken);
    } catch (err) {
      return Response.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      return Response.json(
        { success: false, error: 'Token has been revoked. Please login again.' },
        { status: 401 }
      );
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      return Response.json(
        { success: false, error: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Fetch account
    const account = await Account.findById(decoded.accountId);

    if (!account) {
      return Response.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check account status
    if (account.status === 'suspended' || account.status === 'deactivated') {
      return Response.json(
        { success: false, error: 'Your account is not active' },
        { status: 403 }
      );
    }

    // Create new token pair
    const tokens = jwtService.createTokenPair(account);

    return Response.json(
      {
        success: true,
        ...tokens,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Token Refresh Error:', err);

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
