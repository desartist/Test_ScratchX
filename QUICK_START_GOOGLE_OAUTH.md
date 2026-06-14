# Quick Start: Google OAuth Integration

## 30-Second Overview

Google OAuth login has been implemented. Users can now log in with their Google account, which creates a Super_Admin account.

## Files Changed

1. **New:** `/lib/googleAuthService.js` - OAuth service
2. **New:** `/app/api/auth/google/route.js` - OAuth start
3. **New:** `/app/api/auth/google-callback/route.js` - OAuth callback
4. **Updated:** `/models/accountModel.js` - Added "Google_OAuth" source
5. **Updated:** `/.env` - Added Google OAuth config

## Before You Test

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth Client ID (Web application)
3. Add these origins/URIs:
   - Origin: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/api/auth/google-callback`
4. Copy Client ID and Secret
5. Update `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_id_here
   GOOGLE_CLIENT_SECRET=your_secret_here
   ```

## Start Server

```bash
npm run dev
# Visit http://localhost:3000 (or 3001 if 3000 is busy)
```

## Test OAuth Flow

**Method 1: Via API**
```
http://localhost:3000/api/auth/google
```
This will redirect to Google login.

**Method 2: Add to Login Page**
```html
<a href="/api/auth/google">Login with Google</a>
```

## What Happens

1. User clicks login link
2. Redirects to Google login
3. User approves permissions
4. Gets redirected back
5. Account created in DB
6. Logged in and taken to dashboard

## Verify It Worked

In MongoDB:
```javascript
db.accounts.findOne({
  source: "Google_OAuth"
})
```

You should see an account with:
- `googleId`: (Google's unique ID)
- `email`: (user's Google email)
- `role`: "Super_Admin"
- `status`: "active"

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page on `/api/auth/google` | Check GOOGLE_CLIENT_ID in .env |
| "Redirect URI mismatch" | Update Google Cloud Console URIs |
| Can't login to Google | Check browser console for CORS errors |
| No account created | Check MongoDB connection, check server logs |

## Full Documentation

- See `IMPLEMENTATION_SUMMARY.md` for technical details
- See `GOOGLE_OAUTH_TESTING.md` for 8 detailed test scenarios

## Key Points

- Google accounts = Super_Admin role
- Email auto-verified (trusts Google)
- No phone field needed (placeholder used)
- Session cookies + JWT tokens both set
- CSRF protection enabled
- 15-min access tokens, 7-day refresh tokens

