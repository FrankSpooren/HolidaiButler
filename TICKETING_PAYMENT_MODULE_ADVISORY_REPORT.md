# HolidaiButler Ticketing & Payment Module
## Enterprise-Level Advisory Report

**Versie:** 1.0
**Datum:** November 2025
**Status:** Strategisch Advies & Architectuur Voorstel

---

## 📋 Executive Summary

Dit adviesrapport biedt een grondige analyse en aanbeveling voor de ontwikkeling van een enterprise-level ticketing- en betaalmodule voor het HolidaiButler-platform. Na uitgebreide analyse van de bestaande architectuur, marktonderzoek naar leading platforms (GetYourGuide, Tours-Tickets), en evaluatie van verschillende architectuurpatronen, adviseren wij:

**🎯 HOOFDAANBEVELING: 2 Aparte maar Geïntegreerde Modules**

1. **Ticketing & Reservation Module** - Domein-specifieke functionaliteit
2. **Payment Transaction Engine** - Herbruikbare betaalinfrastructuur

---

## 🔍 1. Situatie Analyse

### 1.1 Huidige HolidaiButler Architectuur

#### Backend Stack
- **Runtime:** Node.js 18+ met Express.js
- **Database:** MongoDB Atlas (primary), Redis (caching), PostgreSQL (gepland voor financial data)
- **Authentication:** JWT met RS256, RBAC met 4 rollen
- **Real-time:** Socket.IO voor live updates
- **AI Integration:** Claude 3.5 Sonnet API
- **Deployment:** Kubernetes (EKS) op AWS EU-West-1

#### Frontend Stack
- **Mobile:** React Native 0.72+ met Redux Toolkit
- **Admin:** React 18 + Vite met Zustand, Material-UI v5
- **PWA:** Responsive web interface (gepland)

#### Bestaande Relevante Modellen
```javascript
// Booking Model (database-models.js:309-381)
{
  userId, poiId, bookingReference,
  status: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
  details: { date, time, duration, guests, specialRequests },
  pricing: { basePrice, taxes, fees, totalPrice, currency, commission },
  payment: {
    status: ['pending', 'paid', 'failed', 'refunded'],
    method, transactionId, paidAt
  },
  partner: { name, email, confirmationMethod },
  aiContext: { generatedFromMessage, recommendationScore }
}
```

**⚠️ Huidige Beperking:** Payment velden zijn basic, geen Adyen integratie, geen ticket generation/validation.

---

## 📊 2. Requirements Analyse

### 2.1 Ticketing Module Requirements

#### Functionele Requirements

**Ticket Types & Products**
- 🎫 **Single Entry Tickets** - Eenmalige toegang (musea, attracties)
- 🗓️ **Timed Entry Tickets** - Tijdslot gebonden tickets
- 🎟️ **Multi-day Passes** - Meerdaagse tickets
- 👥 **Group Tickets** - Groepstickets met kortingen
- 🎭 **Guided Tours** - Rondleidingen met gids
- 🚌 **Experiences** - Complete ervaringen (excursies, workshops)
- 🍽️ **Combo Tickets** - Gecombineerde aanbiedingen (museum + restaurant)

**Core Functionality**
- ✅ Real-time beschikbaarheid check
- ✅ Dynamic pricing (seizoen, dag, tijdslot)
- ✅ Multi-language ondersteuning (EN, ES, DE, NL, FR)
- ✅ Multi-currency pricing (EUR, USD, GBP)
- ✅ Instant confirmation
- ✅ Digital ticket delivery (email, app, SMS)
- ✅ QR code generation voor validatie
- ✅ Mobile wallet integration (Apple Wallet, Google Pay)
- ✅ Cancellation & refund management
- ✅ Ticket transfer/resale (optioneel)

**POI/Partner Integration**
- 📡 API-based inventory sync
- 📊 Real-time quota management
- 🔄 Automatic overbooking prevention
- 📈 Dynamic allocation based on demand
- 🤝 Multi-vendor support

**User Experience**
- 🔍 Availability calendar view
- ⏰ Waitlist management
- 🔔 Reminder notifications (24h/2h before)
- 📱 Offline ticket access
- ⭐ Post-visit review prompts
- 🎁 Promotional codes & vouchers

#### Non-Functionele Requirements
- **Performance:** <500ms ticket search, <2s booking confirmation
- **Availability:** 99.9% uptime SLA
- **Scalability:** 10,000+ concurrent bookings
- **Security:** PCI DSS Level 1 compliance (via payment module)
- **Data Retention:** 7 years (fiscal requirements)

---

### 2.2 Payment Transaction Engine Requirements

#### Functionele Requirements

**Payment Methods (via Adyen)**
- 💳 **Credit/Debit Cards** - Visa, Mastercard, Amex, Maestro
- 🏦 **Local Payment Methods:**
  - iDEAL (Nederland)
  - Sofort (Duitsland)
  - Bizum (Spanje)
  - PayPal (Europa-wijd)
  - Apple Pay & Google Pay
  - SEPA Direct Debit
- 💰 **Buy Now Pay Later** - Klarna, Afterpay (toekomst)

**Core Payment Functionality**
- ✅ Payment authorization & capture (2-step flow)
- ✅ Instant payment confirmation
- ✅ Automatic refunds & partial refunds
- ✅ Split payments (multi-vendor scenarios)
- ✅ Currency conversion (Adyen DCC)
- ✅ Recurring payments (subscriptions - toekomst)
- ✅ Payment link generation (email/SMS)
- ✅ 3D Secure 2.0 (SCA compliance)
- ✅ Tokenization voor veilige opslag

**Transaction Management**
- 📝 Complete audit trail
- 🔄 Retry logic voor failed payments
- ⏱️ Timeout handling (15 min reservation lock)
- 💸 Automatic settlement & reconciliation
- 📊 Real-time transaction monitoring
- 🚨 Fraud detection (Adyen Risk)

**Multi-Use Cases**
- 🎫 Tickets & experiences
- 🍽️ Restaurant reservaties (deposit/pre-payment)
- 🏨 Hotel boekingen (toekomst)
- 🚗 Transport boekingen (toekomst)
- 💎 Premium subscriptions

#### Non-Functionele Requirements
- **Performance:** <3s payment processing
- **Reliability:** 99.95% success rate
- **Security:** PCI DSS Level 1, GDPR compliant
- **Scalability:** 50,000+ transactions/day
- **Monitoring:** Real-time alerts, transaction tracking

---

## 🏗️ 3. Architectuur Evaluatie: 1 Module vs 2 Modules

