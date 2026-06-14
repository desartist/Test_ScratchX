# Google OAuth Integration - Testing Guide

## Implementation Summary

**Date:** May 23, 2026  
**Phase:** 1B Task 1.11  
**Status:** Files Created and Verified

### Files Created:
1. `/lib/googleAuthService.js` - Google OAuth service with token exchange and user info retrieval
2. `/app/api/auth/google/route.js` - OAuth initiation endpoint
3. `/app/api/auth/google-callback/route.js` - OAuth callback handler

### Files Modified:
1. `/models/accountModel.js` - Added "Google_OAuth" to source enum
2. `/.env` - Added Google OAuth configuration variables

---

## Prerequisites for Testing

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use existing
3. Enable the Google+ API:
   - Search for "Google+ API"
   - Click Enable
4. Create OAuth 2.0 Client ID:
   - Go to Credentials (left sidebar)
   - Click "Create Credentials" → "OAuth Client ID"
   - Choose "Web application"
5. Configure Authorized URIs:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `http://localhost:3001` (if port 3000 is in use)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/google-callback`
     - `http://localhost:3001/api/auth/google-callback` (if port 3001 is in use)
6. Copy Client ID and Client Secret
7. Update `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_copied_client_id
   GOOGLE_CLIENT_SECRET=your_copied_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google-callback
   ```
   (Or use port 3001 if that's what Next.js uses)

### 2. Start Development Server

```bash
cd /path/to/coupon_campaigns
npm run dev
```

Note the port (usually 3000 or 3001 if 3000 is in use).

### 3. MongoDB Connection

Ensure MongoDB is running:
```bash
# Windows
mongod

# Or use MongoDB Atlas connection string in DB_URL
```

---

## Test Suite

### Test 1: OAuth Flow Initiation
**Objective:** Verify CSRF state generation and redirect to Google login

**Steps:**
1. Open browser and navigate to: `http://localhost:3000/api/auth/google`
   (Replace 3000 with 3001 if needed)
2. Should redirect to Google OAuth consent screen

**Expected Results:**
- ✓ Redirects to Google login page
- ✓ Cookie `oauth_state` is set (httpOnly)
- ✓ No errors in browser console
- ✓ No errors in server console

**Failure Scenarios:**
- If redirect fails: Check GOOGLE_CLIENT_ID in .env
- If blank page: Check browser console for errors
- If CORS error: OAuth credentials not properly configured

---

### Test 2: Complete OAuth Flow (New Account)
**Objective:** Create new account through Google OAuth

**Steps:**
1. Navigate to `http://localhost:3000/api/auth/google`
2. Login with a Google account (use test account if available)
3. Grant requested permissions
4. Should redirect to `/dashboard`

**Expected Results:**
- ✓ Redirects to dashboard
- ✓ Cookies set: `authToken` (session), `accountRole`
- ✓ OAuth state cookie cleared
- ✓ No errors in console

**Verify in MongoDB:**
```
use ScratchX
db.accounts.findOne({"email": "your-google-email@gmail.com"})
```

Expected output:
```javascript
{
  _id: ObjectId(...),
  email: "your-google-email@gmail.com",
  googleId: "11234567890123456789",  // Google's unique ID
  firstName: "John",                 // From Google profile
  lastName: "Doe",                   // From Google profile
  phone: "google_11234567",          // Placeholder
  role: "Super_Admin",               // Assigned role
  source: "Google_OAuth",            // Source
  status: "active",                  // Auto-verified
  isEmailVerified: true,             // From Google
  emailVerifiedAt: ISODate(...),
  lastLoginAt: ISODate(...),
  loginAttempts: 0,
  createdAt: ISODate(...),
  updatedAt: ISODate(...),
}
```

---

### Test 3: Complete OAuth Flow (Existing Account)
**Objective:** Login with same Google account (second time)

**Steps:**
1. Clear cookies: DevTools → Application → Cookies → Delete all
2. Navigate to `http://localhost:3000/api/auth/google`
3. Login with same Google account
4. Grant permissions again
5. Should redirect to dashboard

**Verify in MongoDB:**
```
db.accounts.findOne({"email": "your-google-email@gmail.com"})
```

Expected differences from Test 2:
- `createdAt` should be earlier (same as first login)
- `lastLoginAt` should be updated to now
- `loginAttempts` should be 0 (reset on successful login)
- No new account created

---

### Test 4: CSRF Protection
**Objective:** Verify CSRF state validation

**Steps:**
1. Start OAuth flow: Navigate to `http://localhost:3000/api/auth/google`
2. Get the `oauth_state` cookie value
3. Let the flow continue to Google, login normally
4. In the callback URL, manually change the `state` parameter to something else
5. Should get an error

**Expected Results:**
- ✓ Error message: `invalid_state`
- ✓ NOT logged in
- ✓ Redirects to: `/auth/login?error=invalid_state`

---

### Test 5: Invalid Authorization Code
**Objective:** Test error handling for invalid OAuth code

**Steps:**
1. Manually construct callback URL:
   ```
   http://localhost:3000/api/auth/google-callback?code=invalid_code&state=any_state
   ```
2. Navigate to this URL
3. Should see error

**Expected Results:**
- ✓ Error redirects to login page
- ✓ Error parameter in URL
- ✓ Server logs contain error details

---

### Test 6: Email Already Registered
**Objective:** Test scenario where email exists but googleId doesn't

**Steps:**
1. Create a regular account with password: `testuser@gmail.com`
2. Try to login with Google OAuth using same email
3. Should get error

**Expected Results:**
- ✓ Redirects to: `/auth/login?error=email_already_registered`
- ✓ NOT logged in
- ✓ No account updated

---

### Test 7: Role-Based Access
**Objective:** Verify Super_Admin role has proper permissions

**Steps:**
1. Complete OAuth flow (Test 2)
2. Navigate to admin routes: `/api/admin/*`
3. Check if authenticated

**Expected Results:**
- ✓ Can access admin endpoints with valid JWT token
- ✓ authToken cookie contains valid session
- ✓ accountRole cookie shows "Super_Admin"

---

### Test 8: Token Verification
**Objective:** Verify JWT tokens are properly generated

**After Test 2 (login successful):**

1. Open DevTools → Network
2. Make a request to any authenticated endpoint
3. Check Request Headers for authorization

**Or check manually:**
```javascript
// In browser console
document.cookie
// Should show: authToken=...; accountRole=Super_Admin; ...
```

**To verify JWT contents:**
```bash
# Decode JWT (in browser console)
const token = 'your_token_here';
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log(payload);
```

Expected JWT payload:
```javascript
{
  accountId: "...",
  email: "your-google-email@gmail.com",
  phone: "google_11234567",
  role: "Super_Admin",
  status: "active",
  type: "access",
  iat: ...,
  exp: ...,
  iss: "scratchx-auth",
  aud: "scratchx-api"
}
```

---

## Troubleshooting

### Problem: "Invalid Client"
**Cause:** GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is wrong  
**Solution:** Double-check credentials in Google Cloud Console

### Problem: "Redirect URI mismatch"
**Cause:** GOOGLE_REDIRECT_URI doesn't match configured URIs in Google Cloud  
**Solution:** Update both .env and Google Cloud Console to match

### Problem: CORS errors
**Cause:** Cross-origin request blocked  
**Solution:** Ensure GOOGLE_REDIRECT_URI matches the OAuth callback route

### Problem: "oauth_state cookie not found"
**Cause:** Browser not accepting httpOnly cookies  
**Solution:** Check if cookies are disabled or use HTTP (not HTTPS) for local dev

### Problem: MongoDB connection error
**Cause:** MongoDB not running or DB_URL incorrect  
**Solution:** Start MongoDB or update DB_URL in .env

### Problem: "Account model validation error"
**Cause:** Model schema doesn't match data being saved  
**Solution:** Verify Account model has googleId and source="Google_OAuth" fields

---

## Production Checklist

Before deploying to production:

- [ ] Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in production environment
- [ ] Update GOOGLE_REDIRECT_URI to production domain (e.g., https://yourdomain.com/api/auth/google-callback)
- [ ] Add production domain to Google Cloud Console authorized URIs
- [ ] Uncomment and configure domain restriction in google-callback route if needed
- [ ] Set NODE_ENV=production to enable secure cookies
- [ ] Test complete flow in production environment
- [ ] Set up monitoring/logging for OAuth errors
- [ ] Test error scenarios in production

---

## Code Architecture

### GoogleAuthService (`/lib/googleAuthService.js`)
- **generateState()** - Creates random 32-byte CSRF token
- **getAuthorizationUrl(state)** - Builds Google OAuth URL
- **exchangeCodeForTokens(code)** - Exchanges auth code for access/refresh tokens
- **getUserInfo(accessToken)** - Retrieves user profile from Google

### OAuth Initiation (`/app/api/auth/google/route.js`)
- Generates CSRF state token
- Stores state in httpOnly cookie (10 min expiry)
- Redirects to Google OAuth

### OAuth Callback (`/app/api/auth/google-callback/route.js`)
- Validates CSRF state
- Exchanges code for Google tokens
- Retrieves user info
- Creates or updates account
- Generates JWT tokens
- Sets session cookies
- Redirects to dashboard

### Account Model Changes
- Added `googleId` field (sparse index)
- Added "Google_OAuth" to source enum
- Existing fields used: email, firstName, lastName, role, status, isEmailVerified, etc.

---

## Security Notes

1. **CSRF Protection:** State token verified on callback
2. **httpOnly Cookies:** Session tokens not accessible to JavaScript
3. **Secure Redirect:** No sensitive data in URL parameters
4. **Token Expiry:** 
   - Access token: 15 minutes
   - Refresh token: 7 days
   - CSRF state: 10 minutes
5. **Email Verification:** Inherited from Google's verification
6. **Account Lockout:** No additional lockout logic (Google handles auth security)

---

## Notes

- Google accounts are automatically assigned the "Super_Admin" role
- Email verification is automatic (trusts Google's verification)
- Phone field is populated with placeholder (can be updated by user later)
- First/Last name populated from Google profile if available
- All Google OAuth users start with status="active" (no email verification step needed)

