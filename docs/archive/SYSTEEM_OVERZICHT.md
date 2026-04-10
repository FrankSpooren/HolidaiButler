# HolidaiButler - Volledig Systeem Overzicht

## 🎯 Systeem Architectuur

Het HolidaiButler platform is een volledig geïntegreerd ecosysteem met de volgende componenten:

### Centrale Hub: Platform Core (Port 3001)
De **Platform Core** is het hart van het systeem en biedt:
- **API Gateway**: Unified access point voor alle modules
- **Event Bus**: Redis-based pub/sub voor event-driven communicatie
- **Workflow Automation**: Geautomatiseerde processen en protocollen
- **Module Integraties**: Connectoren naar alle modules en externe services

### Modules

#### 1. Admin Module (Port 3003/5174)
- **Backend**: Express.js met MongoDB
- **Frontend**: React + Vite
- **Functionaliteit**:
  - POI management (create, update, delete, verify)
  - Platform configuratie
  - User management
  - Dashboard en analytics

#### 2. Ticketing Module (Port 3004)
- **Backend**: Express.js met MySQL (Sequelize)
- **Functionaliteit**:
  - Booking management
  - Ticket generatie (QR codes, PDF)
  - Availability management
  - Email delivery via MailerLite
  - Apple Wallet & Google Pay integratie

#### 3. Payment Module (Port 3005)
- **Backend**: Express.js met MySQL (Sequelize)
- **Functionaliteit**:
  - Adyen payment processing
  - Transaction management
  - Refund processing
  - Payment method management
  - Webhook handling

#### 4. Platform Frontend (Port 3002)
- **Functionaliteit**:
  - Homepage
  - POI detail pages
  - User accounts
  - Booking flow
  - HoliBot AI widget (MistralAI)

### Databases

#### MySQL (Hetzner Cloud - pxoziy_db1)
**Centrale database voor:**
- Bookings
- Tickets
- Availability
- Transactions
- Refunds
- Payment methods
- Analytics
- Reports

**Tabellen:**
```sql
bookings
tickets
availability
transactions
refunds
stored_payment_methods
analytics_hourly
daily_reports
transactions_archive
```

#### MongoDB
**Admin module database voor:**
- Admin users
- Platform configuration
- POI data

#### Redis
**Voor:**
- Event bus (pub/sub)
- Caching
- Session management
- Job queues

### Externe Services

#### 1. MailerLite
**Integratie voor:**
- Email marketing campagnes
- Transactionele emails (tickets, confirmations)
- Gebruiker segmentatie
- Nieuwsbrieven
- Automated workflows

**Email Templates:**
- Welcome emails
- Booking confirmations
- Ticket delivery
- Booking reminders
- Cancellation confirmations
- Cart recovery
- Payment failure notifications

#### 2. Adyen
**Payment processing voor:**
- Payment sessions
- Multiple payment methods (iDEAL, Cards, PayPal, Apple Pay, Google Pay)
- 3D Secure 2.0
- Authorize & Capture
- Refunds
- Webhook notifications

#### 3. MistralAI
**AI-powered HoliBot voor:**
- Customer support
- Booking assistance
- POI recommendations
- FAQ handling

#### 4. Hetzner Cloud
**Infrastructure:**
- Server hosting
- MySQL database (pxoziy_db1)
- Firewall configuratie
- Network security

## 🔄 Data Flow & Integraties

### User Registration Flow
```
1. User registers → Platform Frontend
2. Frontend → Platform Core API Gateway
3. Platform Core → Admin Module (create user)
4. Admin Module → Event Bus (user.registered)
5. Event Bus → Workflow: user-onboarding
6. Workflow → MailerLite (subscribe + welcome email)
7. Response ← User confirmed
```

### Booking & Payment Flow
```
1. User creates booking → Platform Frontend
2. Frontend → Platform Core → Ticketing Module
3. Ticketing → Event Bus (booking.created)
4. Event Bus → Workflow: booking-confirmation
5. Workflow → MailerLite (update user, add to group)
6. User completes payment → Payment Module → Adyen
7. Adyen webhook → Payment Module
8. Payment Module → Event Bus (payment.completed)
9. Event Bus → Workflow: ticket-delivery
10. Workflow → Ticketing Module (confirm booking)
11. Ticketing Module → Generate tickets (QR, PDF)
12. Ticketing Module → MailerLite (send tickets)
13. User receives tickets via email
```

