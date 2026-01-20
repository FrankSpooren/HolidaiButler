# Adyen Payment Integration Guide
**Last Updated**: 2025-11-18
**Status**: Frontend Complete | Backend Pending
**Environment**: Test (ready for production)

---

## 📋 Table of Contents

1. [Current Status](#current-status)
2. [Frontend Integration (COMPLETE)](#frontend-integration-complete)
3. [Backend Integration (TO DO)](#backend-integration-to-do)
4. [Adyen Account Setup](#adyen-account-setup)
5. [Configuration Steps](#configuration-steps)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

---

## ✅ Current Status

### Frontend (100% Complete)
- ✅ @adyen/adyen-web package installed (v5.x)
- ✅ AdyenCheckout component fully implemented
- ✅ Drop-in UI with multiple payment methods
- ✅ Session-based payments configured
- ✅ Payment result handling
- ✅ Error handling and user feedback
- ✅ Loading states and UX polish

### Backend (0% - Needs Implementation)
- ❌ Payment API microservice (port 5002)
- ❌ Adyen SDK integration
- ❌ Payment session creation
- ❌ Webhook handling
- ❌ Payment status tracking

---

## 🎨 Frontend Integration (COMPLETE)

### Files Implemented

**1. AdyenCheckout Component**
Location: `frontend/src/components/AdyenCheckout.jsx`

```javascript
// Already implemented with:
- Real Adyen Web SDK Drop-in
- Session-based configuration
- Multiple payment methods (Card, iDEAL, PayPal)
- Payment result callbacks
- Error handling
```

**2. Payment Screen**
Location: `frontend/src/screens/Payment.jsx`

```javascript
// Features:
- Payment session creation
- Order summary display
- Booking creation on payment success
- User information display
- Loading and error states
```

**3. Payment Service**
Location: `frontend/src/services/paymentService.js`

```javascript
// API calls to backend (expecting port 5002):
- createPaymentSession()
- getPaymentMethods()
- submitPayment()
- getPaymentStatus()
- createRefund()
```

### Payment Flow

```
User selects tickets → Enters info → Payment Screen
    ↓
Frontend calls: POST /api/payment/sessions
    ↓
Backend creates Adyen session (TO IMPLEMENT)
    ↓
Frontend displays Adyen Drop-in
    ↓
User completes payment
    ↓
Adyen processes → Callback to frontend
    ↓
Frontend creates booking with payment reference
```

---

## 🔧 Backend Integration (TO DO)

### Required: Payment Microservice

**Port**: 5002 (as configured in `vite.config.js`)

### Directory Structure (Recommended)

```
04-Development/payment-service/
├── src/
│   ├── config/
│   │   └── adyen.js              # Adyen client configuration
│   ├── controllers/
│   │   ├── sessionController.js  # Session management
│   │   ├── paymentController.js  # Payment operations
│   │   └── webhookController.js  # Adyen webhooks
│   ├── services/
│   │   ├── AdyenService.js       # Core Adyen integration
│   │   └── PaymentService.js     # Business logic
│   ├── models/
│   │   └── Payment.js            # Payment records (MySQL)
│   ├── routes/
│   │   ├── sessions.js
│   │   ├── payments.js
│   │   └── webhooks.js
│   └── server.js                  # Express app (port 5002)
├── .env
├── .env.example
└── package.json
```

### Required Endpoints

```javascript
// Sessions
POST   /api/payment/sessions          # Create payment session
GET    /api/payment/sessions/:id      # Get session status

// Payment Methods
POST   /api/payment/methods            # Get available payment methods

// Payments
POST   /api/payment/payments           # Submit payment
POST   /api/payment/payments/:id/details  # Submit additional details
GET    /api/payment/payments/:id/status   # Get payment status
GET    /api/payment/payments/reference/:ref # Get by reference

// Refunds
POST   /api/payment/payments/:id/refunds  # Create refund
GET    /api/payment/refunds/:id/status    # Get refund status

// Webhooks
POST   /api/payment/webhooks/adyen    # Adyen notification webhooks
```

### Required Dependencies

```json
{
  "dependencies": {
    "@adyen/api-library": "^latest",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "mysql2": "^3.6.5",
    "winston": "^3.11.0"
  }
}
```

---

## 🔐 Adyen Account Setup

### 1. Create Adyen Account

1. Go to https://www.adyen.com/
2. Sign up for a test account (free)
3. Verify your email
4. Complete company information

### 2. Get API Credentials

**Test Environment:**
1. Log in to Adyen Customer Area (https://ca-test.adyen.com/)
2. Navigate to: **Developers** → **API credentials**
3. Create new API credential or use existing
4. Note down:
   - ✅ **API Key** (for backend)
   - ✅ **Client Key** (for frontend)
   - ✅ **Merchant Account** name

**Production:**
- Similar steps but in https://ca-live.adyen.com/
- Requires business verification

### 3. Configure Webhooks

1. In Adyen Customer Area: **Developers** → **Webhooks**
2. Click **+ Webhook** → **Standard Webhook**
3. Configure:
   - **URL**: `https://your-domain.com/api/payment/webhooks/adyen`
   - **Method**: JSON
   - **Events**: Select all payment events
   - **HMAC Key**: Generate and save securely

---

## ⚙️ Configuration Steps

### Frontend Configuration

**File**: `ticketing-module/frontend/.env`

```bash
# Adyen Frontend (already configured in code)
VITE_ADYEN_ENVIRONMENT=test
# VITE_ADYEN_CLIENT_KEY is passed from backend session
```

### Backend Configuration (TO CREATE)

**File**: `payment-service/.env`

```bash
# Server
NODE_ENV=development
PORT=5002

# Adyen Configuration
ADYEN_API_KEY=your_api_key_here
ADYEN_CLIENT_KEY=your_client_key_here
ADYEN_MERCHANT_ACCOUNT=your_merchant_account_here
ADYEN_ENVIRONMENT=TEST  # or LIVE for production
ADYEN_HMAC_KEY=your_hmac_key_for_webhooks

# Database (shared with ticketing)
DATABASE_HOST=jotx.your-database.de
DATABASE_PORT=3306
DATABASE_USER=pxoziy_1
DATABASE_PASSWORD=j8,DrtshJSm$
DATABASE_NAME=pxoziy_db1

# Return URLs
FRONTEND_URL=http://localhost:3001
RETURN_URL=http://localhost:3001/booking/confirmation

# Security
JWT_SECRET=your_jwt_secret

# Logging
LOG_LEVEL=info
```

### Example Adyen Service Implementation

**File**: `payment-service/src/services/AdyenService.js`

```javascript
const { Client, CheckoutAPI, Config } = require('@adyen/api-library');

class AdyenService {
  constructor() {
    const config = new Config();
    config.apiKey = process.env.ADYEN_API_KEY;
    config.merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    config.environment = process.env.ADYEN_ENVIRONMENT || 'TEST';

    const client = new Client({ config });
    this.checkout = new CheckoutAPI(client);
  }

  async createSession(paymentData) {
    try {
      const response = await this.checkout.PaymentsApi.sessions({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        amount: {
          value: paymentData.amount,  // in cents
          currency: paymentData.currency || 'EUR',
        },
        reference: paymentData.reference,
        returnUrl: `${process.env.FRONTEND_URL}/booking/confirmation`,
        countryCode: paymentData.countryCode || 'NL',
        shopperLocale: paymentData.shopperLocale || 'nl-NL',
        shopperEmail: paymentData.shopperEmail,
        shopperName: paymentData.shopperName,
        lineItems: paymentData.lineItems,
      });

      return {
        id: response.id,
        sessionData: response.sessionData,
        clientKey: process.env.ADYEN_CLIENT_KEY,
        environment: process.env.ADYEN_ENVIRONMENT.toLowerCase(),
      };
    } catch (error) {
      console.error('Adyen session creation error:', error);
      throw error;
    }
  }

  async getPaymentMethods(params) {
    const response = await this.checkout.PaymentsApi.paymentMethods({
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      countryCode: params.countryCode || 'NL',
      amount: {
        value: params.amount,
        currency: params.currency || 'EUR',
      },
    });
    return response;
  }

  verifyWebhook(notification, hmacKey) {
    // Implement HMAC signature verification
    // See: https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures/
  }
}

module.exports = AdyenService;
```

---

## 🧪 Testing

### Test Cards (Adyen Test Environment)

```
Successful Payment:
- Card: 4111 1111 1111 1111
- Expiry: 03/30
- CVC: 737

Declined Payment:
- Card: 4000 3000 0000 0003
- Expiry: 03/30
- CVC: 737

3D Secure:
- Card: 4212 3456 7891 0006
- Expiry: 03/30
- CVC: 737
- Password: password
```

### Test iDEAL

- Select "iDEAL" payment method
- Choose any test bank
- Use test credentials provided

### Testing Checklist

- [ ] Create payment session
- [ ] Display Adyen Drop-in correctly
- [ ] Complete successful payment (card)
- [ ] Complete successful payment (iDEAL)
- [ ] Handle payment decline
- [ ] Handle payment cancellation
- [ ] Verify webhook receipt
- [ ] Verify booking creation
- [ ] Test refund flow

---

## 🚀 Production Deployment

### Pre-Launch Checklist

1. **Adyen Account**
   - [ ] Switch from test to live credentials
   - [ ] Complete business verification
   - [ ] Configure live webhook URLs
   - [ ] Test in live environment with small amount

2. **Backend Configuration**
   - [ ] Update ADYEN_ENVIRONMENT=LIVE
   - [ ] Update ADYEN_API_KEY (live)
   - [ ] Update ADYEN_CLIENT_KEY (live)
   - [ ] Update ADYEN_MERCHANT_ACCOUNT (live)
   - [ ] Configure HTTPS webhook URL
   - [ ] Set up proper SSL certificates

3. **Security**
   - [ ] Enable HMAC verification for webhooks
   - [ ] Implement rate limiting
   - [ ] Add IP whitelisting for webhooks
   - [ ] Enable logging and monitoring
   - [ ] Set up error alerts

4. **Testing**
   - [ ] Test with real €0.01 transaction
   - [ ] Verify webhook delivery
   - [ ] Test refund process
   - [ ] Load test payment endpoint

5. **Compliance**
   - [ ] PCI DSS compliance review
   - [ ] Privacy policy update
   - [ ] Terms & conditions update
   - [ ] GDPR compliance check

---

## 📊 Next Steps

### Immediate (Phase 2A - Estimated 3-4 hours)

1. **Create Payment Microservice**
   - Set up Express server on port 5002
   - Install @adyen/api-library
   - Create basic server structure

2. **Implement Core Endpoints**
   - POST /api/payment/sessions (session creation)
   - POST /api/payment/methods (payment methods)
   - GET /api/payment/payments/:id/status

3. **Database Integration**
   - Create `payments` table
   - Track payment sessions
   - Store transaction records

4. **Basic Testing**
   - Test session creation
   - Test frontend→backend flow
   - Verify Adyen Drop-in loads

### Short-term (Phase 2B - Estimated 2-3 hours)

1. **Webhook Implementation**
   - POST /api/payment/webhooks/adyen
   - HMAC signature verification
   - Update payment status in database

2. **Refund System**
   - Refund endpoint
   - Refund tracking

3. **Error Handling**
   - Proper error responses
   - Logging system
   - User-friendly error messages

### Medium-term (Phase 3 - Estimated 4-5 hours)

1. **Advanced Features**
   - Split payments
   - Partial refunds
   - Payment analytics

2. **Monitoring & Alerts**
   - Payment success/failure rates
   - Webhook monitoring
   - Error alerting

3. **Documentation**
   - API documentation (Swagger)
   - Integration guide for other modules
   - Troubleshooting guide

---

## 📚 Resources

### Adyen Documentation
- Session flow: https://docs.adyen.com/online-payments/build-your-integration/
- Web Drop-in: https://docs.adyen.com/online-payments/build-your-integration/web-drop-in/
- API Library (Node.js): https://github.com/Adyen/adyen-node-api-library
- Webhooks: https://docs.adyen.com/development-resources/webhooks/

### Support
- Adyen Support: https://www.adyen.help/hc/en-us
- Technical Integration Support: support@adyen.com

---

## ✨ Summary

**Frontend Status**: ✅ **100% COMPLETE**
- Real Adyen Web SDK Drop-in implemented
- Session-based payments configured
- Full error handling and UX
- Ready for backend integration

**Backend Status**: ❌ **NOT STARTED**
- Payment API microservice needed (port 5002)
- Estimated time: 6-8 hours total implementation
- Can be done in phases (see Next Steps above)

**Key Insight**: The "simulation mode" mentioned in docs was misleading - the frontend is already using the **real Adyen SDK**! We just need to build the backend API service to create sessions and handle webhooks.

---

**Last Updated**: 2025-11-18 by Claude
**Version**: 1.0
**Status**: Documentation Complete - Ready for Backend Implementation
