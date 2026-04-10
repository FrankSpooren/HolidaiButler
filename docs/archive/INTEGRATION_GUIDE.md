# HolidaiButler Integration Guide

Volledige gids voor het opzetten en gebruiken van het geïntegreerde HolidaiButler Platform.

## 📋 Inhoudsopgave

1. [Architectuur Overzicht](#architectuur-overzicht)
2. [Installatie & Setup](#installatie--setup)
3. [Module Configuratie](#module-configuratie)
4. [Data Flow](#data-flow)
5. [Workflows](#workflows)
6. [API Gebruik](#api-gebruik)
7. [Troubleshooting](#troubleshooting)

## 🏗️ Architectuur Overzicht

### Systeem Componenten

Het HolidaiButler Platform bestaat uit de volgende componenten:

```
┌─────────────────────────────────────────────────────────────┐
│                    HolidaiButler Ecosysteem                  │
└─────────────────────────────────────────────────────────────┘

1. PLATFORM CORE (Port 3001)
   └─ API Gateway, Event Bus, Workflows, Integraties

2. ADMIN MODULE (Port 3003/5174)
   └─ POI Management, Platform Config, User Management

3. TICKETING MODULE (Port 3004)
   └─ Bookings, Tickets, Availability, QR Codes

4. PAYMENT MODULE (Port 3005)
   └─ Payments, Refunds, Adyen Integration

5. PLATFORM FRONTEND (Port 3002)
   └─ Homepage, POI Pages, User Accounts, HoliBot AI

6. DATABASES
   ├─ MySQL (Hetzner pxoziy_db1) - Ticketing & Payments
   └─ MongoDB - Admin Module

7. EXTERNAL SERVICES
   ├─ MailerLite - Email Marketing & Transactional
   ├─ Adyen - Payment Processing
   ├─ MistralAI - HoliBot AI Assistant
   └─ Hetzner Cloud - Server & Database Hosting
```

### Data Flow

```
┌──────────┐        ┌──────────────┐        ┌──────────┐
│  Client  │───────▶│Platform Core │───────▶│  Module  │
│ (Browser)│        │  (Gateway)   │        │ (Service)│
└──────────┘        └──────────────┘        └──────────┘
                           │
                           ├──▶ Event Bus (Redis)
                           │         │
                           │    ┌────┴─────┐
                           │    │ Workflows│
                           │    └────┬─────┘
                           │         │
                           ▼         ▼
                    ┌──────────────────────┐
                    │ MailerLite/External  │
                    └──────────────────────┘
```

## 🚀 Installatie & Setup

### Stap 1: Platform Core Setup

```bash
# Navigeer naar platform-core directory
cd /home/user/HolidaiButler/platform-core

# Installeer dependencies
npm install

# Configureer environment
cp .env.example .env
nano .env
```

### Stap 2: Environment Configuratie

Bewerk `.env` met de volgende configuratie:

```env
# Platform Core
NODE_ENV=production
PORT=3001
JWT_SECRET=<genereer-een-sterke-secret>

# Module URLs
ADMIN_MODULE_URL=http://localhost:3003
TICKETING_MODULE_URL=http://localhost:3004
PAYMENT_MODULE_URL=http://localhost:3005
PLATFORM_FRONTEND_URL=http://localhost:3002

# Hetzner MySQL Database
DB_HOST=<your-hetzner-ip>
DB_PORT=3306
DB_NAME=pxoziy_db1
DB_USER=<db-user>
DB_PASSWORD=<db-password>

# MongoDB (Admin Module)
MONGODB_URI=mongodb://localhost:27017/holidaibutler_admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MailerLite
MAILERLITE_API_KEY=<your-mailerlite-key>
MAILERLITE_FROM_EMAIL=noreply@holidaibutler.com
MAILERLITE_FROM_NAME=HolidaiButler

# Automation
ENABLE_CRON_JOBS=true
SYNC_INTERVAL_MINUTES=15
```

### Stap 3: Database Setup

#### MySQL (Hetzner)

```sql
-- Create analytics tables
CREATE TABLE IF NOT EXISTS analytics_hourly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hour DATETIME NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY unique_hour_metric (hour, metric_type)
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  total_bookings INT DEFAULT 0,
  completed_bookings INT DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  unique_customers INT DEFAULT 0,
  createdAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions_archive (
  LIKE transactions
);
```

### Stap 4: Start Alle Services

```bash
# Terminal 1: Platform Core
cd /home/user/HolidaiButler/platform-core
npm start

# Terminal 2: Admin Module
cd /home/user/HolidaiButler/admin-module/backend
npm start

# Terminal 3: Ticketing Module
cd /home/user/HolidaiButler/ticketing-module/backend
npm start

# Terminal 4: Payment Module
cd /home/user/HolidaiButler/payment-module/backend
npm start
```

Of gebruik PM2:

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Stap 5: Verificatie

```bash
# Check Platform Core
curl http://localhost:3001/health

# Check all services
curl http://localhost:3001/api/v1/health/all

# Expected response:
{
  "platform": "HolidaiButler",
  "gateway": "healthy",
  "services": {
    "admin": { "status": "healthy" },
    "ticketing": { "status": "healthy" },
    "payment": { "status": "healthy" }
  }
}
```

## 🔧 Module Configuratie

### Admin Module Integration

Voeg de volgende code toe aan `admin-module/backend/server.js`:

```javascript
import axios from 'axios';

const PLATFORM_CORE_URL = process.env.PLATFORM_CORE_URL || 'http://localhost:3001';

// Publish POI events to Platform Core
async function publishEvent(eventName, data) {
  try {
    await axios.post(
      `${PLATFORM_CORE_URL}/api/v1/integration/events`,
      { event: eventName, data }
    );
  } catch (error) {
    console.error('Failed to publish event:', error.message);
  }
}

// In POI create/update/delete handlers:
app.post('/api/admin/pois', async (req, res) => {
  // ... existing code ...
  await publishEvent('poi.created', { poiId: newPOI._id, data: newPOI });
  // ... rest of code ...
});
```

### Ticketing Module Integration

Voeg toe aan `ticketing-module/backend/server.js`:

```javascript
import axios from 'axios';

const PLATFORM_CORE_URL = process.env.PLATFORM_CORE_URL || 'http://localhost:3001';

// Publish booking events
async function publishEvent(eventName, data) {
  try {
    await axios.post(
      `${PLATFORM_CORE_URL}/api/v1/integration/events`,
      { event: eventName, data }
    );
  } catch (error) {
    console.error('Failed to publish event:', error.message);
  }
}

// In booking handlers:
app.post('/api/v1/tickets/bookings', async (req, res) => {
  // ... create booking ...
  await publishEvent('booking.created', {
    bookingId: booking.id,
    userId: booking.userId,
    email: booking.guestInfo.email
  });
});
```

### Payment Module Integration

Voeg toe aan `payment-module/backend/routes/payments.js`:

```javascript
import axios from 'axios';

const PLATFORM_CORE_URL = process.env.PLATFORM_CORE_URL || 'http://localhost:3001';

// Publish payment events
async function publishEvent(eventName, data) {
  try {
    await axios.post(
      `${PLATFORM_CORE_URL}/api/v1/integration/events`,
      { event: eventName, data }
    );
  } catch (error) {
    console.error('Failed to publish event:', error.message);
  }
}

// In Adyen webhook handler:
router.post('/webhooks/adyen', async (req, res) => {
  // ... verify webhook ...

  if (eventCode === 'AUTHORISATION' && success) {
    await publishEvent('payment.completed', {
      paymentId: merchantReference,
      bookingId: merchantReference
    });
  }
});
```

## 🔄 Workflows

### Automatische Workflows

Deze workflows draaien automatisch:

| Workflow | Trigger | Frequentie | Beschrijving |
|----------|---------|------------|--------------|
| Data Sync | Cron | Elke 15 min | Synct data tussen modules |
| Data Cleanup | Cron | Dagelijks 2:00 | Ruimt oude data op |
| Analytics | Cron | Elk uur | Aggregeert analytics |
| Email Campaigns | Cron | Dagelijks 9:00 | Controleert campagnes |
| Booking Reminders | Cron | Dagelijks 10:00 | Stuurt herinneringen |
| Cart Recovery | Cron | Elke 6 uur | Stuurt recovery emails |

### Event-Driven Workflows

| Workflow | Event | Actie |
|----------|-------|-------|
| User Onboarding | `user.registered` | MailerLite subscribe, welcome email |
| Booking Confirmation | `booking.created` | Update MailerLite, add to group |
| Ticket Delivery | `payment.completed` | Generate tickets, send email |
| Payment Recovery | `payment.failed` | Send recovery email |
| Booking Cancellation | `booking.cancelled` | Process refund, send confirmation |

### Handmatige Workflow Executie

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/workflows/user-onboarding/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }'

# Via code
import workflowManager from './automation/workflowManager.js';

await workflowManager.execute('user-onboarding', {
  userId: '123',
  email: 'user@example.com',
  name: 'John Doe'
});
```

## 📡 API Gebruik

### Unified API via Gateway

Alle module APIs zijn toegankelijk via de gateway:

```javascript
// Admin Module (via gateway)
const response = await fetch('http://localhost:3001/api/v1/admin/pois', {
  headers: { 'Authorization': 'Bearer TOKEN' }
});

// Ticketing Module (via gateway)
const response = await fetch('http://localhost:3001/api/v1/tickets/availability/123', {
  headers: { 'Authorization': 'Bearer TOKEN' }
});

// Payment Module (via gateway)
const response = await fetch('http://localhost:3001/api/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 1000, currency: 'EUR' })
});
```

### Direct Module Access

Je kunt ook direct met modules communiceren:

```javascript
// Direct naar Ticketing Module
const response = await fetch('http://localhost:3004/api/v1/tickets/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bookingData)
});
```

## 🔍 Monitoring & Debugging

### Logs Bekijken

```bash
# Platform Core logs
tail -f /home/user/HolidaiButler/platform-core/logs/combined-*.log

# Error logs
tail -f /home/user/HolidaiButler/platform-core/logs/error-*.log

# Integration events
tail -f /home/user/HolidaiButler/platform-core/logs/integration-*.log
```

### Event History

```bash
# Get event history
curl http://localhost:3001/api/v1/integration/events/booking.created?limit=50 \
  -H "Authorization: Bearer TOKEN"
```

### Workflow History

```bash
# Get workflow execution history
curl http://localhost:3001/api/v1/workflows/user-onboarding/history?limit=50 \
  -H "Authorization: Bearer TOKEN"
```

## 🐛 Troubleshooting

### Module Niet Bereikbaar

```bash
# Check of module draait
curl http://localhost:3003/health  # Admin
curl http://localhost:3004/health  # Ticketing
curl http://localhost:3005/health  # Payment

# Check Platform Core configuratie
grep MODULE_URL /home/user/HolidaiButler/platform-core/.env
```

### Event Bus Problemen

```bash
# Check Redis connectie
redis-cli ping

# Check Redis events
redis-cli PSUBSCRIBE "platform:*"
```

### Database Connectie Issues

```bash
# Test MySQL connectie
mysql -h <host> -u <user> -p<password> -D pxoziy_db1

# Test MongoDB connectie
mongosh mongodb://localhost:27017/holidaibutler_admin
```

### MailerLite Integratie

```bash
# Test MailerLite connectie
curl http://localhost:3001/api/v1/integration/mailerlite/test \
  -H "Authorization: Bearer TOKEN"
```

### Workflows Draaien Niet

```bash
# Check of cron jobs enabled zijn
grep ENABLE_CRON_JOBS /home/user/HolidaiButler/platform-core/.env

# Check workflow status
curl http://localhost:3001/api/v1/workflows \
  -H "Authorization: Bearer TOKEN"
```

## 📊 Performance Optimization

### Redis Caching

```javascript
// In modules, gebruik Redis voor caching
import Redis from 'ioredis';
const redis = new Redis();

// Cache availability
const cacheKey = `availability:${poiId}:${date}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// ... fetch from database ...
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
```

### Database Indexing

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_bookings_user ON bookings(userId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(bookingDate);
CREATE INDEX idx_tickets_booking ON tickets(bookingId);
CREATE INDEX idx_transactions_booking ON transactions(bookingReference);
```

## 🔐 Security Best Practices

1. **Environment Variables**: Gebruik sterke secrets in productie
2. **JWT Tokens**: Roteer JWT_SECRET regelmatig
3. **Rate Limiting**: Pas rate limits aan op basis van usage
4. **CORS**: Configureer alleen toegestane origins
5. **Input Validation**: Valideer alle input in modules
6. **SQL Injection**: Gebruik prepared statements (Sequelize doet dit automatisch)
7. **XSS Protection**: Sanitize user input
8. **HTTPS**: Gebruik HTTPS in productie
9. **Database Access**: Beperk database user permissions
10. **Logging**: Log geen gevoelige data (passwords, tokens)

## 📞 Support

Voor hulp en vragen:
- Platform Core: `http://localhost:3001/health`
- Logs: `/home/user/HolidaiButler/platform-core/logs/`
- Documentatie: `/home/user/HolidaiButler/platform-core/README.md`

## 🎯 Next Steps

Na het opzetten van het integration systeem:

1. ✅ Test alle workflows
2. ✅ Configureer MailerLite templates
3. ✅ Setup monitoring & alerts
4. ✅ Configureer backups
5. ✅ Test payment flows
6. ✅ Setup SSL certificates
7. ✅ Configure firewall rules
8. ✅ Load testing
9. ✅ Documentation voor team
10. ✅ Deployment naar productie

---

**Copyright © 2024 HolidaiButler. All rights reserved.**
