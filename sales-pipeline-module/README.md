# B2B Sales Pipeline CRM

<div align="center">
  <img src="docs/images/logo.png" alt="Sales Pipeline Logo" width="120">

  ### Enterprise-Grade B2B Sales Pipeline & CRM Platform

  *Built on HubSpot CRM principles with modern technology stack*

  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue.svg)](https://postgresql.org/)
  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()
</div>

---

## Overview

The **B2B Sales Pipeline CRM** is a comprehensive, enterprise-level customer relationship management platform designed for B2B sales teams. Built on proven HubSpot CRM principles, it delivers a modern, intuitive interface with powerful automation capabilities.

### Key Value Propositions

- **📊 Complete Sales Visibility** - Real-time pipeline insights and forecasting
- **🤖 Intelligent Automation** - Automated reminders, lead scoring, and workflows
- **💬 Multi-Channel Communication** - Email, WhatsApp Business, and in-app messaging
- **📈 Data-Driven Decisions** - Advanced analytics and performance metrics
- **🔐 Enterprise Security** - Role-based access, 2FA, and audit logging

---

## Features

### Sales Performance Management

| Feature | Description |
|---------|-------------|
| **Pipeline Kanban Board** | Drag-and-drop deal management with stage automation |
| **Lead Generation & Scoring** | Automatic scoring based on demographics and behavior |
| **Conversion Tracking** | Full funnel analytics from lead to closed deal |
| **Sales Forecasting** | Weighted pipeline with probability calculations |
| **Campaign ROI Analysis** | Track marketing campaign effectiveness |
| **Performance Dashboards** | Real-time KPIs and team leaderboards |

### Contact & Account Management

| Feature | Description |
|---------|-------------|
| **Account Health Scoring** | Automated health assessment based on engagement |
| **Contact Hierarchy** | Track relationships and decision-makers |
| **Activity Timeline** | Complete interaction history |
| **Duplicate Detection** | Prevent data quality issues |
| **Bulk Operations** | Mass update and assignment capabilities |
| **Data Import/Export** | CSV, Excel, and JSON support |

### User & Team Management

| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Granular permissions (Admin, Manager, Sales Rep) |
| **Team Organization** | Hierarchical team structure with quotas |
| **Shared Inbox** | Collaborative email management |
| **Automated Reminders** | Email and WhatsApp notifications |
| **Activity Logging** | Complete audit trail |
| **Two-Factor Authentication** | Enhanced security |

### Integrations

| Integration | Status |
|-------------|--------|
| **WhatsApp Business API** | ✅ Built-in |
| **Email (SMTP)** | ✅ Built-in |
| **OAuth 2.0** | ✅ Built-in |
| **Webhook Support** | ✅ Built-in |
| **REST API** | ✅ Built-in |
| **HolidaiButler Platform** | ✅ Integrated |

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18.x with ES Modules
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15.x with Sequelize ORM
- **Cache**: Redis 7.x with Pub/Sub
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.IO
- **Job Scheduling**: node-cron
- **Logging**: Winston with daily rotation

### Frontend
- **Framework**: React 18.x with Vite
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: Zustand
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **HTTP Client**: Axios
- **Date Handling**: date-fns

### Infrastructure
- **Container**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2
- **Database Migrations**: Sequelize CLI

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (Nginx)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Frontend    │       │   API Server  │       │   WebSocket   │
│  (React SPA)  │       │   (Express)   │       │  (Socket.IO)  │
└───────────────┘       └───────────────┘       └───────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  PostgreSQL   │       │     Redis     │       │   File Store  │
│   Database    │       │  Cache/PubSub │       │    (S3/Local) │
└───────────────┘       └───────────────┘       └───────────────┘
```

### Data Models (22 entities)

```
Core CRM                    Sales Operations           System
─────────────────           ──────────────────        ────────────
• Account                   • Deal                    • User
• Contact                   • Pipeline                • Team
• Lead                      • PipelineStage           • Session
• Activity                  • Campaign                • AuditLog
• Task                      • Quote                   • Notification
• Comment                   • Product                 • ImportJob
• Document                  • EmailMessage            • ExportJob
                           • SharedInbox
```

---

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15.x
- Redis 7.x
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sales-pipeline-module.git
cd sales-pipeline-module

# Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate
npm run db:seed

# Start the backend
npm run dev

# In a new terminal, install frontend dependencies
cd ../frontend
npm install

# Start the frontend
npm run dev
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## API Documentation

### Authentication

```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-2fa
```

### Deals

```http
GET    /api/v1/deals              # List deals with filters
POST   /api/v1/deals              # Create deal
GET    /api/v1/deals/:id          # Get deal details
PUT    /api/v1/deals/:id          # Update deal
DELETE /api/v1/deals/:id          # Delete deal
PATCH  /api/v1/deals/:id/stage    # Move deal to stage
GET    /api/v1/deals/kanban/:pipelineId  # Kanban view
GET    /api/v1/deals/forecast     # Sales forecast
```

### Accounts, Contacts, Leads

```http
GET    /api/v1/accounts           # List accounts
POST   /api/v1/accounts           # Create account
GET    /api/v1/accounts/:id       # Get account with metrics
PUT    /api/v1/accounts/:id       # Update account
DELETE /api/v1/accounts/:id       # Delete account
POST   /api/v1/accounts/merge     # Merge accounts

GET    /api/v1/contacts           # List contacts
POST   /api/v1/contacts           # Create contact
GET    /api/v1/contacts/:id       # Get contact details
PUT    /api/v1/contacts/:id       # Update contact
DELETE /api/v1/contacts/:id       # Delete contact

GET    /api/v1/leads              # List leads
POST   /api/v1/leads              # Create lead
POST   /api/v1/leads/:id/convert  # Convert to contact/deal
POST   /api/v1/leads/:id/qualify  # Qualify/disqualify lead
```

### Reports

```http
GET /api/v1/reports/dashboard           # KPI dashboard
GET /api/v1/reports/sales-performance   # Sales metrics
GET /api/v1/reports/pipeline            # Pipeline analysis
GET /api/v1/reports/campaign-performance # Campaign ROI
GET /api/v1/reports/forecast            # Revenue forecast
```

---

## Performance Metrics

### Sales Metrics (HubSpot-Aligned)

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Conversion Rate** | Lead → Deal conversion | `(Converted Leads / Total Leads) × 100` |
| **Win Rate** | Deals won vs. closed | `(Won Deals / Closed Deals) × 100` |
| **Average Deal Size** | Mean deal value | `Total Revenue / Won Deals` |
| **Sales Cycle** | Average days to close | `Sum(Close Date - Create Date) / Deals` |
| **Pipeline Velocity** | Revenue flow rate | `(Deals × Win Rate × Avg Value) / Cycle` |
| **Response Time** | First response speed | `Avg(First Response - Lead Created)` |
| **Cost Per Lead** | Marketing efficiency | `Campaign Cost / Leads Generated` |
| **ROI** | Campaign return | `((Revenue - Cost) / Cost) × 100` |

---

## Security Features

### Authentication & Authorization
- JWT tokens with 15-minute expiry
- Refresh token rotation
- Two-factor authentication (TOTP)
- Session management with device tracking
- Account lockout after failed attempts

### Access Control
- Role-based permissions (RBAC)
- Field-level security
- API rate limiting (1000 req/15min)
- IP whitelisting support

### Data Protection
- Password hashing (bcrypt, 12 rounds)
- Soft deletes with audit trail
- Request/response logging
- CORS and Helmet security headers

### Compliance
- GDPR-ready data handling
- Audit logging for all changes
- Data export capabilities
- Retention policy support

---

## Roadmap

### Phase 1 (Current)
- [x] Core CRM functionality
- [x] Pipeline management
- [x] Lead scoring
- [x] Email notifications
- [x] WhatsApp integration
- [x] Reporting dashboard

### Phase 2 (Q1 2026)
- [ ] AI-powered lead scoring
- [ ] Email sequence automation
- [ ] Meeting scheduler
- [ ] Mobile application
- [ ] Advanced analytics

### Phase 3 (Q2 2026)
- [ ] Salesforce sync
- [ ] HubSpot migration tool
- [ ] Custom reporting builder
- [ ] API marketplace
- [ ] Multi-currency support

---

## Support & Contact

**Technical Support**: support@holidaibutler.com
**Sales Inquiries**: sales@holidaibutler.com
**Documentation**: https://docs.holidaibutler.com/sales-pipeline

---

## License

Copyright © 2025 HolidaiButler. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

---

<div align="center">
  <sub>Built with ❤️ by the HolidaiButler Team</sub>
</div>
