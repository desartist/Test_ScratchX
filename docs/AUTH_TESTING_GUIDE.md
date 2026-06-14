# Phase 1A Authentication - Testing Guide

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```
Server will be available at `http://localhost:3000`

### 2. Test OTP Flow

#### Step 1: Send OTP
```bash
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

**Expected Response:**
```json
{
  "success": true,
  "phone": "+919876543210",
  "purpose": "Signup",
  "expiresIn": 600
}
```

**In Console (dev mode):**
```
📱 OTP for +919876543210: 123456
```

#### Step 2: Signup with OTP
```bash
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "code": "123456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Merchant"
  }'
```

**Expected Response (Signup - Status 201):**
```json
{
  "success": true,
  "message": "Account created. Please verify your email.",
  "account": {
    "id": "user_id_here",
    "email": "user@example.com",
    "phone": "+919876543210",
    "role": "Merchant",
    "status": "pending"
  },
  "requiresEmailVerification": true
}
```

#### Step 3: Login with OTP (on second time)
1. Send OTP again: `POST /api/auth/otp-send` with same phone
2. Verify OTP (without email this time):

```bash
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "code": "123456"
  }'
```

**Expected Response (Login - Status 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "account": {
    "id": "user_id_here",
    "email": "user@example.com",
    "phone": "+919876543210",
    "role": "Merchant",
    "status": "active"
  },
  "redirectTo": "/dashboard"
}
```

---

## Test Scenarios

### ✅ Test 1: Rate Limiting (1 OTP per minute)
```bash
# Request 1 - Should succeed
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543211"}'
# Response: 200 OK

# Request 2 (immediately) - Should fail
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543211"}'
# Response: 429 Too Many Requests
# Body: {"error": "Rate limit exceeded. Try again in X seconds."}
```

### ✅ Test 2: OTP Attempts Limit (3 attempts max)
```bash
# Get OTP
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543212"}'
# OTP in console: 123456

# Attempt 1 - Wrong code
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543212", "code": "111111"}'
# Response: 400 Bad Request
# Body: {"error": "Invalid OTP code. 2 attempts remaining."}

# Attempt 2 - Wrong code
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543212", "code": "222222"}'
# Response: 400 Bad Request
# Body: {"error": "Invalid OTP code. 1 attempts remaining."}

# Attempt 3 - Wrong code
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543212", "code": "333333"}'
# Response: 429 Too Many Requests
# Body: {"error": "Maximum verification attempts exceeded. Request a new code."}
```

### ✅ Test 3: OTP Expiry (10 minutes)
```bash
# Get OTP (valid for 10 minutes)
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543213"}'

# Wait 11 minutes, then try to verify
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543213", "code": "123456"}'
# Response: 400 Bad Request
# Body: {"error": "OTP has expired. Request a new code."}
```

### ✅ Test 4: Token Refresh
```bash
# 1. Login and get tokens
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "code": "123456"}' \
  -o response.json

# 2. Extract refreshToken from response
# (Save the refreshToken value)

# 3. Refresh the token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token_here"}'
# Response: 200 OK
# Body: {"success": true, "accessToken": "...", "refreshToken": "...", "expiresIn": 900}
```

### ✅ Test 5: Invalid Phone Format
```bash
curl -X POST http://localhost:3000/api/auth/otp-send \
  -H "Content-Type: application/json" \
  -d '{"phone": "invalid-phone"}'
# Response: 400 Bad Request
# Body: {"error": "Invalid phone number format"}
```

### ✅ Test 6: Duplicate Email on Signup
```bash
# First signup
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543214",
    "code": "123456",
    "email": "duplicate@example.com"
  }'
# Response: 201 Created

# Second signup with same email, different phone
curl -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543215",
    "code": "654321",
    "email": "duplicate@example.com"
  }'
# Response: 409 Conflict
# Body: {"error": "Email already registered"}
```

---

## Using JWT Tokens

### Get Access Token
```bash
# Login first
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/otp-verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "code": "123456"}')

# Extract tokens (use jq if available)
# ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
# REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refreshToken')
```

### Use Access Token in API Requests
```bash
curl -X GET http://localhost:3000/api/some-protected-route \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### Refresh Expired Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN_HERE"}'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid OTP code. 1 attempts remaining."
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 45 seconds."
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Your account is not active"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Email already registered"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Testing Checklist

- [ ] OTP send generates code
- [ ] OTP sent to console in dev mode
- [ ] Rate limiting works (1 per minute per phone)
- [ ] Account created on first signup
- [ ] Account login on subsequent OTP
- [ ] OTP attempt limiting works (max 3)
- [ ] OTP expiry works (10 minutes)
- [ ] Token refresh works
- [ ] Invalid phone rejected
- [ ] Duplicate email rejected
- [ ] JWT tokens in auth header work
- [ ] Expired tokens properly handled
- [ ] Account status blocking works
- [ ] Error responses formatted correctly

---

## Debugging Tips

### 1. Check Console Logs
OTP codes appear in console for development:
```
⚠️  Using console OTP provider (development only)
📱 OTP for +919876543210: 123456
```

### 2. Check Redis Connection
If Redis is not running:
```
Redis connection error (rate limiting disabled):
```
This is OK - rate limiting will be disabled but OTP will still work.

### 3. Check Database
Verify account created:
```bash
# In MongoDB (or MongoDB Compass)
db.accounts.findOne({"phone": "+919876543210"})
```

Verify OTP record:
```bash
db.otps.findOne({"phone": "+919876543210"})
```

### 4. Monitor Network Requests
Use browser DevTools or:
```bash
# Monitor with netcat (if available)
tcpdump -i lo port 3000
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Ensure MongoDB is running: `mongod` |
| Redis connection warning | Install Redis or ignore (graceful fallback) |
| OTP code not appearing | Check console output, might be buffered |
| Rate limit persists after timeout | Clear Redis cache or restart server |
| Token verification fails | Check JWT_SECRET in .env is correct |
| CORS errors | Check middleware allows your origin |

---

## Performance Benchmarks

- OTP generation: ~50ms
- OTP verification: ~100ms
- JWT creation: ~10ms
- JWT verification: ~5ms
- API response: ~200-500ms (with DB queries)

---

## Next Steps After Testing

1. Test Email Verification Flow (Phase 2)
2. Test Password Login (Phase 1B)
3. Test Password Reset (Phase 1B)
4. Test Google OAuth (Phase 1B)
5. Integration with Frontend
6. Load Testing (10,000+ concurrent users)

---

**Last Updated:** May 23, 2026  
**For Questions:** Check `PHASE_1A_IMPLEMENTATION_SUMMARY.md`
