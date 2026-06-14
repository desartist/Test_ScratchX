# Customer APIs - Quick Reference Guide

## File Structure
```
app/api/customer/
├── campaign/
│   └── [id]/
│       └── route.js (API 1: GET campaign details)
├── location-verify/
│   └── route.js (API 2: POST verify location)
├── participate/
│   └── route.js (API 3: POST participate in campaign)
├── scratch/
│   ├── generate/
│   │   └── route.js (API 4: POST generate scratch card)
│   ├── reveal/
│   │   └── route.js (API 5: POST reveal scratch card)
│   └── redeem/
│       └── route.js (API 6: POST redeem coupon)
└── __tests__/
    └── customerAPIs.test.js (Comprehensive test suite)
```

## API Endpoints Summary

| # | Method | Endpoint | Purpose | Status Code |
|---|--------|----------|---------|------------|
| 1 | GET | `/api/customer/campaign/:id` | Fetch campaign details | 200, 400, 404, 500 |
| 2 | POST | `/api/customer/location-verify` | Verify customer location | 200, 400, 404, 500 |
| 3 | POST | `/api/customer/participate` | Create participation record | 201, 400, 404, 500 |
| 4 | POST | `/api/customer/scratch/generate` | Generate scratch card | 200, 400, 404, 500 |
| 5 | POST | `/api/customer/scratch/reveal` | Mark card as revealed | 200, 400, 404, 500 |
| 6 | POST | `/api/customer/scratch/redeem` | Redeem the coupon | 200, 400, 404, 500 |

## Quick Test Commands

### Using cURL

#### API 1: Get Campaign Details
```bash
curl -X GET "http://localhost:3000/api/customer/campaign/507f1f77bcf86cd799439011"
```

#### API 2: Verify Location
```bash
curl -X POST "http://localhost:3000/api/customer/location-verify" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "507f1f77bcf86cd799439011",
    "latitude": 28.5355,
    "longitude": 77.1234
  }'
```

#### API 3: Participate
```bash
curl -X POST "http://localhost:3000/api/customer/participate" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "507f1f77bcf86cd799439011",
    "storeId": "507f1f77bcf86cd799439012",
    "customerName": "John Doe",
    "customerMobile": "9876543210",
    "customerEmail": "john@example.com",
    "billAmount": 750,
    "latitude": 28.5355,
    "longitude": 77.1234,
    "consent": true
  }'
```

#### API 4: Generate Scratch Card
```bash
curl -X POST "http://localhost:3000/api/customer/scratch/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "participationId": "507f1f77bcf86cd799439013"
  }'
```

#### API 5: Reveal Scratch Card
```bash
curl -X POST "http://localhost:3000/api/customer/scratch/reveal" \
  -H "Content-Type: application/json" \
  -d '{
    "scratchCardId": "507f1f77bcf86cd799439014",
    "participationId": "507f1f77bcf86cd799439013"
  }'
```

#### API 6: Redeem Coupon
```bash
curl -X POST "http://localhost:3000/api/customer/scratch/redeem" \
  -H "Content-Type: application/json" \
  -d '{
    "scratchCardId": "507f1f77bcf86cd799439014",
    "participationId": "507f1f77bcf86cd799439013"
  }'
```

## Running Tests

### Run All Tests
```bash
npm test -- app/api/customer/__tests__/customerAPIs.test.js
```

### Run Specific Test Suite
```bash
npm test -- app/api/customer/__tests__/customerAPIs.test.js -t "API 1"
npm test -- app/api/customer/__tests__/customerAPIs.test.js -t "API 2"
npm test -- app/api/customer/__tests__/customerAPIs.test.js -t "API 3"
```

## Key Features

### Validation
- ✓ Required fields validation
- ✓ Data type validation
- ✓ Format validation (mobile: 10 digits)
- ✓ Coordinate validation (-90 to 90 lat, -180 to 180 lon)
- ✓ Expiration checks
- ✓ Status flow validation

### Error Handling
- ✓ JSON parsing errors (400)
- ✓ Validation errors (400)
- ✓ Not found errors (404)
- ✓ Server errors (500)
- ✓ Consistent error response format

### Data Consistency
- ✓ MongoDB transactions (in APIs 3, 5, 6)
- ✓ Atomic operations
- ✓ Automatic rollback on error
- ✓ Inventory synchronization

