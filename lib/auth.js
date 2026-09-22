import Account from "@/models/accountModel";
import Session from "@/models/sessionModel";
import { PERMISSIONS } from "@/lib/permissions";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/connectDB";

// Constant-time check of the signed authToken cookie against the sessionId.
function isValidAuthToken(token, sessionId) {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    console.error("[Auth] COOKIE_SECRET is not set — rejecting all sessions");
    return false;
  }
  const expected = createHmac("sha256", secret).update(sessionId).digest("hex");
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Resolving a login takes two sequential DB reads (session, then account),
// and a single dashboard load makes 15+ authenticated API calls plus the
// server layout — i.e. 30+ identical lookups per page view. Cache the
// resolved account per sessionId for a few seconds so a burst of requests
// pays for it once. The TTL bounds how long a deactivation / logout can lag.
const LOGIN_CACHE_TTL_MS = 10_000;
const loginCache = new Map(); // sessionId -> { expires, account }

/**
 * Reads the authToken cookie, finds the matching session, and returns the
 * authenticated account with its role and resolved permissions.
 *
 * Returns null when the cookie is missing or the session is invalid.
 *
 * The authToken cookie must be the HMAC of the sessionId cookie (verified
 * with COOKIE_SECRET), and that session must exist and be active.
 */
export async function getLoginToken() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get("authToken");
    const sessionIdCookie = cookieStore.get("sessionId");

    if (!authTokenCookie?.value || !sessionIdCookie?.value) {
      return null;
    }

    const sessionId = sessionIdCookie.value;

    // The authToken cookie is HMAC-SHA256(COOKIE_SECRET, sessionId), minted
    // at login (lib/setAuthSession.js, google-callback). It must be verified
    // here — checking only that the cookie exists let anyone who knew a
    // session or account id send an arbitrary authToken and be treated as
    // that account. Fail closed if the secret isn't configured.
    if (!isValidAuthToken(authTokenCookie.value, sessionId)) {
      return null;
    }

    const cached = loginCache.get(sessionId);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.account };
    }
    loginCache.delete(sessionId);

    // The session must exist and be active. (The old fallbacks that treated
    // the sessionId cookie as an accountId, or looked a session up by
    // accountId, are gone — a signed token only ever covers a real
    // Session._id, so they were only ever reachable by forging cookies.)
    let session = null;
    try {
      session = await Session.findById(sessionId);
    } catch {
      return null; // not a valid ObjectId
    }
    if (!session || !session.isActive) {
      return null;
    }
    const accountId = session.accountId;

    // Look up account
    const account = await Account.findById(accountId).select(
      "-password -__v",
    );

    if (!account || account.status !== "active") {
      return null;
    }

    const resolved = {
      ...account.toObject(),
      permissions: PERMISSIONS[account.role] ?? [],
    };

    loginCache.set(sessionId, {
      expires: Date.now() + LOGIN_CACHE_TTL_MS,
      account: resolved,
    });
    if (loginCache.size > 500) {
      // Keep the map bounded on long-lived servers.
      const now = Date.now();
      for (const [key, entry] of loginCache) {
        if (entry.expires <= now) loginCache.delete(key);
      }
    }

    return { ...resolved };
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
  const account = await getLoginToken();

  if (!account) {
    return {
      account: null,
      error: Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (requiredPermission) {
    const perms = account.permissions;
    const hasAccess = perms.includes("*") || perms.includes(requiredPermission);

    if (!hasAccess) {
      return {
        account: null,
        error: Response.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
  }
  return { account, error: null };
}
