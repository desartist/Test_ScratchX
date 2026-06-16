import { NextResponse } from "next/server";
import jwtService from "@/lib/jwtService";

const LOGIN_PATH = "/auth/login";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Redirect already-authenticated users away from auth pages
  if (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/signup')
  ) {
    const authToken = request.cookies.get('authToken')?.value;
    if (authToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect dashboard pages and dashboard API routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/dashboard")
  ) {
    const authToken = request.cookies.get("authToken")?.value;

    if (!authToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    const role = request.cookies.get("accountRole")?.value;
    if (role) {
      requestHeaders.set("x-user-role", role);
    }
    const userId = request.cookies.get("accountId")?.value;
    if (userId) {
      requestHeaders.set("x-user-id", userId);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ✅ NEW: Protect subscription pages and subscription API routes
  if (
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/api/subscription")
  ) {
    const authToken = request.cookies.get("authToken")?.value;

    if (!authToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      console.log("🔒 Subscription: No auth token. Redirecting to login...");
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    const role = request.cookies.get("accountRole")?.value;
    if (role) {
      requestHeaders.set("x-user-role", role);
    }
    const userId = request.cookies.get("accountId")?.value;
    if (userId) {
      requestHeaders.set("x-user-id", userId);
    }
    const email = request.cookies.get("userEmail")?.value;
    if (email) {
      requestHeaders.set("x-user-email", email);
    }

    console.log("✅ Subscription: Auth token found. Headers set:", {
      "x-user-id": userId,
      "x-user-role": role,
      "x-user-email": email,
    });

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Protect campaign, ranges, stores, inventory, and redemptions API routes
  if (
    pathname.startsWith("/api/campaigns") ||
    pathname.startsWith("/api/ranges") ||
    pathname.startsWith("/api/stores") ||
    pathname.startsWith("/api/inventory") ||
    pathname.startsWith("/api/redemptions")
  ) {
    const authToken = request.cookies.get("authToken")?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 401 },
      );
    }

    const requestHeaders = new Headers(request.headers);
    const role = request.cookies.get("accountRole")?.value;
    if (role) {
      requestHeaders.set("x-user-role", role);
    }
    const userId = request.cookies.get("accountId")?.value;
    if (userId) {
      requestHeaders.set("x-user-id", userId);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/login",
    "/auth/login/:path*",
    "/auth/register",
    "/auth/register/:path*",
    "/auth/signup",
    "/auth/signup/:path*",
    "/dashboard/:path*",
    "/subscription/:path*",
    "/api/dashboard/:path*",
    "/api/subscription/:path*",
    "/api/campaigns/:path*",
    "/api/ranges/:path*",
    "/api/stores/:path*",
    "/api/inventory/:path*",
    "/api/redemptions/:path*",
  ],
};
