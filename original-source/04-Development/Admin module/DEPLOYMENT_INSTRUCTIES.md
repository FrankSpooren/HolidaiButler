# HolidaiButler Admin Module - Deployment Instructies

## 📋 Overzicht

Deze admin module is succesvol **geconverteerd van MongoDB naar MySQL** en is klaar voor deployment. Alle bronbestanden zijn opgeslagen in:

```
C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\Admin module\
```

## ✅ Wat is er gedaan?

### 1. Database Conversie (MongoDB → MySQL)
- ✅ **AdminUser model** volledig geconverteerd naar MySQL2
- ✅ **PlatformConfig model** volledig geconverteerd naar MySQL2
- ✅ **Database configuratie** (ES6 modules met MySQL2 connection pool)
- ✅ **Migratie scripts** (SQL files voor tabel creatie)

### 2. Backend Routes Conversie
- ✅ **adminAuth.js** - Login, refresh, profile, password management (MySQL)
- ✅ **adminPOI.js** - POI CRUD operaties (MySQL)
- ✅ **adminPlatform.js** - Platform configuratie (MySQL)
- ✅ **adminUpload.js** - File uploads (geen wijzigingen nodig)

### 3. Configuratie
- ✅ **package.json** - mongoose verwijderd, mysql2 toegevoegd
- ✅ **.env.example** - Aangepast voor MySQL credentials
- ✅ **server.js** - MySQL connection test en error handling
- ✅ **Seed script** - MySQL versie voor test users

### 4. Middleware
- ✅ **adminAuth.js middleware** - Aangepast voor MySQL compatibility

---

## 🚀 Deployment Stappen

### STAP 1: Database Migraties Uitvoeren

De volgende SQL files moeten worden uitgevoerd op de **holibutler** database (of **pxoziy_db1** op Hetzner):

#### 1.1 AdminUsers Tabellen
```bash
# Locatie: Admin module/backend/migrations/01-create-admin-users-table.sql
```

Dit creëert 3 tabellen:
- `AdminUsers` - Admin gebruikers met rollen en permissions
- `AdminUser_OwnedPOIs` - Junction table voor POI ownership
- `AdminUser_ActivityLog` - Activity logging

#### 1.2 PlatformConfig Tabel
```bash
# Locatie: Admin module/backend/migrations/02-create-platform-config-table.sql
```

Dit creëert:
- `PlatformConfig` - Singleton tabel voor platform configuratie

**Uitvoering via phpMyAdmin (Hetzner):**
1. Log in op https://pma.your-server.de
2. Selecteer database `pxoziy_db1` (of `holibutler`)
3. Ga naar **SQL** tab
4. Kopieer en plak de inhoud van `01-create-admin-users-table.sql`
5. Klik op **Go**
6. Herhaal voor `02-create-platform-config-table.sql`

**Of via command line:**
```bash
mysql -h your-database-host -u your-user -p pxoziy_db1 < "Admin module/backend/migrations/01-create-admin-users-table.sql"
mysql -h your-database-host -u your-user -p pxoziy_db1 < "Admin module/backend/migrations/02-create-platform-config-table.sql"
```

---

### STAP 2: Backend Configuratie

#### 2.1 Installeer Dependencies
```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\Admin module\backend"

npm install
```

Dit installeert:
- express
- mysql2 (in plaats van mongoose)
- bcryptjs
- jsonwebtoken
- cors, helmet, morgan
- multer (file uploads)
- dotenv
- express-validator
- express-rate-limit

#### 2.2 Creëer .env File

Kopieer `.env.example` naar `.env`:
```bash
copy .env.example .env
```

**Bewerk de .env file met de juiste database credentials:**

```env
# Server Configuration
NODE_ENV=development
ADMIN_PORT=3003

# Database Configuration (MySQL)
DB_HOST=your-hetzner-database-host
DB_PORT=3306
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=pxoziy_db1
# of DB_NAME=holibutler (afhankelijk van welke je gebruikt)
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_ADMIN_SECRET=your-very-secure-admin-secret-key-change-this
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key-change-this
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (for CORS)
ADMIN_FRONTEND_URL=http://localhost:5174

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Email Configuration (optioneel)
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=noreply@holidaibutler.com
EMAIL_FROM_NAME=HolidaiButler Admin
```

**❗ BELANGRIJK:** Vervang de volgende waarden:
- `DB_HOST` → Je Hetzner database host (bijv. `your-server.de`)
- `DB_USER` → Je database gebruikersnaam
- `DB_PASSWORD` → Je database wachtwoord
- `DB_NAME` → `pxoziy_db1` of `holibutler`
- `JWT_ADMIN_SECRET` → Genereer een veilige random string (min. 32 karakters)
- `JWT_REFRESH_SECRET` → Genereer een andere veilige random string

**Random secret genereren:**
```bash
# Via Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Of online: https://randomkeygen.com/
```

---

### STAP 3: Seed Database met Test Users

Run het seed script om de initiële admin users aan te maken:

```bash
npm run seed
```

Dit creëert 4 test users:

| **Rol** | **Email** | **Wachtwoord** | **Permissions** |
|---------|-----------|----------------|-----------------|
| Platform Admin | admin@holidaibutler.com | Admin123!@# | Volledige toegang |
| POI Owner | poi.owner@example.com | POI123!@# | Eigen POIs beheren |
| Editor | editor@holidaibutler.com | Editor123!@# | Alle POIs bewerken |
| Reviewer | reviewer@holidaibutler.com | Reviewer123!@# | POIs reviewen |

**⚠️ BELANGRIJK:** Wijzig deze wachtwoorden in productie!

---

### STAP 4: Start Backend Server

#### Development Mode:
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

De backend draait nu op: **http://localhost:3003**