### Optie A: Geïntegreerde Module (1 Module)

```
┌─────────────────────────────────────────┐
│   Ticketing & Payment Module            │
│                                          │
│  ┌────────────────────────────────┐    │
│  │  Ticketing Logic                │    │
│  │  - Inventory management         │    │
│  │  - Booking workflow             │    │
│  │  - Ticket generation            │    │
│  └────────────────────────────────┘    │
│              ↓                          │
│  ┌────────────────────────────────┐    │
│  │  Payment Processing (Adyen)     │    │
│  │  - Transaction handling         │    │
│  │  - Refunds                      │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Voordelen:**
- ✅ Eenvoudigere initiële ontwikkeling
- ✅ Minder inter-module communicatie
- ✅ Snellere time-to-market
- ✅ Minder deployment complexity

**Nadelen:**
- ❌ Geen herbruikbaarheid voor andere use cases (restaurants, etc.)
- ❌ Tight coupling tussen ticketing en payment
- ❌ Moeilijker om payment provider te wisselen
- ❌ PCI compliance scope omvat hele ticketing module
- ❌ Schaalbaarheidsproblemen (kunnen niet onafhankelijk schalen)

---

### Optie B: Gescheiden Modules (2 Modules) ⭐ **AANBEVOLEN**

```
┌──────────────────────────────┐         ┌────────────────────────────┐
│  Ticketing & Reservation     │         │  Payment Transaction       │
│  Module                      │         │  Engine                    │
│                              │         │                            │
│  ┌────────────────────────┐ │         │  ┌──────────────────────┐ │
│  │ Availability Mgmt      │ │         │  │ Adyen Integration    │ │
│  │ Booking Workflow       │ │◄───────►│  │ Transaction Mgmt     │ │
│  │ Ticket Generation      │ │         │  │ Refund Processing    │ │
│  │ QR Validation          │ │         │  │ Fraud Detection      │ │
│  │ Partner Integration    │ │         │  │ Settlement           │ │
│  └────────────────────────┘ │         │  └──────────────────────┘ │
└──────────────────────────────┘         └────────────────────────────┘
         ↓                                         ↓
    POI Database                           Transaction Database
    Booking Records                         Payment Records
```

**Voordelen:**
- ✅ **Herbruikbaarheid** - Payment engine voor restaurants, hotels, etc.
- ✅ **Separation of Concerns** - Duidelijke verantwoordelijkheden
- ✅ **Onafhankelijk schaalbaar** - Ticketing en payment kunnen apart schalen
- ✅ **PCI Compliance Scope** - Alleen payment engine valt onder PCI DSS
- ✅ **Provider Flexibility** - Makkelijk wisselen van Adyen naar Stripe/Mollie
- ✅ **Team Autonomie** - Verschillende teams kunnen parallel werken
- ✅ **Testing & Deployment** - Modules kunnen onafhankelijk getest/deployed worden
- ✅ **Fault Isolation** - Payment problemen beïnvloeden ticketing niet direct

**Nadelen:**
- ⚠️ Meer initiële architectuur werk
- ⚠️ Inter-module communicatie overhead (REST/Events)
- ⚠️ Complexere transaction management (distributed transactions)
- ⚠️ Meer deployment complexity (2 services)

**Mitigatie:**
- Use event-driven architecture voor async communicatie
- Implement saga pattern voor distributed transactions
- Docker + Kubernetes voor geautomatiseerde deployments
- Shared contract testing (Pact/OpenAPI)

---

## ✅ 4. Aanbeveling & Rationale

### **AANBEVELING: 2 Aparte Modules (Optie B)**

**Strategische Overwegingen:**

1. **Toekomstbestendigheid**
   - HolidaiButler roadmap omvat restaurant reserveringen, hotel boekingen
   - Payment engine wordt critical shared infrastructure
   - ROI van herbruikbaarheid compenseert extra development cost

2. **Enterprise Schaalbaarheid**
   - Ticketing heeft andere scaling patterns dan payments
   - Peaks tijdens vakantieperiodes vs continue payment flow
   - Onafhankelijke monitoring en alerting

3. **Compliance & Security**
   - PCI DSS scope beperking tot payment engine
   - Eenvoudigere audits en certificering
   - Risk isolatie

4. **Platform Evolution**
   - Microservices-ready architectuur (volgens Technical Architecture PDF)
   - Align met geplande Kubernetes deployment
   - Faciliteer toekomstige API marketplace voor partners

5. **Team Efficiency**
   - Payment team kan specialists zijn (FinTech experience)
   - Ticketing team focust op domein logica
   - Parallel development mogelijk

---

## 🏛️ 5. Detailed Architecture Design

### 5.1 Module Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HolidaiButler Platform                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
     ┌──────────────────────────┐  ┌──────────────────────────┐
     │  Ticketing & Reservation │  │  Payment Transaction     │
     │  Service                 │  │  Engine                  │
     │  (Port 3004)             │  │  (Port 3005)             │
     └──────────────────────────┘  └──────────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                ▼
                    ┌──────────────────────────┐
                    │  MySQL (Hetzner)         │
                    │  Database: pxoziy_db1    │
                    │  - Bookings              │
                    │  - Tickets               │
                    │  - Availability          │
                    │  - Transactions          │
                    │  - Refunds               │
                    │  - Payment Methods       │
                    └──────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
          ┌──────────────────┐    ┌──────────────────┐
          │  Adyen Platform  │    │  MailerLite      │
          │  (Payments)      │    │  (Email)         │
          └──────────────────┘    └──────────────────┘
```

### 5.2 Ticketing Module Architecture

#### Technology Stack
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js 4.18+
- **Database:** MySQL 8.0+ (bookings, tickets, availability) - Hetzner pxoziy_db1
- **ORM:** Sequelize 6.35+
- **Cache:** Redis (real-time inventory, session data)
- **Queue:** Bull (background jobs voor email/notifications)
- **Real-time:** Socket.IO (live availability updates)
- **Email:** MailerLite (ticket delivery, notifications)

#### Core Components

**1. Availability Service**
```typescript
class AvailabilityService {
  async checkAvailability(poiId: string, date: Date, timeslot?: string): Promise<AvailabilityResult>
  async reserveSlot(bookingId: string, poiId: string, date: Date, quantity: number): Promise<Reservation>
  async releaseReservation(reservationId: string): Promise<void>
  async syncPartnerInventory(partnerId: string): Promise<SyncResult>
}
```

