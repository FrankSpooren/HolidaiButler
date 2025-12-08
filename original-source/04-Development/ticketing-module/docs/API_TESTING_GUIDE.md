# HolidaiButler Ticketing API - Testing Guide

**Last Updated**: 2025-11-17
**Status**: Phase 5 Complete - Ready for Frontend Integration
**API Version**: 1.0.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Authentication](#authentication)
4. [Test Collections](#test-collections)
5. [Complete Booking Flow Test](#complete-booking-flow-test)
6. [Individual Endpoint Tests](#individual-endpoint-tests)
7. [Error Scenario Testing](#error-scenario-testing)
8. [Performance Testing](#performance-testing)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Backend server running on `http://localhost:5000`
- MySQL database deployed and migrations run
- Valid JWT authentication token
- Postman, Bruno, or curl installed

### Import Test Collection

**Option 1: Postman**
```bash
# Import the collection file
File → Import → HolidaiButler_Ticketing_API.postman_collection.json
```

**Option 2: Bruno**
```bash
# Open collection directory
bruno-cli collection open ./docs/
```

**Option 3: Swagger UI**
```bash
# View interactive API documentation
http://localhost:5000/api-docs
```

### Set Environment Variables

Create environment with these variables:
```json
{
  "base_url": "http://localhost:5000/api/v1/ticketing",
  "jwt_token": "YOUR_JWT_TOKEN_HERE",
  "user_id": "1",
  "poi_id": "123"
}
```

---

## Environment Setup

### 1. Start Backend Server

```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend"

# Install dependencies (if not already done)
npm install

# Start server
npm start
```

Expected output:
```
✅ Connected to MySQL database
🎫 Ticketing routes mounted at /api/v1/ticketing
🚀 Server running on port 5000
```

### 2. Verify Database Connection

```bash
# Check database tables
node list-tables.js
```

Expected tables:
- ticketing_bookings
- ticketing_tickets
- ticketing_availability

### 3. Test Health Endpoint

```bash
curl http://localhost:5000/api/v1/ticketing/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T14:30:00Z",
  "uptime": 3600
}
```

---

## Authentication

### Obtaining JWT Token

**Method 1: Via Main Auth Service**
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "your_password"
}
```

Response contains `token` field - copy this value.

**Method 2: For Testing (if auth service not ready)**

Create a test token using existing user ID:
```javascript
// In backend, create a utility script
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 1, email: 'test@example.com', role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
console.log(token);
```

### Using Token in Requests

**Postman/Bruno**: Set in Authorization tab → Bearer Token
**curl**: Add header `-H "Authorization: Bearer YOUR_TOKEN"`

---

## Test Collections

### Collection Structure

```
HolidaiButler Ticketing API/
├── Health & Status/
│   └── Health Check
├── Availability Management/
│   ├── Check Availability
│   ├── Get Availability (Single Date)
│   └── Get Availability Range
├── Booking Lifecycle/
│   ├── Create Booking
│   ├── Get Booking by ID
│   ├── Confirm Booking
│   ├── Cancel Booking
│   └── Get User Bookings
├── Ticket Management/
│   ├── Get User Tickets
│   ├── Get Ticket by ID
│   ├── Resend Ticket Email
│   ├── Add Ticket to Wallet
│   └── Validate Ticket (POI Staff)
├── Partner Integration/
│   ├── Sync Partner Inventory
│   └── Partner Webhook Receiver
└── Error Scenarios/
    ├── Invalid Booking
    ├── Unauthorized Access
    ├── Not Found
    └── Insufficient Availability
```

### Running Full Collection

**Postman**:
```
1. Select collection "HolidaiButler Ticketing API"
2. Click "Run" button
3. Select environment
4. Click "Run HolidaiButler Ticketing API"
```

**Bruno CLI**:
```bash
bruno run --env local
```

**Expected Results**:
- ✅ 16/16 tests passing
- ⏱️ Total time < 10 seconds
- 🟢 All status codes correct

---

## Complete Booking Flow Test

This tests the entire user journey from availability check to ticket validation.

### Step 1: Check Availability

```bash
curl -X POST http://localhost:5000/api/v1/ticketing/availability/check \
  -H "Content-Type: application/json" \
  -d '{
    "poiId": 123,
    "date": "2025-12-25",
    "timeslot": "10:00-12:00",
    "quantity": 2
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "available": true,
    "capacity": {
      "total": 100,
      "available": 85,
      "booked": 10,
      "reserved": 5
    },
    "pricing": {
      "basePrice": 25.00,
      "finalPrice": 30.00,
      "currency": "EUR"
    },
    "requestedQuantity": 2,
    "canBook": true
  }
}
```

**Validations**:
- ✅ `available` is `true`
- ✅ `canBook` is `true`
- ✅ `capacity.available >= requestedQuantity`
- ✅ Response time < 200ms (cached responses < 50ms)

---

### Step 2: Create Booking

```bash
curl -X POST http://localhost:5000/api/v1/ticketing/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "poiId": 123,
    "date": "2025-12-25",
    "timeslot": "10:00-12:00",
    "quantity": 2,
    "ticketType": "single",
    "guestInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+31612345678"
    },
    "guests": {
      "adults": 2,
      "children": 0,
      "infants": 0
    }
  }'
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "bookingReference": "BK-2025-001234",
    "status": "pending",
    "paymentStatus": "pending",
    "reservation": {
      "expiresAt": "2025-11-17T14:45:00Z",
      "reservedCapacity": 2
    },
    "totalAmount": 60.00,
    "currency": "EUR",
    "paymentUrl": "https://payment.holidaibutler.com/checkout/..."
  }
}
```

**Validations**:
- ✅ Status code is 201
- ✅ `status` is "pending"
- ✅ `bookingReference` matches pattern `BK-YYYY-XXXXXX`
- ✅ `reservation.expiresAt` is ~15 minutes from now
- ✅ `paymentUrl` is provided
- ✅ Response time < 800ms

**Save for next steps**: `booking.id` → use as `{{booking_id}}`

---

### Step 3: Verify Booking Created

```bash
curl http://localhost:5000/api/v1/ticketing/bookings/456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "bookingReference": "BK-2025-001234",
    "status": "pending",
    "bookingDate": "2025-12-25",
    "quantity": 2,
    "poi": {
      "id": 123,
      "name": "Terra Mitica",
      "location": "Benidorm, Spain"
    }
  }
}
```

**Validations**:
- ✅ Booking details match creation request
- ✅ POI information is populated
- ✅ Response time < 200ms

---

### Step 4: Simulate Payment Completion

*In production, this would be triggered by payment webhook*

For testing, directly call confirm endpoint:

```bash
curl -X POST http://localhost:5000/api/v1/ticketing/bookings/456/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "paymentTransactionId": "txn_test_abc123xyz"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "status": "confirmed",
      "paymentStatus": "paid",
      "paymentTransactionId": "txn_test_abc123xyz",
      "confirmedAt": "2025-11-17T14:32:00Z"
    },
    "tickets": [
      {
        "id": 789,
        "ticketNumber": "HB-2025-001234-01",
        "status": "active",
        "qrCodeData": "ENCRYPTED_PAYLOAD_HERE",
        "qrCodeImageUrl": "https://storage.holidaibutler.com/tickets/qr/789.png",
        "validFrom": "2025-12-25T00:00:00Z",
        "validUntil": "2025-12-25T23:59:59Z"
      },
      {
        "id": 790,
        "ticketNumber": "HB-2025-001234-02",
        "status": "active",
        "qrCodeData": "ENCRYPTED_PAYLOAD_HERE",
        "qrCodeImageUrl": "https://storage.holidaibutler.com/tickets/qr/790.png",
        "validFrom": "2025-12-25T00:00:00Z",
        "validUntil": "2025-12-25T23:59:59Z"
      }
    ]
  }
}
```

**Validations**:
- ✅ Booking status changed to "confirmed"
- ✅ Payment status is "paid"
- ✅ Tickets array has `quantity` items (2)
- ✅ Each ticket has unique `ticketNumber`
- ✅ Each ticket has QR code image URL
- ✅ Ticket validity dates match booking date
- ✅ Response time < 1000ms

**Save for next steps**: `tickets[0].id` → use as `{{ticket_id}}`

---

### Step 5: Verify Tickets Generated

```bash
curl http://localhost:5000/api/v1/ticketing/tickets/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "ticketNumber": "HB-2025-001234-01",
      "status": "active",
      "holderName": "John Doe",
      "holderEmail": "john@example.com",
      "poi": {
        "name": "Terra Mitica",
        "location": "Benidorm, Spain"
      }
    },
    {
      "id": 790,
      "ticketNumber": "HB-2025-001234-02",
      "status": "active",
      "holderName": "John Doe",
      "holderEmail": "john@example.com",
      "poi": {
        "name": "Terra Mitica",
        "location": "Benidorm, Spain"
      }
    }
  ],
  "count": 2
}
```

---

### Step 6: Get Specific Ticket

```bash
curl http://localhost:5000/api/v1/ticketing/789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 789,
    "ticketNumber": "HB-2025-001234-01",
    "bookingId": 456,
    "status": "active",
    "qrCodeImageUrl": "https://storage.holidaibutler.com/tickets/qr/789.png",
    "validFrom": "2025-12-25T00:00:00Z",
    "validUntil": "2025-12-25T23:59:59Z",
    "poi": {
      "name": "Terra Mitica",
      "location": "Benidorm, Spain"
    }
  }
}
```

---

### Step 7: Validate Ticket (POI Staff)

```bash
curl -X POST http://localhost:5000/api/v1/ticketing/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer POI_STAFF_JWT_TOKEN" \
  -d '{
    "qrCodeData": "ENCRYPTED_QR_PAYLOAD_FROM_TICKET",
    "poiId": 123
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "ticket": {
      "id": 789,
      "ticketNumber": "HB-2025-001234-01",
      "holderName": "John Doe",
      "status": "active"
    },
    "validationDetails": {
      "poiMatch": true,
      "dateValid": true,
      "alreadyUsed": false,
      "canAccess": true
    },
    "validatedAt": "2025-12-25T10:15:00Z"
  }
}
```

**Validations**:
- ✅ `valid` is `true`
- ✅ All validation checks pass
- ✅ Ticket status updated to "used"
- ✅ `usedAt` timestamp recorded
- ✅ Response time < 100ms

---

### Step 8: Cancel Booking (Optional)

```bash
curl -X POST http://localhost:5000/api/v1/ticketing/bookings/456/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reason": "Testing cancellation flow"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 456,
      "status": "cancelled",
      "cancelledAt": "2025-11-17T14:35:00Z"
    },
    "refund": {
      "amount": 60.00,
      "currency": "EUR",
      "refundId": "ref_xyz789",
      "status": "pending"
    },
    "capacityReleased": 2
  }
}
```

**Validations**:
- ✅ Booking status is "cancelled"
- ✅ Refund initiated
- ✅ Capacity released back to availability
- ✅ All associated tickets marked as "cancelled"

---

## Individual Endpoint Tests

### Availability Endpoints

#### 1. Check Availability (Specific Date/Time)

**Request**:
```bash
POST /api/v1/ticketing/availability/check
```

**Test Cases**:

| Case | Input | Expected Result |
|------|-------|-----------------|
| Valid request | poiId=123, date=2025-12-25, quantity=2 | 200, available=true |
| Missing POI ID | date=2025-12-25, quantity=2 | 400, validation error |
| Past date | poiId=123, date=2020-01-01, quantity=2 | 400, "Date must be in future" |
| Quantity = 0 | poiId=123, date=2025-12-25, quantity=0 | 400, "Quantity must be >= 1" |
| Exceeds capacity | poiId=123, date=2025-12-25, quantity=10000 | 200, available=false |

---

#### 2. Get Availability (Single Date)

**Request**:
```bash
GET /api/v1/ticketing/availability/123?date=2025-12-25&timeslot=10:00-12:00
```

**Test Cases**:
- ✅ Valid POI and date → Returns availability data
- ✅ No availability record → 404 Not Found
- ✅ Invalid date format → 400 Bad Request
- ✅ Response includes capacity, pricing, restrictions

---

#### 3. Get Availability Range

**Request**:
```bash
GET /api/v1/ticketing/availability/123/range?from=2025-12-01&to=2025-12-31
```

**Test Cases**:
- ✅ Valid range (1 month) → Returns array of availability
- ✅ Start date after end date → 400 Bad Request
- ✅ Range > 90 days → 400 "Range too large"
- ✅ Results sorted by date ascending
- ✅ Response time < 500ms for 30-day range

---

### Booking Endpoints

#### 4. Create Booking

**Request**:
```bash
POST /api/v1/ticketing/bookings
```

**Test Cases**:

| Case | Expected Result |
|------|-----------------|
| Valid booking | 201, booking created, capacity reserved |
| Missing auth token | 401 Unauthorized |
| Invalid guest email | 400 "Invalid email format" |
| No availability | 409 "Insufficient availability" |
| Duplicate booking (same user, POI, date) | 201 (allowed - users can book multiple) |

---

#### 5. Get Booking by ID

**Request**:
```bash
GET /api/v1/ticketing/bookings/456
```

**Test Cases**:
- ✅ Own booking → 200, full details returned
- ✅ Other user's booking → 403 Forbidden
- ✅ Non-existent ID → 404 Not Found
- ✅ Admin role → 200 (can view any booking)

---

#### 6. Confirm Booking

**Request**:
```bash
POST /api/v1/ticketing/bookings/456/confirm
```

**Test Cases**:
- ✅ Valid pending booking → 200, tickets generated
- ✅ Already confirmed → 400 "Already confirmed"
- ✅ Expired reservation → 409 "Reservation expired"
- ✅ Invalid transaction ID → 400 "Invalid payment"

---

#### 7. Cancel Booking

**Request**:
```bash
POST /api/v1/ticketing/bookings/456/cancel
```

**Test Cases**:
- ✅ Pending booking → 200, cancelled, no refund
- ✅ Confirmed booking (within policy) → 200, cancelled, refund initiated
- ✅ Confirmed booking (outside policy) → 400 "Non-refundable"
- ✅ Already cancelled → 400 "Already cancelled"
- ✅ Past date → 400 "Cannot cancel past booking"

---

#### 8. Get User Bookings

**Request**:
```bash
GET /api/v1/ticketing/bookings/user/1?status=confirmed&limit=50
```

**Test Cases**:
- ✅ Valid user ID → 200, array of bookings
- ✅ Filter by status → Only matching bookings returned
- ✅ Date range filter → Only bookings in range
- ✅ Pagination (limit, offset) → Correct subset returned
- ✅ Empty result → 200, empty array

---

### Ticket Endpoints

#### 9. Get User Tickets

**Request**:
```bash
GET /api/v1/ticketing/tickets/user/1?status=active
```

**Test Cases**:
- ✅ Valid user → 200, array of tickets
- ✅ Status filter → Only active tickets returned
- ✅ Includes QR code URLs → All tickets have qrCodeImageUrl
- ✅ POI details populated → Includes poi.name, poi.location

---

#### 10. Get Ticket by ID

**Request**:
```bash
GET /api/v1/ticketing/789
```

**Test Cases**:
- ✅ Own ticket → 200, full details
- ✅ Other user's ticket → 403 Forbidden
- ✅ Non-existent → 404 Not Found

---

#### 11. Resend Ticket Email

**Request**:
```bash
POST /api/v1/ticketing/789/resend
```

**Test Cases**:
- ✅ Valid ticket → 200, email sent
- ✅ Rate limiting → 429 "Too many requests" (after 5 resends in 1 hour)
- ✅ Cancelled ticket → 400 "Cannot resend cancelled ticket"

---

#### 12. Add Ticket to Wallet

**Request**:
```bash
POST /api/v1/ticketing/789/wallet
Body: { "walletType": "apple" }
```

**Test Cases**:
- ✅ Apple Wallet → 200, .pkpass URL returned
- ✅ Google Pay → 200, .jwt URL returned
- ✅ Invalid wallet type → 400 "Unsupported wallet type"

---

#### 13. Validate Ticket

**Request**:
```bash
POST /api/v1/ticketing/validate
Body: { "qrCodeData": "...", "poiId": 123 }
```

**Test Cases**:
- ✅ Valid ticket, correct POI → 200, valid=true
- ✅ Valid ticket, wrong POI → 200, valid=false (poiMatch=false)
- ✅ Already used ticket → 200, valid=false (alreadyUsed=true)
- ✅ Expired ticket → 200, valid=false (dateValid=false)
- ✅ Invalid QR data → 400 "Invalid QR code"
- ✅ Cancelled ticket → 200, valid=false

---

### Partner Endpoints

#### 14. Sync Partner Inventory

**Request**:
```bash
POST /api/v1/ticketing/partners/partner_123/sync-inventory
```

**Test Cases**:
- ✅ Valid inventory data → 200, synced
- ✅ Invalid partner ID → 403 "Unknown partner"
- ✅ Missing auth → 401 Unauthorized

---

#### 15. Partner Webhook

**Request**:
```bash
POST /api/v1/ticketing/partners/partner_123/webhook
```

**Test Cases**:
- ✅ Valid webhook → 200, processed
- ✅ Duplicate webhook (idempotency) → 200, ignored
- ✅ Invalid signature → 401 "Invalid signature"

---

## Error Scenario Testing

### Authentication Errors

```bash
# No token
curl http://localhost:5000/api/v1/ticketing/bookings/user/1
# Expected: 401 Unauthorized

