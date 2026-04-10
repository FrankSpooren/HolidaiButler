# HolidaiButler Ticketing & Payment Modules
## Implementation Guide

**Version:** 1.0.0
**Date:** November 2025
**Status:** Production Ready

---

## 📋 Executive Summary

This guide covers the complete implementation of two enterprise-level modules for the HolidaiButler platform:

1. **Ticketing & Reservation Module** (Port 3004)
2. **Payment Transaction Engine** (Port 3005)

Both modules are designed as microservices with independent databases, following the architecture specified in `TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md`.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                  HolidaiButler Platform                     │
└────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐
│  Ticketing       │                 │  Payment         │
│  Module          │◄───────────────►│  Engine          │
│  (Port 3004)     │   REST/Events   │  (Port 3005)     │
└──────────────────┘                 └──────────────────┘
        │                                     │
        ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐
│  MongoDB         │                 │  PostgreSQL      │
│  + Redis         │                 │  + Redis         │
└──────────────────┘                 └──────────────────┘
                                            │
                                            ▼
                                    ┌──────────────────┐
                                    │  Adyen Platform  │
                                    └──────────────────┘
```

---

## 📁 Project Structure

```
HolidaiButler/
├── ticketing-module/
│   ├── backend/
│   │   ├── models/
│   │   │   ├── Ticket.js
│   │   │   ├── Booking.js
│   │   │   └── Availability.js
│   │   ├── services/
│   │   │   ├── AvailabilityService.js
│   │   │   ├── BookingService.js
│   │   │   └── TicketService.js
│   │   ├── routes/
│   │   │   └── tickets.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validators.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── server.js
│   │   ├── package.json
│   │   └── .env.example
│   └── frontend/
│       └── src/
│           ├── components/
│           ├── screens/
│           └── services/
│
├── payment-module/
│   ├── backend/
│   │   ├── models/
│   │   │   └── index.js (Transaction, Refund, PaymentMethod)
│   │   ├── services/
│   │   │   ├── AdyenService.js
│   │   │   └── PaymentService.js
│   │   ├── routes/
│   │   │   └── payments.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── server.js
│   │   ├── package.json
│   │   └── .env.example
│   └── frontend/
│       └── src/
│
├── TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md
└── IMPLEMENTATION_GUIDE.md (this file)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ LTS
- MongoDB 6.0+
- PostgreSQL 15+
- Redis 7.0+
- Adyen merchant account (test or live)

### Installation

#### 1. Ticketing Module

```bash
cd ticketing-module/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start MongoDB and Redis
# (Docker example)
docker run -d -p 27017:27017 --name mongo mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest

# Start server
npm run dev
```

Server will start on **http://localhost:3004**

#### 2. Payment Module

```bash
cd payment-module/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with Adyen credentials

# Start PostgreSQL and Redis
docker run -d -p 5432:5432 --name postgres \
  -e POSTGRES_DB=holidaibutler_payments \
  -e POSTGRES_PASSWORD=yourpassword \
  postgres:15

# Start server
npm run dev
```

Server will start on **http://localhost:3005**

---

## 🔧 Configuration

### Ticketing Module (.env)

```bash
# Server
NODE_ENV=development
PORT=3004

# MongoDB
MONGODB_URI=mongodb://localhost:27017/holidaibutler-ticketing

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB_AVAILABILITY=1

# Payment Engine Integration
PAYMENT_ENGINE_URL=http://localhost:3005

# Frontend URL
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HolidaiButler" <tickets@holidaibutler.com>

# QR Code Security
QR_SECRET_KEY=your-qr-encryption-key
```

### Payment Module (.env)

```bash
# Server
NODE_ENV=development
PORT=3005

# PostgreSQL
DATABASE_URL=postgresql://localhost:5432/holidaibutler_payments

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=2

# JWT
JWT_SECRET=your-secret-key

# Adyen
ADYEN_API_KEY=your-api-key
ADYEN_ENVIRONMENT=test
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccount
ADYEN_HMAC_KEY=your-hmac-key
ADYEN_CLIENT_KEY=pub_test_your-client-key

# Auto-capture
AUTO_CAPTURE=true

# Ticketing Module
TICKETING_MODULE_URL=http://localhost:3004
```

---

## 📡 API Documentation

### Ticketing Module API

#### Base URL
```
http://localhost:3004/api/v1/tickets
```

#### Endpoints

**1. Check Availability**
```http
GET /availability/:poiId?date=YYYY-MM-DD&timeslot=HH:MM-HH:MM
```

**2. Create Booking**
```http
POST /bookings
Authorization: Bearer {jwt_token}

{
  "poiId": "507f1f77bcf86cd799439011",
  "date": "2025-12-15",
  "timeslot": "14:00-15:00",
  "quantity": 2,
  "guestInfo": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**3. Confirm Booking**
```http
POST /bookings/:bookingId/confirm

{
  "paymentTransactionId": "abc123"
}
```

**4. Get User Tickets**
```http
GET /user/:userId?status=active
```

**5. Validate Ticket**
```http
POST /validate

