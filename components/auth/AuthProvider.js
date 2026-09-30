'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from './AuthContext';
import { tokenService } from '@/lib/tokenService';
import { authService } from '@/lib/authService';
import { dashboardCache } from '@/lib/dashboardCache';
import { dashboardForRole } from '@/lib/permissions';

// Public, unauthenticated customer-facing routes (QR scan, scratch card
// reveal, coupon view). These pages never call useAuthContext() and have no
// concept of a logged-in merchant/distributor session. Running session
// validation here was actively harmful: a customer scanning a QR code on a
// device/browser that happens to have a stale merchant login token (e.g. the
// merchant's own phone, or a shared device) would get force-logged-out and
// redirected to /auth/login mid-flow, repeatedly, since every redirect
// remounts the app and re-triggers the same check.
const PUBLIC_CUSTOMER_ROUTE_PREFIXES = ['/scan', '/customer', '/coupon'];

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicCustomerRoute = PUBLIC_CUSTOMER_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(p + '/'),
  );
  const [account, setAccount] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAccount = useCallback(async () => {
    const profile = await authService.getMe();
    if (profile) {
      setAccount(profile);
      return profile;
    }

    tokenService.clearTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setAccount(null);
    return null;
  }, []);

  const forceLogout = useCallback(async () => {
    tokenService.clearTokens();
    setAccount(null);
    setAccessToken(null);
    setRefreshToken(null);
    // Clear the authToken cookie (set by Google OAuth) to prevent middleware redirect loops
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore — clearing the cookie is best-effort; we still redirect
    }
    router.push('/auth/login');
  }, [router]);

  // Keep a ref so initializeAuth (which runs once) always calls the latest forceLogout.
  const forceLogoutRef = useRef(forceLogout);
  forceLogoutRef.current = forceLogout;

  useEffect(() => {
    if (isPublicCustomerRoute) {
      setIsLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const storedAccessToken = tokenService.getAccessToken();
        const storedRefreshToken = tokenService.getRefreshToken();
        const hadStoredTokens = Boolean(storedAccessToken || storedRefreshToken);

        if (storedAccessToken && storedRefreshToken) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
        }

        const profile = await authService.getMe();
        if (!profile) {
          // Only force logout if there were stored tokens that are now invalid.
          // Fresh unauthenticated visits (login page) should do nothing.
          if (hadStoredTokens) {
            forceLogoutRef.current();
          }
          return;
        }
        setAccount(profile);
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAuthResult = async (userData, newAccessToken, newRefreshToken) => {
    tokenService.setAccessToken(newAccessToken);
    tokenService.setRefreshToken(newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    const profile = await refreshAccount();
    setAccount(profile ?? userData);
  };

  /**
   * @returns {Promise<boolean>} true once navigation to the dashboard has
   *   started — the caller should keep its "Signing in…" state (the page is
   *   about to change); false on failure (the error is in `error`).
   */
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        account: userData,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        redirectTo,
      } = await authService.passwordLogin(email, password);

      tokenService.setAccessToken(newAccessToken);
      tokenService.setRefreshToken(newRefreshToken);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      // The login response already carries what the dashboard shell needs
      // (id, name, role, createdAt). The full profile (photo, etc.) from
      // /api/auth/me fills in behind it — it used to be awaited here, which
      // put one more sequential round trip between "Sign In" and the page.
      setAccount(userData);
      refreshAccount().catch(() => {});

      // Go straight to the role's own dashboard. /dashboard only redirects
      // there (in middleware), so pushing it cost an extra request. Keep any
      // other explicit destination the API asks for.
      const target =
        redirectTo && redirectTo !== '/dashboard'
          ? redirectTo
          : dashboardForRole(userData?.role) || '/dashboard';
      // replace, not push — Back from the dashboard shouldn't land on login.
      router.replace(target);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        account: userData,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        redirectTo,
      } = await authService.passwordSignup(data);

      await applyAuthResult(userData, newAccessToken, newRefreshToken);
      router.push(redirectTo || '/dashboard');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.sendOTP(phone);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (phone, code) => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        account: userData,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        redirectTo,
      } = await authService.verifyOTP(phone, code);

      await applyAuthResult(userData, newAccessToken, newRefreshToken);
      router.push(redirectTo || '/dashboard');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email) => {
    setIsLoading(true);
    setError(null);

    try {
      return await authService.requestPasswordReset(email);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, newPassword);
      router.push('/auth/login');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Always call logout with credentials:include so the authToken cookie
      // (set by Google OAuth) is sent and cleared server-side regardless of
      // which login method was used.
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
      });

      dashboardCache.clear();
      tokenService.clearTokens();
      setAccount(null);
      setAccessToken(null);
      setRefreshToken(null);
      router.push('/auth/login');
    } catch (err) {
      // Even if the API call fails, clear client-side state and redirect
      dashboardCache.clear();
      tokenService.clearTokens();
      setAccount(null);
      setAccessToken(null);
      setRefreshToken(null);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const isAuthenticated = Boolean(account);

  const value = {
    account,
    accessToken,
    refreshToken,
    isLoading,
    error,
    isAuthenticated,
    refreshAccount,
    login,
    signup,
    sendOTP,
    verifyOTP,
    requestPasswordReset,
    resetPassword,
    logout,
    forceLogout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
