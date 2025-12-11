# HolidaiButler Admin Module

Complete CMS/Admin module voor het HolidaiButler platform. Dit systeem stelt verschillende gebruikersrollen in staat om POIs (Points of Interest) en platform configuraties te beheren.

## 📋 Overzicht

Deze admin module biedt:

- **POI Management**: Volledige CRUD voor locaties met afbeeldingen, contactgegevens en content
- **Platform Configuratie**: Branding, content, contact, en juridische documenten beheren
- **Rolgebaseerd Toegangsbeheer**: 4 verschillende rollen met specifieke permissies
- **Multi-taal Ondersteuning**: Engels, Spaans, Duits, Frans
- **File Upload Systeem**: Lokale opslag voor afbeeldingen en documenten
- **Responsive UI**: Modern Material-UI dashboard

## 🏗️ Architectuur

### Backend (Node.js/Express)
- **Port**: 3003
- **Database**: MySQL/Sequelize (gedeeld met hoofdapplicatie)
- **Authentication**: JWT tokens (access + refresh)
- **File Storage**: Lokaal bestandssysteem

### Frontend (React)
- **Port**: 5174
- **Framework**: React 18 + Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Routing**: React Router v6

## 👥 Gebruikersrollen

### 1. Platform Admin
- **Volledige toegang** tot alle functies
- Kan alle POIs beheren
- Kan platform configuratie wijzigen
- Kan gebruikers beheren

### 2. POI Owner
- Kan **eigen POIs** aanmaken en bewerken
- Nieuwe POIs gaan naar "pending" status
- Kan afbeeldingen uploaden
- Geen toegang tot platform configuratie

### 3. Editor
- Kan **alle POIs** bewerken
- Kan content blokken wijzigen
- Kan afbeeldingen uploaden
- Kan geen POIs verwijderen

### 4. Reviewer
- Kan POIs **goedkeuren/afkeuren**
- Read-only toegang
- Kan status wijzigen
- Kan geen content bewerken

## 🚀 Installatie & Setup

### Vereisten
- Node.js >= 18.0.0
- MongoDB (draaiend)
- NPM of Yarn

### Stap 1: Backend Setup

```bash
cd admin-module/backend

# Installeer dependencies
npm install

# Kopieer environment variabelen
cp .env.example .env

# Bewerk .env en pas aan voor jouw omgeving
nano .env

# Seed database met eerste admin gebruiker
npm run seed

# Start backend server
npm run dev
```

Backend draait nu op: `http://localhost:3003`

### Stap 2: Frontend Setup

```bash
cd admin-module/frontend

# Installeer dependencies
npm install

# Kopieer environment variabelen
cp .env.example .env

# Start development server
npm run dev
```

Frontend draait nu op: `http://localhost:5174`

### Stap 3: Login

Ga naar `http://localhost:5174/login` en log in met:

**Platform Admin:**
- Email: `admin@holidaibutler.com`
- Password: `Admin2025`

**POI Owner:**
- Email: `poi.owner@example.com`
- Password: `POI2025`

**Editor:**
- Email: `editor@holidaibutler.com`
- Password: `Editor2025`

**Reviewer:**
- Email: `reviewer@holidaibutler.com`
- Password: `Reviewer2025`

⚠️ **BELANGRIJK**: Wijzig deze wachtwoorden in productie!

## 📁 Projectstructuur

```
admin-module/
├── backend/
│   ├── models/
│   │   ├── AdminUser.js          # Admin gebruiker model
│   │   └── PlatformConfig.js     # Platform configuratie model
│   ├── routes/
│   │   ├── adminAuth.js          # Authenticatie routes
│   │   ├── adminPOI.js           # POI management routes
│   │   ├── adminUpload.js        # File upload routes
│   │   └── adminPlatform.js      # Platform config routes
│   ├── middleware/
│   │   └── adminAuth.js          # Auth & permission middleware
│   ├── scripts/
│   │   └── seedAdmin.js          # Database seeding
│   ├── uploads/                  # Uploaded files
│   ├── server.js                 # Main server file
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── Login.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   └── pois/
│   │   │       ├── POIList.jsx
│   │   │       └── POIForm.jsx
│   │   ├── services/
│   │   │   └── api.js            # API service laag
│   │   ├── store/
│   │   │   └── authStore.js      # Zustand auth store
│   │   ├── App.jsx               # Main app component
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── docs/                         # Documentatie
└── README.md                     # Deze file
```

