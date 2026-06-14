import jwtService from '@/lib/jwtService';
import Account from '@/models/accountModel';
import { connectDB } from '@/lib/connectDB';
import tokenBlacklist from '@/lib/tokenBlacklist';

/**
 * Extract and validate JWT token from Authorization header
 * Usage in API routes:
 *   const { account, error } = await authMiddleware(request);
 *   if (error) return error;
 */
export async function authMiddleware(request) {
  try {
    await connectDB();

    // Extract token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header',
          },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    let decoded;
    try {
      decoded = jwtService.verifyAccessToken(token);
    } catch (err) {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Token validation failed',
          },
          { status: 401 }
        ),
      };
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Token has been revoked. Please login again.',
          },
          { status: 401 }
        ),
      };
    }

    // Check token type
    if (decoded.type !== 'access') {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Invalid token type',
          },
          { status: 401 }
        ),
      };
    }

    // Fetch fresh account data
    const account = await Account.findById(decoded.accountId);

    if (!account) {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Account not found',
          },
          { status: 404 }
        ),
      };
    }

    // Check account status
    if (account.status === 'suspended' || account.status === 'deactivated') {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Your account is not active',
          },
          { status: 403 }
        ),
      };
    }

    if (account.status === 'pending') {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Your account is pending',
          },
          { status: 403 }
        ),
      };
    }

    return {
      account: account.toObject(),
      error: null,
    };
  } catch (err) {
    console.error('Auth Middleware Error:', err);

    return {
      account: null,
      error: Response.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Auth check failed',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Convenience wrapper for API routes requiring authentication
 * Usage:
 *   const { account, error } = await requireAuth(request, ['Admin', 'Manager']);
 *   if (error) return error;
 */
export async function requireAuth(request, allowedRoles = null) {
  const { account, error } = await authMiddleware(request);

  if (error) {
    return { account: null, error };
  }

  // Check role if specified
  if (allowedRoles && Array.isArray(allowedRoles)) {
    if (!allowedRoles.includes(account.role)) {
      return {
        account: null,
        error: Response.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Insufficient permissions',
          },
          { status: 403 }
        ),
      };
    }
  }

  return { account, error: null };
}
