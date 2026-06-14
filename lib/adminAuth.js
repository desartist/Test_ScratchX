/**
 * Admin Authentication
 *
 * Middleware to verify admin role and permissions
 */

import { getLoginToken } from './auth';

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const authToken = await getLoginToken();

  if (!authToken) {
    return false;
  }

  // Check if user has admin role
  return (
    authToken.role === 'Super_Admin' ||
    authToken.role === 'Admin' ||
    authToken.isAdmin === true
  );
}

/**
 * Verify admin access
 * Throws error if user is not admin
 */
export async function requireAdmin() {
  const admin = await isAdmin();

  if (!admin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const authToken = await getLoginToken();
  return authToken;
}

/**
 * Admin middleware for API routes
 */
export async function withAdminAuth(handler) {
  return async (request) => {
    try {
      await requireAdmin();
      return handler(request);
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

export default {
  isAdmin,
  requireAdmin,
  withAdminAuth,
};