**2. Booking Service**
```typescript
class BookingService {
  async createBooking(bookingData: CreateBookingDTO): Promise<Booking>
  async confirmBooking(bookingId: string, paymentId: string): Promise<ConfirmedBooking>
  async cancelBooking(bookingId: string, reason: string): Promise<CancellationResult>
  async getBookingsByUser(userId: string, filters: BookingFilters): Promise<Booking[]>
}
```

**3. Ticket Service**
```typescript
class TicketService {
  async generateTicket(bookingId: string): Promise<Ticket>
  async generateQRCode(ticketId: string): Promise<QRCode>
  async validateTicket(qrCode: string, poiId: string): Promise<ValidationResult>
  async sendTicketToUser(ticketId: string, delivery: DeliveryMethod): Promise<void>
  async addToWallet(ticketId: string, walletType: 'apple' | 'google'): Promise<WalletPass>
}
```

**4. Partner Integration Service**
```typescript
class PartnerIntegrationService {
  async pushBookingToPartner(bookingId: string, partnerId: string): Promise<PartnerConfirmation>
  async syncInventory(partnerId: string): Promise<InventorySyncResult>
  async handlePartnerWebhook(partnerId: string, payload: any): Promise<void>
}
```

#### Data Models

**Ticket Model**
```typescript
interface Ticket {
  _id: ObjectId;
  ticketNumber: string; // Unique readable code (e.g., "HB-2025-001234")
  bookingId: ObjectId;
  userId: ObjectId;
  poiId: ObjectId;

  type: 'single' | 'multi-day' | 'group' | 'guided-tour' | 'experience';

  validity: {
    validFrom: Date;
    validUntil: Date;
    timeslot?: string;
    timezone: string;
  };

  qrCode: {
    data: string; // Encrypted payload
    imageUrl: string; // QR code image (S3/CloudFront)
    format: 'QR' | 'Barcode128';
  };

  holder: {
    name: string;
    email: string;
    phone?: string;
  };

  details: {
    productName: string;
    description: string;
    quantity: number;
    language: string;
    specialRequirements?: string;
  };

  validation: {
    isValidated: boolean;
    validatedAt?: Date;
    validatedBy?: string; // Staff member/device ID
    validationLocation?: string;
  };

  status: 'active' | 'used' | 'expired' | 'cancelled' | 'refunded';

  wallet: {
    appleWalletUrl?: string;
    googlePayUrl?: string;
  };

  metadata: {
    source: 'web' | 'mobile' | 'api';
    isTransferred: boolean;
    originalHolder?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Availability Model (Redis Cache + MongoDB)**
```typescript
interface AvailabilitySlot {
  poiId: string;
  date: string; // YYYY-MM-DD
  timeslot?: string; // "09:00-10:00"

  capacity: {
    total: number;
    booked: number;
    reserved: number; // Pending payments
    available: number; // Computed: total - booked - reserved
  };

  pricing: {
    basePrice: number;
    currency: string;
    dynamicPriceMultiplier: number; // 0.8 - 2.0
    finalPrice: number;
  };

  restrictions: {
    minBooking: number;
    maxBooking: number;
    cutoffHours: number; // Hours before event
  };

  lastUpdated: Date;
  ttl: number; // Redis TTL in seconds
}
```

**Enhanced Booking Model**
```typescript
interface EnhancedBooking extends BaseBooking {
  // Additional ticketing-specific fields
  tickets: {
    ticketIds: ObjectId[];
    deliveryMethod: 'email' | 'sms' | 'app' | 'wallet';
    deliveredAt?: Date;
  };

  experience: {
    productType: 'ticket' | 'tour' | 'excursion' | 'experience';
    meetingPoint?: {
      name: string;
      coordinates: [number, number];
      instructions: string;
    };
    duration?: number; // minutes
    language?: string;
    groupSize?: number;
  };

  cancellation: {
    allowCancellation: boolean;
    cancellationDeadline?: Date;
    refundPolicy: 'full' | 'partial' | 'none';
    partialRefundPercentage?: number;
  };

  voucher: {
    code?: string;
    discountAmount?: number;
    discountPercentage?: number;
  };
}
```

#### API Endpoints

```typescript
// Availability
GET    /api/v1/tickets/availability/:poiId?date=YYYY-MM-DD&timeslot=...
POST   /api/v1/tickets/availability/check
       Body: { poiId, date, timeslot, quantity }

// Booking
POST   /api/v1/tickets/bookings
       Body: { userId, poiId, date, timeslot, quantity, guestInfo, voucherCode }
GET    /api/v1/tickets/bookings/:bookingId
GET    /api/v1/tickets/bookings/user/:userId?status=...&from=...&to=...
PUT    /api/v1/tickets/bookings/:bookingId/cancel
POST   /api/v1/tickets/bookings/:bookingId/confirm
       Body: { paymentTransactionId }

// Tickets
GET    /api/v1/tickets/:ticketId
POST   /api/v1/tickets/:ticketId/resend
       Body: { deliveryMethod: 'email' | 'sms' }
POST   /api/v1/tickets/:ticketId/wallet
       Body: { walletType: 'apple' | 'google' }
POST   /api/v1/tickets/validate
       Body: { qrCode, poiId, validatorDeviceId }
GET    /api/v1/tickets/user/:userId?status=active

// Partner Integration (Protected)
POST   /api/v1/partners/:partnerId/sync-inventory
POST   /api/v1/partners/:partnerId/webhook
       Body: { event, data }
```

---

### 5.3 Payment Transaction Engine Architecture

#### Technology Stack
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js 4.18+
- **Database:** MySQL 8.0+ (ACID compliance voor financial data) - Hetzner pxoziy_db1
- **ORM:** Sequelize 6.35+
- **Cache:** Redis (idempotency keys, rate limiting)
- **Queue:** Bull (retry logic, webhooks, settlements)
- **Monitoring:** Prometheus + Grafana (transaction metrics)

#### Core Components

**1. Payment Service**
```typescript
class PaymentService {
  async createPayment(paymentRequest: CreatePaymentDTO): Promise<Payment>
  async authorizePayment(paymentId: string): Promise<AuthorizationResult>
  async capturePayment(paymentId: string, amount?: number): Promise<CaptureResult>
  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<Refund>
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus>
  async cancelPayment(paymentId: string): Promise<void>
}
```

**2. Adyen Integration Service**
```typescript
class AdyenIntegrationService {
  async createPaymentSession(
    amount: number,
    currency: string,
    reference: string,
    returnUrl: string,
    metadata: Record<string, any>
  ): Promise<AdyenSession>

