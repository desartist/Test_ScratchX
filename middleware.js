import { NextResponse } from "next/server";
import { dashboardForRole } from "@/lib/permissions";

const LOGIN_PATH = "/auth/login";

// Cookies cleared when a session is rejected, so a stale or forged token
// doesn't keep getting resent on every subsequent request.
const AUTH_COOKIES = [
  'authToken',
  'refreshToken',
  'sessionId',
  'accountId',
  'accountRole',
  'userEmail',
  'merchantHasStore',
  'merchantHasSub',
];

/**
 * The authToken cookie is HMAC-SHA256(COOKIE_SECRET, sessionId), minted at
 * login (lib/setAuthSession.js). Middleware runs on the Edge runtime, so this
 * uses Web Crypto rather than node:crypto — but it must produce the exact same
 * hex digest that lib/auth.js verifies server-side.
 *
 * This is a signature check only. Middleware cannot reach the database, so it
 * cannot know whether the session is still active or the account still exists;
 * that remains the job of requireAuth()/getLoginToken() in the API routes and
 * the dashboard layout. The point here is that a fabricated cookie no longer
 * buys an attacker a rendered dashboard shell.
 */
async function isValidAuthToken(token, sessionId) {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || !token || !sessionId) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sessionId));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison.
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function clearAuthCookies(response) {
  for (const name of AUTH_COOKIES) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' });
  }
  return response;
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Build request headers once — always include x-pathname so server
  // components (layouts) can read the current path without JS.
  //
  // Deliberately does NOT forward x-user-id / x-user-role / x-user-email.
  // Those were derived from the accountRole/accountId cookies, which are not
  // httpOnly and so are attacker-controlled; forwarding them as if they were
  // authoritative is what let a forged header act as another account. Every
  // route now derives identity from requireAuth() instead.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const authTokenCookie  = request.cookies.get('authToken')?.value;
  const sessionId        = request.cookies.get('sessionId')?.value;
  const role             = request.cookies.get('accountRole')?.value;
  const merchantHasStore = request.cookies.get('merchantHasStore')?.value;
  const merchantHasSub   = request.cookies.get('merchantHasSub')?.value;

  const withHeaders = { request: { headers: requestHeaders } };

  // A session counts as present only if the cookie's signature checks out.
  const hasSession = await isValidAuthToken(authTokenCookie, sessionId);

  // A token that was supplied but failed verification is stale or forged —
  // strip the cookies so the browser stops resending it.
  const hasRejectedToken = Boolean(authTokenCookie) && !hasSession;

  // ── Redirect already-authenticated users away from auth pages ─────────
  if (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/signup')
  ) {
    if (hasSession) {
      // Send them to their own dashboard, not always the merchant one — a
      // signed-in Distributor or Super_Admin hitting /auth/login was being
      // bounced into /merchant-overview regardless of role.
      const target = dashboardForRole(role) || '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    // Let them reach the login page, but drop the bad cookies on the way in —
    // otherwise the branch above would bounce them straight back out.
    return hasRejectedToken
      ? clearAuthCookies(NextResponse.next(withHeaders))
      : NextResponse.next(withHeaders);
  }

  // ── /dashboard is just a router: send each role to its real dashboard ──
  // This used to be done by the page itself, which rendered a full-screen
  // spinner, fetched /api/auth/me to learn the role, then client-side pushed —
  // an extra round trip and a blank screen on every single login. The role is
  // already in a cookie, so resolve it here and the browser never loads that
  // page at all. If the cookie is missing or unrecognised we fall through and
  // let the page do its /api/auth/me lookup as before.
  if (pathname === '/dashboard' && hasSession) {
    const target = dashboardForRole(role);
    if (target) {
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // ── Merchant subscription + store onboarding gates ────────────────────
  // Routes that require an active subscription
  const SUBSCRIPTION_REQUIRED_ROUTES = [
    '/merchant-overview', '/campaign', '/stores', '/customers',
    '/analytics', '/team', '/studio',
  ];
  // Routes that additionally require at least one store
  const STORE_REQUIRED_ROUTES = [
    '/merchant-overview', '/campaign', '/customers', '/analytics', '/team', '/studio',
  ];
  // Pages that are part of the onboarding/recovery flow — never redirect these
  // These routes are exempt from the subscription/store gates so merchants
  // can complete the onboarding or recovery flow even without a subscription/store.
  const ONBOARDING_BYPASS = [
    '/subscription-required', '/onboarding',
    '/billing', '/subscription', '/stores/create',
  ];

  const isMerchant = role === 'Merchant' && hasSession;
  const isOnboardingBypass = ONBOARDING_BYPASS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  if (isMerchant && !isOnboardingBypass) {
    // Store gate runs first — a merchant must have at least one store before
    // anything else (subscription, campaigns, etc.) makes sense.
    const needsStore = STORE_REQUIRED_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (needsStore && merchantHasStore === '0') {
      return NextResponse.redirect(new URL('/stores/create', request.url));
    }

    // Subscription gate — only after the merchant has a store.
    const needsSub = SUBSCRIPTION_REQUIRED_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (needsSub && merchantHasSub === '0') {
      return NextResponse.redirect(new URL('/subscription-required', request.url));
    }
  }

  // ── Protect all merchant-overview / store / campaign / subscription pages ──────
  const isProtectedPage =
    pathname === '/dashboard' ||
    pathname === '/subscription-required' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/merchant-overview') ||
    pathname.startsWith('/stores') ||
    pathname.startsWith('/campaign') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/privacy-policy');

  const isProtectedApi =
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/campaigns') ||
    pathname.startsWith('/api/ranges') ||
    pathname.startsWith('/api/stores') ||
    pathname.startsWith('/api/inventory') ||
    pathname.startsWith('/api/redemptions') ||
    pathname.startsWith('/api/subscription');

  if (isProtectedPage || isProtectedApi) {
    if (!hasSession) {
      if (isProtectedApi) {
        return clearAuthCookies(
          NextResponse.json(
            { success: false, error: 'Unauthorized', data: null },
            { status: 401 },
          ),
        );
      }
      return clearAuthCookies(
        NextResponse.redirect(new URL(LOGIN_PATH, request.url)),
      );
    }
  }

  return hasRejectedToken
    ? clearAuthCookies(NextResponse.next(withHeaders))
    : NextResponse.next(withHeaders);
}

export const config = {
  matcher: [
    '/auth/login',
    '/auth/login/:path*',
    '/auth/register',
    '/auth/register/:path*',
    '/auth/signup',
    '/auth/signup/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/merchant-overview',
    '/merchant-overview/:path*',
    '/subscription-required',
    '/onboarding/:path*',
    '/stores/:path*',
    '/campaign',
    '/campaign/:path*',
    '/campaigns/:path*',
    '/analytics/:path*',
    '/customers/:path*',
    '/team/:path*',
    '/subscription/:path*',
    '/settings/:path*',
    '/billing/:path*',
    '/studio/:path*',
    '/privacy-policy',
    '/privacy-policy/:path*',
    '/api/dashboard/:path*',
    '/api/campaigns/:path*',
    '/api/ranges/:path*',
    '/api/stores/:path*',
    '/api/inventory/:path*',
    '/api/redemptions/:path*',
    '/api/subscription/:path*',
  ],
};