# Invalid token
curl http://localhost:5000/api/v1/ticketing/bookings/user/1 \
  -H "Authorization: Bearer INVALID_TOKEN"
# Expected: 401 Unauthorized

# Expired token
curl http://localhost:5000/api/v1/ticketing/bookings/user/1 \
  -H "Authorization: Bearer EXPIRED_TOKEN"
# Expected: 401 "Token expired"
```

---

### Validation Errors

```bash
# Missing required fields
curl -X POST http://localhost:5000/api/v1/ticketing/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"poiId": 123}'
# Expected: 400 "Validation error: date is required"

# Invalid email
curl -X POST http://localhost:5000/api/v1/ticketing/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "poiId": 123,
    "date": "2025-12-25",
    "quantity": 2,
    "guestInfo": {"email": "not-an-email"}
  }'
# Expected: 400 "Invalid email format"
```

---

### Business Logic Errors

```bash
# Insufficient availability
curl -X POST http://localhost:5000/api/v1/ticketing/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "poiId": 123,
    "date": "2025-12-25",
    "quantity": 10000,
    "ticketType": "single",
    "guestInfo": {"name": "Test", "email": "test@example.com"}
  }'
# Expected: 409 "Insufficient availability"

# Confirm already confirmed booking
curl -X POST http://localhost:5000/api/v1/ticketing/bookings/456/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"paymentTransactionId": "txn_123"}'
# Expected: 400 "Booking already confirmed"
```

---

## Performance Testing

### Response Time Benchmarks

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| Health check | < 50ms | < 100ms |
| Availability check (cached) | < 50ms | < 100ms |
| Availability check (uncached) | < 200ms | < 500ms |
| Create booking | < 800ms | < 1500ms |
| Confirm booking | < 1000ms | < 2000ms |
| Get bookings list | < 300ms | < 600ms |
| Validate ticket | < 100ms | < 200ms |

### Load Testing with Apache Bench

```bash
# Test availability endpoint
ab -n 1000 -c 10 \
  -p availability_payload.json \
  -T "application/json" \
  http://localhost:5000/api/v1/ticketing/availability/check

