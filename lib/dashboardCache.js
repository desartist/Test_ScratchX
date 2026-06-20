/**
 * In-memory cache for dashboard data.
 * Lives for the browser session — survives route changes, cleared on logout.
 * TTL: 60 seconds. After that, a background refresh runs while stale data
 * is shown immediately (stale-while-revalidate pattern).
 */

const CACHE_TTL = 60_000; // 60 seconds

const store = {};

export const dashboardCache = {
  get(key) {
    const entry = store[key];
    if (!entry) return null;
    return entry;
  },

  set(key, data) {
    store[key] = { data, ts: Date.now() };
  },

  isStale(key) {
    const entry = store[key];
    if (!entry) return true;
    return Date.now() - entry.ts > CACHE_TTL;
  },

  clear() {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
