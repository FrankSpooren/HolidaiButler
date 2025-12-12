# Restaurant Reservations Module voor HolidaiButler

## 📋 Overzicht

Dit is een **enterprise-level restaurant reserveringsmodule** die kan worden toegepast voor restaurants, cafés en andere horecagelegenheden. De module is geïnspireerd op marktleiders zoals **TheFork** (Europa), **OpenTable** (wereldwijd) en **Resy** (premium segment).

### ✅ Waarom een Aparte Module?

Na grondige analyse is gekozen voor een **aparte maar geïntegreerde module** naast het bestaande ticketing systeem:

**Kernverschillen:**
| Aspect | Ticketing (Attracties) | Reserveringen (Restaurants) |
|--------|------------------------|----------------------------|
| **Business Model** | Capacity-based, prepayment | Table-based, deposit/guarantee |
| **Data Focus** | Timeslots, QR codes | Tables, floor plans, guest CRM |
| **Relatie** | Transactioneel | CRM-gedreven (gastgeschiedenis) |
| **Payment** | 100% vooruitbetaling | Borg of betalen ter plaatse |

**Gedeelde Componenten:**
- ✅ Availability Engine (Redis + MySQL)
- ✅ Payment Integration (Adyen)
- ✅ Notification System (MailerLite)
- ✅ Authentication (JWT)

---

## 🏗️ Architectuur

### Database Schema (MySQL)

De module gebruikt **8 hoofdtabellen**:

1. **`restaurants`** - Restaurant profielen en instellingen
2. **`tables`** - Fysieke tafels met capaciteit en eigenschappen
3. **`reservations`** - Reserveringen met lifecycle tracking
4. **`guests`** - Gastprofielen met voorkeuren en geschiedenis
5. **`guest_notes`** - Personeelsnotities over gasten
6. **`waitlist`** - Wachtlijst voor vol geboekte slots
7. **`floor_plans`** - Visuele plattegronden
8. **`restaurant_availability`** - Real-time beschikbaarheid

### Backend Services

**Kernservices:**
- `ReservationService` - Reservering lifecycle (maken, bevestigen, wijzigen, annuleren)
- `TableManagementService` - Tafel allocatie en optimalisatie
- `GuestCRMService` - Gastprofielen en relatiebeheer
- `WaitlistService` - Wachtlijstbeheer
- `AvailabilityService` - Real-time beschikbaarheid (gedeeld met ticketing)
- `PaymentService` - Borgen en betalingen (gedeeld)
- `NotificationService` - Email/SMS communicatie (gedeeld)
- `IntegrationService` - TheFork, Google, POS integraties

---

## 🎯 Kernfunctionaliteit

### Voor Gasten

- ✅ Restaurant zoeken (locatie, cuisine, prijs, kenmerken)
- ✅ Real-time beschikbaarheid checker
- ✅ Online reserveren met instant bevestiging
- ✅ Borgbetaling via Adyen (indien vereist)
- ✅ Speciale gelegenheden en voorkeuren
- ✅ Dieet restricties (vegetarisch, allergieën, etc.)
- ✅ Wijzigen en annuleren van reserveringen
- ✅ Email/SMS herinneringen (24u van tevoren)
- ✅ Wachtlijst voor vol geboekte tijden

### Voor Restaurants

- ✅ Reserveringen dashboard (timeline view)
- ✅ Visuele floor plan met tafelstatus
- ✅ Auto-optimalisatie van tafeltoewijzingen
- ✅ Guest CRM met geschiedenis en voorkeuren
- ✅ No-show tracking en preventie
- ✅ Wachtlijstbeheer met notificaties
- ✅ Analytics (covers per service, revenue, trends)
- ✅ Multi-channel bookings (TheFork, Google, Instagram)
- ✅ POS integratie (Toast, Square, Lightspeed)

---

## 🔧 Implementatiestatus

### ✅ Voltooid (Fase 1)

1. **Technische Architectuur**
   - [x] Uitgebreid architectuurdocument (RESTAURANT_RESERVATIONS_ARCHITECTURE.md)
   - [x] Database schema design met alle relaties
   - [x] Service layer architectuur

2. **Database Modellen (Sequelize)**
   - [x] Restaurant model met openingstijden en settings
   - [x] Table model met floor plan coördinaten
   - [x] Reservation model met volledige lifecycle
   - [x] Guest model met CRM en statistieken
   - [x] GuestNote model voor personeelsnotities
   - [x] Waitlist model met auto-expiry
   - [x] FloorPlan model voor visuele layouts
   - [x] RestaurantAvailability model met real-time capacity

3. **Backend Services**
   - [x] ReservationService (volledig geïmplementeerd)
   - [x] TableManagementService (basis functionaliteit)
   - [x] Package.json met alle dependencies

### 🚧 Volgende Stappen (Fase 2)

1. **Backend Services (voortzetting)**
   - [ ] GuestCRMService implementeren
   - [ ] WaitlistService implementeren
   - [ ] AvailabilityService wrapper (gebruikt shared core)
   - [ ] PaymentService wrapper (gebruikt payment engine)
   - [ ] NotificationService wrapper (gebruikt MailerLite)
   - [ ] IntegrationService voor TheFork/Google

2. **API Routes**
   - [ ] Restaurant endpoints (GET, POST, PUT)
   - [ ] Reservation endpoints (volledige CRUD)
   - [ ] Table management endpoints
   - [ ] Guest CRM endpoints
   - [ ] Waitlist endpoints
   - [ ] Webhook endpoints (TheFork, Google)

3. **Server Setup**
   - [ ] Express server configuratie (port 3006)
   - [ ] Middleware setup (auth, validation, rate limiting)
   - [ ] Database connectie en sync
   - [ ] Redis connectie voor caching
   - [ ] Cron jobs voor reminders en cleanup

