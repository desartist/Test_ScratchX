import { tokenService } from './tokenService';

// In the browser, use relative URLs so the app works on any domain.
// On the server (SSR), fall back to the explicit env var.
const API_BASE_URL =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
const AUTH_LOGIN_ROUTE = '/auth/login';

// Helper function to handle fetch requests (body must already be a JSON string or null)
async function performFetch(endpoint, { method = 'GET', headers = {}, body = null, credentials } = {}) {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ?? undefined,
    credentials: credentials ?? 'same-origin',
  });
}

// Fetch-based API client with automatic token refresh on 401
export const apiClient = {
  async request(url, options = {}) {
    const { method = 'GET', body = null, headers = {}, skipAuthRedirect = false } = options;
    const accessToken = tokenService.getAccessToken();

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    let response = await performFetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : null,
      credentials: options.credentials,
    });

    // Handle 401 Unauthorized - attempt token refresh
    // Skip this logic for auth endpoints (login/signup) that legitimately return 401
    if (response.status === 401 && !skipAuthRedirect) {
      const refreshToken = tokenService.getRefreshToken();

      if (refreshToken) {
        try {
          const refreshResponse = await fetch(
            `${API_BASE_URL}/api/auth/refresh`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            }
          );

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            tokenService.setAccessToken(refreshData.accessToken);

            // Retry original request with new token
            const retryHeaders = {
              'Content-Type': 'application/json',
              ...headers,
              Authorization: `Bearer ${refreshData.accessToken}`,
            };

            response = await performFetch(url, {
              method,
              headers: retryHeaders,
              body: body ? JSON.stringify(body) : null,
              credentials: options.credentials,
            });
          } else {
            // Refresh failed - clear tokens and redirect
            tokenService.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = AUTH_LOGIN_ROUTE;
            }
          }
        } catch (error) {
          // Error during refresh - clear tokens and redirect
          tokenService.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = AUTH_LOGIN_ROUTE;
          }
        }
      } else {
        // No refresh token - redirect to login
        tokenService.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = AUTH_LOGIN_ROUTE;
        }
      }
    }

    return response;
  },

  post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  },

  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },

  put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  },

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  },
};
