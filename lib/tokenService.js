// Token persistence service with SSR-safe localStorage access
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'scratchx_access_token',
  REFRESH_TOKEN: 'scratchx_refresh_token',
};

// SSR-safe check for window object
const isClient = typeof window !== 'undefined';

export const tokenService = {
  setAccessToken: (token) => {
    if (isClient) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
    }
  },

  getAccessToken: () => {
    if (isClient) {
      return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    }
    return null;
  },

  setRefreshToken: (token) => {
    if (isClient) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
    }
  },

  getRefreshToken: () => {
    if (isClient) {
      return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    }
    return null;
  },

  clearTokens: () => {
    if (isClient) {
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
    }
  },

  hasTokens: () => {
    if (!isClient) {
      return false;
    }
    return !!(
      localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN) &&
      localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
    );
  },
};
