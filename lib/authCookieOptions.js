/**
 * Options for the login cookies (authToken, sessionId, accountRole) and the
 * middleware gate flags (merchantHasStore, merchantHasSub) — one place, so
 * every login path sets them the same way.
 *
 * sameSite is 'lax', not 'strict'. With 'strict' (which production used)
 * the browser drops these cookies on the first request whenever the user
 * ARRIVES from somewhere else — a link in WhatsApp/Gmail, a home-screen
 * shortcut, the redirect back from Google sign-in — so a still-valid login
 * landed on the login page. 'lax' sends them on those top-level GET
 * navigations while still withholding them from cross-site POSTs, iframes
 * and background requests (the CSRF cases).
 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, matches the Session TTL

export function authCookieOptions({ httpOnly = true } = {}) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  };
}