### Services Used
- ✓ inventoryManagementService
  - consumeInventory() - API 3
  - redeemInventory() - API 6
- ✓ locationVerificationService
  - verifyCustomerLocation() - API 2

## Status Flows

### Participation Lifecycle
```
initiated (created) → scratched (generate called)
    ↓
scratched → revealed (reveal called)
    ↓
revealed → redeemed (redeem called)
```

### Scratch Card Lifecycle
```
generated (created) → revealed (reveal called)
    ↓
revealed → redeemed (redeem called)
    ↓
generated → expired (5 min timeout)
```

## Important Constants

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Expiry Duration | 5 minutes | ScratchCardRecord | Configurable |
| Allowed Radius | 2000 meters | locationVerificationService | Configurable |
| Mobile Format | 10 digits | Model validation | No international format |
| Max Bill Amount | Unlimited | Model validation | >= 0 validation |
| Campaign ID Length | 24 chars | MongoDB ObjectId | Validates format |

## Database Collections

### CustomerParticipation
- Indexes: campaign_id, merchant_id, store_id, customer_mobile, status
- Status enum: initiated, scratched, revealed, redeemed, expired, failed
- TTL: None (manual cleanup)

### ScratchCardRecord
- Indexes: campaign_id, merchant_id, store_id, status, expires_at
- Status enum: generated, revealed, redeemed, expired
- TTL: 30 days (automatic deletion)

## Common Error Messages

| Error | Status | Cause |
|-------|--------|-------|
| Invalid campaign ID format | 400 | ID not 24 chars |
| Campaign not found | 404 | Campaign doesn't exist |
| Campaign is not active | 400 | Wrong campaign status |
| storeId is required | 400 | Missing field |
| Invalid coordinate ranges | 400 | Lat/Lon out of range |
| Mobile must be 10 digits | 400 | Wrong format |
| Scratch card has expired | 400 | Beyond expires_at |
| Scratch card not found | 404 | Doesn't exist |
| Cannot redeem more than used | 400 | Inventory issue |

## Testing Checklist

- [ ] All 6 APIs respond with correct status codes
- [ ] Validation errors return 400
- [ ] Not found errors return 404
- [ ] Valid requests return correct data
- [ ] Transactions rollback on error
- [ ] Inventory is consumed correctly
- [ ] Expiration dates are set properly
- [ ] Status transitions are correct
- [ ] Database records are created
- [ ] Location verification works
- [ ] Participation records include scratch card ID
- [ ] Coordinates are validated properly

## Development Tips

1. **Test Data Setup:** Create test campaign, store, and ranges before testing
2. **Valid IDs:** Use ObjectId format (24 hex characters)
3. **Coordinate Testing:** Use real coordinates or test ranges (-90 to 90, -180 to 180)
4. **Expiration Testing:** Check current time vs expires_at field
5. **Status Testing:** Verify status flow before calling next API
6. **Transaction Testing:** Verify rollback with database in error state

## Deployment Checklist

- [ ] All files created in `app/api/customer/`
- [ ] Test suite runs successfully
- [ ] All validations working
- [ ] Database models updated
- [ ] Services integrated
- [ ] Error handling tested
- [ ] Transaction rollback tested
- [ ] Status flows validated
- [ ] Documentation complete
- [ ] API documentation updated
- [ ] Monitoring configured
- [ ] Logging configured

## Files Statistics

| File | Lines | Type |
|------|-------|------|
| API 1 (campaign/:id) | 85 | Implementation |
| API 2 (location-verify) | 102 | Implementation |
| API 3 (participate) | 267 | Implementation |
| API 4 (scratch/generate) | 103 | Implementation |
| API 5 (scratch/reveal) | 134 | Implementation |
| API 6 (scratch/redeem) | 173 | Implementation |
| Test Suite | 735 | Tests |
| **Total** | **1,599** | **All Files** |

## Next Steps

1. Run test suite to verify implementation
2. Create test data in database
3. Test each API endpoint manually
4. Verify transaction rollback behavior
5. Check error handling edge cases
6. Review database indexes for performance
7. Set up monitoring and alerting
8. Deploy to staging environment
9. Conduct load testing
10. Deploy to production

## Support

For questions or issues:
1. Check CUSTOMER_APIS_IMPLEMENTATION.md for detailed docs
2. Review test cases in customerAPIs.test.js
3. Check error messages in API responses
4. Verify database records created properly
5. Check service integration (inventory, location)
