# Auth Token Cookie Issue - Debug & Fix Report

## Problem Summary
- Users logged in but API calls return 401 Unauthorized
- Auth token cookie not being sent properly with requests
- Session verification failing in requireAuth()

## Root Causes Identified

### 1. SameSite Cookie Policy Too Strict
**File:** `lib/setAuthSession.js`, `app/api/auth/google-callback/route.js`
**Issue:** Cookies were set with `sameSite: 'strict'` in ALL environments
- In development/localhost, this can prevent cookies from being sent with fetch requests
- Even with `credentials: "include"`, strict sameSite may block them

**Fix:** Changed to `sameSite: 'lax'` in development, `sameSite: 'strict'` in production
```javascript
const sameSiteValue = process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
```

### 2. Inconsistent Cookie-Setting Implementation
**Files:** 
- `app/api/auth/password-login/route.js` (used setAuthSession ✓)
- `app/api/auth/otp-verify/route.js` (set cookies directly ✗)
- `app/api/auth/google-callback/route.js` (set cookies directly ✗)

**Issue:** Different authentication methods used different approaches to set cookies
- OTP and Google routes bypassed the unified setAuthSession function
- Led to subtle differences in cookie configuration

**Fix:** 
- Updated `app/api/auth/otp-verify/route.js` to use `setAuthSession()`
- Updated `app/api/auth/google-callback/route.js` with proper sameSite handling
- Now all routes use consistent, validated cookie-setting logic

### 3. Missing COOKIE_SECRET Validation
**Issue:** No validation that COOKIE_SECRET environment variable exists
- If COOKIE_SECRET was not set or changed, cookie hashing would fail silently

**Fix:** Added explicit checks in both `setAuthSession.js` and `google-callback/route.js`:
```javascript
if (!process.env.COOKIE_SECRET) {
  console.error("[Auth] CRITICAL: COOKIE_SECRET environment variable is not set!");
  throw new Error("COOKIE_SECRET is required");
}
```

### 4. Inefficient Session Lookup
**File:** `lib/auth.js`
**Issue:** getLoginToken() was doing brute-force search through ALL sessions
- Scanned every session in the database
- Hashed session ID and compared with cookie for each one

**Fix:** 
- Added optimization to use sessionId cookie for direct lookup first
- Falls back to hash-based search if direct lookup fails
- Added session.isActive check to verify session is still valid
- Massively improves performance and reliability

## Files Modified

### 1. `lib/auth.js`
- Added comprehensive debug logging to getLoginToken()
- Added comprehensive debug logging to requireAuth()
- Optimized session lookup with sessionId cookie
- Added COOKIE_SECRET validation checks
- Added isActive session status check

### 2. `lib/setAuthSession.js`
- Changed sameSite from 'strict' to 'lax' in development
- Added COOKIE_SECRET validation
- Added debug logging for cookie creation
- Documents the 7-day cookie expiry

### 3. `app/api/auth/otp-verify/route.js`
- Removed direct cookie-setting code
- Now uses unified setAuthSession() function
- Ensures consistency across all auth methods

### 4. `app/api/auth/google-callback/route.js`
- Updated sameSite cookie policy (lax in dev, strict in prod)
- Added COOKIE_SECRET validation
- Added debug logging for session creation
- Now matches cookie configuration from other routes

### 5. `app/api/debug/cookies/route.js` (NEW)
- Debug endpoint to check cookie status
- Returns: all cookies, session count, account count, auth result
- Hit this to diagnose auth issues: GET /api/debug/cookies

## Testing Instructions

### Step 1: Verify COOKIE_SECRET
```bash
grep "COOKIE_SECRET" .env
# Should show: COOKIE_SECRET=super-secret-key-xyz (or similar non-empty value)
```

### Step 2: Check Debug Endpoint
```
GET http://localhost:3000/api/debug/cookies
```

Expected response shows:
- `cookieSecretExists: true`
- `authTokenExists: true` (if logged in)
- `sessionCount: > 0` (if sessions exist)
- `authResult.authenticated: true` (if valid session)

### Step 3: Monitor Console Logs
When making API calls that require auth, look for:
```
[Auth] Getting login token...
[Auth] authToken cookie exists: true
[Auth] All cookie names: authToken, accountRole, sessionId
[Auth] Found session via sessionId cookie: [id]
[Auth] Authentication successful for account: [id]
[requireAuth] Checking authorization
[requireAuth] Account found: [id] role: Merchant
[requireAuth] Authorization successful
```

### Step 4: Test Checkout Flow
1. Login via password or OTP
2. Navigate to /billing/checkout?planId=xxx&planName=Core
3. Click "Confirm & Activate"
4. Watch console for [Auth] and [requireAuth] logs
5. Payment should proceed without 401 error

## What Each Fix Addresses

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| 401 on /api/subscription/activate | sameSite: strict blocking fetch | Changed to lax in dev |
| Inconsistent cookie config | Different routes set cookies differently | Use setAuthSession() everywhere |
| Silent COOKIE_SECRET failures | No validation | Added explicit checks |
| Slow session lookup | O(n) brute force search | Added direct sessionId lookup |
| Unclear auth failures | No debug logging | Added [Auth] and [requireAuth] logs |

## Environment Variables Check

**Required in .env:**
- `COOKIE_SECRET` - Must be set and non-empty (required for HMAC cookie hashing)
- `NODE_ENV` - Determines sameSite: 'strict' (prod) vs 'lax' (dev)

**Command to verify:**
```bash
echo "NODE_ENV: $NODE_ENV"
echo "COOKIE_SECRET: $([ -z "$COOKIE_SECRET" ] && echo 'NOT SET' || echo 'SET')"
```

## Next Steps

1. Restart the application with these changes
2. Login again (this creates new session with fixed cookies)
3. Call `/api/debug/cookies` to verify cookies are set correctly
4. Try /api/subscription/activate to confirm 401 is fixed
5. Check browser DevTools (Application > Cookies) to see sameSite value

## Rollback Plan

If issues arise, revert to:
- `sameSite: 'strict'` - Change line in setAuthSession.js
- Original auth.js - Use git to restore
- Remove `/api/debug/cookies/route.js` if not needed

## Logs to Monitor

After each change, check server console for:
- `[Auth]` prefix - Authentication checks
- `[requireAuth]` prefix - Authorization checks
- `[setAuthSession]` prefix - Cookie setting
- `[PASSWORD-LOGIN]`, `[OTP-LOGIN]`, `[GOOGLE-LOGIN]` - Specific auth methods
- Any `CRITICAL:` messages about missing configuration

---
Date: 2026-06-10
Debug fixes applied to resolve 401 Unauthorized on API calls despite user being logged in.