  async handleWebhook(notification: AdyenNotification): Promise<void>
  async getPaymentMethods(countryCode: string, currency: string): Promise<PaymentMethod[]>
  async initiateRefund(pspReference: string, amount: number): Promise<RefundResponse>
  async verifyHMAC(payload: string, signature: string): Promise<boolean>
}
```

**3. Transaction Service**
```typescript
class TransactionService {
  async recordTransaction(transactionData: TransactionDTO): Promise<Transaction>
  async updateTransactionStatus(transactionId: string, status: TransactionStatus): Promise<void>
  async getTransactionHistory(filters: TransactionFilters): Promise<Transaction[]>
  async reconcileTransactions(date: Date): Promise<ReconciliationReport>
  async generateSettlementReport(merchantId: string, period: DateRange): Promise<Report>
}
```

**4. Fraud Detection Service**
```typescript
class FraudDetectionService {
  async assessRisk(payment: Payment, userContext: UserContext): Promise<RiskScore>
  async handleHighRiskPayment(paymentId: string): Promise<void>
  async blockSuspiciousActivity(userId: string, reason: string): Promise<void>
}
```

#### Data Models (MySQL - Hetzner pxoziy_db1)

**Transaction Table**
```sql
CREATE TABLE transactions (
  id CHAR(36) PRIMARY KEY,
  transaction_reference VARCHAR(100) UNIQUE NOT NULL,

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_method VARCHAR(50),

  -- Status
  status ENUM(
    'pending', 'authorized', 'captured', 'failed',
    'cancelled', 'refunded', 'partially_refunded'
  ) NOT NULL,

  -- Adyen References
  psp_reference VARCHAR(100) UNIQUE,
  merchant_reference VARCHAR(100),

  -- User & Booking Context
  user_id CHAR(36) NOT NULL,
  booking_reference VARCHAR(100),
  resource_type VARCHAR(50), -- 'ticket', 'restaurant', 'hotel'
  resource_id CHAR(36),

  -- Financial Details
  authorized_amount DECIMAL(10,2),
  captured_amount DECIMAL(10,2),
  refunded_amount DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  metadata JSON,
  ip_address VARCHAR(45), -- IPv6 max length
  user_agent TEXT,

  -- Risk Assessment
  risk_score DECIMAL(3,2),
  fraud_check_result VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  authorized_at TIMESTAMP NULL,
  captured_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_transactions (user_id, created_at DESC),
  INDEX idx_status (status),
  INDEX idx_booking_reference (booking_reference),
  INDEX idx_created_at (created_at)
);
```

**Refund Table**
```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_reference VARCHAR(100) UNIQUE NOT NULL,

  -- Original Transaction
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  original_psp_reference VARCHAR(100),

  -- Refund Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  reason VARCHAR(500),

  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),

  -- Adyen Reference
  refund_psp_reference VARCHAR(100),

  -- Metadata
  initiated_by UUID, -- Admin/System user ID
  processed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_transaction_refunds (transaction_id),
  INDEX idx_status (status)
);
```

**Payment Methods Table**
```sql
CREATE TABLE stored_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Tokenized Card Data (Adyen tokens)
  payment_token VARCHAR(200) UNIQUE NOT NULL,
  payment_type VARCHAR(50), -- 'card', 'ideal', 'paypal'

  -- Card Display Info (NO PAN storage!)
  card_brand VARCHAR(50), -- 'visa', 'mastercard'
  last_four VARCHAR(4),
  expiry_month INTEGER,
  expiry_year INTEGER,
  holder_name VARCHAR(200),

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,

  INDEX idx_user_payment_methods (user_id),
  CONSTRAINT unique_user_default UNIQUE (user_id, is_default) WHERE is_default = TRUE
);
```

#### API Endpoints

```typescript
// Payment Creation & Processing
POST   /api/v1/payments
       Body: {
         amount, currency, resourceType, resourceId,
         returnUrl, metadata, paymentMethod
       }
       Response: { paymentId, sessionData, redirectUrl }

GET    /api/v1/payments/:paymentId
POST   /api/v1/payments/:paymentId/authorize
POST   /api/v1/payments/:paymentId/capture
       Body: { amount? } // Optional partial capture
POST   /api/v1/payments/:paymentId/cancel

// Refunds
POST   /api/v1/payments/:paymentId/refunds
       Body: { amount?, reason }
GET    /api/v1/payments/:paymentId/refunds
GET    /api/v1/refunds/:refundId

// Payment Methods (User Facing)
GET    /api/v1/payment-methods/available?country=NL&currency=EUR
GET    /api/v1/users/:userId/payment-methods
POST   /api/v1/users/:userId/payment-methods
       Body: { paymentToken, setAsDefault }
DELETE /api/v1/users/:userId/payment-methods/:methodId

// Webhooks (Adyen → Platform)
POST   /api/v1/webhooks/adyen
       Body: AdyenNotification[]
       Headers: { Authorization: HMAC signature }

// Admin/Reporting
GET    /api/v1/admin/transactions?from=...&to=...&status=...
GET    /api/v1/admin/settlements/:merchantId?period=...
POST   /api/v1/admin/transactions/:transactionId/investigate
```

---

### 5.4 Inter-Module Communication

#### Communication Pattern: Event-Driven + REST

```typescript
// Flow: User boekt ticket

1. Frontend → Ticketing Module
   POST /api/v1/tickets/bookings
   { userId, poiId, date, quantity, ... }

2. Ticketing Module:
   - Check availability
   - Create booking (status: 'pending')
   - Reserve inventory (15 min hold)

3. Ticketing Module → Payment Engine (REST)
   POST /api/v1/payments
   {
     amount: 45.00,
     currency: 'EUR',
     resourceType: 'ticket',
     resourceId: bookingId,
     returnUrl: 'https://holidaibutler.com/booking/complete'
   }

4. Payment Engine → Adyen
   - Create payment session
   - Return redirect URL

5. Payment Engine → Ticketing Module (Response)
   { paymentId, redirectUrl, sessionData }

6. Ticketing Module → Frontend
   { bookingId, paymentUrl }

7. User → Adyen Payment Page
   - Complete payment

8. Adyen → Payment Engine (Webhook)
   POST /api/v1/webhooks/adyen
   { eventCode: 'AUTHORISATION', success: true, pspReference: '...' }

9. Payment Engine:
   - Verify HMAC signature
   - Update transaction status
   - Emit event: 'payment.completed'

10. Payment Engine → Ticketing Module (Event/Webhook)
    POST /api/v1/webhooks/payment
    {
      event: 'payment.completed',
      paymentId, transactionId, bookingReference
    }

11. Ticketing Module:
    - Update booking status: 'confirmed'
    - Generate tickets
    - Send confirmation email
    - Release reservation hold
