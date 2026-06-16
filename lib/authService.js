import { apiClient } from './apiClient';

// Service layer for auth API calls
export const authService = {
  async getMe() {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (response.status === 401) {
      // Session cookie exists but is invalid/expired — clear server-side cookie
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      } catch (_) {}
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    return data.account ?? null;
  },

  async passwordLogin(email, password) {
    const response = await apiClient.post(
      '/api/auth/password-login',
      { email, password },
      { credentials: 'include' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Login failed');
    }

    return response.json();
  },

  async passwordSignup(data) {
    const signupData = {
      ...data,
      role: data.role || 'Merchant',
    };

    const response = await apiClient.post('/api/auth/password-signup', signupData, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Signup failed');
    }

    return response.json();
  },

  async sendOTP(phone) {
    const response = await apiClient.post('/api/auth/otp-send', {
      phone,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to send OTP');
    }

    return response.json();
  },

  async verifyOTP(phone, code) {
    const response = await apiClient.post(
      '/api/auth/otp-verify',
      { phone, code },
      { credentials: 'include' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'OTP verification failed');
    }

    return response.json();
  },

  async requestPasswordReset(email) {
    const response = await apiClient.post('/api/auth/password-reset-request', {
      email,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Password reset request failed');
    }

    return response.json();
  },

  async resetPassword(token, newPassword) {
    const response = await apiClient.post('/api/auth/password-reset', {
      token,
      newPassword,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Password reset failed');
    }

    return response.json();
  },

  async logout(accessToken, refreshToken) {
    try {
      await apiClient.post('/api/auth/logout', {
        accessToken,
        refreshToken,
      });
    } catch (error) {
      // Log error but don't throw - logout should always succeed on client
      console.error('Logout error:', error);
    }
  },

  async initiateGoogleAuth() {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
  },
};
