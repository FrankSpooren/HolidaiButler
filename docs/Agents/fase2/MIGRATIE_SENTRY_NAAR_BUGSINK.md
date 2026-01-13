# Migratieplan: Sentry.io -> Bugsink

**Datum**: 13 januari 2026
**Doel**: Volledige migratie van error monitoring naar EU-compliant Bugsink
**Geschatte doorlooptijd**: 1-2 dagen
**Risico**: Laag (Sentry SDK compatible)

---

## Executive Summary

| Aspect | Details |
|--------|---------|
| **Van** | Sentry.io (US-hosted SaaS) |
| **Naar** | Bugsink (self-hosted op Hetzner 91.98.71.87) |
| **Reden** | EU-compliance, data soevereiniteit, kostenreductie |
| **Impact** | Minimaal - alleen DSN configuratie wijzigen |
| **Kosten na migratie** | €0/maand (self-hosted) |

---

## Huidige Sentry Configuratie

### Projecten in Sentry
| Project | Type | Environment | DSN Locatie |
|---------|------|-------------|-------------|
| `holidaibutler-api` | Backend (NestJS) | dev, test, prod | `.env` files |
| `holidaibutler-customer-portal` | Frontend (React) | dev, test, prod | `.env` files |
| `holidaibutler-admin-portal` | Frontend (React) | dev, test, prod | `.env` files |

### Huidige SDK Versies
```json
{
  "@sentry/node": "^7.x of ^8.x",
  "@sentry/react": "^7.x of ^8.x"
}
```

---

## Migratieplan

### Pre-Migratie Checklist

- [ ] Backup maken van Sentry project settings
- [ ] Documenteren van huidige alert rules
- [ ] Inventariseren van alle DSN locaties in codebase
- [ ] SSH toegang tot Hetzner server bevestigd
- [ ] Docker geïnstalleerd op Hetzner server

---

## Fase 1: Bugsink Installatie (2-3 uur)

### Stap 1.1: Server Voorbereiding

```bash
# SSH naar Hetzner server
ssh root@91.98.71.87

# Controleer Docker installatie
docker --version

# Als Docker niet geïnstalleerd:
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### Stap 1.2: Bugsink Directory Setup

```bash
# Maak dedicated directory
mkdir -p /opt/bugsink
cd /opt/bugsink

# Genereer secure secret key
openssl rand -base64 50 > secret_key.txt
cat secret_key.txt
```

### Stap 1.3: Docker Compose Configuratie

```bash
# Maak docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  bugsink:
    image: bugsink/bugsink:latest
    container_name: bugsink
    restart: unless-stopped
    environment:
      - SECRET_KEY=${BUGSINK_SECRET_KEY}
      - CREATE_SUPERUSER=admin:${BUGSINK_ADMIN_PASSWORD}
      - PORT=8000
      - BEHIND_HTTPS_PROXY=True
      - DATABASE_URL=sqlite:///data/bugsink.db
    volumes:
      - ./data:/app/data
    ports:
      - "127.0.0.1:8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  default:
    name: bugsink-network
EOF
```

### Stap 1.4: Environment Variables

```bash
# Maak .env file
cat > .env << EOF
BUGSINK_SECRET_KEY=$(cat secret_key.txt)
BUGSINK_ADMIN_PASSWORD=$(openssl rand -base64 16)
EOF

# Noteer het admin wachtwoord
echo "Admin wachtwoord: $(grep BUGSINK_ADMIN_PASSWORD .env | cut -d= -f2)"
```

### Stap 1.5: Start Bugsink

```bash
# Start de container
docker compose up -d

# Controleer status
docker compose ps
docker compose logs -f bugsink
```

### Stap 1.6: Nginx Reverse Proxy

```bash
# Maak Nginx configuratie
cat > /etc/nginx/sites-available/bugsink << 'EOF'
server {
    listen 80;
    server_name errors.holidaibutler.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name errors.holidaibutler.com;

    ssl_certificate /etc/letsencrypt/live/errors.holidaibutler.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/errors.holidaibutler.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Voor grote error payloads
        client_max_body_size 10M;
    }
}
EOF

# Activeer site
ln -sf /etc/nginx/sites-available/bugsink /etc/nginx/sites-enabled/

# SSL certificaat (indien nog niet bestaat)
certbot certonly --nginx -d errors.holidaibutler.com

