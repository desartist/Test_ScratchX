/**
 * Distance Calculation Utility
 * Uses Haversine formula to calculate distance between two coordinates
 * All distances returned in meters
 */

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param {number} lat1 - Customer latitude
 * @param {number} lon1 - Customer longitude
 * @param {number} lat2 - Store latitude
 * @param {number} lon2 - Store longitude
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    throw new Error('All coordinates must be numbers');
  }

  // Validate coordinate ranges
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return distance;
}

/**
 * Find nearest store from a list of stores
 * @param {number} customerLat - Customer latitude
 * @param {number} customerLon - Customer longitude
 * @param {Array} storesList - Array of stores with latitude and longitude
 * @returns {Object} { nearestStore, distance } or null if no valid stores
 */
export function findNearestStore(customerLat, customerLon, storesList) {
  if (!Array.isArray(storesList) || storesList.length === 0) {
    return null;
  }

  let nearestStore = null;
  let minDistance = Infinity;

  for (const store of storesList) {
    if (!store.latitude || !store.longitude) {
      console.warn(`⚠️ Store ${store.storeId} missing location coordinates`);
      continue;
    }

    try {
      const distance = calculateDistance(
        customerLat,
        customerLon,
        store.latitude,
        store.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    } catch (err) {
      console.error(`Error calculating distance for store ${store.storeId}:`, err.message);
      continue;
    }
  }

  if (nearestStore) {
    return {
      store: nearestStore,
      distance: Math.round(minDistance), // Round to nearest meter
    };
  }

  return null;
}

/**
 * Validate if customer is within allowed radius of any store
 * @param {number} customerLat - Customer latitude
 * @param {number} customerLon - Customer longitude
 * @param {Array} storesList - Array of stores
 * @param {number} allowedRadiusMeters - Allowed radius in meters (default: 100m)
 * @returns {Object} { isValid, matchedStore, distance }
 */
export function validateCustomerLocation(
  customerLat,
  customerLon,
  storesList,
  allowedRadiusMeters = 100
) {
  // Validate inputs
  if (
    typeof customerLat !== 'number' ||
    typeof customerLon !== 'number'
  ) {
    return {
      isValid: false,
      matchedStore: null,
      distance: null,
      error: 'Invalid customer coordinates',
    };
  }

  if (!Array.isArray(storesList) || storesList.length === 0) {
    return {
      isValid: false,
      matchedStore: null,
      distance: null,
      error: 'No stores provided for validation',
    };
  }

  // Validate that stores have coordinates
  const storesWithCoordinates = storesList.filter((s) => s.latitude && s.longitude);

  if (storesWithCoordinates.length === 0) {
    console.error('❌ No stores with valid coordinates found:', storesList);
    return {
      isValid: false,
      matchedStore: null,
      distance: null,
      error: 'No stores with valid location coordinates found. Please ensure all stores have latitude and longitude values.',
      debugInfo: {
        totalStores: storesList.length,
        storesWithCoordinates: 0,
        stores: storesList.map((s) => ({
          storeId: s.storeId,
          storeName: s.storeName,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      },
    };
  }

  // Find nearest store (use filtered list)
  const result = findNearestStore(customerLat, customerLon, storesWithCoordinates);

  if (!result) {
    return {
      isValid: false,
      matchedStore: null,
      distance: null,
      error: 'Could not calculate distance to any store',
    };
  }

  // Check if within allowed radius
  const isValid = result.distance <= allowedRadiusMeters;

  // Log all store distances for debugging
  const allDistances = storesWithCoordinates.map((store) => {
    try {
      const dist = calculateDistance(customerLat, customerLon, store.latitude, store.longitude);
      return {
        storeName: store.storeName,
        distance: Math.round(dist),
        withinRadius: dist <= allowedRadiusMeters,
      };
    } catch (err) {
      return {
        storeName: store.storeName,
        distance: null,
        error: err.message,
      };
    }
  });

  console.log('📊 All store distances:', allDistances);

  return {
    isValid,
    matchedStore: result.store,
    distance: result.distance,
    allowedRadius: allowedRadiusMeters,
    allDistances: allDistances, // Include for debugging
  };
}

export default {
  calculateDistance,
  findNearestStore,
  validateCustomerLocation,
  EARTH_RADIUS_METERS,
};
