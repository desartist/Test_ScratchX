import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import Session from '@/models/sessionModel';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

  // In development, use 'lax' sameSite for easier testing. In production use 'strict'
  const sameSiteValue = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';

  cookieStore.set('authToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: sameSiteValue,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  console.log("[setAuthSession] authToken cookie set (sameSite:", sameSiteValue, ")");

  cookieStore.set('accountRole', account.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: sameSiteValue,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  console.log("[setAuthSession] accountRole cookie set (sameSite:", sameSiteValue, ")");

  // Also set sessionId cookie for session management
  cookieStore.set('sessionId', sessionToUse._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: sameSiteValue,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  console.log("[setAuthSession] sessionId cookie set (sameSite:", sameSiteValue, ")");
}