```

#### Event Types

**Payment Engine Events**
```typescript
enum PaymentEvent {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
}
```

**Ticketing Module Events**
```typescript
enum TicketingEvent {
  BOOKING_CREATED = 'booking.created',
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_CANCELLED = 'booking.cancelled',
  TICKET_GENERATED = 'ticket.generated',
  TICKET_VALIDATED = 'ticket.validated',
}
```

#### Idempotency & Retry Logic

**Idempotency Keys (Redis)**
```typescript
// Every payment request includes idempotency key
POST /api/v1/payments
Headers: { 'Idempotency-Key': 'booking-{bookingId}-payment-attempt-1' }

// Payment Engine caches response for 24h
// Duplicate requests return cached response
```

**Retry Logic (Bull Queue)**
```typescript
// Failed payment webhooks retry with exponential backoff
const retryStrategy = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000 // 2s, 4s, 8s, 16s, 32s
  }
};
```

---

## 🔐 6. Adyen Integration Strategy

### 6.1 Adyen Account Setup

**Account Requirements:**
- **Merchant Account:** HolidaiButler B.V.
- **Region:** European Union (GDPR compliant)
- **Risk Profile:** Low-Medium (travel/experiences)
- **Processing Volume:** €500K - €2M annually (starting)

**API Integration Type:** **Web Components + API-based**

### 6.2 Adyen Web Components Integration

**Frontend Flow (React/React Native)**

```typescript
// 1. Frontend requests payment session
const createPaymentSession = async (bookingData) => {
  const response = await api.post('/api/v1/payments', {
    amount: bookingData.totalPrice * 100, // cents
    currency: 'EUR',
    resourceType: 'ticket',
    resourceId: bookingData.bookingId,
    returnUrl: `${window.location.origin}/booking/complete`,
    metadata: {
      userId: bookingData.userId,
      poiName: bookingData.poiName
    }
  });

  return response.data; // { paymentId, sessionData }
};

// 2. Initialize Adyen Drop-in Component
const initializeAdyenDropin = (sessionData, container) => {
  const configuration = {
    environment: 'live', // or 'test'
    clientKey: 'pub_live_...', // Public key
    session: sessionData,
    onPaymentCompleted: (result, component) => {
      console.log('Payment completed:', result);
      handlePaymentSuccess(result);
    },
    onError: (error, component) => {
      console.error('Payment error:', error);
      handlePaymentError(error);
    },
    paymentMethodsConfiguration: {
      card: {
        hasHolderName: true,
        holderNameRequired: true,
        billingAddressRequired: false
      },
      ideal: {
        showImage: true
      }
    }
  };

  const checkout = new AdyenCheckout(configuration);
  checkout.create('dropin').mount(container);
};
```

### 6.3 Backend Adyen Integration

**Payment Session Creation**

```typescript
// payment-engine/services/adyen.service.ts
import { Client, CheckoutAPI } from '@adyen/api-library';

class AdyenService {
  private client: Client;
  private checkout: CheckoutAPI;

  constructor() {
    this.client = new Client({
      apiKey: process.env.ADYEN_API_KEY,
      environment: 'live' // or 'test'
    });
    this.checkout = new CheckoutAPI(this.client);
  }

  async createPaymentSession(paymentRequest: PaymentRequest): Promise<SessionResponse> {
    try {
      const session = await this.checkout.sessions({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        amount: {
          value: paymentRequest.amount, // in cents
          currency: paymentRequest.currency
        },
        reference: paymentRequest.reference,
        returnUrl: paymentRequest.returnUrl,
        countryCode: paymentRequest.countryCode || 'NL',
        shopperLocale: paymentRequest.locale || 'nl-NL',
        metadata: paymentRequest.metadata,

        // Enable desired payment methods
        allowedPaymentMethods: [
          'scheme', // Credit cards
          'ideal',
          'paypal',
          'applepay',
          'googlepay'
        ],

        // 3D Secure 2.0
        authenticationData: {
          threeDSRequestData: {
            nativeThreeDS: 'preferred'
          }
        },

        // Capture delay (for authorize + capture flow)
        captureDelayHours: 0 // Immediate capture, or set to manual
      });

      return {
        sessionId: session.id,
        sessionData: session.sessionData,
        expiresAt: session.expiresAt
      };

    } catch (error) {
      logger.error('Adyen session creation failed:', error);
      throw new PaymentGatewayError('Failed to create payment session', error);
    }
  }

  async handleWebhook(notification: AdyenNotification): Promise<void> {
    // Verify HMAC signature
    const isValid = await this.verifyHMACSignature(
      notification,
      process.env.ADYEN_HMAC_KEY
    );

    if (!isValid) {
      throw new SecurityError('Invalid HMAC signature');
    }

    // Process notification
    const { eventCode, success, pspReference, merchantReference } = notification;

    switch (eventCode) {
      case 'AUTHORISATION':
        if (success === 'true') {
          await this.handleAuthorization(pspReference, merchantReference);
        } else {
          await this.handleAuthorizationFailure(pspReference, merchantReference);
        }
        break;

      case 'CAPTURE':
        await this.handleCapture(pspReference);
        break;

      case 'REFUND':
        await this.handleRefund(pspReference);
        break;

      case 'CANCELLATION':
        await this.handleCancellation(pspReference);
        break;

      default:
        logger.warn(`Unhandled Adyen event: ${eventCode}`);
    }

    // Acknowledge webhook (return [accepted])
    return;
  }

  private async verifyHMACSignature(
    notification: any,
    hmacKey: string
  ): Promise<boolean> {
    const hmacValidator = new HmacValidator();
    return hmacValidator.validateHMAC(
      notification,
      hmacKey
    );
  }

