/**
 * Dashboard Cache Service
 * Client-side caching for dashboard data
 */

const cache = new Map();

export const dashboardCache = {
  set(key, value, ttl = 5 * 60 * 1000) {
    cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  },

  get(key) {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }

    return item.value;
  },

  clear() {
    cache.clear();
  },

  remove(key) {
    cache.delete(key);
  },
};
