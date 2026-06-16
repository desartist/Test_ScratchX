import { NextResponse } from "next/server";
import jwtService from "@/lib/jwtService";

const LOGIN_PATH = "/auth/login";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Build request headers once — always include x-pathname so server
  // components (layouts) can read the current path without JS.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const authToken = request.cookies.get('authToken')?.value;
  const role      = request.cookies.get('accountRole')?.value;
  const userId    = request.cookies.get('accountId')?.value;
  const userEmail = request.cookies.get('userEmail')?.value;

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

  // ── Protect all dashboard / store / campaign / subscription pages ──────
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/stores') ||
    pathname.startsWith('/campaigns') ||
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
    '/dashboard/:path*',
    '/stores/:path*',
    '/campaigns/:path*',
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
