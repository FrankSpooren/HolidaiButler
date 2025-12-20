# HolidaiButler Platform Core

Centrale integratiehub voor het HolidaiButler ecosysteem. Dit is het hart van het platform dat alle modules, services en tools met elkaar verbindt en geautomatiseerde workflows beheert.

## 🏗️ Architectuur Overzicht

```
┌──────────────────────────────────────────────────────┐
│           HolidaiButler Platform Core                │
│              (Port 3001 - API Gateway)               │
└──────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐     ┌──────────┐    ┌──────────┐
   │  Admin  │     │ Ticketing│    │ Payment  │
   │ Module  │     │  Module  │    │  Module  │
   │  :3003  │     │   :3004  │    │  :3005   │
   └─────────┘     └──────────┘    └──────────┘
        │                │                │
        └────────────────┴────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌──────────┐                    ┌───────────┐
   │  MySQL   │                    │  MongoDB  │
   │(Hetzner) │                    │  (Admin)  │
   └──────────┘                    └───────────┘
        │
        ▼
   ┌──────────┐     ┌────────────┐    ┌──────────┐
   │  Redis   │     │ MailerLite │    │  Adyen   │
   │(Event Bus)     │  (Email)   │    │(Payments)│
   └──────────┘     └────────────┘    └──────────┘
```

## 📦 Componenten

### 1. API Gateway
- **Poort**: 3001
- **Functie**: Centrale toegangspoort voor alle modules
- **Features**:
  - Request routing naar modules
  - Rate limiting
  - Authentication & Authorization
  - Request logging
  - Health monitoring

### 2. Event Bus (Redis Pub/Sub)
- **Functie**: Event-driven communicatie tussen modules
- **Events**:
  - `user.registered`, `user.updated`
  - `booking.created`, `booking.confirmed`, `booking.cancelled`
  - `payment.completed`, `payment.failed`
  - `ticket.delivered`
  - `poi.created`, `poi.updated`, `poi.deleted`

### 3. Database Connectors
- **MySQL** (Hetzner pxoziy_db1): Centrale database voor ticketing en payments
- **MongoDB**: Admin module data
- **Redis**: Caching, sessions, job queues

### 4. MailerLite Integration
- Gebruikers synchronisatie
- Transactionele emails
- Marketing campagnes
- Segmentatie en groepen

### 5. Automation System
- **Cron Jobs**: Geplande taken
- **Workflows**: Event-driven automatiseringen
- **Job Queues**: Asynchrone verwerking

## 🚀 Installatie

### Vereisten
- Node.js >= 18.0.0
- MySQL 8.0+
- MongoDB 5.0+
- Redis 6.0+

### Installatie Stappen

```bash
# Installeer dependencies
cd platform-core
npm install

# Kopieer environment configuratie
cp .env.example .env

# Bewerk .env met jouw configuratie
nano .env

# Start de service
npm start

# Of gebruik development modus met auto-reload
npm run dev
```

## ⚙️ Configuratie

### Environment Variables

#### Platform Core
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
```

#### Module URLs
```env
ADMIN_MODULE_URL=http://localhost:3003
TICKETING_MODULE_URL=http://localhost:3004
PAYMENT_MODULE_URL=http://localhost:3005
PLATFORM_FRONTEND_URL=http://localhost:3002
```

#### Databases
```env
# MySQL (Hetzner)
DB_HOST=your-hetzner-server.com
DB_PORT=3306
DB_NAME=pxoziy_db1
DB_USER=your-user
DB_PASSWORD=your-password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/holidaibutler_admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### MailerLite
```env
MAILERLITE_API_KEY=your-api-key
MAILERLITE_FROM_EMAIL=noreply@holidaibutler.com
MAILERLITE_FROM_NAME=HolidaiButler
MAILERLITE_GROUP_ID=your-group-id

# Template IDs
MAILERLITE_WELCOME_GROUP_ID=xxx
MAILERLITE_ACTIVE_BOOKERS_GROUP_ID=xxx
MAILERLITE_NEWSLETTER_GROUP_ID=xxx
MAILERLITE_REMINDER_TEMPLATE_ID=xxx
MAILERLITE_CANCELLATION_TEMPLATE_ID=xxx
MAILERLITE_CART_RECOVERY_TEMPLATE_ID=xxx
```

#### Automation
```env
ENABLE_CRON_JOBS=true
SYNC_INTERVAL_MINUTES=15
CLEANUP_INTERVAL_HOURS=24
```

## 🔄 Workflows

### Geregistreerde Workflows

#### User Workflows
- **user-onboarding**: Nieuwe gebruiker onboarding
- **user-profile-update**: Profiel updates synchroniseren
- **user-data-sync**: Volledige gebruiker data sync

#### Booking Workflows
- **booking-confirmation**: Bevestiging bij nieuwe booking
- **ticket-delivery**: Ticket levering na betaling
- **booking-cancellation**: Annulering en refund afhandeling
- **booking-reminders**: Herinneringen voor aankomende bookings
- **abandoned-cart-recovery**: Verlaten winkelwagen recovery

#### Email Workflows
- **email-campaign-check**: Controle geplande campagnes
- **newsletter-subscription**: Nieuwsbrief inschrijvingen
- **promotional-campaign**: Promotionele campagnes

#### Data Workflows
- **data-sync**: Volledige data synchronisatie
- **data-cleanup**: Opruimen oude data
- **database-optimization**: Database optimalisatie
- **analytics-aggregation**: Analytics aggregatie
- **daily-report**: Dagelijkse rapporten

