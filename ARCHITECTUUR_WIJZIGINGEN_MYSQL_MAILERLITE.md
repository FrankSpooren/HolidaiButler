# HolidaiButler - Architectuurwijzigingen: MySQL & MailerLite

**Datum:** 17 November 2025
**Status:** ✅ Geïmplementeerd
**Database:** MySQL (Hetzner pxoziy_db1)
**Email:** MailerLite

---

## 📋 Overzicht Wijzigingen

De payment- en ticketing-modules zijn volledig aangepast om te werken met:

1. **MySQL 8.0+** in plaats van MongoDB/PostgreSQL
2. **MailerLite** in plaats van Nodemailer

Dit document beschrijft alle doorgevoerde wijzigingen en configuratie-instructies.

---

## 🗄️ Database Wijzigingen

### 1. Payment Module (van PostgreSQL → MySQL)

#### Aangepaste Bestanden:

**`payment-module/backend/package.json`**
- ❌ Verwijderd: `pg`, `pg-hstore`
- ✅ Toegevoegd: `mysql2`

**`payment-module/backend/.env.example`**
```env
# Database (MySQL - Hetzner)
DATABASE_HOST=your-hetzner-mysql-host
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=your-mysql-username
DATABASE_PASSWORD=your-mysql-password
DATABASE_URL=mysql://your-mysql-username:your-mysql-password@your-hetzner-mysql-host:3306/pxoziy_db1
```

**`payment-module/backend/models/index.js`**
- Database dialect gewijzigd: `postgres` → `mysql`
- Connection configuratie aangepast voor MySQL
- JSONB → JSON
- INET → VARCHAR(45)
- Timezone: `+01:00` (Amsterdam)
- Charset: `utf8mb4_unicode_ci`

#### Database Tabellen:

```sql
-- Transactions table
CREATE TABLE transactions (
  id CHAR(36) PRIMARY KEY,
  transaction_reference VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status ENUM('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL,
  user_id CHAR(36) NOT NULL,
  metadata JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ...
);

-- Refunds table
CREATE TABLE refunds (
  id CHAR(36) PRIMARY KEY,
  refund_reference VARCHAR(100) UNIQUE NOT NULL,
  transaction_id CHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
  ...
);

-- Payment Methods table
CREATE TABLE stored_payment_methods (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  payment_token VARCHAR(200) UNIQUE NOT NULL,
  ...
);
```

---

### 2. Ticketing Module (van MongoDB → MySQL)

#### Aangepaste Bestanden:

**`ticketing-module/backend/package.json`**
- ❌ Verwijderd: `mongoose`
- ✅ Toegevoegd: `mysql2`, `sequelize`

**`ticketing-module/backend/.env.example`**
```env
# Database (MySQL - Hetzner)
DATABASE_HOST=your-hetzner-mysql-host
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=your-mysql-username
DATABASE_PASSWORD=your-mysql-password
DATABASE_URL=mysql://your-mysql-username:your-mysql-password@your-hetzner-mysql-host:3306/pxoziy_db1
```

**`ticketing-module/backend/models/index.js`** (NIEUW)
- Volledig nieuwe Sequelize-based models
- 3 hoofdmodels: Booking, Ticket, Availability
- UUID's als CHAR(36)
- Alle timestamps als MySQL TIMESTAMP
- Auto-generation van booking references en ticket numbers
- Relaties: Booking hasMany Tickets

#### Database Tabellen:

```sql
-- Bookings table
CREATE TABLE bookings (
  id CHAR(36) PRIMARY KEY,
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  user_id CHAR(36) NOT NULL,
  poi_id CHAR(36) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired') NOT NULL,
  booking_date DATE NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'),
  ...
);

-- Tickets table
CREATE TABLE tickets (
  id CHAR(36) PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  booking_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  poi_id CHAR(36) NOT NULL,
  type ENUM('single', 'multi-day', 'group', 'guided-tour', 'experience', 'combo') NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  status ENUM('active', 'used', 'expired', 'cancelled', 'refunded') NOT NULL,
  qr_code_data TEXT NOT NULL,
  ...
);

-- Availability table
CREATE TABLE availability (
  id CHAR(36) PRIMARY KEY,
  poi_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  total_capacity INT NOT NULL,
  booked_capacity INT DEFAULT 0,
  reserved_capacity INT DEFAULT 0,
  available_capacity INT DEFAULT 0,
  base_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  ...
);
```

---

## 📧 Email Systeem Wijzigingen

### Ticketing Module (van Nodemailer → MailerLite)

#### Aangepaste Bestanden:

**`ticketing-module/backend/package.json`**
- ❌ Verwijderd: `nodemailer`
- ✅ Toegevoegd: `@mailerlite/mailerlite-nodejs`