4. **Frontend Components (React)**
   - [ ] RestaurantSearch en filters
   - [ ] TimeSlotSelection met kalender
   - [ ] ReservationForm met gast info
   - [ ] Payment integratie (Adyen Drop-in)
   - [ ] Restaurant dashboard voor personeel
   - [ ] FloorPlanView met drag-and-drop
   - [ ] GuestManagement interface

5. **Integraties**
   - [ ] TheFork API connector
   - [ ] Google Reservations webhooks
   - [ ] POS systeem integraties (Toast, Square)
   - [ ] Social media booking links

6. **Testing & Deployment**
   - [ ] Unit tests voor alle services
   - [ ] Integration tests voor API endpoints
   - [ ] Load testing voor concurrent bookings
   - [ ] Production deployment naar Hetzner
   - [ ] SSL/TLS configuratie
   - [ ] Monitoring en logging setup

---

## 🚀 Quick Start (Ontwikkeling)

### Vereisten

- Node.js 18+
- MySQL 8.0+ (gedeeld met ticketing module)
- Redis (voor availability caching)
- MailerLite API key
- Adyen API credentials

### Installatie

```bash
# Navigeer naar reservations module
cd reservations-module/backend

# Installeer dependencies (al gedaan)
npm install

# Kopieer environment configuratie
cp .env.example .env

# Bewerk .env met je credentials
nano .env

# Sync database (maakt tabellen aan)
node -e "require('./models').syncDatabase()"

# Start development server
npm run dev
```

Server draait op: `http://localhost:3006`

### Database Migratie

```bash
# Maak alleen nieuwe tabellen (veilig)
node scripts/migrate.js

# Force recreate (⚠️ WAARSCHUWING: verwijdert bestaande data)
node scripts/migrate.js --force
```

---

## 📊 Best Practices van Marktleiders

### TheFork (Europa Marktleider)

**Wat we hebben overgenomen:**
- Multi-channel booking aggregatie (website, social media, Google)
- No-show preventie met credit card garanties
- Cross-sell feature (andere restaurants suggereren bij vol)
- Mobile-first management interface
- 10-talige ondersteuning
- POS/CRM integraties

### OpenTable (Wereldwijde Standaard)

**Wat we hebben overgenomen:**
- Geautomatiseerde tafeltoewijzing voor maximale bezetting
- 24/7 boekbaarheid via meerdere kanalen
- Gedetailleerde guest insights en profielen
- POS integratie voor revenue tracking
- AI-powered guest tagging

### Resy (Premium Experience)

**Wat we hebben overgenomen:**
- Dynamische tafeloptimalisatie per zone
- Two-way texting voor reserveringen
- Geautomatiseerd wachtlijstbeheer
- Snelle setup (<24 uur)
- Geen per-cover fees (flat pricing)
- Remote management via mobile

---

## 🔐 Security & Privacy

- **GDPR Compliant**: Gastgegevens met consent management
- **PCI DSS**: Betalingen via gecertificeerde Adyen gateway
- **JWT Authentication**: Secure API access
- **Rate Limiting**: 100 requests / 15 min per IP
- **Encrypted QR Codes**: HMAC-SHA256 voor table validatie
- **Audit Logging**: Alle wijzigingen gelogd voor accountability

---

## 📈 Schaalbaarheid

De architectuur is ontworpen voor groei:

- **Horizontal Scaling**: Load balance meerdere backend instances
- **Redis Cluster**: Voor high-concurrency availability checks
- **DB Replication**: Master-slave MySQL voor read scaling
- **Microservices Ready**: Separate deployment per module
- **CDN**: CloudFront voor assets (floor plans, images)
- **Queue System**: Bull queue voor async operations

---

## 💰 Business Model

### Voor Restaurants

**Pricing Options:**
1. **Flat Fee**: €99-399/maand (geen per-cover fees)
2. **Per-Cover**: €0.25-0.50 per gerealiseerde reservering
3. **Hybrid**: Lage basis + kleine per-cover fee

**ROI voor Restaurants:**
- ✅ Hogere tafelbezetting door optimalisatie
- ✅ Minder no-shows (credit card garanties)
- ✅ Betere gastrelaties (CRM)
- ✅ Multi-channel zichtbaarheid
- ✅ Geautomatiseerde communicatie (tijd besparen)

### Voor HolidaiButler Platform

**Revenue Streams:**
1. SaaS subscriptions van restaurants
2. Commissie op borgen/deposits (1-2%)
3. Premium features (advanced analytics, AI)
4. White-label oplossingen voor grotere groepen
5. Partner commissions (TheFork, Google)

---

## 📞 Support & Documentatie

- **Volledige Architectuur**: `RESTAURANT_RESERVATIONS_ARCHITECTURE.md`
- **API Documentatie**: Wordt gegenereerd met Swagger
- **Database Schema**: Zie models/ directory
- **Integratie Guides**: Komt in Phase 3

---

## 🎯 Conclusie

Deze reserveringsmodule brengt **enterprise-level restaurant management** naar HolidaiButler. Door te leren van marktleiders als TheFork, OpenTable en Resy, maar met de flexibiliteit van een aparte module die shared infrastructure gebruikt, hebben we een schaalbare en toekomstbestendige oplossing gecreëerd.

**Next Actions:**
1. Review en goedkeuring van architectuur
2. Implementatie van resterende services (Phase 2)
3. API endpoints development
4. Frontend components
5. Beta testing met 3-5 pilot restaurants
6. Production launch

---

**Status**: ✅ Foundation Complete - Ready for Phase 2 Implementation
**Last Updated**: November 17, 2025