  async initiateRefund(
    pspReference: string,
    amount: number,
    currency: string,
    reference: string
  ): Promise<RefundResponse> {
    try {
      const refund = await this.checkout.refunds({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        amount: {
          value: amount,
          currency: currency
        },
        reference: reference,
        pspReference: pspReference
      });

      return {
        refundPspReference: refund.pspReference,
        status: refund.status
      };
    } catch (error) {
      logger.error('Adyen refund failed:', error);
      throw new RefundError('Failed to process refund', error);
    }
  }
}
```

### 6.4 Security & Compliance

**PCI DSS Compliance**
- ✅ Use Adyen Drop-in (PCI DSS SAQ A compliant)
- ✅ NO card data touches HolidaiButler servers
- ✅ Tokenization for stored payment methods
- ✅ HTTPS/TLS 1.3 for all communications

**HMAC Signature Verification**
```typescript
// Verify every webhook
app.post('/api/v1/webhooks/adyen', async (req, res) => {
  const notification = req.body.notificationItems[0].NotificationRequestItem;

  const isValid = await adyenService.verifyHMACSignature(
    notification,
    process.env.ADYEN_HMAC_KEY
  );

  if (!isValid) {
    logger.error('Invalid HMAC signature from Adyen');
    return res.status(401).send('[invalid]');
  }

  await adyenService.handleWebhook(notification);
  res.send('[accepted]');
});
```

**3D Secure 2.0 (SCA Compliance)**
- Automatically handled by Adyen Drop-in
- Frictionless flow voor low-risk transactions
- Challenge flow when required by issuer

---

## 📱 7. Frontend Integration

### 7.1 Mobile App (React Native)

**Ticket Booking Flow**

```typescript
// screens/TicketBookingScreen.tsx
import React, { useState } from 'react';
import { AdyenCheckout } from '@adyen/react-native';

const TicketBookingScreen = ({ route }) => {
  const { poi, date, quantity } = route.params;
  const [booking, setBooking] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);

  const handleBooking = async () => {
    // 1. Create booking
    const bookingResponse = await api.post('/api/v1/tickets/bookings', {
      poiId: poi._id,
      date,
      quantity,
      guestInfo: { name: user.name, email: user.email }
    });

    setBooking(bookingResponse.data);

    // 2. Create payment session
    const paymentResponse = await api.post('/api/v1/payments', {
      amount: bookingResponse.data.totalPrice * 100,
      currency: 'EUR',
      resourceType: 'ticket',
      resourceId: bookingResponse.data.bookingId,
      returnUrl: 'holidaibutler://booking/complete'
    });

    setPaymentSession(paymentResponse.data);
  };

  const handlePaymentResult = async (result) => {
    if (result.resultCode === 'Authorised') {
      // 3. Confirm booking
      await api.post(`/api/v1/tickets/bookings/${booking.bookingId}/confirm`, {
        paymentTransactionId: result.pspReference
      });

      // Navigate to confirmation
      navigation.navigate('BookingConfirmation', { bookingId: booking.bookingId });
    } else {
      Alert.alert('Payment Failed', 'Please try again');
    }
  };

  return (
    <View>
      <BookingSummary poi={poi} date={date} quantity={quantity} />

      {paymentSession && (
        <AdyenCheckout
          config={{
            environment: 'live',
            clientKey: ADYEN_CLIENT_KEY,
            session: paymentSession.sessionData
          }}
          onComplete={handlePaymentResult}
          onError={(error) => console.error(error)}
        />
      )}

      <Button title="Book & Pay" onPress={handleBooking} />
    </View>
  );
};
```

**Ticket Display (Wallet Pass)**

```typescript
// components/TicketCard.tsx
import PassKit from 'react-native-passkit';
import { QRCode } from 'react-native-qrcode-svg';