# Expected results:
# - Requests per second: > 100
# - 99% requests < 500ms
# - 0% errors
```

### Redis Cache Performance

```bash
# First request (cache miss)
time curl -X POST http://localhost:5000/api/v1/ticketing/availability/check \
  -H "Content-Type: application/json" \
  -d '{"poiId": 123, "date": "2025-12-25", "quantity": 2}'
# Expected: ~200ms

# Second request (cache hit)
time curl -X POST http://localhost:5000/api/v1/ticketing/availability/check \
  -H "Content-Type: application/json" \
  -d '{"poiId": 123, "date": "2025-12-25", "quantity": 2}'
# Expected: ~30-50ms (4-6x faster)
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"

**Solution**:
```bash
# Check .env file
cat backend/.env | grep DB_

# Test connection
node backend/list-tables.js
```

---

#### 2. "JWT token invalid"

**Solution**:
```bash
# Verify JWT_SECRET matches between auth service and ticketing module
# Check token expiration
# Regenerate token if needed
```

---

#### 3. "Booking creation fails with 500 error"

**Check**:
- POI with ID exists in database
- User with ID exists in database
- Availability record exists for date
- Database foreign key constraints

**Debug**:
```bash
# Check logs
tail -f backend/logs/combined.log

# Verify POI exists
mysql> SELECT * FROM poi WHERE id = 123;

# Verify availability
mysql> SELECT * FROM ticketing_availability WHERE poiId = 123 AND date = '2025-12-25';
```

