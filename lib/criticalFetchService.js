/**
 * Critical-first fetch service — load critical APIs first, then non-critical in background
 * Uses sessionStorage caching to survive page refreshes
 */

import { dashboardCache } from './dashboardCache';

export const criticalFetchService = {
  /**
   * Fetch critical APIs first, return data, then fetch non-critical in background
   * @param {string} pageKey - Cache key prefix (e.g., 'campaigns-list', 'campaign-detail')
   * @param {Array} criticalAPIs - [{key: 'data-key', url: '/api/...', options?: {...}}]
   * @param {Array} nonCriticalAPIs - Same format as criticalAPIs
   * @returns {Promise<{critical: {...}, nonCritical: {...}}>}
   */
  async fetchCriticalFirst(pageKey, criticalAPIs = [], nonCriticalAPIs = []) {
    const cacheKey = `${pageKey}__data`;
    const cached = dashboardCache.get(cacheKey);
    const isStale = dashboardCache.isStale(cacheKey);

    // If cache exists and not stale, return cached + fetch fresh in background
    if (cached && !isStale) {
      this._fetchNonCriticalBg(pageKey, nonCriticalAPIs);
      return cached.data;
    }

    // Cache is stale/empty: fetch critical first
    const criticalData = await this._fetchBatch(criticalAPIs);

    // Store critical data immediately
    const result = { critical: criticalData, nonCritical: {} };
    dashboardCache.set(cacheKey, result);

    // Fetch non-critical in background
    this._fetchNonCriticalBg(pageKey, nonCriticalAPIs);

    return result;
  },

  /**
   * Fetch non-critical APIs in background, update cache when ready
   * Fire-and-forget pattern — errors are logged but don't affect UI
   */
  async _fetchNonCriticalBg(pageKey, nonCriticalAPIs) {
    if (!nonCriticalAPIs.length) return;

    try {
      const nonCriticalData = await this._fetchBatch(nonCriticalAPIs);
      const cacheKey = `${pageKey}__data`;
      const cached = dashboardCache.get(cacheKey);

      if (cached) {
        cached.data.nonCritical = nonCriticalData;
        dashboardCache.set(cacheKey, cached.data);
      }
    } catch (err) {
      console.warn(`[criticalFetch] Non-critical APIs failed for ${pageKey}:`, err);
      // Don't throw — UI is already showing with critical data
    }
  },

  /**
   * Fetch multiple APIs in parallel
   * @param {Array} apis - [{key: 'name', url: '/api/...', options?: {...}}]
   * @returns {Promise<{[key]: data}>}
   */
  async _fetchBatch(apis) {
    if (!apis.length) return {};

    const requests = apis.map(({ key, url, options = {} }) =>
      fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options
      })
        .then(r => r.json())
        .then(data => ({ key, data }))
        .catch(err => {
          console.error(`[criticalFetch] API failed: ${key}`, err);
          return { key, data: null, error: err.message };
        })
    );

    const results = await Promise.all(requests);
    const batch = {};
    results.forEach(({ key, data }) => {
      batch[key] = data;
    });
    return batch;
  },

  /**
   * Clear specific page cache
   */
  clearPageCache(pageKey) {
    const cacheKey = `${pageKey}__data`;
    dashboardCache.clearKey(cacheKey);
  },
};