## 🔐 API Endpoints

### Authenticatie
- `POST /api/admin/auth/login` - Login
- `POST /api/admin/auth/refresh` - Refresh token
- `GET /api/admin/auth/me` - Get current user
- `PUT /api/admin/auth/profile` - Update profile
- `POST /api/admin/auth/change-password` - Change password
- `POST /api/admin/auth/forgot-password` - Request password reset
- `POST /api/admin/auth/reset-password` - Reset password

### POI Management
- `GET /api/admin/pois` - List POIs (met filters & paginatie)
- `GET /api/admin/pois/stats` - Get POI statistieken
- `GET /api/admin/pois/:id` - Get single POI
- `POST /api/admin/pois` - Create POI
- `PUT /api/admin/pois/:id` - Update POI
- `PATCH /api/admin/pois/:id/status` - Update status
- `PATCH /api/admin/pois/:id/verify` - Verify POI (DMO)
- `DELETE /api/admin/pois/:id` - Delete POI
- `POST /api/admin/pois/bulk/action` - Bulk actions

### File Upload
- `POST /api/admin/upload/:type` - Upload single file
- `POST /api/admin/upload/:type/multiple` - Upload multiple files
- `GET /api/admin/upload/:type` - List files
- `DELETE /api/admin/upload/:type/:filename` - Delete file

Types: `pois`, `platform`, `avatars`, `documents`

### Platform Configuration
- `GET /api/admin/platform` - Get config
- `PUT /api/admin/platform/branding` - Update branding
- `PUT /api/admin/platform/content` - Update content
- `PUT /api/admin/platform/contact` - Update contact
- `PUT /api/admin/platform/legal` - Update legal docs
- `PUT /api/admin/platform/settings` - Update settings
- `PUT /api/admin/platform/features` - Update features

## 🎨 UI Features

### POI Management Interface

**POI Lijst:**
- Tabel met alle POIs
- Filters: search, status, category, city
- Paginatie
- Bulk acties
- Status indicators
- Quick actions menu

**POI Formulier:**
- Tabbed interface (Basic, Location, Images, Details)
- Form validatie
- Image upload met preview
- Multi-taal support (voorbereid)
- Auto-save (voorbereid)

**Dashboard:**
- Overzicht statistieken
- Quick stats
- Role-based widgets
- Recent activity (voorbereid)

## 🔒 Security Features

- JWT authentication met refresh tokens
- Password hashing (bcrypt, cost: 12)
- Role-based access control (RBAC)
- Permission-based authorization
- Account lockout na 5 failed logins (2 uur)
- Rate limiting op auth endpoints
- Input validatie
- File upload validatie (type & size)
- Activity logging
- CORS configuratie
- Helmet security headers

## 🌍 Multi-taal Ondersteuning

De applicatie ondersteunt:
- 🇬🇧 Engels (en)
- 🇪🇸 Spaans (es)
- 🇩🇪 Duits (de)
- 🇫🇷 Frans (fr)

**Implementatie status:**
- ✅ Database models ondersteunen alle talen
- ✅ POI translations velden beschikbaar
- ✅ Platform config per taal
- ⏳ Frontend UI translation (i18next geïnstalleerd)

## 📝 POI Model Velden

Het POI model bevat uitgebreide velden:

**Basis Informatie:**
- name, category, subcategory, description

**Locatie:**
- city, region, country, address
- GeoJSON coordinates (lat/lng)

**Contact:**
- phone, email, website
- social media links

**Content:**
- images (met upload functie)
- opening hours
- pricing info

**Metadata:**
- status (active, inactive, pending, etc.)
- ratings & reviews
- stats (views, clicks, bookings)
- quality metrics
- DMO verification

**Translations:**
- Ondersteuning voor alle 4 talen

## 🎯 Permissie Systeem

Permissies zijn georganiseerd per resource:

