# HolidaiButler - Hetzner Server Deployment Guide

Dit document beschrijft de stappen om HolidaiButler te deployen op de Hetzner server met de `pxoziy_db1` database.

## Probleemanalyse

De huidige errors op https://test.holidaibutler.com/pois:
- `localhost:3003/api/v_quire_images=true` - Frontend probeert localhost te bereiken
- `localhost:3003/api/v1/pois?limit=1000` - API endpoint niet bereikbaar

**Oorzaken:**
1. Frontend was gebouwd zonder productie API URLs
2. Backend API draait niet op de server
3. Apache is niet geconfigureerd om API requests te proxyen

## Oplossing Overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    test.holidaibutler.com                        │
├─────────────────────────────────────────────────────────────────┤
│  Apache (Port 443)                                               │
│  ├── /              → Static Frontend (React)                   │
│  └── /api/*         → Reverse Proxy → Node.js (Port 3001)      │
├─────────────────────────────────────────────────────────────────┤
│  Node.js Backend (PM2 managed)                                   │
│  └── Connects to MySQL (pxoziy_db1)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Stap 1: Server Vereisten

SSH naar de Hetzner server:
```bash
ssh root@91.98.71.87
```

Installeer vereiste software:
```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# PM2 Process Manager
npm install -g pm2

# Apache modules
a2enmod proxy proxy_http rewrite headers ssl expires deflate
```

## Stap 2: Apache Configuratie

1. Kopieer de Apache configuratie naar de server:
```bash
# Lokaal (vanuit project root)
scp deployment/apache/test.holidaibutler.com.conf root@91.98.71.87:/etc/apache2/sites-available/
```

2. Op de server, activeer de configuratie:
```bash
ssh root@91.98.71.87

# Disable default site if enabled
a2dissite 000-default.conf

# Enable our site
a2ensite test.holidaibutler.com.conf

# Test configuration
apache2ctl configtest

# Reload Apache
systemctl reload apache2
```

## Stap 3: Backend Environment Configuratie

1. Maak de backend directory:
```bash
ssh root@91.98.71.87
mkdir -p /var/www/api.holidaibutler.com
```

2. Maak het `.env` bestand aan op de server:
```bash
nano /var/www/api.holidaibutler.com/.env
```

3. Kopieer de inhoud van `platform-core/.env.production.template` en vul de juiste waarden in:

```env
# PRODUCTION ENVIRONMENT

NODE_ENV=production
LOG_LEVEL=info
PLATFORM_CORE_PORT=3001

# DATABASE - Hetzner MySQL (pxoziy_db1)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=pxoziy_u1
DATABASE_PASSWORD=<VUL_HIER_HET_WACHTWOORD_IN>

# CORS - Allow test domain
CORS_ORIGIN=https://test.holidaibutler.com

# JWT Secrets (genereer unieke waarden!)
# Genereer met: openssl rand -hex 32
JWT_SECRET=<GENEREER_64_CHAR_HEX>
JWT_ADMIN_SECRET=<GENEREER_64_CHAR_HEX>
JWT_REFRESH_SECRET=<GENEREER_64_CHAR_HEX>
JWT_EXPIRES_IN=24h

# Security
ENCRYPTION_KEY=<GENEREER_64_CHAR_HEX>
```

**Belangrijk:** Genereer unieke secrets:
```bash
# Op de server, genereer random secrets
openssl rand -hex 32  # Run dit 4x voor elk secret
```

## Stap 4: Backend Deployment

De GitHub Actions workflow zal automatisch deployen bij push naar `main`. Voor handmatige deployment:

```bash
# Op de server
cd /var/www/api.holidaibutler.com

# Clone of update de repo
git pull origin main

# Installeer dependencies
npm ci --only=production

# Start met PM2
pm2 start src/index.js --name holidaibutler-api --env production

# Auto-start bij reboot
pm2 startup
pm2 save
```

## Stap 5: Database Verificatie

Controleer de database verbinding:

```bash
# Op de server
mysql -u pxoziy_u1 -p pxoziy_db1

# Test query
SHOW TABLES;
SELECT COUNT(*) FROM pois;
```

## Stap 6: Test de Deployment

Na deployment, test alle endpoints:

```bash
# Frontend
curl -I https://test.holidaibutler.com

# API Health
curl https://test.holidaibutler.com/api/v1/health

# POIs endpoint
curl "https://test.holidaibutler.com/api/v1/pois?limit=10"
```

## Troubleshooting

### Error: API Returns 502 Bad Gateway
- Backend draait niet: `pm2 status`
- Start backend: `pm2 start holidaibutler-api`

### Error: Database Connection Refused
- Check MySQL status: `systemctl status mysql`
- Verify credentials in `.env`
- Check of user toegang heeft: `mysql -u pxoziy_u1 -p`

### Error: CORS Blocked
- Check `CORS_ORIGIN` in backend `.env`
- Verify Apache headers in vhost config

### PM2 Logs Bekijken
```bash
pm2 logs holidaibutler-api
pm2 logs holidaibutler-api --lines 100
```

### Apache Logs Bekijken
```bash
tail -f /var/log/apache2/test.holidaibutler.com-error.log
tail -f /var/log/apache2/test.holidaibutler.com-access.log
```

## Checklist voor Deployment

- [ ] Apache modules geactiveerd (proxy, rewrite, ssl, headers)
- [ ] Apache vhost configuratie geplaatst en geactiveerd
- [ ] Backend `.env` aangemaakt met juiste database credentials
- [ ] PM2 geinstalleerd en backend draaiend
- [ ] SSL certificaten aanwezig (Let's Encrypt)
- [ ] Database toegankelijk vanaf server
- [ ] CORS correct geconfigureerd
- [ ] Health endpoint bereikbaar: `/api/v1/health`
- [ ] POIs endpoint werkt: `/api/v1/pois`

## Automatische Deployment

Na deze handmatige setup zal de GitHub Actions workflow automatisch deployen bij elke push naar `main`:

1. Frontend wordt gebouwd met productie API URLs
2. Frontend static files worden gedeployed naar `/var/www/test.holidaibutler.com`
3. Backend wordt gedeployed naar `/var/www/api.holidaibutler.com`
4. PM2 herstart de backend service
5. Health check verifieert de deployment

## Contact

Bij problemen, check de logs:
- PM2: `pm2 logs`
- Apache: `/var/log/apache2/test.holidaibutler.com-*.log`
- Applicatie: `/var/www/api.holidaibutler.com/logs/`