### Workflow Uitvoeren

Via API:
```bash
curl -X POST http://localhost:3001/api/v1/workflows/user-onboarding/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

## 📊 Events

### Event Structuur
```javascript
{
  event: 'event.name',
  data: { /* event data */ },
  timestamp: '2024-01-01T12:00:00.000Z',
  source: 'platform-core'
}
```

### Event Publishing
```javascript
import eventBus from './services/eventBus.js';

await eventBus.publish('user.registered', {
  userId: '123',
  email: 'user@example.com'
});
```

### Event Listening
```javascript
eventBus.on('user.registered', async (data) => {
  console.log('New user registered:', data);
  // Handle event
});
```

## 🔌 Module Integraties

### Admin Module
```javascript
import { adminModuleIntegration } from './integrations/index.js';

// Get POIs
const pois = await adminModuleIntegration.getPOIs();

// Create POI
const poi = await adminModuleIntegration.createPOI(data, token);
```

### Ticketing Module
```javascript
import { ticketingModuleIntegration } from './integrations/index.js';

// Check availability
const availability = await ticketingModuleIntegration.checkAvailability(poiId);

// Create booking
const booking = await ticketingModuleIntegration.createBooking(data, token);
```

### Payment Module
```javascript
import { paymentModuleIntegration } from './integrations/index.js';

// Create payment
const payment = await paymentModuleIntegration.createPayment(data, token);

// Create refund
const refund = await paymentModuleIntegration.createRefund(paymentId, data, token);
```

## 📝 API Endpoints

### Gateway Routes
- `GET /health` - Health check
- `GET /api/v1/health/all` - All services health
- `GET /api/v1/services` - Service discovery

### Integration Routes
- `POST /api/v1/integration/sync` - Trigger data sync
- `GET /api/v1/integration/status` - Integration status
- `GET /api/v1/integration/events/:eventName` - Event history
- `GET /api/v1/integration/mailerlite/test` - Test MailerLite
- `POST /api/v1/integration/mailerlite/subscribe` - Subscribe user

### Workflow Routes
- `GET /api/v1/workflows` - List all workflows
- `GET /api/v1/workflows/:id` - Get workflow details
- `POST /api/v1/workflows/:id/execute` - Execute workflow
- `GET /api/v1/workflows/:id/history` - Workflow history
- `PATCH /api/v1/workflows/:id/status` - Enable/disable workflow

### Module Proxies
- `/api/v1/admin/*` → Admin Module (3003)
- `/api/v1/tickets/*` → Ticketing Module (3004)
- `/api/v1/payments/*` → Payment Module (3005)
- `/api/v1/platform/*` → Platform Frontend (3002)

## 🔒 Beveiliging

- JWT-based authenticatie
- Rate limiting (100 requests per 15 minuten)
- CORS configuratie
- Helmet.js security headers
- Request logging
- Error masking in productie

## 📈 Monitoring

### Logs
Logs worden opgeslagen in `/logs`:
- `combined-YYYY-MM-DD.log` - Alle logs
- `error-YYYY-MM-DD.log` - Alleen errors
- `integration-YYYY-MM-DD.log` - Integratie events

### Log Levels
- `error` - Errors en failures
- `warn` - Waarschuwingen
- `info` - Algemene informatie
- `debug` - Debug informatie (alleen development)

### Health Checks
```bash
# Platform Core
curl http://localhost:3001/health

# All Services
curl http://localhost:3001/api/v1/health/all
```

## 🛠️ Development

### Folder Structure
```
platform-core/
├── src/
│   ├── automation/          # Workflows en automations
│   │   ├── workflows/       # Individuele workflows
│   │   ├── workflowManager.js
│   │   └── index.js
│   ├── config/              # Configuratie
│   │   └── database.js
│   ├── gateway/             # API Gateway
│   │   └── index.js
│   ├── integrations/        # Module integraties
│   │   ├── adminModule.js
│   │   ├── ticketingModule.js
│   │   ├── paymentModule.js
│   │   └── index.js
│   ├── middleware/          # Middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── requestLogger.js
│   ├── routes/              # API Routes
│   │   ├── health.js
│   │   ├── integration.js
│   │   └── workflows.js
│   ├── services/            # Services
│   │   ├── eventBus.js
│   │   └── mailerlite.js
│   ├── utils/               # Utilities
│   │   └── logger.js
│   └── index.js             # Entry point
├── logs/                    # Log files
├── .env.example
├── package.json
└── README.md
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 🚢 Deployment

### Production Checklist
1. ✅ Update `.env` met productie credentials
2. ✅ Zet `NODE_ENV=production`
3. ✅ Configureer sterke `JWT_SECRET`
4. ✅ Zet CORS origins correct
5. ✅ Configureer MailerLite templates
6. ✅ Test database connecties
7. ✅ Test module connectiviteit
8. ✅ Configureer logging
9. ✅ Setup monitoring
10. ✅ Test alle workflows

### Start in Production
```bash
NODE_ENV=production npm start
```

### PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name holidaibutler-core
pm2 save
pm2 startup
```

## 📞 Support

Voor vragen en support:
- Email: support@holidaibutler.com
- Documentatie: /docs

## 📄 License

Copyright © 2024 HolidaiButler. All rights reserved.
# TTS Enabled za 20 dec 2025 21:36:42
