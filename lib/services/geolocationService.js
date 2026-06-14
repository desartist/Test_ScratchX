/**
 * Geolocation Service
 * Resolves IP addresses to geographic locations
 * For development: simple IP-based detection
 * For production: integrate with IP geolocation API (MaxMind, IP2Location, etc.)
 */

/**
 * Get location from IP address
 * @param {string} ip - IP address
 * @returns {string} Location (city, country)
 */
export async function getLocationFromIP(ip) {
  // Local development detection
  if (!ip || ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
    return "Local Development";
  }

  // Remove port if present
  const ipAddress = ip.split(":")[0];

  // For production, integrate with a real geolocation service
  // Example: MaxMind GeoIP2, IP2Location, or similar
  // For now, return the IP as fallback

  try {
    // This is a placeholder - in production, call your geolocation API
    // Example using ip-api.com (free tier available):
    // const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=city,country`);
    // const data = await response.json();
    // return `${data.city}, ${data.country}`;

    // For development, provide a sensible default
    return "India"; // Default location for Indian users
  } catch (error) {
    console.error("Geolocation lookup error:", error);
    return "Unknown Location";
  }
}

/**
 * Alternative: Batch geolocation lookup if you have multiple sessions
 */
export async function getLocationsFromIPs(ips) {
  return Promise.all(ips.map(ip => getLocationFromIP(ip)));
}