# Test en herstart Nginx
nginx -t && systemctl reload nginx
```

### Stap 1.7: DNS Configuratie

Voeg DNS record toe (bij jullie DNS provider):
```
Type: A
Name: errors
Value: 91.98.71.87
TTL: 300
```

### Stap 1.8: Verificatie

```bash
# Test lokaal
curl -I http://127.0.0.1:8000

# Test via HTTPS (na DNS propagatie)
curl -I https://errors.holidaibutler.com
```

**Deliverable Fase 1**: Bugsink draait op https://errors.holidaibutler.com

---

## Fase 2: Bugsink Configuratie (30 min)

### Stap 2.1: Login en Organisatie Setup

1. Ga naar https://errors.holidaibutler.com
2. Login met admin credentials (uit .env)
3. **Wijzig direct het admin wachtwoord!**

### Stap 2.2: Projecten Aanmaken

Maak dezelfde projectstructuur als in Sentry:

| Project Naam | Platform | Beschrijving |
|--------------|----------|--------------|
| `holidaibutler-api` | Node.js | Backend API (NestJS) |
| `holidaibutler-customer-portal` | JavaScript | Customer Portal (React) |
| `holidaibutler-admin-portal` | JavaScript | Admin Portal (React) |

### Stap 2.3: DSN's Noteren

Na het aanmaken van elk project, noteer de DSN:

```
# Voorbeeld DSN formaat
https://<project-key>@errors.holidaibutler.com/<project-id>

# Noteer voor elk project:
API_DSN=https://xxx@errors.holidaibutler.com/1
CUSTOMER_PORTAL_DSN=https://xxx@errors.holidaibutler.com/2
ADMIN_PORTAL_DSN=https://xxx@errors.holidaibutler.com/3
```

### Stap 2.4: Alert Configuratie

Stel email alerts in (repliceer Sentry alerts):

| Alert | Trigger | Actie |
|-------|---------|-------|
| New Issue | Eerste keer dat error voorkomt | Email naar info@holidaibutler.com |
| Regression | Error komt terug na resolved | Email naar info@holidaibutler.com |

**Deliverable Fase 2**: 3 projecten geconfigureerd met DSN's

---

## Fase 3: Code Migratie (1-2 uur)

### Stap 3.1: Backend API (NestJS)

**Locatie**: `platform-core/`

```bash
# Bestand: .env.development
# Oude waarde:
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456

# Nieuwe waarde:
SENTRY_DSN=https://xxx@errors.holidaibutler.com/1
```

```bash
# Bestand: .env.test
SENTRY_DSN=https://xxx@errors.holidaibutler.com/1

# Bestand: .env.production
SENTRY_DSN=https://xxx@errors.holidaibutler.com/1
```

**Geen code wijzigingen nodig!** De Sentry SDK werkt direct met Bugsink.

### Stap 3.2: Customer Portal (React)

**Locatie**: `customer-portal/`

```bash
# Bestand: .env.development
REACT_APP_SENTRY_DSN=https://xxx@errors.holidaibutler.com/2

# Bestand: .env.production
REACT_APP_SENTRY_DSN=https://xxx@errors.holidaibutler.com/2
```

### Stap 3.3: Admin Portal (React)

**Locatie**: `admin-portal/`

```bash
# Bestand: .env.development
REACT_APP_SENTRY_DSN=https://xxx@errors.holidaibutler.com/3

# Bestand: .env.production
REACT_APP_SENTRY_DSN=https://xxx@errors.holidaibutler.com/3
```

### Stap 3.4: Optioneel - Environment Variabele Hernoemen

Voor duidelijkheid kun je de variabele hernoemen (optioneel):

```typescript
// src/main.ts (NestJS)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.BUGSINK_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // ... rest van config blijft gelijk
});
```

**Deliverable Fase 3**: Alle DSN's geüpdatet in codebase

---

## Fase 4: Testing (2-4 uur)

### Stap 4.1: Development Environment Test

```bash
# Start lokale development
cd platform-core
npm run start:dev

# Trigger test error
curl -X POST http://localhost:3000/api/v1/test-error
```

Controleer in Bugsink dashboard of de error verschijnt.

### Stap 4.2: Test Environment Deployment

```bash
# Deploy naar test environment
git add .
git commit -m "chore: migrate from Sentry to Bugsink"
git push origin dev

