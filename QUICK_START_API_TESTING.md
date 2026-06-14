# 🚀 QUICK START - API BACKEND TESTING

## **Setup in 5 Minutes**

### **1. Start MongoDB** (if not running)
```bash
# Windows with MongoDB installed
mongod

# Or Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### **2. Start Dev Server**
```bash
cd your_project_directory
npm run dev
```
Server should be running on `http://localhost:3000`

### **3. Verify Server is Working**
```bash
curl http://localhost:3000/api/auth/me
# Should return: {"error":"Unauthorized"} 
# (This is expected - no token provided)
```

---

## **Test Authentication (Manual Steps)**

### **Step 1: Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "name": "Test User",
    "phone": "9876543210"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "test@example.com", ... },
    "token": "eyJhbGc..."
  }
}
```

### **Step 2: Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

**Save the token from response:**
```bash
TOKEN="eyJhbGc..." # Copy from response
```

### **Step 3: Get Current User (Authenticated)**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Returns your user profile

---

## **Test Store Creation**

### **Step 1: Create Store**
```bash
curl -X POST http://localhost:3000/api/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "Test Store",
    "store_code": "STORE001",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "contact_person": "John",
    "phone": "9876543210",
    "email": "store@example.com"
  }'
```

**Expected:** Store created with ID

### **Step 2: List Stores**
```bash
curl http://localhost:3000/api/stores \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Returns array of stores

### **Step 3: Get Store Details**
```bash
# Replace STORE_ID with actual ID from create response
curl http://localhost:3000/api/stores/STORE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## **Test Campaign Creation**

### **Step 1: Create Campaign**
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_name": "Summer Sale",
    "campaign_code": "SUMMER001",
    "description": "50% discount campaign",
    "start_date": "2026-06-01",
    "end_date": "2026-06-30",
    "total_coupons": 1000,
    "discount_percent": 50,
    "terms": "Valid for one-time use",
    "status": "draft"
  }'
```

**Expected:** Campaign created

### **Step 2: Create Campaign Range**
```bash
curl -X POST http://localhost:3000/api/campaign_range \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "CAMPAIGN_ID",
    "range_start": 1,
    "range_end": 1000,
    "denomination": 50,
    "description": "Main coupon batch"
  }'
```

### **Step 3: Assign Campaign to Store**
```bash
curl -X POST http://localhost:3000/api/campaigns/CAMPAIGN_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "STORE_ID",
    "quantity": 100
  }'
```

---

## **Test Redemption**

### **Step 1: Scan QR Code**
```bash
# Get a QR code from campaign range
curl http://localhost:3000/api/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "QR_CODE_VALUE"
  }'
```

### **Step 2: Redeem Coupon**
```bash
curl -X POST http://localhost:3000/api/redemptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "QR_CODE_VALUE",
    "store_id": "STORE_ID",
    "amount": 50
  }'
```

### **Step 3: Check Redemption History**
```bash
curl http://localhost:3000/api/redemptions/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## **Using Postman Collection**

### **Import Collection**
1. Open Postman
2. Click **Import** (top-left)
3. Select file: `postman/QR-Coupon-Platform.postman_collection.json`
4. Click **Import**

### **Set Environment Variables**
1. Click **Environments** (top-right)
2. Create new environment called "Development"
3. Add variables:
   ```
   base_url = http://localhost:3000
   auth_token = (leave empty, will be filled after login)
   ```

### **Pre-request Script for Auto Token**
In Postman, create a test script that extracts token from login response:
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("auth_token", jsonData.data.token);
}
```

---

## **Common Issues & Solutions**

### ❌ "Cannot POST /api/stores"
**Solution:** 
- Ensure server is running: `npm run dev`
- Check URL is correct: `http://localhost:3000`

### ❌ "Unauthorized" on protected routes
**Solution:**
- Missing `Authorization` header
- Token expired - login again
- Wrong token format (should be "Bearer TOKEN")

### ❌ "Invalid email" or validation errors
**Solution:**
- Check email format is valid
- Password must be 8+ chars with uppercase, number, special char

### ❌ "Duplicate email" when registering
**Solution:**
- Use different email address
- Or delete user from database and retry

### ❌ MongoDB connection error
**Solution:**
```bash
# Check if MongoDB is running
mongod --dbpath ./data

# Or check if docker container running
docker ps | grep mongo
```

### ❌ Port 3000 already in use
**Solution:**
```bash
# Kill process on port 3000
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 $(lsof -t -i:3000)

# Or use different port
npm run dev -- -p 3001
```

---

## **Database Inspection**

### **View Collections**
```bash
# Open MongoDB shell
mongosh

# List databases
show dbs

# Use the database
use qr_coupon_dev

# List collections
show collections

# View documents
db.users.find()
db.stores.find()
db.campaigns.find()
```

---

## **Monitoring API Calls**

### **View Server Logs**
```bash
# Terminal where 'npm run dev' is running
# Look for:
# - POST /api/auth/login
# - GET /api/stores
# - POST /api/campaigns
```

### **Check Request/Response in DevTools**
1. Open browser dev tools (F12)
2. Go to **Network** tab
3. Perform API call
4. Click on request to see:
   - Request headers
   - Request body
   - Response status
   - Response body

---

## **Testing Checklist**

Use this as you test each endpoint:

### Authentication
- [ ] Register works
- [ ] Login works
- [ ] Token obtained
- [ ] Get /me works with token
- [ ] Logout works

### Stores
- [ ] Create store
- [ ] List stores
- [ ] Get store details
- [ ] Update store
- [ ] Get store inventory
- [ ] Add inventory

### Campaigns
- [ ] Create campaign
- [ ] List campaigns
- [ ] Get campaign details
- [ ] Create ranges
- [ ] Assign to store

### Redemptions
- [ ] Scan QR code
- [ ] Redeem coupon
- [ ] View history
- [ ] Reverse redemption

### Analytics
- [ ] Get dashboard data
- [ ] Get analytics
- [ ] Verify calculations

---

## **Next Steps**

✅ **After all tests pass:**
1. Document any bugs found
2. Check response times (< 2 seconds ideal)
3. Verify database transactions
4. Test with multiple users concurrently
5. Move to Phase 5B: Performance Testing

---

**Questions or Issues?** Check logs in terminal where `npm run dev` is running
