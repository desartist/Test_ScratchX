/**
 * Dashboard cache — in-memory + sessionStorage fallback.
 * In-memory: survives route changes within a session.
 * sessionStorage: survives page refreshes (same tab), cleared on tab close.
 * TTL: 60 seconds stale-while-revalidate.
 */

const CACHE_TTL = 60_000;
const store = {};

function ssKey(key) { return `__dx_${key}`; }

function readSS(key) {
  try {
    const raw = sessionStorage.getItem(ssKey(key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeSS(key, entry) {
  try { sessionStorage.setItem(ssKey(key), JSON.stringify(entry)); } catch { /* quota */ }
}

function removeSS(key) {
  try { sessionStorage.removeItem(ssKey(key)); } catch { /* ignore */ }
}

export const dashboardCache = {
  get(key) {
    // Memory first, then sessionStorage
    if (store[key]) return store[key];
    const ss = readSS(key);
    if (ss) { store[key] = ss; return ss; }
    return null;
  },

  set(key, data) {
    const entry = { data, ts: Date.now() };
    store[key] = entry;
    writeSS(key, entry);
  },

  isStale(key) {
    const entry = store[key] || readSS(key);
    if (!entry) return true;
    return Date.now() - entry.ts > CACHE_TTL;
  },

  clearKey(key) {
    removeSS(key);
    delete store[key];
  },

  clear() {
    Object.keys(store).forEach((k) => {
      removeSS(k);
      delete store[k];
    });
    // Also clear all __dx_ keys from sessionStorage
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('__dx_'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
  },
};