**Test de API:**
```bash
# Health check
curl http://localhost:3003/api/admin/health

# Login test
curl -X POST http://localhost:3003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@holidaibutler.com\",\"password\":\"Admin123!@#\"}"
```

---

### STAP 5: Frontend Setup

#### 5.1 Installeer Frontend Dependencies
```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\Admin module\frontend"

npm install
```

#### 5.2 Configureer Frontend .env

Kopieer `.env.example` naar `.env`:
```bash
copy .env.example .env
```

**Bewerk frontend/.env:**
```env
VITE_API_URL=http://localhost:3003/api/admin
```

Voor productie:
```env
VITE_API_URL=https://your-domain.com/api/admin
```

#### 5.3 Start Frontend Development Server

```bash
npm run dev
```

Frontend draait nu op: **http://localhost:5174**

#### 5.4 Login

Ga naar `http://localhost:5174/login` en log in met een van de test accounts.

---

## 📊 Database Schema

### AdminUsers Tabel

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INT AUTO_INCREMENT | Primary key |
| email | VARCHAR(255) UNIQUE | Email adres |
| password | VARCHAR(255) | Bcrypt hashed password |
| first_name | VARCHAR(100) | Voornaam |
| last_name | VARCHAR(100) | Achternaam |
| avatar | VARCHAR(255) | Avatar URL |
| phone_number | VARCHAR(50) | Telefoonnummer |
| language | ENUM | en, es, de, fr |
| role | ENUM | platform_admin, poi_owner, editor, reviewer |
| status | ENUM | active, suspended, pending |
| permissions_* | JSON | Permissions per resource |
| email_verified | BOOLEAN | Email verificatie status |
| login_attempts | INT | Failed login counter |
| lock_until | DATETIME | Account lock timestamp |
| two_factor_enabled | BOOLEAN | 2FA status |
| preferences | JSON | User preferences |
| created_at | DATETIME | Aanmaak datum |
| updated_at | DATETIME | Laatste update |

### PlatformConfig Tabel (Singleton)

Bevat alle platform configuratie:
- **Branding**: Logo, favicon, colors, fonts, images
- **Content**: About, FAQ, reviews settings
- **Contact**: Email, phone, address, social media
- **Legal**: Privacy, terms, cookies, GDPR settings
- **Settings**: Languages, currency, timezone, maintenance mode
- **Features**: Chat, booking, reviews, social sharing

---

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
- `GET /api/admin/pois` - List POIs
- `GET /api/admin/pois/stats` - POI statistieken
- `GET /api/admin/pois/:id` - Get POI
- `POST /api/admin/pois` - Create POI
- `PUT /api/admin/pois/:id` - Update POI
- `PATCH /api/admin/pois/:id/status` - Update status
- `DELETE /api/admin/pois/:id` - Delete POI
- `POST /api/admin/pois/bulk/action` - Bulk actions

### File Upload
- `POST /api/admin/upload/:type` - Upload file
- `POST /api/admin/upload/:type/multiple` - Upload multiple
- `GET /api/admin/upload/:type` - List files
- `DELETE /api/admin/upload/:type/:filename` - Delete file

### Platform Config
- `GET /api/admin/platform` - Get config
- `PUT /api/admin/platform/branding` - Update branding
- `PUT /api/admin/platform/content` - Update content
- `PUT /api/admin/platform/contact` - Update contact
- `PUT /api/admin/platform/legal` - Update legal
- `PUT /api/admin/platform/settings` - Update settings
- `PUT /api/admin/platform/features` - Update features

---

## 🔧 Troubleshooting

### Backend start niet

**Symptoom:** Server crasht bij opstarten

**Mogelijke oorzaken:**
1. Database connectie mislukt
   - Check `.env` credentials
   - Test MySQL connectie: `mysql -h HOST -u USER -p`
   - Controleer firewall settings

2. Port 3003 al in gebruik
   - Wijzig `ADMIN_PORT` in `.env`
   - Kill bestaand proces: `npx kill-port 3003`

3. Dependencies niet geïnstalleerd
   - Run: `npm install`

### Database errors

**ER_NO_SUCH_TABLE:**
- Migraties niet uitgevoerd
- Run SQL scripts opnieuw

**ER_DUP_ENTRY:**
- Seed script al eerder uitgevoerd
- Users bestaan al in database

**ECONNREFUSED:**
- Database server niet bereikbaar
- Check `DB_HOST` en `DB_PORT`

### Login werkt niet

**Invalid credentials:**
- Check of seed script succesvol was
- Verify user exists in database
- Test met exacte credentials uit seed script

**Token errors:**
- Check `JWT_ADMIN_SECRET` in `.env`
- Secrets moeten gelijk zijn tussen environments

---

## 📝 Productie Checklist

Voordat je naar productie gaat:

- [ ] Wijzig alle default wachtwoorden
- [ ] Genereer nieuwe, veilige JWT secrets
- [ ] Update `NODE_ENV=production` in `.env`
- [ ] Configureer HTTPS
- [ ] Setup reverse proxy (nginx/Apache)
- [ ] Configure CORS voor productie domain
- [ ] Enable MySQL SSL connection
- [ ] Setup database backups
- [ ] Configure logging
- [ ] Setup monitoring
- [ ] Review en versterk rate limiting
- [ ] Test alle endpoints
- [ ] Review en update permissions
- [ ] Configure email provider voor password reset
- [ ] Setup CDN voor uploads (optioneel)

---

## 📞 Support & Documentatie

Voor meer informatie, zie:
- `README.md` - Algemene overzicht
- `backend/models/` - Database models documentatie
- `backend/routes/` - API endpoints
- `backend/middleware/` - Middleware logica

---

**Gemaakt:** 2025-01-16
**Versie:** 1.0
**Database:** MySQL (geconverteerd van MongoDB)
