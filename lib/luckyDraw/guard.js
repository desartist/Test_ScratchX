import { LUCKY_DRAW_ENABLED } from '@/lib/featureFlags';

/**
 * Returns a 404 Response while the Lucky Draw feature flag is off, otherwise
 * null. Every Lucky Draw route handler calls this first.
 */
export function luckyDrawDisabledResponse() {
  if (LUCKY_DRAW_ENABLED) return null;
  return Response.json(
    { success: false, error: 'Not found', data: null },
    { status: 404 },
  );
}
