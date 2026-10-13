import { calculateDistance } from '@/lib/utils/geoUtils';
import { storeHasLocation } from '@/lib/luckyDraw/storeRules';

/** Closest active store with a location to the customer, with the distance in whole meters. */
export function findNearestStore(stores, latitude, longitude) {
  let best = null;
  for (const store of stores) {
    if (store.status !== 'active' || !storeHasLocation(store)) continue;
    const distance = calculateDistance(latitude, longitude, store.latitude, store.longitude);
    if (!best || distance < best.distance) best = { store, distance };
  }
  return best ? { store: best.store, distance: Math.round(best.distance) } : null;
}
