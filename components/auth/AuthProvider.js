'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './AuthContext';
import { tokenService } from '@/lib/tokenService';
import { authService } from '@/lib/authService';

export function AuthProvider({ children }) {
  const router = useRouter();
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken = tokenService.getAccessToken();
        const storedRefreshToken = tokenService.getRefreshToken();

        if (storedAccessToken && storedRefreshToken) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
        }

        await refreshAccount();
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshAccount]);

  const applyAuthResult = async (userData, newAccessToken, newRefreshToken) => {
    tokenService.setAccessToken(newAccessToken);
    tokenService.setRefreshToken(newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    const profile = await refreshAccount();
    setAccount(profile ?? userData);
  };

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

      await applyAuthResult(userData, newAccessToken, newRefreshToken);
      router.push(redirectTo || '/dashboard');
    } catch (err) {
      setError(err.message);
      throw err;
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
      await authService.requestPasswordReset(email);
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
      if (accessToken && refreshToken) {
        await authService.logout(accessToken, refreshToken);
      } else {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      tokenService.clearTokens();
      setAccount(null);
      setAccessToken(null);
      setRefreshToken(null);
      router.push('/auth/login');
    } catch (err) {
      setError(err.message);
      throw err;
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
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