const TicketCard = ({ ticket }) => {
  const addToAppleWallet = async () => {
    const walletPass = await api.post(`/api/v1/tickets/${ticket._id}/wallet`, {
      walletType: 'apple'
    });

    await PassKit.addPass(walletPass.data.passUrl);
  };

  return (
    <Card>
      <TicketHeader poi={ticket.poi} date={ticket.validity.validFrom} />

      <QRCode
        value={ticket.qrCode.data}
        size={250}
        logo={require('../assets/logo.png')}
      />

      <Text>Ticket: {ticket.ticketNumber}</Text>
      <Text>Valid: {formatDate(ticket.validity.validFrom)}</Text>

      {Platform.OS === 'ios' && (
        <Button title="Add to Apple Wallet" onPress={addToAppleWallet} />
      )}

      <Button title="Download PDF" onPress={() => downloadPDF(ticket._id)} />
    </Card>
  );
};
```

---

## 🚀 8. Implementation Roadmap

### Phase 1: Foundation (Maanden 1-2)

**Week 1-2: Architecture & Setup**
- ✅ Setup microservices infrastructure (Docker, Kubernetes)
- ✅ Create service skeletons (Ticketing, Payment)
- ✅ Setup PostgreSQL database voor payments
- ✅ Configure MongoDB collections voor tickets
- ✅ Setup Redis cluster
- ✅ Configure Bull queues
- ✅ Setup monitoring (Prometheus, Grafana)

**Week 3-4: Payment Engine - Adyen Integration**
- ✅ Adyen account setup & API credentials
- ✅ Implement Adyen session creation
- ✅ Build webhook handler met HMAC verification
- ✅ Implement payment methods API
- ✅ Build transaction recording system
- ✅ Implement refund processing
- ✅ Setup payment testing environment

**Week 5-6: Ticketing Module - Core**
- ✅ Implement availability service
- ✅ Build booking workflow
- ✅ Implement reservation locking (Redis)
- ✅ Build ticket generation service
- ✅ Implement QR code generation
- ✅ Build ticket validation endpoint

**Week 7-8: Integration & Testing**
- ✅ Connect Ticketing ↔ Payment modules
- ✅ Implement event-driven communication
- ✅ Build idempotency layer
- ✅ Integration testing (end-to-end flows)
- ✅ Load testing (10K concurrent users)
- ✅ Security audit

---

### Phase 2: User-Facing Features (Maanden 3-4)

**Week 9-10: Frontend Integration**
- ✅ Integrate Adyen Drop-in (React Native)
- ✅ Build ticket booking screens
- ✅ Implement payment flow UI
- ✅ Build ticket display components
- ✅ Implement QR code display

**Week 11-12: Digital Wallet Integration**
- ✅ Apple Wallet pass generation
- ✅ Google Pay pass generation
- ✅ Wallet pass distribution API
- ✅ Pass update notifications

**Week 13-14: Email & Notifications**
- ✅ Booking confirmation emails (SendGrid templates)
- ✅ Ticket delivery emails met PDF attachment
- ✅ Reminder notifications (24h, 2h before)
- ✅ Cancellation confirmation emails
- ✅ Push notifications (Firebase)

**Week 15-16: User Experience Enhancements**
- ✅ Booking history & management
- ✅ Cancellation & refund UI
- ✅ Ticket transfer functionality
- ✅ Review/rating prompts post-visit
- ✅ Offline ticket access

---

### Phase 3: Partner & Admin Features (Maanden 5-6)

**Week 17-18: Partner Integration**
- ✅ Partner API voor inventory sync
- ✅ Webhook notifications naar partners
- ✅ Partner dashboard (basic)
- ✅ Booking push to partner systems
- ✅ Partner confirmation handling

**Week 19-20: Admin Module Extension**
- ✅ Transaction monitoring dashboard
- ✅ Refund management interface
- ✅ Booking management (cancel, modify)
- ✅ Fraud detection alerts
- ✅ Settlement reports

**Week 21-22: Analytics & Reporting**
- ✅ Revenue analytics dashboard
- ✅ Booking conversion metrics
- ✅ Payment method distribution
- ✅ Refund rate tracking
- ✅ Partner performance metrics

**Week 23-24: Testing & Launch Prep**
- ✅ UAT (User Acceptance Testing)
- ✅ Partner integration testing
- ✅ Performance optimization
- ✅ Security penetration testing
- ✅ PCI DSS compliance validation
- ✅ GDPR compliance audit
- ✅ Documentation completion

---

### Phase 4: Advanced Features (Maanden 7-9)

**Advanced Payment Features**
- ✅ Split payments (multi-vendor)
- ✅ Installment payments (Klarna, Afterpay)
- ✅ Recurring payments (subscriptions)
- ✅ Dynamic currency conversion
- ✅ Multi-currency settlements

**Advanced Ticketing Features**
- ✅ Waitlist management
- ✅ Ticket resale marketplace
- ✅ Season passes & memberships
- ✅ Group booking discounts (automatic)
- ✅ Combo ticket bundles
- ✅ Last-minute deals

**Scalability & Performance**
- ✅ Database sharding (PostgreSQL)
- ✅ Read replicas (MongoDB)
- ✅ CDN integration (ticket downloads)
- ✅ Elasticsearch integration (search)
- ✅ Auto-scaling policies

---

## 💰 9. Cost Estimation

### Development Costs (6 maanden - Enterprise Team)

| Role | FTE | Rate | Duration | Cost |
|------|-----|------|----------|------|
| Senior Backend Engineer (Payment) | 1.0 | €90/hr | 6 mnd | €86,400 |
| Senior Backend Engineer (Ticketing) | 1.0 | €90/hr | 6 mnd | €86,400 |
| Frontend Engineer (React Native) | 0.8 | €80/hr | 4 mnd | €41,200 |
| DevOps Engineer | 0.5 | €85/hr | 6 mnd | €43,200 |
| QA Engineer | 0.5 | €70/hr | 4 mnd | €22,400 |
| Product Owner | 0.3 | €100/hr | 6 mnd | €28,800 |
| **Total Development** | | | | **€308,400** |

### Infrastructure Costs (Yearly)

| Service | Specification | Monthly | Yearly |
|---------|--------------|---------|--------|
| AWS EKS (2 services) | 2x t3.medium nodes | €150 | €1,800 |
| RDS PostgreSQL | db.t3.medium (payment data) | €120 | €1,440 |
| MongoDB Atlas | M30 cluster | €250 | €3,000 |
| Redis Enterprise | 5GB cache | €80 | €960 |
| CloudFront CDN | 1TB transfer | €60 | €720 |
| S3 Storage | 500GB (tickets/images) | €12 | €144 |
| **Total Infrastructure** | | | **€8,064** |

### Third-Party Services (Yearly)

| Service | Cost Model | Estimated Volume | Yearly Cost |
|---------|-----------|------------------|-------------|
| Adyen Transaction Fees | 0.10€ + 1.5% interchange | 50,000 txn @ €45 avg | €39,000 |
| SendGrid (emails) | $15/month (40K emails) | 35K emails/month | €200 |
| Twilio SMS (optional) | $0.075/SMS | 5K SMS/month | €540 |
| Firebase (notifications) | Free tier → Spark plan | | €300 |
| **Total Services** | | | **€40,040** |

### **Total First Year: €356,504** (incl. development + operations)
### **Recurring Yearly: €48,104** (infrastructure + services, excl. Adyen fees)

### ROI Projection

**Revenue Assumptions:**
- 50,000 tickets verkocht/jaar (conservatief)
- Gemiddelde ticket prijs: €45
- Platform commissie: 8%

**Yearly Revenue:** €180,000

**Break-even:** 24 maanden (eerste jaar development cost + operationele kosten)

---

## 📊 10. Success Metrics & KPIs

### Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | <500ms | Prometheus |
| Payment Success Rate | >98% | Transaction DB |
| System Uptime | 99.9% | Grafana |
| Ticket Generation Time | <2s | Application logs |
| Database Query Performance | <100ms (p95) | Slow query log |

### Business KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Booking Conversion Rate | >15% | Analytics |
| Cart Abandonment Rate | <40% | Event tracking |
| Customer Refund Rate | <5% | Refund DB |
| Average Transaction Value | €45+ | Transaction DB |
| Repeat Booking Rate | >25% | User analytics |

### User Experience KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Booking Flow Completion Time | <3 min | Analytics |
| Customer Satisfaction (CSAT) | >4.5/5 | Post-booking survey |
| Ticket Delivery Success Rate | >99.5% | Email/SMS logs |
| Mobile App Rating | >4.3/5 | App Store metrics |

---

## 🔒 11. Security & Compliance

### PCI DSS Compliance

**SAQ A Compliance** (Self-Assessment Questionnaire)
- ✅ All card data handled by Adyen (PCI DSS Level 1 certified)
- ✅ No card data stored on HolidaiButler servers
- ✅ HTTPS/TLS 1.3 for all API communications
- ✅ Tokenization for stored payment methods
- ✅ Quarterly security scans (ASV)

**Action Items:**
- Annual PCI DSS audit
- Network segmentation (payment engine isolated)
- Access control (RBAC for payment data)
- Logging & monitoring (SIEM integration)

### GDPR Compliance

**Data Protection Measures:**
- ✅ Data encryption at rest (AES-256)
- ✅ Data encryption in transit (TLS 1.3)
- ✅ Right to access (user data export API)
- ✅ Right to erasure (anonymization after 7 years)
- ✅ Data minimization (only necessary fields)
- ✅ Consent management (explicit opt-ins)
- ✅ Data Processing Agreement met Adyen

**Audit Trail:**
- All transactions logged met user context
- 7-year retention for financial data
- Activity logging voor admin actions

### Security Best Practices

**Application Security:**
- ✅ Input validation (all API endpoints)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (output escaping)
- ✅ CSRF tokens (form submissions)
- ✅ Rate limiting (100 req/min per user)
- ✅ Account lockout (5 failed attempts)

**Infrastructure Security:**
- ✅ WAF (Web Application Firewall) - CloudFlare
- ✅ DDoS protection - CloudFlare
- ✅ VPN for database access
- ✅ Secrets management (AWS Secrets Manager)
- ✅ Container security scanning (Trivy)

---

## 📞 12. Support & Maintenance

### Support Model

**Tier 1: User Support**
- Email: support@holidaibutler.com
- Live chat (during business hours)
- Response time: <4 hours

**Tier 2: Technical Support (Partners)**
- Email: partners@holidaibutler.com
- API documentation portal
- Response time: <2 hours (business hours)

**Tier 3: Critical Incidents**
- 24/7 on-call rotation
- PagerDuty integration
- Response time: <30 min
- Escalation to Adyen if payment gateway issue

### Maintenance Windows

- **Planned Maintenance:** Sundays 02:00-04:00 CET
- **Notification:** 7 days advance notice
- **Zero-downtime deployments:** Blue-green deployment strategy

---

## 🎯 13. Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Adyen API downtime | High | Low | Fallback payment page, queue failed webhooks |
| Database failure | Critical | Low | PostgreSQL replication, automated backups |
| Overbooking | Medium | Medium | Redis-based locking, inventory sync every 5min |
| Payment fraud | High | Medium | Adyen Risk module, velocity checks, 3DS |
| Data breach | Critical | Low | Encryption, access controls, penetration testing |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low adoption | High | Phased rollout, partner onboarding, marketing |
| Partner resistance | Medium | Clear value proposition, API simplicity |
| Regulatory changes | Medium | Legal team monitoring, adaptable architecture |
| Competitor entry | Medium | Differentiation via AI, user experience |

---

## 📝 14. Conclusie & Next Steps

### Samenvatting Aanbevelingen

**1. Architectuur: 2 Aparte Modules** ⭐
- Ticketing & Reservation Module (Port 3004, MySQL/Sequelize)
- Payment Transaction Engine (Port 3005, MySQL/Sequelize, Adyen)
- Event-driven communicatie + REST APIs

**2. Technology Stack**
- Backend: Node.js 18+ / Express.js
- Database: MySQL 8.0+ (Hetzner pxoziy_db1) - Centrale database voor payments & tickets
- ORM: Sequelize 6.35+
- Cache: Redis (real-time inventory, sessions)
- Payment Provider: Adyen (Web Components + API)
- Email Service: MailerLite (ticket delivery, notifications)
- Queue: Bull (job processing)
- Monitoring: Prometheus + Grafana

**3. Implementation Timeline: 6 maanden**
- Phase 1-2: Core functionality (4 maanden)
- Phase 3: Partner/Admin features (2 maanden)
- Phase 4: Advanced features (optioneel, 3 maanden)

**4. Investment**
- Development: €308,400 (6 maanden team)
- Infrastructure: €8,064/year
- Third-party: €40,040/year (incl. Adyen fees)
- Total Year 1: €356,504

**5. Expected ROI**
- Projected revenue: €180,000/year (50K tickets @ 8% commissie)
- Break-even: ~24 maanden
- Schaalbaarheid naar andere verticals (restaurants, hotels)

---

### Immediate Next Steps

**Week 1-2: Decision & Planning**
1. ✅ Stakeholder review & approval
2. ✅ Finalize budget allocation
3. ✅ Team recruitment/allocation
4. ✅ Adyen account application & onboarding

**Week 3-4: Technical Setup**
5. ✅ Infrastructure provisioning (Kubernetes, databases)
6. ✅ Service repositories creation
7. ✅ CI/CD pipelines setup
8. ✅ Development environment configuration

**Week 5+: Development Kickoff**
9. ✅ Sprint 1: Payment Engine skeleton
10. ✅ Sprint 2: Adyen integration POC
11. ✅ Sprint 3: Ticketing module skeleton
12. ✅ Ongoing: Weekly standups, bi-weekly demos

---

## 📚 15. Appendix

### A. Competitive Analysis

**GetYourGuide**
- Strengths: Massive inventory, instant confirmation, mobile-first
- Architecture: Microservices, multi-payment providers
- Differentiation: AI recommendations, local guides

**Tours-Tickets.com**
- Strengths: Localized experiences, group bookings
- Payment: Adyen + Stripe
- Differentiation: B2B partnerships, affiliate network

**HolidaiButler Differentiators**
- 🤖 AI-driven personalization (Claude integration)
- 🌍 Mediterranean focus (niche market)
- 🔗 Integrated platform (chat → booking → payment)
- 📍 Location-based contextual recommendations

---

### B. API Documentation (Sample)

**Create Booking**
```
POST /api/v1/tickets/bookings
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "poiId": "507f1f77bcf86cd799439011",
  "date": "2025-12-15",
  "timeslot": "14:00-15:00",
  "quantity": 2,
  "guestInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+31612345678"
  },
  "voucherCode": "SUMMER2025"
}

