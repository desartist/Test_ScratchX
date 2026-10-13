// Which stores a Lucky Draw can use. No server-only imports: the create wizard runs the same checks as the API.

/** True when the store has a map location, which QR entries need for the "you are at the store" check. */
export function storeHasLocation(store) {
  const { latitude, longitude } = store || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return !(latitude === 0 && longitude === 0);
}

/** Why these active stores cannot run this kind of draw, or null when they can. */
export function storeProblem(drawType, stores) {
  if (!Array.isArray(stores) || stores.length === 0) return 'You have no active stores. Add a store first.';
  if (drawType === 'digital' && !stores.some(storeHasLocation)) {
    return 'Customers can only scan in at a store with a location. Add a location to one of your stores first.';
  }
  return null;
}
