import { calculateDistance } from '@/lib/utils/geoUtils';

describe('LocationVerificationService', () => {
  test('calculateDistance returns correct distance between two points', () => {
    // Mumbai to Pune (approx 120 km)
    const lat1 = 19.0760;
    const lon1 = 72.8777;
    const lat2 = 18.5204;
    const lon2 = 73.8567;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    // Should be approximately 120 km = 120000 meters (±5%)
    expect(distance).toBeGreaterThan(114000);
    expect(distance).toBeLessThan(126000);
  });

  test('calculateDistance returns 0 for same point', () => {
    const distance = calculateDistance(19.0760, 72.8777, 19.0760, 72.8777);
    expect(distance).toBeLessThan(1);
  });
});
