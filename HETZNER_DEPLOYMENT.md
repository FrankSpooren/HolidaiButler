# HolidaiButler - Hetzner Server Deployment Guide

Dit document beschrijft de huidige deployment configuratie op de Hetzner server.

**Laatst bijgewerkt:** 2025-12-09

## Server Informatie

| Item | Waarde |
|------|--------|
| Server IP | 91.98.71.87 |
| SSH User | root |
| Frontend URL | https://test.holidaibutler.com |
| API URL | https://test.holidaibutler.com/api |
| Health Endpoint | https://test.holidaibutler.com/health |

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    test.holidaibutler.com                        │
├─────────────────────────────────────────────────────────────────┤
│  Apache (Port 443 - SSL/TLS)                                     │
│  ├── /              → Static Frontend (React)                    │
│  │                    /var/www/test.holidaibutler.com            │
│  ├── /api/*         → Reverse Proxy → Node.js (Port 3001)       │
│  └── /health        → Reverse Proxy → Node.js (Port 3001)       │
├─────────────────────────────────────────────────────────────────┤
│  Node.js Backend (PM2 managed - holidaibutler-api)              │
│  └── Working dir: /var/www/api.holidaibutler.com/platform-core  │
│      Entry point: src/index.js                                   │
├─────────────────────────────────────────────────────────────────┤
│  Database (External Hetzner KonsoleH)                            │
│  └── Host: jotx.your-database.de                                │
│      Database: pxoziy_db1                                        │
│      Read User: pxoziy_1                                         │
│      Write User: pxoziy_1_w                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structuur op Server

```
/var/www/
├── test.holidaibutler.com/     # Frontend static files
│   ├── index.html
│   ├── assets/
│   └── ...
│
└── api.holidaibutler.com/      # Backend applicatie
    ├── platform-core/          # Actieve codebase
    │   ├── .env                # Environment variabelen
    │   ├── src/                # Source code
    │   │   ├── index.js        # Entry point
    │   │   ├── controllers/
    │   │   ├── models/
    │   │   ├── routes/
    │   │   └── services/
    │   ├── node_modules/
    │   └── logs/
    └── ...
```

## Environment Configuratie (.env)

Locatie: `/var/www/api.holidaibutler.com/platform-core/.env`

```env
# HolidaiButler Platform Core - Production Environment
NODE_ENV=production
PORT=3001
API_BASE_URL=https://test.holidaibutler.com/api

# Security (gegenereerd met openssl rand -hex 32)
JWT_SECRET=<64-char-hex>
API_KEY=<64-char-hex>

# Database - External Hetzner MySQL (KonsoleH)
DB_HOST=jotx.your-database.de
DB_PORT=3306
DB_USER=pxoziy_1
DB_PASSWORD=<wachtwoord>
DB_NAME=pxoziy_db1

# CORS
CORS_ORIGIN=https://test.holidaibutler.com

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/holidaibutler

# Features
ENABLE_METRICS=false
ENABLE_CRON_JOBS=false
SESSION_EXPIRY_HOURS=24
```

**Let op:** Database is EXTERN (niet localhost). Gebruik `jotx.your-database.de` als host.

## Apache SSL Configuratie

Locatie: `/etc/apache2/sites-enabled/test.holidaibutler.com-le-ssl.conf`

```apache
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName test.holidaibutler.com
    DocumentRoot /var/www/test.holidaibutler.com

    # API Proxy to Node.js backend
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api
    ProxyPass /health http://127.0.0.1:3001/health
    ProxyPassReverse /health http://127.0.0.1:3001/health

    # CORS Headers for API
    <Location /api>
        Header always set Access-Control-Allow-Origin "https://test.holidaibutler.com"
        Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
        Header always set Access-Control-Allow-Credentials "true"
    </Location>

    # SPA routing
    <Directory /var/www/test.holidaibutler.com>
        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api
        RewriteCond %{REQUEST_URI} !^/health
        RewriteRule . /index.html [L]
    </Directory>

    # SSL (Let's Encrypt)
    SSLCertificateFile /etc/letsencrypt/live/test.holidaibutler.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/test.holidaibutler.com/privkey.pem
</VirtualHost>
</IfModule>
```

## PM2 Configuratie

```bash
# Status bekijken
pm2 status

# Logs bekijken
pm2 logs holidaibutler-api --lines 50

# Herstarten
pm2 restart holidaibutler-api

# Start configuratie
pm2 start src/index.js --name holidaibutler-api --cwd /var/www/api.holidaibutler.com/platform-core

# Opslaan voor auto-restart
pm2 save
```

## Deployment Stappen

### Code Update (handmatig)

```bash
ssh root@91.98.71.87

# Haal laatste code van GitHub
cd /var/www/api.holidaibutler.com
git clone --depth 1 https://github.com/FrankSpooren/HolidaiButler.git temp_repo
cp -r temp_repo/platform-core/src/* platform-core/src/
rm -rf temp_repo

# Herstart applicatie
pm2 restart holidaibutler-api
```

### Verifieer Deployment

```bash
# Health check
curl https://test.holidaibutler.com/health

# POIs test
curl "https://test.holidaibutler.com/api/v1/pois?limit=2"

# Categories test
curl "https://test.holidaibutler.com/api/v1/pois/categories"
```

## Beschikbare API Endpoints

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/health` | GET | Health check |
| `/api/v1/pois` | GET | Lijst POIs (pagination) |
| `/api/v1/pois/:id` | GET | Enkele POI |
| `/api/v1/pois/categories` | GET | Alle categorieën |
| `/api/v1/pois/cities` | GET | Alle steden |
| `/api/v1/pois/search` | GET | Zoeken in POIs |
| `/api/v1/pois/geojson` | GET | POIs als GeoJSON |
| `/api/v1/holibot/chat` | POST | HoliBot AI chat |
| `/api/v1/holibot/categories` | GET | HoliBot categorieën |
| `/api/v1/holibot/recommendations` | POST | POI aanbevelingen |
| `/api/v1/onboarding/status` | GET | Onboarding status |
| `/api/auth/signup` | POST | Registratie |
| `/api/auth/login` | POST | Login |

## Database Informatie

**Externe MySQL Database (Hetzner KonsoleH)**

- Host: `jotx.your-database.de`
- Database: `pxoziy_db1`
- Read User: `pxoziy_1`
- Write User: `pxoziy_1_w`

**Belangrijke Tabellen:**
- `POI` - 1593 Points of Interest (1591 actief)
- `Users` - Gebruikers
- `User_Preferences` - Gebruikersvoorkeuren
- `Chat_Sessions` - Chat geschiedenis

## Troubleshooting

### 503 Service Unavailable

```bash
# Check of backend draait
pm2 status

# Bekijk error logs
pm2 logs holidaibutler-api --lines 50

# Herstart indien nodig
pm2 restart holidaibutler-api
```

### Database Connection Error

```bash
# Test database verbinding
mysql -h jotx.your-database.de -u pxoziy_1 -p pxoziy_db1 -e "SHOW TABLES;"

# Check .env bestand
cat /var/www/api.holidaibutler.com/platform-core/.env | grep DB_
```

### CORS Errors

- Controleer `CORS_ORIGIN` in `.env`
- Controleer Apache headers in vhost config

### Apache Logs

```bash
tail -f /var/log/apache2/test_error.log
tail -f /var/log/apache2/test_access.log
```

## Status (2025-12-09)

- [x] Backend API draait op PM2
- [x] MySQL database verbonden (extern: jotx.your-database.de)
- [x] Apache reverse proxy geconfigureerd
- [x] SSL certificaat actief (Let's Encrypt)
- [x] POIs endpoint werkt (1591 actieve POIs)
- [x] Health endpoint werkt
- [ ] MongoDB niet geconfigureerd (niet nodig voor huidige functionaliteit)
- [ ] Mistral AI niet geconfigureerd (HoliBot gebruikt fallback responses)