### Data Synchronization Flow
```
1. Cron job triggers (every 15 min)
2. Platform Core → Workflow: data-sync
3. Workflow → Admin Module (get POIs)
4. Workflow → Event Bus (poi.synced for each POI)
5. Workflow → Ticketing Module (get user stats)
6. Workflow → Event Bus (user.stats.updated)
7. All modules listen and update accordingly
```

## 🤖 Geautomatiseerde Workflows

### Tijd-Gebaseerde Workflows (Cron Jobs)

| Workflow | Schedule | Beschrijving |
|----------|----------|--------------|
| **data-sync** | Elke 15 min | Synchroniseert data tussen alle modules |
| **data-cleanup** | Dagelijks 02:00 | Ruimt oude/verlopen data op |
| **analytics-aggregation** | Elk uur | Aggregeert analytics metrics |
| **email-campaign-check** | Dagelijks 09:00 | Controleert en triggert email campagnes |
| **booking-reminders** | Dagelijks 10:00 | Stuurt herinneringen voor aankomende bookings |
| **abandoned-cart-recovery** | Elke 6 uur | Stuurt recovery emails voor verlaten bookings |
| **daily-report** | Dagelijks 03:00 | Genereert dagelijkse performance rapporten |
| **database-optimization** | Wekelijks | Optimaliseert database tabellen |

### Event-Driven Workflows

| Event | Workflow | Acties |
|-------|----------|--------|
| **user.registered** | user-onboarding | • Subscribe to MailerLite<br>• Send welcome email<br>• Add to welcome group |
| **booking.created** | booking-confirmation | • Update MailerLite<br>• Add to active bookers group<br>• Publish confirmation event |
| **payment.completed** | ticket-delivery | • Confirm booking in ticketing<br>• Generate tickets (QR + PDF)<br>• Send tickets via email<br>• Update MailerLite |
| **payment.failed** | payment-recovery | • Send recovery email<br>• Log failure<br>• Update booking status |
| **booking.cancelled** | booking-cancellation | • Cancel booking<br>• Process refund if applicable<br>• Send cancellation email<br>• Update MailerLite |
| **poi.created** | poi-sync | • Sync POI to all modules<br>• Update availability<br>• Publish sync event |
| **poi.updated** | poi-sync | • Update POI in all modules<br>• Refresh cached data |

## 📊 API Endpoints

### Platform Core Gateway

#### Health & Status
```
GET  /health                      - Platform Core health
GET  /api/v1/health/all          - All services health
GET  /api/v1/services            - Service discovery
```

#### Integration Management
```
POST /api/v1/integration/sync              - Trigger manual sync
GET  /api/v1/integration/status            - Integration status
GET  /api/v1/integration/events/:name      - Event history
GET  /api/v1/integration/mailerlite/test   - Test MailerLite
POST /api/v1/integration/mailerlite/subscribe - Subscribe user
```

#### Workflow Management
```
GET   /api/v1/workflows                    - List workflows
GET   /api/v1/workflows/:id                - Get workflow
POST  /api/v1/workflows/:id/execute        - Execute workflow
GET   /api/v1/workflows/:id/history        - Workflow history
PATCH /api/v1/workflows/:id/status         - Enable/disable
```

#### Module Proxies
```
/api/v1/admin/*     → Admin Module (3003)
/api/v1/tickets/*   → Ticketing Module (3004)
/api/v1/payments/*  → Payment Module (3005)
/api/v1/platform/*  → Platform Frontend (3002)
```

### Admin Module
```
POST   /api/admin/auth/login           - Admin login
GET    /api/admin/pois                 - List POIs
POST   /api/admin/pois                 - Create POI
PUT    /api/admin/pois/:id             - Update POI
DELETE /api/admin/pois/:id             - Delete POI
GET    /api/admin/platform             - Platform config
PUT    /api/admin/platform/branding    - Update branding
```

### Ticketing Module
```
GET  /api/v1/tickets/availability/:poiId    - Check availability
POST /api/v1/tickets/bookings               - Create booking
GET  /api/v1/tickets/bookings/:id           - Get booking
POST /api/v1/tickets/bookings/:id/confirm   - Confirm booking
PUT  /api/v1/tickets/bookings/:id/cancel    - Cancel booking
GET  /api/v1/tickets/:id                    - Get ticket
POST /api/v1/tickets/:id/resend             - Resend ticket
POST /api/v1/tickets/validate               - Validate QR code
```