**`ticketing-module/backend/.env.example`**
```env
# Email (MailerLite)
MAILERLITE_API_KEY=your-mailerlite-api-key
MAILERLITE_FROM_EMAIL=tickets@holidaibutler.com
MAILERLITE_FROM_NAME=HolidaiButler
```

**`ticketing-module/backend/services/TicketService.js`**
- MailerLite client geïnitialiseerd in constructor
- Email verzending via `mailerLite.send()` API
- PDF attachments als base64 encoded content
- Verbeterde error logging

#### MailerLite Implementatie:

```javascript
// Initialize MailerLite
this.mailerLite = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY,
});

// Send email with PDF attachment
await this.mailerLite.send({
  from: {
    email: this.fromEmail,
    name: this.fromName,
  },
  to: [{
    email: email,
    name: holderName,
  }],
  subject: `Your HolidaiButler Tickets - ${productName}`,
  html: emailHTML,
  attachments: [{
    content: pdfBase64,
    filename: `tickets-${bookingId}.pdf`,
    type: 'application/pdf',
    disposition: 'attachment',
  }],
});
```

---

## 🏗️ Architectuur Overzicht

### Nieuwe Architectuur Diagram:

```
┌─────────────────────────────────────────────────────────────┐
│                  HolidaiButler Platform                      │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
   ┌────────────────────┐   ┌────────────────────┐
   │  Ticketing Module  │   │  Payment Engine    │
   │  (Port 3004)       │   │  (Port 3005)       │
   │  Sequelize/MySQL   │   │  Sequelize/MySQL   │
   └────────────────────┘   └────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌──────────────────────┐
                │  MySQL (Hetzner)     │
                │  pxoziy_db1          │
                │  - Bookings          │
                │  - Tickets           │
                │  - Availability      │
                │  - Transactions      │
                │  - Refunds           │
                └──────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
      ┌──────────────┐        ┌──────────────┐
      │  Adyen       │        │  MailerLite  │
      │  (Payments)  │        │  (Email)     │
      └──────────────┘        └──────────────┘
```

### Technology Stack:

| Component | Technologie |
|-----------|-------------|
| **Backend** | Node.js 18+ / Express.js 4.18+ |
| **Database** | MySQL 8.0+ (Hetzner pxoziy_db1) |
| **ORM** | Sequelize 6.35+ |
| **Cache** | Redis 4.6+ |
| **Queue** | Bull 4.12+ |
| **Payments** | Adyen API Library 16.0+ |
| **Email** | MailerLite Node.js SDK |
| **Real-time** | Socket.IO 4.6+ |

---

## 🚀 Installatie & Configuratie

### 1. Dependencies Installeren

#### Payment Module:
```bash
cd payment-module/backend
npm install
```

#### Ticketing Module:
```bash
cd ticketing-module/backend
npm install
```

### 2. Environment Variables Configureren

#### Payment Module (.env):
```env
# Server
NODE_ENV=production
PORT=3005

# Database (MySQL - Hetzner)
DATABASE_HOST=your-hetzner-host.de
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=your-username
DATABASE_PASSWORD=your-secure-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Adyen
ADYEN_API_KEY=your-adyen-api-key
ADYEN_ENVIRONMENT=live
ADYEN_MERCHANT_ACCOUNT=your-merchant-account
ADYEN_HMAC_KEY=your-hmac-key
ADYEN_CLIENT_KEY=pub_live_your-client-key

# Other
AUTO_CAPTURE=true
TICKETING_MODULE_URL=http://localhost:3004
JWT_SECRET=your-jwt-secret
```

#### Ticketing Module (.env):
```env
# Server
NODE_ENV=production
PORT=3004

# Database (MySQL - Hetzner)
DATABASE_HOST=your-hetzner-host.de
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=your-username
DATABASE_PASSWORD=your-secure-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MailerLite
MAILERLITE_API_KEY=your-mailerlite-api-key
MAILERLITE_FROM_EMAIL=tickets@holidaibutler.com
MAILERLITE_FROM_NAME=HolidaiButler

# Payment Engine
PAYMENT_ENGINE_URL=http://localhost:3005

# QR Security
QR_SECRET_KEY=your-qr-secret-key

# Other
JWT_SECRET=your-jwt-secret
RESERVATION_TIMEOUT_MINUTES=15
```

### 3. Database Setup

#### Optie A: Automatische Sync (Development)
```javascript
const { syncDatabase } = require('./models');

// Sync zonder DROP (safe)
await syncDatabase();

// Force sync (DROP + CREATE - alleen development!)
await syncDatabase({ force: true });
```

#### Optie B: Migraties (Production - AANBEVOLEN)
```bash
# Payment module
cd payment-module/backend
npm run migrate

# Ticketing module
cd ticketing-module/backend
npm run migrate
```

### 4. Applicatie Starten

