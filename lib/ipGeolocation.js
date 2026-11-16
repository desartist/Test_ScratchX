/**
 * Approximate customer location from the request's IP address — no browser
 * permission popup. Vercel adds these headers to every request on its edge
 * (https://vercel.com/docs/headers/request-headers#x-vercel-ip-latitude).
 *
 * Accuracy is roughly city-level (often a few km off, sometimes the mobile
 * network's city): good for "which area do scans come from", NOT for
 * "is the customer inside the store". Returns null when the headers are
 * missing (local development, non-Vercel hosting) or unusable.
 *
 * @param {Request} request
 * @returns {{ latitude: number, longitude: number, city: string|null,
 *             region: string|null, country: string|null } | null}
 */
export function ipLocationFromRequest(request) {
  const get = (name) => {
    const v = request?.headers?.get?.(name);
    if (!v) return null;
    try {
      return decodeURIComponent(v); // the city header is URI-encoded
    } catch {
      return v;
    }
  };
  const latitude = Number.parseFloat(get("x-vercel-ip-latitude"));
  const longitude = Number.parseFloat(get("x-vercel-ip-longitude"));
  if (
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    city: get("x-vercel-ip-city"),
    region: get("x-vercel-ip-country-region"),
    country: get("x-vercel-ip-country"),
  };
}

/** "Gurugram, HR, IN" from whatever parts are known (null if none). */
export function ipLocationLabel(loc) {
  if (!loc) return null;
  const label = [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
  return label || null;
}
