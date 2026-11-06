import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import Session from '@/models/sessionModel';
import { authCookieOptions } from '@/lib/authCookieOptions';

/**
 * Set auth cookies from a session object.
 * NOTE: Session must be created separately with device tracking!
 * This function only sets cookies, it does NOT create sessions.
 *
 * @param {Object} account - The account object
 * @param {Object} session - Pre-created session object (from createSession)
 */
export async function setAuthSession(account, session) {
  // If no session provided, create one the old way (backward compatibility)
  let sessionToUse = session;
  if (!sessionToUse) {
    sessionToUse = await Session.create({
      accountId: account._id,
      role: account.role,
    });
  }

  if (!process.env.COOKIE_SECRET) {
    console.error("[setAuthSession] CRITICAL: COOKIE_SECRET environment variable is not set!");
    throw new Error("COOKIE_SECRET is required");
  }

  const sessionToken = createHmac('sha256', process.env.COOKIE_SECRET)
    .update(sessionToUse._id.toString())
    .digest('hex');

  console.log("[setAuthSession] Setting auth cookies for account:", account._id);
  console.log("[setAuthSession] Session ID:", sessionToUse._id);
  console.log("[setAuthSession] Token (first 20 chars):", sessionToken.substring(0, 20) + "...");

  const cookieStore = await cookies();

  // sameSite 'lax' in every environment — see lib/authCookieOptions.js.
  cookieStore.set('authToken', sessionToken, authCookieOptions());
  cookieStore.set('accountRole', account.role, authCookieOptions({ httpOnly: false }));
  // Also set sessionId cookie for session management (middleware needs both)
  cookieStore.set('sessionId', sessionToUse._id.toString(), authCookieOptions());

  console.log("[setAuthSession] auth cookies set (authToken, accountRole, sessionId)");
}