{
  "qrCode": "base64-encoded-qr-data",
  "poiId": "507f1f77bcf86cd799439011",
  "validatorDeviceId": "device-123"
}
```

### Payment Module API

#### Base URL
```
http://localhost:3005/api/v1/payments
```

#### Endpoints

**1. Create Payment**
```http
POST /
Authorization: Bearer {jwt_token}

{
  "amount": 4500,
  "currency": "EUR",
  "resourceType": "ticket",
  "resourceId": "booking-id",
  "returnUrl": "https://app.com/booking/complete"
}
```

**2. Get Payment Status**
```http
GET /:paymentId
```

**3. Initiate Refund**
```http
POST /:paymentId/refunds

{
  "amount": 4500,
  "reason": "Booking cancelled"
}
```

**4. Adyen Webhook**
```http
POST /webhooks/adyen

{
  "notificationItems": [...]
}
```

---

## 🔄 Integration Flow

### Complete Booking & Payment Flow

```
1. User selects POI and date
   ↓
2. Frontend → Ticketing Module
   GET /availability/:poiId?date=2025-12-15
   ← { available: true, capacity: { available: 50 } }
   ↓
3. User confirms booking
   ↓
4. Frontend → Ticketing Module
   POST /bookings
   ← { bookingId, paymentUrl, expiresAt }
   (Inventory reserved for 15 minutes)
   ↓
5. Redirect user to paymentUrl
   ↓
6. User completes payment on Adyen page
   ↓
7. Adyen → Payment Module (webhook)
   POST /webhooks/adyen
   { eventCode: 'AUTHORISATION', success: true }
   ↓
8. Payment Module → Ticketing Module (webhook)
   POST /webhooks/payment
   { event: 'payment.completed', bookingReference }
   ↓
9. Ticketing Module:
   - Confirms booking
   - Generates tickets with QR codes
   - Sends email to customer
   ↓
10. Customer receives tickets via email
```

---

## 🔐 Security

### PCI DSS Compliance

- ✅ **SAQ A** level compliance
- ✅ No card data touches HolidaiButler servers
- ✅ All payments processed via Adyen Drop-in
- ✅ HTTPS/TLS 1.3 for all communications

### Authentication

Both modules use JWT tokens:
```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### HMAC Verification (Webhooks)

Adyen webhooks are verified using HMAC SHA-256:
```javascript
const isValid = AdyenService.verifyHMACSignature(notification, signature);
```

---

## 🧪 Testing

### Manual Testing

**Test Adyen Connection:**
```bash
curl http://localhost:3005/api/v1/payments/health
```

**Test Booking Flow:**
```bash
# 1. Check availability
curl "http://localhost:3004/api/v1/tickets/availability/POI123?date=2025-12-15"

# 2. Create booking (requires JWT)
curl -X POST http://localhost:3004/api/v1/tickets/bookings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "poiId": "POI123",
    "date": "2025-12-15",
    "quantity": 2,
    "guestInfo": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Adyen Test Cards

**Test successful payment:**
- Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVC: Any 3 digits

**Test failed payment:**
- Card: 5555 5555 5555 4444

---

## 📊 Monitoring

### Health Checks

```bash
# Ticketing Module
curl http://localhost:3004/health

# Payment Module
curl http://localhost:3005/health
```

### Logs

Both modules use Winston for logging:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

### Key Metrics to Monitor

**Ticketing Module:**
- Booking creation rate
- Availability cache hit rate
- Reservation timeout rate
- Ticket generation time

**Payment Module:**
- Payment success rate
- Average transaction time
- Refund rate
- Webhook processing time

---

## 🚀 Deployment

### Docker Deployment

**Ticketing Module:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3004
CMD ["node", "server.js"]
```

**Payment Module:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3005
CMD ["node", "server.js"]
```

### Kubernetes (Example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ticketing-module
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ticketing
  template:
    metadata:
      labels:
        app: ticketing
    spec:
      containers:
      - name: ticketing
        image: holidaibutler/ticketing:latest
        ports:
        - containerPort: 3004
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: ticketing-secrets
              key: mongodb-uri
```

---

## 🆘 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```
Solution: Check MongoDB is running and URI is correct
docker ps | grep mongo
```

**2. Adyen API Key Invalid**
```
Solution: Verify Adyen credentials in .env
- Check ADYEN_API_KEY
- Ensure ADYEN_ENVIRONMENT matches (test/live)
```

**3. Payment Webhook Not Received**
```
Solution:
- Check webhook URL in Adyen dashboard
- Use ngrok for local testing:
  ngrok http 3005
- Add ngrok URL to Adyen webhook settings
```

**4. Reservation Lock Expired**
```
Solution: User has 15 minutes to complete payment
- Check RESERVATION_TIMEOUT_MINUTES setting
- Consider increasing timeout if needed
```

---

## 📞 Support

For questions or issues:
- **Technical Lead:** tech@holidaibutler.com
- **Documentation:** See TICKETING_PAYMENT_MODULE_ADVISORY_REPORT.md
- **Adyen Support:** https://docs.adyen.com

---

## 📝 License

Proprietary - HolidaiButler B.V.
All rights reserved.

---

**Document Version:** 1.0
**Last Updated:** November 2025
