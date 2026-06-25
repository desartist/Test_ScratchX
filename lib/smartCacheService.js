/**
 * SmartCacheService - Advanced caching for all CRUD operations
 *
 * Features:
 * - Instant UI updates with optimistic updates
 * - Smart cache invalidation
 * - Background data refresh
 * - Automatic cache expiry
 * - CRUD operation support (CREATE, READ, UPDATE, DELETE)
 */

import { dashboardCache } from './dashboardCache';

const CACHE_TTL = 60_000; // 60 seconds

class SmartCacheService {
  /**
   * Cache a list of items with optimistic updates
   * @param {string} cacheKey - Cache key (e.g., 'campaigns-list')
   * @param {Array} items - Array of items to cache
   * @returns {void}
   */
  cacheList(cacheKey, items) {
    dashboardCache.set(cacheKey, {
      success: true,
      data: items,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached list data
   * @param {string} cacheKey - Cache key
   * @returns {Array|null} Cached items or null
   */
  getCachedList(cacheKey) {
    const cached = dashboardCache.get(cacheKey);
    return cached?.data?.data || cached?.data || null;
  }

  /**
   * CREATE operation with optimistic update
   * @param {string} cacheKey - Cache key for the list
   * @param {string} url - API endpoint
   * @param {Object} payload - Data to send
   * @param {string} userId - User ID for headers
   * @param {string} userRole - User role for headers
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async createWithCache(cacheKey, url, payload, userId, userRole, options = {}) {
    try {
      // Show optimistic UI update immediately
      const cachedList = this.getCachedList(cacheKey);
      const optimisticId = `optimistic_${Date.now()}`;
      const optimisticData = {
        ...payload,
        _id: optimisticId,
        isOptimistic: true,
        createdAt: new Date().toISOString(),
      };

      // Update cache with optimistic data
      if (Array.isArray(cachedList)) {
        this.cacheList(cacheKey, [optimisticData, ...cachedList]);
      }

      // Make API call
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-role': userRole || 'Merchant',
          ...options.headers,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        // Rollback optimistic update on failure
        if (Array.isArray(cachedList)) {
          this.cacheList(cacheKey, cachedList);
        }
        return {
          success: false,
          error: data?.error || data?.message || 'Operation failed',
        };
      }

      // Replace optimistic data with actual data
      if (Array.isArray(cachedList) && data?.data) {
        const updatedList = cachedList.map(item =>
          item._id === optimisticId ? data.data : item
        );
        this.cacheList(cacheKey, updatedList);
      }

      return { success: true, data: data.data };
    } catch (err) {
      console.error('Create with cache failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * UPDATE operation with optimistic update
   * @param {string} cacheKey - Cache key for the list
   * @param {string} id - Item ID to update
   * @param {string} url - API endpoint
   * @param {Object} updates - Updated data
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async updateWithCache(cacheKey, id, url, updates, userId, userRole, options = {}) {
    try {
      const cachedList = this.getCachedList(cacheKey);
      const originalItem = Array.isArray(cachedList)
        ? cachedList.find(item => item._id === id)
        : null;

      // Optimistic update
      if (Array.isArray(cachedList)) {
        const optimisticList = cachedList.map(item =>
          item._id === id ? { ...item, ...updates, isOptimistic: true } : item
        );
        this.cacheList(cacheKey, optimisticList);
      }

      // Make API call
      const res = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-role': userRole || 'Merchant',
          ...options.headers,
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        // Rollback on failure
        if (originalItem && Array.isArray(cachedList)) {
          const originalList = cachedList.map(item =>
            item._id === id ? originalItem : item
          );
          this.cacheList(cacheKey, originalList);
        }
        return {
          success: false,
          error: data?.error || data?.message || 'Update failed',
        };
      }

      // Update cache with server response
      if (data?.data && Array.isArray(cachedList)) {
        const updatedList = cachedList.map(item =>
          item._id === id ? data.data : item
        );
        this.cacheList(cacheKey, updatedList);
      }

      return { success: true, data: data.data };
    } catch (err) {
      console.error('Update with cache failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * DELETE operation with optimistic update
   * @param {string} cacheKey - Cache key for the list
   * @param {string} id - Item ID to delete
   * @param {string} url - API endpoint
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean}>}
   */
  async deleteWithCache(cacheKey, id, url, userId, userRole, options = {}) {
    try {
      const cachedList = this.getCachedList(cacheKey);
      const originalItem = Array.isArray(cachedList)
        ? cachedList.find(item => item._id === id)
        : null;

      // Optimistic delete from cache
      if (Array.isArray(cachedList)) {
        const optimisticList = cachedList.filter(item => item._id !== id);
        this.cacheList(cacheKey, optimisticList);
      }

      // Make API call
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-role': userRole || 'Merchant',
          ...options.headers,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        // Rollback on failure
        if (originalItem && Array.isArray(cachedList)) {
          const restoredList = [originalItem, ...cachedList];
          this.cacheList(cacheKey, restoredList);
        }
        return {
          success: false,
          error: data?.error || data?.message || 'Delete failed',
        };
      }

      return { success: true };
    } catch (err) {
      console.error('Delete with cache failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Invalidate cache for specific keys
   * @param {string|string[]} keys - Cache key(s) to invalidate
   */
  invalidateCache(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      dashboardCache.clearKey(`${key}__data`);
    });
  }

  /**
   * Invalidate multiple related caches
   * @param {Object} relatedCaches - Object mapping cache names to invalidate
   */
  invalidateRelated(relatedCaches = {}) {
    Object.keys(relatedCaches).forEach(key => {
      dashboardCache.clearKey(`${key}__data`);
    });
  }

  /**
   * Fetch with cache - Read operation
   * @param {string} cacheKey - Cache key
   * @param {string} url - API endpoint
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Data from cache or API
   */
  async fetchWithCache(cacheKey, url, userId, userRole, options = {}) {
    // Return cached data immediately if available
    const cached = this.getCachedList(cacheKey);
    if (cached && !dashboardCache.isStale(`${cacheKey}__data`)) {
      return cached;
    }

    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-user-id': userId || '',
          'x-user-role': userRole || 'Merchant',
          ...options.headers,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (data?.success && Array.isArray(data?.data)) {
        this.cacheList(cacheKey, data.data);
        return data.data;
      }

      return cached || [];
    } catch (err) {
      console.error('Fetch with cache failed:', err);
      return cached || [];
    }
  }

  /**
   * Clear all caches (on logout)
   */
  clearAllCaches() {
    dashboardCache.clear();
  }
}

export const smartCacheService = new SmartCacheService();