### Payment Module
```
POST /api/v1/payments                    - Create payment
GET  /api/v1/payments/:id                - Get payment status
POST /api/v1/payments/:id/capture        - Capture payment
POST /api/v1/payments/:id/cancel         - Cancel payment
POST /api/v1/payments/:id/refunds        - Create refund
GET  /api/v1/payments/:id/refunds        - Get refunds
GET  /api/v1/payments/payment-methods/available - Payment methods
POST /api/v1/webhooks/adyen              - Adyen webhook
```

## 🚀 Deployment

### Quick Start

```bash
# 1. Initial setup
cd /home/user/HolidaiButler
./scripts/setup.sh

# 2. Configure .env files
# Edit .env in each module with your credentials

# 3. Deploy all services
./scripts/deploy.sh
```

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart service
pm2 restart holidaibutler-core

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Monitor
pm2 monit
```

### Service URLs

| Service | URL |
|---------|-----|
| Platform Core | http://localhost:3001 |
| Admin Backend | http://localhost:3003 |
| Admin Frontend | http://localhost:5174 |
| Ticketing | http://localhost:3004 |
| Payment | http://localhost:3005 |
| Platform Frontend | http://localhost:3002 |

## 🔐 Configuratie Checklist

### Platform Core
- [ ] `JWT_SECRET` - Sterke secret key
- [ ] `DB_HOST` - Hetzner MySQL server
- [ ] `DB_PASSWORD` - Database password
- [ ] `MONGODB_URI` - MongoDB connection
- [ ] `REDIS_HOST` - Redis server
- [ ] `MAILERLITE_API_KEY` - MailerLite API key
- [ ] `MAILERLITE_*_GROUP_ID` - MailerLite group IDs
- [ ] `MAILERLITE_*_TEMPLATE_ID` - Email template IDs

### Admin Module
- [ ] MongoDB connection
- [ ] JWT secret
- [ ] CORS origins

### Ticketing Module
- [ ] MySQL connection (Hetzner)
- [ ] MailerLite configuration
- [ ] Redis connection

### Payment Module
- [ ] MySQL connection (Hetzner)
- [ ] Adyen API credentials
- [ ] Adyen webhook HMAC key
- [ ] Adyen merchant account

## 📈 Monitoring & Logging

### Log Locaties
```
/home/user/HolidaiButler/platform-core/logs/
  ├── combined-YYYY-MM-DD.log      # Alle logs
  ├── error-YYYY-MM-DD.log         # Errors
  └── integration-YYYY-MM-DD.log   # Integration events

/home/user/HolidaiButler/*/backend/logs/
  ├── pm2-error.log                # PM2 errors
  └── pm2-out.log                  # PM2 output
```

### Health Monitoring
```bash
# Check all services
curl http://localhost:3001/api/v1/health/all

# Check individual service
curl http://localhost:3001/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

## 🔒 Security Features

- **JWT Authentication**: Beveiligde API toegang
- **Rate Limiting**: 100 requests per 15 minuten
- **CORS Protection**: Configured origins only
- **Helmet.js**: Security headers
- **Input Validation**: Via express-validator
- **SQL Injection**: Prevented via Sequelize ORM
- **Password Hashing**: BCrypt voor admin users
- **HMAC Verification**: Voor Adyen webhooks
- **Request Logging**: Alle requests worden gelogd
- **Error Masking**: Geen sensitive data in productie errors

## 📞 Support & Maintenance

### Backup Procedures
```bash
# MySQL backup
mysqldump -h <host> -u <user> -p pxoziy_db1 > backup-$(date +%Y%m%d).sql

# MongoDB backup
mongodump --uri="mongodb://localhost:27017/holidaibutler_admin" --out=backup-$(date +%Y%m%d)
```

### Update Procedures
```bash
# Pull latest code
git pull origin main

# Re-deploy
./scripts/deploy.sh
```

### Common Issues
Zie `INTEGRATION_GUIDE.md` voor troubleshooting.

## 🎯 Performance Metrics

Het systeem is ontworpen voor:
- **Response Time**: < 200ms voor API calls
- **Throughput**: 1000+ bookings per uur
- **Availability**: 99.9% uptime
- **Concurrent Users**: 10,000+

## 📄 Licentie

Copyright © 2024 HolidaiButler. All rights reserved.

---

**Documentatie Versie**: 1.0
**Laatste Update**: 2024
**Auteur**: HolidaiButler Development Team
