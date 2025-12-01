# HolidaiButler Platform

**Enterprise-Level Tourism Platform for Costa Blanca & Beyond**

Version 2.0.0 | Last Updated: 1 December 2025

---

## Overview

HolidaiButler is a comprehensive tourism platform that helps travelers discover, book, and experience the best of the Costa Blanca region. The platform combines AI-powered recommendations, real-time availability, and seamless booking experiences.

### Key Features

- **HoliBot AI Assistant** - Mistral AI-powered chatbot for personalized recommendations
- **POI Discovery** - 1000+ curated Points of Interest
- **Smart Ticketing** - Digital tickets with Apple Wallet & Google Pay
- **Seamless Payments** - Adyen-powered secure payment processing
- **Multi-language Support** - 6 languages (NL, EN, DE, ES, SV, PL)
- **WCAG 2.1 Compliant** - Full accessibility support

---

## Architecture

```
HolidaiButler Platform v2.0
├── Frontend (React 19 + TypeScript + Tailwind)
│   ├── Customer Portal (main frontend)
│   ├── Admin Dashboard
│   └── HoliBot Widget
│
├── Backend Services
│   ├── Platform Core (:3001) - API Gateway & Central Hub
│   ├── HoliBot API (:3002) - AI Chat Service
│   ├── Admin Module (:3003) - Content Management
│   ├── Ticketing Module (:3004) - Ticket Management
│   ├── Payment Module (:3005) - Adyen Integration
│   ├── Reservations Module (:3006) - Restaurant Bookings
│   ├── Agenda Module (:3007) - Event Management
│   └── Sales Pipeline (:3008) - B2B CRM
│
└── Data Layer
    ├── MySQL (Primary Database)
    ├── Redis (Caching & Sessions)
    └── ChromaDB (Vector Search for AI)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- Redis 7.0+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/FrankSpooren/HolidaiButler.git
cd HolidaiButler

# Install dependencies for all modules
npm run install:all

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Required Configuration
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_ADMIN_SECRET=your-secure-admin-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret

# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=holidaibutler
DATABASE_USER=holidaibutler_app
DATABASE_PASSWORD=your-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Adyen (Payments)
ADYEN_API_KEY=your-adyen-api-key
ADYEN_MERCHANT_ACCOUNT=your-merchant-account

# Mistral AI (HoliBot)
MISTRAL_API_KEY=your-mistral-api-key
```

---

## Module Documentation

### Platform Core

The central integration hub that provides:
- API Gateway (proxy to all modules)
- Event Bus (Redis Pub/Sub)
- POI Discovery & Classification
- Authentication & Authorization
- Prometheus Metrics

```bash
cd platform-core
npm install
npm run dev
```

### Admin Module

Content management system for:
- POI CRUD operations
- User management
- Booking oversight
- Analytics dashboard

```bash
cd admin-module/backend
npm install
npm run dev
```

### Ticketing Module

Ticket management with:
- Digital ticket generation
- QR code validation
- Apple Wallet integration
- Ticket transfer support

### Payment Module

Adyen-powered payments:
- PCI-DSS compliant
- Multiple payment methods
- Refund processing
- Webhook handling

---

## API Documentation

See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for complete API reference.

### Quick API Examples

```bash
# Get POIs
curl http://localhost:3001/api/v1/pois?city=Calpe&category=food_drinks

# Chat with HoliBot
curl -X POST http://localhost:3001/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your-session", "message": "Find restaurants"}'

# Admin Login
curl -X POST http://localhost:3003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

---

## Development

### Project Structure

```
HolidaiButler/
├── platform-core/          # Central API Gateway
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Sequelize models
│   │   └── utils/          # Utilities
│   └── tests/              # Test suites
│
├── admin-module/           # Admin CMS
│   ├── backend/            # Express API
│   └── frontend/           # React dashboard
│
├── ticketing-module/       # Ticket management
├── payment-module/         # Payment processing
├── reservations-module/    # Restaurant bookings
├── agenda-module/          # Event management
├── sales-pipeline-module/  # B2B CRM
│
├── docs/                   # Documentation
└── frontend/               # Customer portal (if separate)
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific module tests
cd platform-core && npm test
cd admin-module/backend && npm test

# Run with coverage
npm run test:coverage
```

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
cd platform-core
npx sequelize-cli migration:generate --name your-migration

# Rollback last migration
npm run migrate:undo
```

---

## Security

### Security Audit

See [docs/SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md) for the latest security assessment.

### Best Practices

- All JWT secrets must be configured via environment variables
- Use HTTPS in production
- Configure explicit CORS origins
- Enable rate limiting on all endpoints
- Regular dependency updates

---

## Deployment

### Production Checklist

- [ ] Configure all environment variables
- [ ] Set `NODE_ENV=production`
- [ ] Enable SSL/TLS
- [ ] Configure backup strategy
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Run security audit
- [ ] Load testing completed

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards

- ESLint configuration included
- Prettier for formatting
- Jest for testing
- JSDoc for documentation

---

## License

Proprietary - HolidaiButler B.V.

---

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/FrankSpooren/HolidaiButler/issues)
- Email: support@holidaibutler.com

---

## Changelog

### Version 2.0.0 (December 2025)

**Fase 1: Foundation**
- Security fixes (JWT, SQL injection)
- Auth middleware merge
- Database schema alignment
- Basic integration tests

**Fase 2: Frontend Integration**
- ORIGINAL frontend merge
- Footer design integration
- Framer Motion animations
- HoliBot widget integration

**Fase 3: Module Integration**
- Admin POI routes
- Widget API deployment
- Ticketing module activation
- Payment module Adyen setup

**Fase 4: Testing & Polish**
- E2E test suites
- Performance optimization
- Security audit
- Documentation update