```javascript
permissions: {
  pois: {
    create: boolean,
    read: boolean,
    update: boolean,
    delete: boolean,
    approve: boolean
  },
  platform: {
    branding: boolean,
    content: boolean,
    settings: boolean
  },
  users: {
    view: boolean,
    manage: boolean
  },
  media: {
    upload: boolean,
    delete: boolean
  }
}
```

Platform admins hebben automatisch alle permissies.

## 🔄 Status Workflow

POI statussen:
- `pending` - Wacht op goedkeuring
- `active` - Actief en zichtbaar
- `inactive` - Inactief (niet zichtbaar)
- `closed_temporarily` - Tijdelijk gesloten
- `closed_permanently` - Permanent gesloten

**Workflow:**
1. POI Owner maakt POI → status: `pending`
2. Reviewer keurt goed → status: `active`
3. Platform Admin kan altijd status wijzigen

## 📊 Database Models

### AdminUser
- Profile info (naam, avatar, taal)
- Role & permissions
- Owned POIs (voor POI owners)
- Security (login attempts, lockout, 2FA)
- Activity log
- Preferences

### PlatformConfig
- Singleton document (één config)
- Branding (logo, colors, fonts)
- Content (about, FAQ, reviews)
- Contact info
- Legal documents per taal
- Settings (languages, currency, timezone)
- Features toggles
- Metadata (version, last modified)

### POI
- Gebruikt bestaand POI model uit hoofdapplicatie
- Uitgebreid met admin velden
- Quality tracking
- Approval workflow

## 🛠️ Development

### Backend Development

```bash
# Watch mode (auto-restart)
npm run dev

# Production mode
npm start

# Seed database
npm run seed
```

### Frontend Development

```bash
# Development server met HMR
npm run dev

# Build voor productie
npm run build

# Preview production build
npm run preview
```

### Environment Variabelen

**Backend (.env):**
```env
NODE_ENV=development
ADMIN_PORT=3003
MONGODB_URI=mongodb://localhost:27017/holidaibutler
JWT_ADMIN_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key
ADMIN_FRONTEND_URL=http://localhost:5174
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3003/api/admin
```

## 🚢 Productie Deployment

### Backend
1. Zet `NODE_ENV=production`
2. Gebruik sterke JWT secrets
3. Configureer MongoDB connection string
4. Setup reverse proxy (nginx)
5. Enable HTTPS
6. Configure CORS voor productie domain

### Frontend
1. Build: `npm run build`
2. Serve static files
3. Configure API URL naar productie backend
4. Setup CDN (optioneel)

## 🔮 Roadmap / Toekomstige Features

**Versie 1.1:**
- [ ] Complete multi-taal UI (i18next)
- [ ] Advanced POI filters
- [ ] Bulk import/export (CSV, JSON)
- [ ] Rich text editor voor content
- [ ] Image optimization
- [ ] User management interface

**Versie 1.2:**
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Audit trail viewer
- [ ] Content approval workflow
- [ ] Version control voor content
- [ ] Scheduled publishing

**Versie 2.0:**
- [ ] Advanced RBAC met custom roles
- [ ] API rate limiting per user
- [ ] Webhooks
- [ ] Integration met third-party systemen
- [ ] Mobile app (React Native)

## 🐛 Troubleshooting

### Backend start niet
- Check of MongoDB draait: `mongod --version`
- Check of port 3003 beschikbaar is
- Controleer .env configuratie

### Frontend kan niet verbinden met backend
- Check of backend draait op port 3003
- Controleer VITE_API_URL in .env
- Check browser console voor CORS errors

### Login werkt niet
- Run seed script: `npm run seed`
- Check MongoDB connection
- Controleer JWT secrets in .env

### File uploads werken niet
- Check write permissions op uploads folder
- Controleer MAX_FILE_SIZE in .env
- Check file type restrictions

## 📞 Support

Voor vragen of problemen:
- Check de documentatie in `/docs`
- Bekijk bestaande code comments
- Raadpleeg API endpoint voorbeelden

## 📄 Licentie

Proprietary - HolidaiButler Platform

---

**Gemaakt voor HolidaiButler** - Admin Module v1.0
