/**
 * Critical Fetch Service
 * Wrapper for critical API calls with error handling
 */

export const criticalFetchService = {
  async fetch(url, options = {}) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Critical fetch error:', error);
      throw error;
    }
  },

  async get(url) {
    return this.fetch(url, { method: 'GET' });
  },

  async post(url, data) {
    return this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async put(url, data) {
    return this.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async delete(url) {
    return this.fetch(url, { method: 'DELETE' });
  },
};
