# HolidaiButler Admin Module - Documentatie

**Versie:** 1.0.0
**Database:** MySQL (geconverteerd van MongoDB)
**Status:** Production Ready
**Aangemaakt:** 16 januari 2025

---

## 📋 Overzicht

De HolidaiButler Admin Module is een volledige CMS/Admin interface voor het beheren van POIs (Points of Interest), platform configuratie, en gebruikers. Deze module is **volledig geconverteerd van MongoDB naar MySQL** om te integreren met de bestaande HolidaiButler database op Hetzner.

### Kernfunctionaliteit

- ✅ **POI Management** - CRUD operaties voor locaties met afbeeldingen, contactgegevens en content
- ✅ **Platform Configuratie** - Branding, content, contact, juridische documenten beheren
- ✅ **Rolgebaseerd Toegangsbeheer** - 4 verschillende rollen met specifieke permissies
- ✅ **Multi-taal Ondersteuning** - Engels, Spaans, Duits, Frans
- ✅ **File Upload Systeem** - Lokale opslag voor afbeeldingen en documenten
- ✅ **Responsive UI** - Modern Material-UI dashboard

---

## 🏗️ Technische Architectuur

### Backend
- **Framework:** Node.js 18+ met Express 4.18
- **Database:** MySQL 8.0 (via mysql2 driver)
- **Authenticatie:** JWT tokens (access + refresh)
- **Port:** 3003
- **Database:** pxoziy_db1 (Hetzner)

### Frontend
- **Framework:** React 18 + Vite 4
- **UI Library:** Material-UI (MUI) v5
- **State Management:** Zustand
- **Routing:** React Router v6
- **Port:** 5174

---

## 📁 Project Structuur

```
Admin module/
├── backend/
│   ├── models/                    # MySQL models (AdminUser, PlatformConfig)
│   ├── routes/                    # API routes (auth, POI, upload, platform)
│   ├── middleware/                # Auth & permissions middleware
│   ├── config/                    # Database configuratie
│   ├── migrations/                # SQL migratie scripts
│   ├── scripts/                   # Seed scripts
│   ├── uploads/                   # Uploaded files
│   ├── server.js                  # Main server
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API service laag
│   │   ├── store/                 # Zustand stores
│   │   └── main.jsx               # Entry point
│   ├── package.json
│   └── .env
│
├── docs/                          # Documentatie (deze map)
├── DEPLOYMENT_INSTRUCTIES.md      # Deployment guide
└── README.md
```

---

## 👥 Gebruikersrollen

### 1. Platform Admin
- **Volledige toegang** tot alle functies
- Kan alle POIs beheren
- Kan platform configuratie wijzigen
- Kan gebruikers beheren
- **Test account:** admin@holidaibutler.com / Admin123!@#

### 2. POI Owner
- Kan **eigen POIs** aanmaken en bewerken
- Nieuwe POIs gaan naar "pending" status
- Kan afbeeldingen uploaden
- Geen toegang tot platform configuratie
- **Test account:** poi.owner@example.com / POI123!@#

### 3. Editor
- Kan **alle POIs** bewerken
- Kan content blokken wijzigen
- Kan afbeeldingen uploaden
- Kan geen POIs verwijderen
- **Test account:** editor@holidaibutler.com / Editor123!@#

### 4. Reviewer
- Kan POIs **goedkeuren/afkeuren**
- Read-only toegang
- Kan status wijzigen
- Kan geen content bewerken
- **Test account:** reviewer@holidaibutler.com / Reviewer123!@#

---

## 🔐 Beveiliging

- **JWT Authenticatie** - Access tokens (1u) + refresh tokens (7d)
- **Password Hashing** - bcrypt met cost factor 12
- **Role-Based Access Control** - Granulaire permissies per resource
- **Account Lockout** - Na 5 mislukte logins voor 2 uur
- **Rate Limiting** - 100 requests per 15 minuten
- **Input Validatie** - express-validator op alle endpoints
- **File Upload Validatie** - Type & size checks
- **Activity Logging** - Alle admin acties worden gelogd
- **CORS Configuratie** - Whitelist van allowed origins
- **Helmet Security Headers** - XSS, clickjacking protection

---

## 🗄️ Database

### Nieuwe Tabellen (aangemaakt voor admin module)

1. **AdminUsers** - Admin gebruikers met rollen en permissions
2. **AdminUser_OwnedPOIs** - Junction table voor POI ownership
3. **AdminUser_ActivityLog** - Activity logging
4. **PlatformConfig** - Singleton tabel voor platform configuratie

### Bestaande Tabel (gebruikt)

- **POI** - Bestaande POI data uit holibutler database (1,593 records)

Zie [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) voor volledige schema details.

---

## 🚀 Snelstart

### 1. Backend opstarten
```bash
cd "Admin module/backend"
npm install
npm run dev
```
Backend: http://localhost:3003

### 2. Frontend opstarten
```bash
cd "Admin module/frontend"
npm install
npm run dev
```
Frontend: http://localhost:5174

### 3. Login
- URL: http://localhost:5174/login
- Email: admin@holidaibutler.com
- Password: Admin123!@#

---

## 📚 Documentatie Overzicht

- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Complete database schema
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Alle API endpoints
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technische architectuur
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Veelvoorkomende problemen
- **[CONVERSION_NOTES.md](./CONVERSION_NOTES.md)** - MongoDB → MySQL conversie

---

## 🔄 Status Workflow

POI statussen:
- `pending` - Wacht op goedkeuring (nieuw door POI Owner)
- `active` - Actief en zichtbaar (goedgekeurd)
- `inactive` - Inactief (niet zichtbaar)
- `closed_temporarily` - Tijdelijk gesloten
- `closed_permanently` - Permanent gesloten

**Workflow:**
1. POI Owner maakt POI → `pending`
2. Reviewer keurt goed → `active`
3. Platform Admin kan altijd status wijzigen

---

## 🌍 Multi-taal Support

Ondersteunde talen:
- 🇬🇧 Engels (en) - Default
- 🇪🇸 Spaans (es)
- 🇩🇪 Duits (de)
- 🇫🇷 Frans (fr)

**Implementatie:**
- ✅ Database models ondersteunen alle talen
- ✅ POI translations velden beschikbaar
- ✅ Platform config per taal
- ⏳ Frontend UI translation (i18next geïnstalleerd maar niet geactiveerd)

---

## 📝 Belangrijke Configuratie

### Backend .env
```env
DB_HOST=jotx.your-database.de
DB_NAME=pxoziy_db1
DB_USER=pxoziy_1
ADMIN_PORT=3003
JWT_ADMIN_SECRET=[secure-random-string]
JWT_REFRESH_SECRET=[secure-random-string]
```

### Frontend .env
```env
VITE_API_URL=http://localhost:3003/api/admin
```

---

## ⚠️ Productie Checklist

Voordat je naar productie gaat:

- [ ] Wijzig alle default wachtwoorden
- [ ] Genereer nieuwe JWT secrets (32+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Configureer HTTPS
- [ ] Setup reverse proxy (nginx)
- [ ] Enable MySQL SSL
- [ ] Configure rate limiting
- [ ] Setup database backups
- [ ] Configure email provider
- [ ] Review CORS settings
- [ ] Enable monitoring/logging

---

## 📞 Support

Voor vragen of problemen:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Zie code comments in `/models` en `/routes`
- Review API endpoint voorbeelden in [API_REFERENCE.md](./API_REFERENCE.md)

---

**HolidaiButler Admin Module v1.0 - MySQL Edition**
