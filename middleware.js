import { NextResponse } from "next/server";
import jwtService from "@/lib/jwtService";

const LOGIN_PATH = "/auth/login";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Build request headers once — always include x-pathname so server
  // components (layouts) can read the current path without JS.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const authToken        = request.cookies.get('authToken')?.value;
  const role             = request.cookies.get('accountRole')?.value;
  const userId           = request.cookies.get('accountId')?.value;
  const userEmail        = request.cookies.get('userEmail')?.value;
  const merchantHasStore = request.cookies.get('merchantHasStore')?.value;
  const merchantHasSub   = request.cookies.get('merchantHasSub')?.value;

  if (role)      requestHeaders.set('x-user-role', role);
  if (userId)    requestHeaders.set('x-user-id', userId);
  if (userEmail) requestHeaders.set('x-user-email', userEmail);

  const withHeaders = { request: { headers: requestHeaders } };

  // ── Redirect already-authenticated users away from auth pages ─────────
  if (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/signup')
  ) {
    if (authToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next(withHeaders);
  }

  // ── Merchant subscription + store onboarding gates ────────────────────
  // Routes that require an active subscription
  const SUBSCRIPTION_REQUIRED_ROUTES = [
    '/dashboard', '/campaign', '/stores', '/customers',
    '/analytics', '/team', '/studio',
  ];
  // Routes that additionally require at least one store
  const STORE_REQUIRED_ROUTES = [
    '/dashboard', '/campaign', '/customers', '/analytics', '/team', '/studio',
  ];
  // Pages that are part of the onboarding/recovery flow — never redirect these
  // These routes are exempt from the subscription/store gates so merchants
  // can complete the onboarding or recovery flow even without a subscription/store.
  const ONBOARDING_BYPASS = [
    '/subscription-required', '/onboarding',
    '/billing', '/subscription', '/stores/create',
  ];

  const isMerchant = role === 'Merchant' && authToken;
  const isOnboardingBypass = ONBOARDING_BYPASS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  if (isMerchant && !isOnboardingBypass) {
    const needsSub = SUBSCRIPTION_REQUIRED_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (needsSub && merchantHasSub === '0') {
      return NextResponse.redirect(new URL('/subscription-required', request.url));
    }

    const needsStore = STORE_REQUIRED_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (needsStore && merchantHasSub === '1' && merchantHasStore === '0') {
      return NextResponse.redirect(new URL('/stores/create', request.url));
    }
  }

  // ── Protect all dashboard / store / campaign / subscription pages ──────
  const isProtectedPage =
    pathname === '/subscription-required' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/stores') ||
    pathname.startsWith('/campaign') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/studio');

  const isProtectedApi =
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/campaigns') ||
    pathname.startsWith('/api/ranges') ||
    pathname.startsWith('/api/stores') ||
    pathname.startsWith('/api/inventory') ||
    pathname.startsWith('/api/redemptions') ||
    pathname.startsWith('/api/subscription');

  if (isProtectedPage || isProtectedApi) {
    if (!authToken) {
      if (isProtectedApi) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', data: null },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
  }

  return NextResponse.next(withHeaders);
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
    '/api/dashboard/:path*',
    '/api/campaigns/:path*',
    '/api/ranges/:path*',
    '/api/stores/:path*',
    '/api/inventory/:path*',
    '/api/redemptions/:path*',
    '/api/subscription/:path*',
  ],
};