Response 201 Created:
{
  "success": true,
  "data": {
    "bookingId": "BK-2025-001234",
    "status": "pending",
    "totalPrice": 45.00,
    "currency": "EUR",
    "paymentUrl": "https://payments.holidaibutler.com/pay/xyz",
    "expiresAt": "2025-11-15T14:15:00Z"
  }
}
```

---

### C. Database Schema Diagrams

*[Detailed ER diagrams would be included here in final document]*

---

### D. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS EU-West-1                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Application Load Balancer                    │  │
│  │          (SSL Termination, CloudFlare WAF)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│          ┌────────────────┴────────────────┐                    │
│          ▼                                  ▼                    │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  EKS Cluster      │              │  EKS Cluster      │        │
│  │  Ticketing Module │              │  Payment Engine   │        │
│  │  (3 pods)         │◄────────────►│  (3 pods)         │        │
│  └──────────────────┘              └──────────────────┘        │
│          │                                  │                    │
│          ▼                                  ▼                    │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  MongoDB Atlas    │              │  RDS PostgreSQL   │        │
│  │  (M30 cluster)    │              │  (Multi-AZ)       │        │
│  └──────────────────┘              └──────────────────┘        │
│                                             │                    │
│                                             ▼                    │
│                                     ┌──────────────────┐        │
│                                     │  Adyen Platform   │        │
│                                     │  (External)       │        │
│                                     └──────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

### E. Contact & Support

**Project Team:**
- **Technical Lead:** tech@holidaibutler.com
- **Product Owner:** product@holidaibutler.com
- **DevOps:** devops@holidaibutler.com

**External Partners:**
- **Adyen Account Manager:** [Assigned upon signup]
- **AWS Solutions Architect:** [Regional contact]

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Next Review:** December 2025

---

*Dit document is vertrouwelijk en bedoeld voor intern gebruik binnen HolidaiButler B.V.*
