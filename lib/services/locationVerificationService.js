import Store from '@/models/storeModel';
import Campaign from '@/models/campaignModel';
import { calculateDistance } from '@/lib/utils/geoUtils';

const ALLOWED_RADIUS_METERS = 2000; // 2 km

/**
 * Verify if customer is within allowed distance from store
 * Uses Haversine formula to calculate distance
 */
export async function verifyCustomerLocation(
  storeId,
  customerLatitude,
  customerLongitude
) {
  try {
    // Fetch store location
    const store = await Store.findById(storeId);
    if (!store) {
      return {
        verified: false,
        error: 'Store not found',
        distance: 0
      };
    }

    // Check if store has location coordinates
    if (!store.location?.coordinates || store.location.coordinates.length !== 2) {
      return {
        verified: false,
        error: 'Store location not configured',
        distance: 0
      };
    }

    // Extract store coordinates [longitude, latitude]
    const [storeLongitude, storeLatitude] = store.location.coordinates;

    // Calculate distance using Haversine formula
    const distanceMeters = calculateDistance(
      customerLatitude,
      customerLongitude,
      storeLatitude,
      storeLongitude
    );

    // Check if within allowed radius
    const verified = distanceMeters <= ALLOWED_RADIUS_METERS;

    return {
      verified,
      distance: Math.round(distanceMeters),
      storeLatitude,
      storeLongitude,
      allowedRadius: ALLOWED_RADIUS_METERS,
      message: verified
        ? `You are ${Math.round(distanceMeters)} meters away from the store`
        : `This QR code is not valid at your current location. Please visit the participating store. (${Math.round(distanceMeters)} meters away)`
    };
  } catch (error) {
    console.error('Error verifying location:', error);
    return {
      verified: false,
      error: error.message,
      distance: 0
    };
  }
}

/**
 * Verify customer location against campaign store snapshots (NEW)
 * Uses historical store location data from campaign.assignedStores snapshots
 * This ensures QR validation works with store location at time of campaign assignment
 *
 * @param campaignId - Campaign ID containing store snapshots
 * @param storesList - Array of store snapshots from campaign.assignedStores
 * @param customerLatitude - Customer's current latitude
 * @param customerLongitude - Customer's current longitude
 * @returns Verification result with distance and status (checks all stores, returns closest)
 */
export async function verifyCustomerLocationWithSnapshot(
  campaignId,
  storesList,
  customerLatitude,
  customerLongitude
) {
  try {
    // Validate input
    if (!storesList || !Array.isArray(storesList) || storesList.length === 0) {
      return {
        verified: false,
        error: 'No stores provided for verification',
        distance: 0
      };
    }

    // Fetch campaign to get full snapshot data if needed
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return {
        verified: false,
        error: 'Campaign not found',
        distance: 0
      };
    }

    // Filter active stores from campaign snapshots
    const activeStores = campaign.assignedStores?.filter(s => s.status === 'active') || [];

    if (activeStores.length === 0) {
      return {
        verified: false,
        error: 'No stores assigned to this campaign',
        distance: 0,
        allowedRadius: ALLOWED_RADIUS_METERS,
        message: 'No active stores assigned to this campaign'
      };
    }

    // Calculate distance to each store and find the closest one
    let closestStore = null;
    let closestDistance = Infinity;

    for (const storeSnapshot of activeStores) {
      // Check if snapshot has location coordinates
      if (!storeSnapshot.latitude || !storeSnapshot.longitude) {
        continue;
      }

      // Calculate distance using Haversine formula
      const distanceMeters = calculateDistance(
        customerLatitude,
        customerLongitude,
        storeSnapshot.latitude,
        storeSnapshot.longitude
      );

      // Track closest store
      if (distanceMeters < closestDistance) {
        closestDistance = distanceMeters;
        closestStore = storeSnapshot;
      }
    }

    // Check if we found a valid store with location data
    if (!closestStore) {
      return {
        verified: false,
        error: 'Store location data is not available. Please contact the merchant to assign store location.',
        distance: 0,
        allowedRadius: ALLOWED_RADIUS_METERS,  // Include allowedRadius even in error case
        message: 'Store location data is not available in campaign snapshots'
      };
    }

    // Check if customer is within allowed radius of closest store
    const verified = closestDistance <= ALLOWED_RADIUS_METERS;

    return {
      verified,
      distance: Math.round(closestDistance),
      storeLatitude: closestStore.latitude,
      storeLongitude: closestStore.longitude,
      allowedRadius: ALLOWED_RADIUS_METERS,
      storeName: closestStore.storeName,
      storeId: closestStore.storeId,
      // Note: Using snapshot location captured at assignment time (closest store)
      message: verified
        ? `You are ${Math.round(closestDistance)} meters away from ${closestStore.storeName}`
        : `This QR code is not valid at your current location. Please visit the participating store. (${Math.round(closestDistance)} meters away from ${closestStore.storeName})`,
      snapshotUsed: true, // Flag indicating snapshot-based validation
      closestStoreName: closestStore.storeName
    };
  } catch (error) {
    console.error('Error verifying location with snapshot:', error);
    return {
      verified: false,
      error: error.message,
      distance: 0
    };
  }
}

/**
 * Get nearby stores using geospatial query
 * Returns stores within specified distance
 */
export async function getNearbyStores(
  customerLatitude,
  customerLongitude,
  radiusMeters = 5000
) {
  try {
    const stores = await Store.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [customerLongitude, customerLatitude]
          },
          $maxDistance: radiusMeters
        }
      }
    });

    return stores;
  } catch (error) {
    console.error('Error finding nearby stores:', error);
    return [];
  }
}