```bash
# Payment Engine
cd payment-module/backend
npm start

# Ticketing Module
cd ticketing-module/backend
npm start
```

---

## ✅ Verificatie & Testing

### Database Connectie Testen:

```javascript
// Test MySQL connectie
const { sequelize } = require('./models');

sequelize.authenticate()
  .then(() => console.log('✅ MySQL connected'))
  .catch(err => console.error('❌ MySQL error:', err));
```

### MailerLite Testen:

```javascript
// Test MailerLite
const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

const mailerLite = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY,
});

// Verzend test email
await mailerLite.send({
  from: { email: 'tickets@holidaibutler.com', name: 'HolidaiButler' },
  to: [{ email: 'test@example.com', name: 'Test User' }],
  subject: 'MailerLite Test',
  html: '<h1>Test email</h1>',
});
```

---

## 📊 Belangrijke Verschillen

### MongoDB/Mongoose → MySQL/Sequelize

| Aspect | MongoDB | MySQL |
|--------|---------|-------|
| **ID Type** | ObjectId | CHAR(36) UUID |
| **Schema** | Flexibel | Strikt gedefinieerd |
| **Relaties** | References | Foreign Keys |
| **Queries** | `.find()`, `.findOne()` | `.findAll()`, `.findOne()` |
| **Timestamps** | Automatisch | Via Sequelize config |
| **Nested Objects** | Natuurlijk | JSON columns |

### PostgreSQL → MySQL

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| **UUID** | UUID type | CHAR(36) |
| **JSON** | JSONB | JSON |
| **IP Address** | INET | VARCHAR(45) |
| **Timestamps** | TIMESTAMP WITH TIME ZONE | TIMESTAMP |
| **Auto UUID** | gen_random_uuid() | Sequelize UUIDV4 |

### Nodemailer → MailerLite

| Aspect | Nodemailer | MailerLite |
|--------|-----------|------------|
| **Setup** | SMTP configuratie | API Key |
| **Verzending** | Direct SMTP | API call |
| **Attachments** | File path | Base64 encoded |
| **Templates** | Zelf maken | Platform templates |
| **Analytics** | Geen | Ingebouwd |
| **Deliverability** | Afhankelijk van SMTP | Geoptimaliseerd |

---

## 🔧 Troubleshooting

### MySQL Connectie Problemen

**Fout:** `ER_NOT_SUPPORTED_AUTH_MODE`
```bash
# Oplossing: Update MySQL user authentication
ALTER USER 'your-username'@'%' IDENTIFIED WITH mysql_native_password BY 'your-password';
FLUSH PRIVILEGES;
```

**Fout:** `Can't connect to MySQL server`
```bash
# Check:
1. Firewall regels (port 3306)
2. MySQL bind-address configuratie
3. Correcte host/port in .env
```

### MailerLite Problemen

**Fout:** `Invalid API key`
```bash
# Oplossing:
1. Verifieer API key in MailerLite dashboard
2. Check .env MAILERLITE_API_KEY
3. Herstart applicatie na .env wijziging
```

**Fout:** `Email not sent`
```bash
# Check:
1. MailerLite account status
2. Email quota/limits
3. From email verified in MailerLite
```

---

## 📝 Migratie Checklist

### Pre-Migratie:
- [ ] Backup bestaande MongoDB/PostgreSQL databases
- [ ] MySQL database aangemaakt (pxoziy_db1)
- [ ] MySQL user aangemaakt met juiste permissions
- [ ] MailerLite account aangemaakt en API key verkregen
- [ ] From email geverifieerd in MailerLite

### Code Deployment:
- [ ] Git pull latest changes
- [ ] `npm install` in payment-module/backend
- [ ] `npm install` in ticketing-module/backend
- [ ] .env bestanden geconfigureerd
- [ ] Database migrations uitgevoerd

### Testing:
- [ ] Database connectie getest
- [ ] MailerLite email verzending getest
- [ ] Payment flow getest (test mode)
- [ ] Ticket generatie getest
- [ ] QR code validatie getest

### Post-Migratie:
- [ ] Data gemigreerd (indien bestaande data)
- [ ] Monitoring ingesteld
- [ ] Backup strategie geconfigureerd
- [ ] Team geïnformeerd over wijzigingen

---

## 📚 Referenties

### Documentatie:
- **Sequelize:** https://sequelize.org/docs/v6/
- **MySQL 8.0:** https://dev.mysql.com/doc/refman/8.0/en/
- **MailerLite API:** https://developers.mailerlite.com/
- **Adyen API:** https://docs.adyen.com/

### Support:
- **Technische vragen:** tech@holidaibutler.com
- **Database issues:** Hetzner support
- **Email issues:** MailerLite support

---

**Document versie:** 1.0
**Laatste update:** 17 November 2025
**Auteur:** Claude (Anthropic)
**Status:** ✅ Productie-klaar