---

#### 4. "QR code generation fails"

**Check**:
- QR code library installed: `npm list qrcode`
- Encryption key configured: `process.env.TICKET_ENCRYPTION_KEY`
- File storage permissions

---

#### 5. "Redis cache not working"

**Check**:
```bash
# Redis installed and running
redis-cli ping
# Expected: PONG

# Redis connection in .env
cat backend/.env | grep REDIS_

# Test Redis from Node.js
node -e "const Redis = require('ioredis'); const redis = new Redis(); redis.ping().then(console.log);"
```

---

### Debug Mode

Enable verbose logging:
```bash
# In .env
LOG_LEVEL=debug

# Restart server
npm start

# Watch logs
tail -f backend/logs/combined.log
```

---

## Next Steps

After completing API testing:

1. **Frontend Integration** (2-3 days)
   - Create React/Vue components
   - Integrate API client
   - Handle authentication flow
   - Display booking/ticket UI

2. **Payment Integration** (1 day)
   - Integrate Adyen payment flow
   - Handle webhook callbacks
   - Test complete payment cycle

3. **Production Deployment**
   - Deploy to staging environment
   - Run full test suite
   - Performance testing
   - Security audit
   - Deploy to production

---

## Test Results Template

Use this template to document your test results:

```markdown
# Test Run: YYYY-MM-DD HH:MM

**Environment**: Local / Staging / Production
**Tester**: Your Name
**Duration**: XX minutes

## Results

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Health & Status | 1/1 | 0/1 | 0/1 |
| Availability | 3/3 | 0/3 | 0/3 |
| Bookings | 5/5 | 0/5 | 0/5 |
| Tickets | 5/5 | 0/5 | 0/5 |
| Partners | 2/2 | 0/2 | 0/2 |
| **TOTAL** | **16/16** | **0/16** | **0/16** |

## Issues Found

1. [Issue description]
   - Severity: High/Medium/Low
   - Endpoint:
   - Expected:
   - Actual:
   - Reproduction steps:

## Performance Metrics

- Average response time: XXms
- Slowest endpoint: [endpoint] (XXms)
- Fastest endpoint: [endpoint] (XXms)
- Cache hit rate: XX%

## Notes

[Any additional observations or comments]
```

---

**🎉 Happy Testing! 🎉**

For questions or issues, contact: api@holidaibutler.com