# Trigger CI/CD pipeline
# Na deployment: trigger test error
```

### Stap 4.3: Frontend Test

```javascript
// In browser console op test environment
throw new Error('Bugsink migration test - Customer Portal');
```

### Stap 4.4: Verificatie Checklist

- [ ] Backend errors verschijnen in Bugsink
- [ ] Customer Portal errors verschijnen in Bugsink
- [ ] Admin Portal errors verschijnen in Bugsink
- [ ] Stack traces zijn volledig en leesbaar
- [ ] Source maps werken (indien geconfigureerd)
- [ ] Email alerts worden verzonden

**Deliverable Fase 4**: Alle errors worden correct gecaptured

---

## Fase 5: Productie Migratie (1 uur)

### Stap 5.1: Merge naar Main

```bash
# Na succesvolle tests
git checkout main
git merge dev
git push origin main
```

### Stap 5.2: Productie Deployment

Volg jullie standaard deployment procedure:

```bash
# Via CI/CD of handmatig
# Zorg dat .env.production de nieuwe DSN heeft
```

### Stap 5.3: Verificatie Productie

```bash
# Monitor eerste uur na deployment
# Controleer Bugsink dashboard voor incoming errors
```

### Stap 5.4: Rollback Plan

Als er problemen zijn:
1. Revert de DSN naar Sentry in .env.production
2. Redeploy
3. Analyseer het probleem

**Deliverable Fase 5**: Productie draait op Bugsink

---

## Fase 6: Cleanup (Na 90 dagen)

### Stap 6.1: Sentry Data Retentie

Sentry bewaart data 90 dagen. Wacht deze periode af voor:
- Historische error analyse
- Vergelijking Bugsink vs Sentry data

### Stap 6.2: Sentry Account Sluiten

Na 90 dagen:
1. Export belangrijke data/rapporten uit Sentry
2. Verwijder projecten
3. Sluit Sentry account

### Stap 6.3: Documentatie Update

Update alle documentatie:
- [ ] README.md - verwijder Sentry referenties
- [ ] CLAUDE.md - update monitoring sectie
- [ ] Developer onboarding docs

---

## Technische Details

### Bugsink Resource Monitoring

```bash
# Monitor resource gebruik
docker stats bugsink

# Verwacht: <500MB RAM, <5% CPU bij normale load
```

### Backup Strategie

```bash
# Dagelijkse backup van Bugsink data
cat > /opt/bugsink/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/bugsink"
DATE=$(date +%Y%m%d)
mkdir -p $BACKUP_DIR
cp /opt/bugsink/data/bugsink.db "$BACKUP_DIR/bugsink_$DATE.db"
# Bewaar laatste 7 dagen
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
EOF

chmod +x /opt/bugsink/backup.sh

# Voeg toe aan crontab
echo "0 3 * * * /opt/bugsink/backup.sh" >> /etc/crontab
```

### Bugsink Updates

```bash
# Periodiek updaten (maandelijks)
cd /opt/bugsink
docker compose pull
docker compose up -d
```

---

## Vergelijking: Voor en Na

| Aspect | Sentry.io (Voor) | Bugsink (Na) |
|--------|------------------|--------------|
| **Kosten** | €0 (free tier) / €29+ (betaald) | €0 |
| **Data locatie** | US (default) of EU (optie) | NL (Hetzner 91.98.71.87) |
| **Data eigendom** | Sentry (US bedrijf) | HolidaiButler |
| **US CLOUD Act** | Ja, risico | Nee |
| **EU Compliance** | Gedeeltelijk | Volledig |
| **Onderhoud** | Geen | ~1 uur/maand |
| **Features** | Uitgebreid (APM, etc.) | Error tracking focus |

---

## Definitie van Done

### Migratie Compleet Wanneer:

- [ ] Bugsink draait stabiel op https://errors.holidaibutler.com
- [ ] Alle 3 projecten zijn geconfigureerd
- [ ] Development environment stuurt errors naar Bugsink
- [ ] Test environment stuurt errors naar Bugsink
- [ ] Productie environment stuurt errors naar Bugsink
- [ ] Email alerts werken
- [ ] Backup strategie is geïmplementeerd
- [ ] Team is geïnformeerd over nieuwe dashboard URL

---

## Support

### Bugsink Issues

- GitHub: https://github.com/bugsink/bugsink
- Documentatie: https://www.bugsink.com/docs/

### Rollback

Bij kritieke problemen: revert naar Sentry DSN (tijdelijk beschikbaar tot account gesloten)

---

*Document versie 1.0 - Sentry naar Bugsink Migratieplan*
