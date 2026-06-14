# QR-Coupon-Platform API Collection - Postman Guide

Complete API testing collection for the QR Coupon/Scratch Card Platform with comprehensive documentation, environment setup, and testing workflows.

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Environment Variables](#environment-variables)
3. [Workflow Guide](#workflow-guide)
4. [Testing Checklist](#testing-checklist)
5. [Troubleshooting](#troubleshooting)
6. [API Endpoints Reference](#api-endpoints-reference)

---

## Setup Instructions

### Prerequisites

- Postman Desktop Application (v9.0 or higher recommended)
- Running instance of the QR-Coupon-Platform API
- Valid user credentials for testing

### Step 1: Import the Collection

1. Open Postman
2. Click **Import** button (top-left)
3. Select **File** tab
4. Navigate to `QR-Coupon-Platform.postman_collection.json`
5. Click **Open** and then **Import**

The collection will be imported with all 30+ API endpoints organized in logical folders.

### Step 2: Create Postman Environment

1. Click **Environments** in the left sidebar
2. Click **Create New** or **+** button
3. Name it `QR-Coupon-Dev` (or your preferred name)
4. Add the following variables:

| Variable | Initial Value | Type |
|----------|---------------|------|
| `base_url` | `http://localhost:3000` | String |
| `user_id` | (empty) | String |
| `store_id` | (empty) | String |
| `campaign_id` | (empty) | String |
| `redemption_id` | (empty) | String |
| `user_role` | `Merchant` | String |

5. Click **Save**

### Step 3: Select Environment

1. In Postman, locate the environment dropdown (top-right corner)
2. Select `QR-Coupon-Dev` (or your created environment name)
3. Verify that `base_url` and other variables appear green/active

### Step 4: Configure for Different Environments

#### Development
```
base_url = http://localhost:3000
```

#### Staging
```
base_url = https://staging-api.qrcoupon.com
```

#### Production
```
base_url = https://api.qrcoupon.com
```

---

## Environment Variables

### Variable Description

| Variable | Purpose | Example |
|----------|---------|---------|
| `base_url` | API server address | `http://localhost:3000` |
| `user_id` | Current authenticated user ID | `507f1f77bcf86cd799439011` |
| `store_id` | Active store for operations | `507f1f77bcf86cd799439012` |
| `campaign_id` | Active campaign for operations | `507f1f77bcf86cd799439013` |
| `redemption_id` | Redemption record ID for reversals | `507f1f77bcf86cd799439014` |
| `user_role` | Current user's role | `Merchant`, `Store_Staff`, `Manager`, `Super_Admin` |

### Auto-Setting Variables

Variables are automatically set by responses from certain requests:

**Login Request** - Sets `user_id` from response
```javascript
// Pre-request Script or Tests can be configured to extract and set:
// pm.environment.set('user_id', pm.response.json().data.user._id);
```

**Create Store** - Captures `store_id`
**Create Campaign** - Captures `campaign_id`
**Create Redemption** - Captures `redemption_id`

---

## Workflow Guide

### Recommended Testing Order

Follow this sequence to properly test the API:

#### 1. Authentication Flow (Start Here)

```
POST /api/auth/login
  ↓ (sets user_id in environment)
GET /api/auth/me (optional - verify login)
```

**Test Data:**
```json
{
  "email": "merchant@example.com",
  "password": "password123"
}
```

#### 2. Store Management

```
POST /api/stores (Create Store)
  ↓ (copy store_id from response)
GET /api/stores (List all stores)
GET /api/stores/{{store_id}} (View specific store)
PATCH /api/stores/{{store_id}} (Update store details)
PATCH /api/stores/{{store_id}}/inventory (Adjust inventory)
```

**Create Store Payload:**
```json
{
  "store_name": "Mumbai Central",
  "store_code": "STR001",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "contact_person": "John Doe",
  "contact_number": "9876543210"
}
```

#### 3. Campaign Management

```
POST /api/campaigns (Create Campaign)
  ↓ (copy campaign_id from response)
GET /api/campaigns (List campaigns)
GET /api/campaigns/{{campaign_id}} (Get campaign details)
POST /api/campaigns/{{campaign_id}}/assign (Assign to stores)
```

**Create Campaign Payload:**
```json
{
  "name": "Summer Sale 2026",
  "description": "Summer promotional campaign",
  "campaignType": "seasonal",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "totalQRCodes": 1000,
  "discountPercentage": 15
}
```

#### 4. Inventory Allocation

```
PATCH /api/inventory/allocate (Allocate to campaign)
PATCH /api/inventory/allocate (Allocate to store)
GET /api/inventory/status?type=campaign (Check campaign inventory)
GET /api/inventory/status?type=store (Check store inventory)
GET /api/inventory/history (View transaction history)
```

#### 5. Redemptions

```
POST /api/redemptions (Single redemption)
POST /api/redemptions (Bulk redemptions)
GET /api/redemptions/history (View redemption history)
GET /api/redemptions/stats (Get statistics)
POST /api/redemptions/reverse (Reverse a redemption)
```

#### 6. Analytics

```
GET /api/analytics/inventory?type=merchant (Merchant inventory)
GET /api/analytics/inventory?type=campaign (Campaign breakdown)
GET /api/analytics/inventory?type=store (Store breakdown)
GET /api/analytics/redemptions?type=merchant (Redemption stats)
GET /api/analytics/redemptions?type=campaign (Campaign redemptions)
GET /api/analytics/redemptions?type=store (Store redemptions)
```

---

## Testing Checklist

### Happy Path Testing (Successful Scenarios)

Use this checklist to verify normal operation:

#### Authentication
- [ ] Login with valid credentials returns 200 status
- [ ] Response includes user information
- [ ] `user_id` is captured and available in environment

#### Store Operations
- [ ] Create store returns 201 status
- [ ] Store ID is correctly captured from response
- [ ] List stores shows all created stores
- [ ] Get store by ID returns correct details
- [ ] Update store successfully modifies data
- [ ] Adjust inventory (add) works correctly

#### Campaign Operations
- [ ] Create campaign returns 201 status
- [ ] Campaign ID is correctly captured
- [ ] List campaigns returns merchant's campaigns only
- [ ] Get campaign details includes all fields
- [ ] Assign campaign to stores returns 200

#### Inventory Operations
- [ ] Allocate to campaign succeeds with valid data
- [ ] Allocate to store succeeds with valid data
- [ ] Inventory status returns accurate counts
- [ ] History shows all transactions

#### Redemptions
- [ ] Single redemption succeeds with valid data
- [ ] Bulk redemption processes multiple items
- [ ] Redemption history shows all records
- [ ] Statistics return accurate aggregations
- [ ] Reverse redemption restores inventory

#### Analytics
- [ ] Merchant analytics shows aggregated data
- [ ] Campaign analytics shows campaign breakdown
- [ ] Store analytics shows store breakdown
- [ ] All responses include expected metrics

### Error Handling Testing

Test these failure scenarios:

#### Authentication Errors
- [ ] Invalid email returns 401
- [ ] Invalid password returns 401
- [ ] Inactive account returns 403
- [ ] Missing credentials return 400

#### Authorization Errors
- [ ] Missing x-user-role header returns 401
- [ ] Missing x-user-id header returns 401
- [ ] Insufficient permissions return 403

#### Validation Errors
- [ ] Missing required fields return 400
- [ ] Invalid field values return 400
- [ ] Invalid campaign ID returns 404
- [ ] Invalid store ID returns 404

#### Business Logic Errors
- [ ] Allocating more inventory than available fails
- [ ] Redeeming invalid scratch card fails
- [ ] Assigning campaign to non-existent store fails
- [ ] Reversing completed redemption succeeds

### Authorization Testing

Verify role-based access control:

#### Merchant Role
- [ ] Can create stores and campaigns
- [ ] Cannot create other merchant's resources
- [ ] Can view only own campaigns
- [ ] Can perform all redemption operations

#### Store Staff Role
- [ ] Can perform redemptions at assigned store
- [ ] Cannot create campaigns
- [ ] Cannot modify inventory allocations

#### Manager Role
- [ ] Can view all merchant data
- [ ] Can reverse redemptions
- [ ] Cannot modify campaign settings

#### Super Admin Role
- [ ] Can access all resources
- [ ] Can view any merchant's data
- [ ] Can create resources for any merchant

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "401 Unauthorized" Response

**Problem:** Getting 401 status on protected endpoints

**Solutions:**
1. Verify you've successfully logged in
2. Check `user_id` is set in environment variables
3. Ensure `x-user-role` header is correct for your user type
4. Verify `x-user-id` header is set in request

**Debug Steps:**
```
1. Run POST /api/auth/login
2. Check response status is 200
3. Copy user_id from response
4. Set it manually in environment: Environment > Select env > Edit > user_id
5. Retry the failed request
```

#### 2. "403 Forbidden" Response

**Problem:** Getting 403 status (permission denied)

**Solutions:**
1. Verify user role matches operation requirements
2. Store Staff cannot create campaigns (Merchant only)
3. Users cannot access other merchant's resources
4. Check role-based permissions in documentation

**Fix:**
```
- Use Merchant role for campaign operations
- Use Store_Staff role for redemptions
- Use Manager role for reversals
- Use Super_Admin for system operations
```

#### 3. "404 Not Found" Response

**Problem:** Resource not found errors

**Solutions:**
1. Verify the resource ID exists
2. Ensure IDs are correctly set in environment variables
3. Check you're not using IDs from a different environment
4. Verify resource belongs to current merchant

**Debug:**
```
GET /api/stores - List all stores
GET /api/campaigns - List all campaigns
Check IDs match the ones you're trying to use
```

#### 4. "400 Bad Request" Response

**Problem:** Request validation failures

**Check:**
1. All required fields are present in body
2. Field values are correct type (string, number, date)
3. Date format is ISO 8601 (2026-06-01T00:00:00Z)
4. No typos in field names

**Example Fix:**
```json
// Wrong - missing required field
{"campaignType": "seasonal"}

// Correct - all required fields
{
  "name": "Campaign",
  "campaignType": "seasonal",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "totalQRCodes": 1000
}
```

#### 5. Environment Variables Not Working

**Problem:** Variables showing as `{{variable_name}}` in requests

**Solution:**
1. Click environment selector (top-right)
2. Select your environment (should show name with green dot)
3. Click "x" if environment is not selected
4. Re-select it

**Verify:**
```
1. Pre-request script runs for variable substitution
2. Check variable is defined in environment
3. Spelling must match exactly (case-sensitive)
4. Save environment after making changes
```

#### 6. "422 Unprocessable Entity" Response

**Problem:** Data validation error from server

**Check:**
1. Date ranges are valid (startDate < endDate)
2. Quantities are positive numbers
3. IDs are valid MongoDB ObjectIds
4. Email format is valid
5. Phone number format matches requirements

#### 7. CORS or Network Errors

**Problem:** Getting CORS errors or connection refused

**Solutions:**
1. Verify API server is running on correct port
2. Check `base_url` environment variable is correct
3. Verify server is not behind authentication firewall
4. Check network connectivity

**Test:**
```
1. Open base_url in browser: http://localhost:3000
2. Should return some response (even if 404)
3. If connection refused, server is not running
4. Check server logs for startup errors
```

#### 8. Token/Session Expired

**Problem:** Requests return 401 after some time

**Solution:**
1. Login again with POST /api/auth/login
2. This will set new user_id
3. Continue with subsequent requests

**Prevent:**
```
- For long testing sessions, re-run login every 30 minutes
- Check if API has token refresh endpoint
- Store refresh tokens if available
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| POST | `/api/auth/login` | None | Login with email/password |
| GET | `/api/auth/me` | Any | Get current user info |

### Stores

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| POST | `/api/stores` | Merchant, Super_Admin | Create new store |
| GET | `/api/stores` | Merchant, Super_Admin, Manager | List stores |
| GET | `/api/stores/{id}` | Merchant, Super_Admin, Manager | Get store details |
| PATCH | `/api/stores/{id}` | Merchant, Super_Admin | Update store |
| PATCH | `/api/stores/{id}/inventory` | Merchant, Super_Admin | Adjust inventory |

### Campaigns

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| POST | `/api/campaigns` | Merchant | Create campaign |
| GET | `/api/campaigns` | Merchant | List campaigns |
| GET | `/api/campaigns/{id}` | Merchant | Get campaign details |
| POST | `/api/campaigns/{id}/assign` | Merchant | Assign to stores |

### Inventory

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| PATCH | `/api/inventory/allocate` | Merchant, Manager | Allocate inventory |
| GET | `/api/inventory/status` | Any | Get inventory status |
| GET | `/api/inventory/history` | Any | Get transaction history |

### Redemptions

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| POST | `/api/redemptions` | Store_Staff, Manager | Redeem scratch cards |
| GET | `/api/redemptions/history` | Merchant, Manager | Get redemption history |
| GET | `/api/redemptions/stats` | Merchant, Manager | Get statistics |
| POST | `/api/redemptions/reverse` | Manager, Super_Admin | Reverse redemption |

### Analytics

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| GET | `/api/analytics/inventory` | Any | Get inventory analytics |
| GET | `/api/analytics/redemptions` | Any | Get redemption analytics |

### Admin

| Method | Endpoint | Role Required | Description |
|--------|----------|----------------|-------------|
| GET | `/api/dashboard/super-admin` | Super_Admin | System statistics |
| GET | `/api/dashboard/admin` | Admin | Admin dashboard |

---

## Sample Test Scenarios

### Scenario 1: Complete Campaign Flow

**Objective:** Test full workflow from creation to analytics

```
1. Login (POST /api/auth/login)
2. Create Store (POST /api/stores)
3. Create Campaign (POST /api/campaigns)
4. Assign Campaign to Store (POST /api/campaigns/{id}/assign)
5. Allocate Inventory to Campaign (PATCH /api/inventory/allocate)
6. Allocate Inventory to Store (PATCH /api/inventory/allocate)
7. Perform Redemption (POST /api/redemptions)
8. View Analytics (GET /api/analytics/*)
```

### Scenario 2: Bulk Redemption and Reversal

**Objective:** Test bulk processing and reversal

```
1. Login and setup (stores, campaigns, allocations)
2. Bulk Redeem Scratch Cards (POST /api/redemptions with multiple items)
3. Get Redemption History (GET /api/redemptions/history)
4. Reverse One Redemption (POST /api/redemptions/reverse)
5. Verify Inventory Restored (GET /api/inventory/status)
```

### Scenario 3: Multi-Store Campaign Distribution

**Objective:** Test campaign distribution across stores

```
1. Create Campaign
2. Create 3 Stores
3. Assign Campaign to All Stores (POST /api/campaigns/{id}/assign)
4. Allocate Inventory to Campaign
5. Allocate Inventory to Each Store
6. Generate Analytics by Store (GET /api/analytics/inventory?type=store)
```

---

## Advanced Topics

### Pre-request Scripts

Postman allows automation via pre-request scripts. Example for extracting IDs:

```javascript
// Automatically set user_id from previous response
if (pm.response && pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.data && jsonData.data._id) {
        pm.environment.set('user_id', jsonData.data._id);
    }
}
```

### Tests/Assertions

Add test scripts to validate responses:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.equal(true);
});

pm.test("Response data is not empty", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.not.be.empty;
});
```

### Newman CLI Testing

Run collection from command line:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run QR-Coupon-Platform.postman_collection.json \
  -e environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

---

## Support and Resources

### Documentation Links
- API Documentation: `/api/docs` (if available)
- GitHub Repository: [project-repo]
- Issue Tracker: [github-issues]

### Getting Help
1. Check Troubleshooting section above
2. Review API endpoint descriptions
3. Check server logs for detailed error messages
4. Contact development team with error details

### Best Practices

1. **Always authenticate first** - Run login before testing other endpoints
2. **Set environment variables** - Reduces manual ID copying
3. **Test systematically** - Follow the recommended testing order
4. **Use meaningful request names** - Makes debugging easier
5. **Document custom tests** - Add comments to test scripts
6. **Keep credentials secure** - Don't commit real passwords to version control
7. **Test with realistic data** - Use actual field formats and ranges

---

## Version History

- **v1.0** (2026-05-26) - Initial release with 30+ endpoints
  - Authentication endpoints
  - Store management
  - Campaign management
  - Inventory allocation
  - Redemption processing
  - Analytics endpoints
  - Admin dashboard

---

**Last Updated:** 2026-05-26
**Collection Version:** 1.0
**API Version:** v1
