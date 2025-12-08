# HolidaiButler - Hetzner Server Deployment Guide

**Laatste update:** 8 december 2025
**Status:** ✅ Operationeel
**Test URL:** https://test.holidaibutler.com

Dit document beschrijft de complete deployment van HolidaiButler op de Hetzner server met de externe `pxoziy_db1` database.

---

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      test.holidaibutler.com                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Apache (Port 443 - SSL via Let's Encrypt)                              │
│  ├── /              → Static Frontend (React/Vite build)                │
│  ├── /api/*         → Reverse Proxy → Node.js (Port 3001)              │
│  └── /health        → Reverse Proxy → Node.js (Port 3001)              │
├─────────────────────────────────────────────────────────────────────────┤
│  Node.js Backend (PM2 managed - platform-core)                          │
│  ├── Express.js API Server                                              │
│  ├── Sequelize ORM                                                      │
│  └── Redis Event Bus                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Databases                                                               │
│  ├── MySQL: jotx.your-database.de (Hetzner KonsoleH - extern)          │
│  └── Redis: localhost:6379 (lokaal op server)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Server Informatie

| Item | Waarde |
|------|--------|
| **Server IP** | `91.98.71.87` |
| **Server IPv6** | `2a01:4f8:1c1a:dc15::1` |
| **SSH User** | `root` |
| **OS** | Ubuntu 24.04 LTS |
| **Node.js** | v20.19.6 |
| **PM2** | Latest |

---

## Database Informatie (Hetzner KonsoleH)

| Item | Waarde |
|------|--------|
| **Host** | `jotx.your-database.de` |
| **Database** | `pxoziy_db1` |
| **Read-only User** | `pxoziy_1` |
| **Read-only Password** | `j8,DrtshJSm$` |
| **Read-write User** | `pxoziy_1_w` |
| **Read-write Password** | `i9)PUR^2k=}!` |

### Database Tabellen
- **POI**: 1593 Points of Interest (Costa Blanca regio)
- Plus 30+ andere tabellen voor users, sessions, tickets, etc.

### ⚠️ Belangrijke Opmerking
De **read-write user** (`pxoziy_1_w`) heeft momenteel GEEN toegang vanaf het server IP.
Dit moet geconfigureerd worden in Hetzner KonsoleH:
1. Ga naar Database → pxoziy_db1 → Users
2. Voeg IP `2a01:4f8:1c1a:dc15::1` toe aan toegestane hosts voor `pxoziy_1_w`

---

## Directory Structuur op Server

```
/var/www/
├── test.holidaibutler.com/          # Frontend (static files)
│   ├── index.html
│   ├── assets/
│   │   └── index-DYBP2KY-.js        # Vite build (API URL: https://test.holidaibutler.com/api/v1)
│   └── holibot-assets/
│
└── api.holidaibutler.com/           # Backend (GitHub clone)
    └── platform-core/
        ├── .env                      # Environment config (NIET in Git!)
        ├── src/
        │   ├── index.js             # Main entry point
        │   ├── models/
        │   │   └── POI.js           # ⭐ Aangepast voor pxoziy_db1.POI tabel
        │   └── routes/
        │       └── publicPOI.js     # ⭐ Aangepast API response format
        └── node_modules/

/etc/apache2/sites-available/
└── test.holidaibutler.com-le-ssl.conf  # ⭐ Apache proxy config
```

---

## Aangepaste Bestanden (voor GitHub)

### 1. `platform-core/src/models/POI.js`
Aangepast om te matchen met bestaande database structuur:
- `tableName: 'POI'` (hoofdletters)
- `timestamps: false` (gebruikt `last_updated`)
- Velden: id, google_placeid, name, description, category, subcategory, poi_type, latitude, longitude, etc.

### 2. `platform-core/src/routes/publicPOI.js`
Aangepast API response format voor frontend compatibiliteit:
```javascript
// Response format (wat frontend verwacht):
{
  "success": true,
  "data": [...POIs...],      // Direct array, NIET genest in "pois"
  "meta": {
    "total": 1593,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

Features:
- `safeParseJSON()` voor JSON velden (images, amenities worden soms als string opgeslagen)
- Query parameters: `q`, `category`, `city`, `sort`, `limit`, `offset`, `min_rating`
- Sort format: `name:asc` of `rating:desc`

### 3. `apache/test.holidaibutler.com-le-ssl.conf`
```apache
ProxyPass /api http://127.0.0.1:3001/api
ProxyPassReverse /api http://127.0.0.1:3001/api
ProxyPass /health http://127.0.0.1:3001/health
ProxyPassReverse /health http://127.0.0.1:3001/health
```

---

## Deployment Stappen

### Stap 1: SSH naar Server
```bash
ssh root@91.98.71.87
# Password: WUgn4rtjUUP4
```

### Stap 2: Software Installatie (eenmalig)
```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2 Process Manager
npm install -g pm2

# Redis
apt-get install -y redis-server
systemctl enable redis-server

# Apache modules
a2enmod proxy proxy_http rewrite headers ssl
systemctl restart apache2
```

### Stap 3: Backend Clone/Update
```bash
cd /var/www/api.holidaibutler.com

# Eerste keer: clone
git clone https://github.com/FrankSpooren/HolidaiButler.git .

# Updates: pull
git pull origin main

# Dependencies installeren
cd platform-core
npm install
```

### Stap 4: Environment Configuratie
```bash
nano /var/www/api.holidaibutler.com/platform-core/.env
```

```env
# PRODUCTION ENVIRONMENT
NODE_ENV=production
PORT=3001
API_BASE_URL=https://test.holidaibutler.com/api

# Security (genereer met: openssl rand -hex 32)
JWT_SECRET=<64-char-hex>
API_KEY=<64-char-hex>

# Database - Externe Hetzner MySQL
DB_HOST=jotx.your-database.de
DB_PORT=3306
DB_USER=pxoziy_1
DB_PASSWORD=j8,DrtshJSm$
DB_NAME=pxoziy_db1

# Redis (lokaal)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=https://test.holidaibutler.com

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/holidaibutler

# Features (uitgeschakeld voor nu)
ENABLE_METRICS=false
ENABLE_CRON_JOBS=false
SESSION_EXPIRY_HOURS=24
```

### Stap 5: Backend Starten
```bash
cd /var/www/api.holidaibutler.com/platform-core

# Start met PM2
pm2 start src/index.js --name holidaibutler-api

# Auto-start bij reboot
pm2 startup
pm2 save
```

### Stap 6: Apache Configuratie
```bash
# Kopieer config (of edit handmatig)
nano /etc/apache2/sites-available/test.holidaibutler.com-le-ssl.conf

# Activeer en herlaad
a2ensite test.holidaibutler.com-le-ssl.conf
systemctl reload apache2
```

---

## API Endpoints

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/health` | GET | Health check (MySQL status) |
| `/api/v1/pois` | GET | Alle POIs met pagination |
| `/api/v1/pois/:id` | GET | Enkele POI op ID |
| `/api/v1/pois/categories` | GET | Unieke categorieën |
| `/api/v1/pois/cities` | GET | Unieke steden |

### Query Parameters voor `/api/v1/pois`
| Parameter | Type | Beschrijving |
|-----------|------|--------------|
| `q` | string | Zoekterm (naam/beschrijving) |
| `category` | string | Filter op categorie |
| `city` | string | Filter op stad |
| `sort` | string | Sortering (bijv. `name:asc`, `rating:desc`) |
| `limit` | number | Max resultaten (default: 20) |
| `offset` | number | Skip eerste N resultaten |
| `min_rating` | number | Minimum rating filter |

### Voorbeeld Requests
```bash
# Health check
curl https://test.holidaibutler.com/health

# Eerste 10 POIs
curl "https://test.holidaibutler.com/api/v1/pois?limit=10"

# Zoeken op naam
curl "https://test.holidaibutler.com/api/v1/pois?q=restaurant"

# Filter op categorie
curl "https://test.holidaibutler.com/api/v1/pois?category=Food%20%26%20Drinks"

# Sorteren op rating
curl "https://test.holidaibutler.com/api/v1/pois?sort=rating:desc&limit=10"
```

---

## Beheer Commands

### PM2 (Backend)
```bash
pm2 status                    # Status overzicht
pm2 logs holidaibutler-api    # Live logs
pm2 logs holidaibutler-api --lines 100  # Laatste 100 regels
pm2 restart holidaibutler-api # Herstart backend
pm2 stop holidaibutler-api    # Stop backend
pm2 delete holidaibutler-api  # Verwijder uit PM2
```

### Apache
```bash
systemctl status apache2      # Status
systemctl reload apache2      # Herlaad config
systemctl restart apache2     # Volledige herstart
apache2ctl configtest         # Test configuratie
```

### Redis
```bash
systemctl status redis-server
redis-cli ping                # Test verbinding (PONG)
```

### Logs Bekijken
```bash
# PM2 logs
pm2 logs holidaibutler-api

# Apache logs
tail -f /var/log/apache2/test_error.log
tail -f /var/log/apache2/test_access.log
```

---

## Troubleshooting

### Error: 502 Bad Gateway
**Oorzaak:** Backend draait niet
```bash
pm2 status
pm2 start holidaibutler-api
# Of herstart:
pm2 restart holidaibutler-api
```

### Error: Database Connection Refused
**Oorzaak:** Verkeerde credentials of netwerk probleem
```bash
# Test database verbinding
mysql -h jotx.your-database.de -u pxoziy_1 -p'j8,DrtshJSm$' pxoziy_db1 -e "SELECT COUNT(*) FROM POI;"
```

### Error: `.filter is not a function`
**Oorzaak:** API response format matcht niet met frontend verwachting
- Check of `publicPOI.js` correct is (response moet `data: [...]` zijn, niet `data: { pois: [...] }`)
- Herstart backend na wijzigingen: `pm2 restart holidaibutler-api`

### Error: CORS Blocked
**Oorzaak:** CORS headers niet correct
```bash
# Check .env
grep CORS_ORIGIN /var/www/api.holidaibutler.com/platform-core/.env

# Check Apache headers
grep -A5 "Location /api" /etc/apache2/sites-available/test.holidaibutler.com-le-ssl.conf
```

### Error: Redis Connection Refused
**Oorzaak:** Redis service draait niet
```bash
systemctl status redis-server
systemctl start redis-server
```

---

## Deployment Checklist

### Initiële Setup
- [x] Server toegankelijk via SSH
- [x] Node.js 20.x geïnstalleerd
- [x] PM2 geïnstalleerd
- [x] Redis geïnstalleerd en draaiend
- [x] Apache modules geactiveerd (proxy, proxy_http, rewrite, headers, ssl)
- [x] SSL certificaten aanwezig (Let's Encrypt)

### Backend
- [x] GitHub repo gecloned naar `/var/www/api.holidaibutler.com`
- [x] `platform-core/src/models/POI.js` aangepast voor database
- [x] `platform-core/src/routes/publicPOI.js` aangepast voor frontend
- [x] `.env` bestand geconfigureerd
- [x] npm dependencies geïnstalleerd
- [x] PM2 draait backend service
- [x] PM2 auto-start geconfigureerd

### Apache
- [x] Proxy configuratie voor `/api` en `/health`
- [x] SPA routing voor React frontend
- [x] CORS headers geconfigureerd

### Database
- [x] Read-only verbinding werkt (`pxoziy_1`)
- [ ] Read-write verbinding werkt (`pxoziy_1_w`) - **ACTIE VEREIST IN KONSOLEH**

### Endpoints Getest
- [x] `https://test.holidaibutler.com` - Frontend laadt
- [x] `https://test.holidaibutler.com/health` - Returns MySQL status
- [x] `https://test.holidaibutler.com/api/v1/pois` - Returns 1593 POIs
- [x] `https://test.holidaibutler.com/api/v1/pois/categories` - Returns 9 categorieën
- [x] `https://test.holidaibutler.com/api/v1/pois/cities` - Returns 32 steden

---

## GitHub Repository

**Repository:** https://github.com/FrankSpooren/HolidaiButler

### Bestanden om te updaten in GitHub:
1. `platform-core/src/models/POI.js` - Database model
2. `platform-core/src/routes/publicPOI.js` - API routes
3. `apache/test.holidaibutler.com-le-ssl.conf` - Apache config
4. `platform-core/.env.production.example` - Environment template

### Na GitHub Update:
```bash
ssh root@91.98.71.87
cd /var/www/api.holidaibutler.com
git pull origin main
cd platform-core && npm install
pm2 restart holidaibutler-api
```

---

## Productie Deployment (holidaibutler.com)

Voor productie deployment naar `holidaibutler.com`:

1. **Dupliceer Apache config:**
   ```bash
   cp /etc/apache2/sites-available/test.holidaibutler.com-le-ssl.conf \
      /etc/apache2/sites-available/holidaibutler.com-le-ssl.conf
   ```

2. **Update ServerName en DocumentRoot**

3. **Frontend build met productie URL:**
   ```bash
   VITE_API_URL=https://holidaibutler.com/api/v1 npm run build
   ```

4. **SSL certificaat voor productie domein:**
   ```bash
   certbot --apache -d holidaibutler.com -d www.holidaibutler.com
   ```

---

## Contact & Support

- **GitHub Issues:** https://github.com/FrankSpooren/HolidaiButler/issues
- **Server Logs:** `pm2 logs` of `/var/log/apache2/`
- **Database (KonsoleH):** https://konsoleh.your-server.de

---

*Documentatie gegenereerd: 8 december 2025*
