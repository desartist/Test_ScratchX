import Account from "@/models/accountModel";
import Session from "@/models/sessionModel";
import { PERMISSIONS } from "@/lib/permissions";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { connectDB } from "@/lib/connectDB";

/**
 * Reads the authToken cookie, finds the matching session, and returns the
 * authenticated account with its role and resolved permissions.
 *
 * Returns null when the cookie is missing or the session is invalid.
 *
 * Session lookup strategy (three-tier):
 * 1. Try to find Session by ID = sessionId
 * 2. Try to find Session where accountId = sessionId
 * 3. Use sessionId directly as accountId (fallback)
 */
export async function getLoginToken() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get("authToken");
    const sessionIdCookie = cookieStore.get("sessionId");

    console.log("[Auth] Getting login token...");
    console.log("[Auth] authToken cookie exists:", !!authTokenCookie?.value);
    console.log("[Auth] sessionId cookie exists:", !!sessionIdCookie?.value);

    // Debug: Log all cookies
    const allCookies = cookieStore.getAll();
    console.log(
      "[Auth] All cookie names:",
      allCookies.map((c) => c.name).join(", "),
    );

    if (!authTokenCookie?.value) {
      console.log("[Auth] No authToken cookie found, returning null");
      return null;
    }

    if (!sessionIdCookie?.value) {
      console.log("[Auth] No sessionId cookie found, returning null");
      return null;
    }

    const sessionId = sessionIdCookie.value;
    console.log("[Auth] Got sessionId:", sessionId);

    // TIER 1: Try to find session by ID
    let session = null;
    try {
      session = await Session.findById(sessionId);
      if (session) {
        console.log("[Auth] Found session by ID:", session._id);
      }
    } catch (err) {
      console.log("[Auth] Session lookup by ID failed");
    }

    // TIER 2: If not found by ID, try to find by accountId
    if (!session) {
      console.log(
        "[Auth] Session not found by ID, trying accountId lookup",
      );
      try {
        session = await Session.findOne({ accountId: sessionId });
        if (session) {
          console.log("[Auth] Found session by accountId:", session._id);
        }
      } catch (err) {
        console.log("[Auth] Session lookup by accountId failed");
      }
    }

    // TIER 3: If still not found, use sessionId directly as accountId
    let accountId = null;
    if (session) {
      accountId = session.accountId;
      console.log("[Auth] Using accountId from session:", accountId);

      // Verify session is active
      if (!session.isActive) {
        console.log("[Auth] Session is not active");
        return null;
      }
    } else {
      console.log(
        "[Auth] No session found, using sessionId as accountId directly",
      );
      accountId = sessionId;
    }

    // Look up account
    const account = await Account.findById(accountId).select(
      "-password -__v",
    );

    if (!account) {
      console.log("[Auth] Account not found for accountId:", accountId);
      return null;
    }

    if (account.status !== "active") {
      console.log("[Auth] Account status is not active:", account.status);
      return null;
    }

    console.log("[Auth] Authentication successful for account:", account._id);
    return {
      ...account.toObject(),
      permissions: PERMISSIONS[account.role] ?? [],
    };
  } catch (error) {
    console.error("[Auth] Verification error:", error);
    return null;
  }
}

/**
 * Convenience guard for API routes.
 * Returns { account } or a 401 Response when unauthorized.
 * Optionally checks that the account has the required permission.
 *
 * Usage:
 *   const { account, error } = await requireAuth(request, "campaign:create");
 *   if (error) return error;
 */
export async function requireAuth(requiredPermission = null) {
  console.log(
    "[requireAuth] Checking authorization",
    requiredPermission ? `(permission: ${requiredPermission})` : "",
  );
  const account = await getLoginToken();

  if (!account) {
    console.log("[requireAuth] No account found - returning 401 Unauthorized");
    return {
      account: null,
      error: Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  console.log(
    "[requireAuth] Account found:",
    account._id,
    "role:",
    account.role,
  );

  if (requiredPermission) {
    const perms = account.permissions;
    const hasAccess = perms.includes("*") || perms.includes(requiredPermission);

    if (!hasAccess) {
      console.log(
        "[requireAuth] Permission denied. Required:",
        requiredPermission,
        "User permissions:",
        perms,
      );
      return {
        account: null,
        error: Response.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
  }

  console.log("[requireAuth] Authorization successful");
  return { account, error: null };
}
