# HolidaiButler Multi-Destination Architecture
## Strategisch Adviesrapport

**Datum**: 28 januari 2026
**Auteur**: Claude (Strategic Analysis)
**Versie**: 1.2
**Classificatie**: Strategisch / Vertrouwelijk
**Status**: FASE 1 COMPLEET - GEREED VOOR FASE 2

---

## Document Status & Tracking

| Fase | Status | Start | Einde | Verantwoordelijke |
|------|--------|-------|-------|-------------------|
| **Fase 1: Foundation** | COMPLEET | 28-01-2026 | 28-01-2026 | Claude Code |
| **Fase 2: Texel Deployment** | GEREED | - | - | Claude Code |
| **Fase 3: Alicante Preparation** | WACHT | - | - | Claude Code |
| **Fase 4: Stabilization** | WACHT | - | - | Claude Code |

**Laatste update**: 28 januari 2026 - Fase 1 volledig geimplementeerd

---

## Executive Summary

Na uitgebreide analyse van de huidige HolidaiButler-infrastructuur, GitHub repository documentatie, agent masterplan en configuratiedocumenten, presenteer ik hieronder een enterprise-level strategie voor multi-destination uitbreiding.

**Kernadvies**: Behoud **een monorepo** met **destination-agnostische code** en **bestemming-specifieke configuratie**. Dit is de meest schaalbare, onderhoudbare en kostenefficiënte aanpak voor jullie situatie.

---

## Deel 1: Analyse Huidige Situatie

### 1.1 Huidige Architectuur Status

| Component | Status | Beoordeling |
|-----------|--------|-------------|
| **GitHub Repository** | Monorepo structuur | Correct |
| **Branch Strategy** | dev - test - main | Correct |
| **Server (Hetzner)** | Enkele VPS (91.98.71.87) | Schaalbaar maken |
| **Database** | MySQL + MongoDB + Redis | Correct |
| **CI/CD** | GitHub Actions | Aanwezig, uitbreiden |
| **Agent Systeem** | 35 scheduled jobs, 14 agents | Enterprise-level |
| **GDPR Compliance** | GDPR Agent actief | EU-compliant |
| **EU AI Act** | Low-risk classification | Compliant |

### 1.2 Geidentificeerde Gaps voor Multi-Destination

| Gap | Ernst | Oplossing |
|-----|-------|-----------|
| Hardcoded Calpe-referenties in code | Hoog | Destination configuration layer |
| Geen multi-destination database schema | Hoog | destination_id kolom toevoegen |
| POI images niet per bestemming gescheiden | Medium | Storage restructuring |
| READMEFIRST.md ontbreekt per module | Medium | Documentatie standaardiseren |
| Geen destination-specifieke environment configs | Hoog | Config per destination |

---

## Deel 2: Aanbevolen Architectuur

### 2.1 Repository Strategie: Monorepo met Multi-Destination Support

**Aanbeveling**: Behoud **een HolidaiButler repository** met destination-specifieke configuratie.

**Waarom NIET aparte repositories per bestemming:**
- Code duplicatie (90%+ gedeelde code)
- Hogere onderhoudskosten
- Moeilijkere feature rollouts
- Complexere CI/CD pipelines

**Aanbevolen structuur:**

```
HolidaiButler/
├── .github/
│   └── workflows/
│       ├── deploy-platform-core.yml      # Alle destinations
│       ├── deploy-customer-portal.yml    # Per destination via matrix
│       └── deploy-admin-portal.yml
├── .claude/
│   └── skills/
│       ├── _shared/                      # Gedeelde skills
│       └── destinations/
│           ├── calpe/
│           ├── alicante/
│           └── texel/
├── config/
│   ├── destinations/
│   │   ├── calpe.config.js
│   │   ├── alicante.config.js
│   │   └── texel.config.js
│   └── shared.config.js
├── customer-portal/
│   └── frontend/
├── admin-portal/
├── platform-core/
├── modules/
│   ├── admin-module/
│   ├── agenda-module/
│   ├── payment-module/
│   ├── ticketing-module/
│   └── holibot-module/
├── infrastructure/
│   ├── apache/
│   │   └── vhosts/                       # Per destination vhost
│   ├── docker/
│   └── scripts/
├── data/
│   └── destinations/
│       ├── calpe/
│       │   ├── poi-seed.json
│       │   └── qa-seed.json
│       ├── alicante/
│       └── texel/
├── docs/
│   ├── READMEFIRST.md                    # Globaal entry point
│   ├── destinations/
│   │   └── [destination]/DESTINATION.md
│   └── modules/
│       └── [module]/README.md
└── CLAUDE.md                             # Agent context
```

### 2.2 Branch Strategie voor Multi-Destination

**Optie A (Aanbevolen): Gedeelde branches + feature flags**

```
main          <-- Productie (alle destinations)
test          <-- Staging (alle destinations)
dev           <-- Development (alle destinations)
feature/*     <-- Nieuwe features
hotfix/*      <-- Urgente fixes
destination/* <-- Destination-specifieke aanpassingen (zeldzaam)
```

**Waarom dit werkt:**
- Een codebase, meerdere destinations via configuratie
- Feature flags voor destination-specifieke features
- Simpeler merge proces
- Geen branch explosie

**Alternatief B (Niet aanbevolen): Per-destination branches**

```
main/calpe, main/alicante, main/texel
test/calpe, test/alicante, test/texel
dev/calpe, dev/alicante, dev/texel
```

**Nadelen:** 21+ branches, complexe merges, code drift risico.

### 2.3 Environment Configuratie per Destination

**Aanbevolen bestandsstructuur:**

```javascript
// config/destinations/calpe.config.js
export default {
  destination: {
    id: 'calpe',
    name: 'Calpe',
    country: 'ES',
    region: 'Costa Blanca',
    timezone: 'Europe/Madrid',
    languages: ['es', 'en', 'de', 'nl', 'fr'],
    defaultLanguage: 'es',
    currency: 'EUR'
  },
  domains: {
    production: {
      customer: 'holidaibutler.com',
      admin: 'admin.holidaibutler.com',
      api: 'api.holidaibutler.com'
    },
    test: {
      customer: 'test.holidaibutler.com',
      admin: 'admin.test.holidaibutler.com',
      api: 'api.test.holidaibutler.com'
    },
    dev: {
      customer: 'dev.holidaibutler.com',
      admin: 'admin.dev.holidaibutler.com',
      api: 'api.dev.holidaibutler.com'
    }
  },
  features: {
    holibot: true,
    ticketing: true,
    restaurants: true,
    golf: true,
    beaches: true
  },
  branding: {
    primaryColor: '#0066CC',
    logo: '/assets/calpe/logo.svg',
    favicon: '/assets/calpe/favicon.ico'
  },
  legal: {
    privacyPolicyUrl: '/legal/calpe/privacy',
    termsUrl: '/legal/calpe/terms',
    gdprContactEmail: 'privacy@holidaibutler.com'
  },
  poi: {
    tierStrategy: 'default', // of 'custom'
    categories: ['beaches', 'restaurants', 'hiking', 'golf', 'historical'],
    maxTier1: 25,
    maxTier2: 250
  },
  mailerlite: {
    groupId: 'calpe-subscribers',
    welcomeEmailId: 'calpe-welcome'
  }
};
```

```javascript
// config/destinations/texel.config.js
export default {
  destination: {
    id: 'texel',
    name: 'Texel',
    country: 'NL',
    region: 'Noord-Holland',
    timezone: 'Europe/Amsterdam',
    languages: ['nl', 'en', 'de'],
    defaultLanguage: 'nl',
    currency: 'EUR'
  },
  domains: {
    production: {
      customer: 'texelmaps.nl',           // Eigen domein!
      admin: 'admin.texelmaps.nl',
      api: 'api.texelmaps.nl'
    },
    test: { /* ... */ },
    dev: { /* ... */ }
  },
  features: {
    holibot: true,
    ticketing: true,
    restaurants: true,
    golf: false,                          // Geen golf op Texel
    beaches: true,
    cycling: true,                        // Texel-specifiek
    birdwatching: true                    // Texel-specifiek
  },
  branding: {
    primaryColor: '#FF6B00',              // Texel oranje
    logo: '/assets/texel/logo.svg',
    favicon: '/assets/texel/favicon.ico'
  },
  poi: {
    tierStrategy: 'island',               // Custom strategie
    categories: ['beaches', 'cycling', 'restaurants', 'nature', 'museums'],
    maxTier1: 15,                         // Kleiner eiland = minder POIs
    maxTier2: 100
  }
};
```

---

## Deel 3: Database Architectuur

### 3.1 Multi-Tenant Database Schema

**Geimplementeerde aanpak: Shared Database met Destination ID (INT)**

> **GEIMPLEMENTEERD 28-01-2026** - Afwijkingen van origineel plan gedocumenteerd hieronder.

**Implementatie Beslissingen:**
| Aspect | Origineel Plan | Daadwerkelijke Implementatie | Rationale |
|--------|---------------|------------------------------|-----------|
| `destination_id` type | VARCHAR(50) | **INT** | Betere performance, FK constraints |
| `destinations.id` | VARCHAR(50) PRIMARY KEY | **INT AUTO_INCREMENT** + `code` VARCHAR(50) | Standaard MySQL pattern |
| Tabellen met destination_id | POI, users, bookings, user_consent | **POI, QA, agenda, Users, user_journeys, holibot_sessions** | Gebaseerd op actuele datamodel |

```sql
-- GEIMPLEMENTEERD: destinations tabel met INT id
CREATE TABLE destinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,           -- 'calpe', 'texel', 'alicante'
  display_name VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  is_active TINYINT(1) DEFAULT 0,
  feature_flags JSON,                         -- Per-destination feature toggles
  config JSON,                                -- Additional configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initiele destinations (met INT id)
INSERT INTO destinations (id, code, display_name, country, timezone, is_active) VALUES
(1, 'calpe', 'Calpe', 'Spain', 'Europe/Madrid', 1),      -- Active
(2, 'texel', 'Texel', 'Netherlands', 'Europe/Amsterdam', 0),  -- Planned
(3, 'alicante', 'Alicante', 'Spain', 'Europe/Madrid', 0);     -- Planned

-- GEIMPLEMENTEERD: destination_id toegevoegd aan 6 tabellen
ALTER TABLE POI ADD COLUMN destination_id INT DEFAULT 1;
ALTER TABLE QA ADD COLUMN destination_id INT DEFAULT 1;
ALTER TABLE agenda ADD COLUMN destination_id INT DEFAULT 1;
ALTER TABLE Users ADD COLUMN destination_id INT DEFAULT 1;
ALTER TABLE user_journeys ADD COLUMN destination_id INT DEFAULT 1;
ALTER TABLE holibot_sessions ADD COLUMN destination_id INT DEFAULT 1;

-- Foreign keys toegevoegd
ALTER TABLE POI ADD CONSTRAINT fk_poi_destination
  FOREIGN KEY (destination_id) REFERENCES destinations(id);
ALTER TABLE QA ADD CONSTRAINT fk_qa_destination
  FOREIGN KEY (destination_id) REFERENCES destinations(id);
-- etc. voor alle tabellen

-- Indexes voor performance
CREATE INDEX idx_poi_destination ON POI(destination_id);
CREATE INDEX idx_qa_destination ON QA(destination_id);
CREATE INDEX idx_agenda_destination ON agenda(destination_id);
```

**Data Migratie Resultaat:**
| Tabel | Records | Destination |
|-------|---------|-------------|
| POI | 1593 | -> Calpe (id=1) |
| QA | 0 | - |
| agenda | 314 | -> Calpe (id=1) |
| Users | 10 | -> Calpe (id=1) |
| user_journeys | 0 | - |
| holibot_sessions | 169 | -> Calpe (id=1) |

### 3.2 Data Isolatie Strategie

| Data Type | Isolatie Level | Rationale |
|-----------|----------------|-----------|
| POIs | Per destination | Unieke locaties |
| Users (toeristen) | Gedeeld | Kunnen meerdere destinations bezoeken |
| User Preferences | Per destination | Voorkeuren kunnen verschillen |
| Bookings | Per destination | Locatie-gebonden |
| Partners | Per destination | Lokale ondernemers |
| Admin Users | Per destination (RBAC) | Toegangsbeheer |
| System Config | Gedeeld | Platform-breed |

---

## Deel 4: Server & Infrastructure

### 4.1 Hetzner Server Configuratie

**Huidige situatie:** Enkele VPS voor alle environments.

**Aanbevolen voor schaalbaarheid:**

```
+-------------------------------------------------------------+
|                    Load Balancer (Optioneel)                |
|                    (Hetzner Cloud LB - EUR5/mnd)            |
+-------------------------------------------------------------+
                              |
          +-------------------+-------------------+
          v                   v                   v
+-----------------+  +-----------------+  +-----------------+
|   VPS Main      |  |   VPS Test      |  |   VPS Dev       |
|   (Production)  |  |   (Staging)     |  |   (Development) |
|   CPX31 EUR15   |  |   CPX11 EUR5    |  |   CPX11 EUR5    |
+-----------------+  +-----------------+  +-----------------+
          |                   |                   |
          +-------------------+-------------------+
                              v
                    +-----------------+
                    |   Database VPS  |
                    |   CPX31 EUR15   |
                    |   MySQL + Redis |
                    +-----------------+
```

**Fase 1 (Nu - Budget EUR50/mnd):** Behoud huidige setup
**Fase 2 (Bij 3+ destinations):** Scheiding environments
**Fase 3 (Bij significant traffic):** Database separatie

### 4.2 Apache Virtual Hosts per Destination

> **GEIMPLEMENTEERD 28-01-2026** - Templates beschikbaar in `infrastructure/apache/sites-available/`

**Implementatie Beslissingen:**
| Aspect | Origineel Plan | Daadwerkelijke Implementatie | Rationale |
|--------|---------------|------------------------------|-----------|
| Destination header | `SetEnv DESTINATION_ID` | **`RequestHeader set X-Destination-ID`** | HTTP header is betrouwbaarder voor backend routing |
| DocumentRoot | `/var/www/destinations/texel/` | **`/var/www/texelmaps.nl`** | Eenvoudiger DNS/SSL beheer |
| POI images | Via destination directory | **`Alias /poi-images` naar storage path** | Backward compatible |

```apache
# GEIMPLEMENTEERD: /etc/apache2/sites-available/texelmaps.nl-le-ssl.conf
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName texelmaps.nl
    ServerAlias www.texelmaps.nl
    DocumentRoot /var/www/texelmaps.nl

    # KRITIEK: Destination header voor backend routing
    RequestHeader set X-Destination-ID "texel"

    # API Proxy to shared Node.js backend
    ProxyPreserveHost On
    ProxyPass /poi-images !
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api
    ProxyPass /health http://127.0.0.1:3001/health
    ProxyPassReverse /health http://127.0.0.1:3001/health

    # POI Images - destination-specific storage
    Alias /poi-images /var/www/api.holidaibutler.com/storage/destinations/texel/poi-images
    <Directory /var/www/api.holidaibutler.com/storage/destinations/texel/poi-images>
        Options -Indexes
        AllowOverride None
        Require all granted
        Header set Access-Control-Allow-Origin "*"
        Header set Cache-Control "public, max-age=2592000"
    </Directory>

    # CORS Headers for API
    <Location /api>
        Header always set Access-Control-Allow-Origin "https://texelmaps.nl"
        Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Destination-ID"
        Header always set Access-Control-Allow-Credentials "true"
    </Location>

    # SPA routing
    <Directory /var/www/texelmaps.nl>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api
        RewriteCond %{REQUEST_URI} !^/poi-images
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/texelmaps_error.log
    CustomLog ${APACHE_LOG_DIR}/texelmaps_access.log combined

    SSLCertificateFile /etc/letsencrypt/live/texelmaps.nl/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/texelmaps.nl/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
</IfModule>
```

**Beschikbare Templates:**
| Template | Bestemming | Type |
|----------|------------|------|
| `texelmaps.nl.conf.template` | Texel | HTTP -> HTTPS redirect |
| `texelmaps.nl-le-ssl.conf.template` | Texel | HTTPS main site |
| `admin.texelmaps.nl-le-ssl.conf.template` | Texel | HTTPS admin portal |
| `alicante.holidaibutler.com.conf.template` | Alicante | HTTP -> HTTPS redirect |
| `alicante.holidaibutler.com-le-ssl.conf.template` | Alicante | HTTPS main site |

**Deployment instructies:** Zie `infrastructure/apache/README.md`

### 4.3 Directory Structuur op Server

> **GEIMPLEMENTEERD 28-01-2026** - Structuur aangepast voor backward compatibility

**Implementatie Beslissingen:**
| Aspect | Origineel Plan | Daadwerkelijke Implementatie | Rationale |
|--------|---------------|------------------------------|-----------|
| POI images path | `/var/www/shared/media/{destination}/` | **`/var/www/api.holidaibutler.com/storage/destinations/{destination}/poi-images/`** | Consistent met bestaande storage structuur |
| Frontend path | `/var/www/destinations/{destination}/customer-portal/` | **`/var/www/{domain}/`** (bijv. `/var/www/texelmaps.nl/`) | Eenvoudiger SSL/DNS beheer |
| Symlink | Niet gepland | **`storage/poi-images -> storage/destinations/calpe/poi-images`** | Backward compatibility Calpe |

```
/var/www/
├── api.holidaibutler.com/                    # Platform Core (gedeeld)
│   └── platform-core/
│       ├── src/
│       ├── config/
│       │   └── destinations/                 # Config per destination
│       │       ├── index.js
│       │       ├── calpe.config.js
│       │       ├── texel.config.js
│       │       └── alicante.config.js
│       ├── migrations/                       # Database migrations
│       │   └── 001_multi_destination.sql
│       ├── public/
│       │   └── assets/
│       │       └── destinations/             # Branding per destination
│       │           ├── calpe/
│       │           ├── texel/
│       │           └── alicante/
│       └── storage/
│           ├── poi-images/                   # -> symlink naar calpe (backward compat)
│           └── destinations/                 # NIEUW: Per-destination storage
│               ├── calpe/
│               │   └── poi-images/           # 8.3 GB, 1576 afbeeldingen
│               ├── texel/
│               │   └── poi-images/
│               └── alicante/
│                   └── poi-images/
│
├── holidaibutler.com/                        # Calpe customer portal
├── admin.holidaibutler.com/                  # Calpe admin portal
├── texelmaps.nl/                             # Texel customer portal (Fase 2)
├── admin.texelmaps.nl/                       # Texel admin portal (Fase 2)
├── alicante.holidaibutler.com/               # Alicante customer portal (Fase 3)
│
└── backups/                                  # Server backups (870 MB)
    └── database/
```

**Logs Directory (NIEUW):**
```
/var/log/holidaibutler/
└── destinations/
    ├── calpe/                                # Destination-specific logs
    ├── texel/
    └── alicante/
```

---

## Deel 5: GitHub Actions CI/CD

### 5.1 Matrix Deployment Strategy

```yaml
# .github/workflows/deploy-customer-portal.yml
name: Deploy Customer Portal

on:
  push:
    branches: [main, test, dev]
    paths:
      - 'customer-portal/**'
      - 'config/destinations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        destination: [calpe, texel, alicante]
        include:
          - destination: calpe
            domain_prod: holidaibutler.com
            domain_test: test.holidaibutler.com
            domain_dev: dev.holidaibutler.com
          - destination: texel
            domain_prod: texelmaps.nl
            domain_test: test.texelmaps.nl
            domain_dev: dev.texelmaps.nl
          - destination: alicante
            domain_prod: alicante.holidaibutler.com
            domain_test: test.alicante.holidaibutler.com
            domain_dev: dev.alicante.holidaibutler.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: customer-portal/frontend

      - name: Build for ${{ matrix.destination }}
        run: |
          npm run build
        working-directory: customer-portal/frontend
        env:
          VITE_DESTINATION_ID: ${{ matrix.destination }}
          VITE_API_URL: https://api.${{ matrix.domain_prod }}

      - name: Determine target environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "target=production" >> $GITHUB_OUTPUT
            echo "domain=${{ matrix.domain_prod }}" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/test" ]]; then
            echo "target=test" >> $GITHUB_OUTPUT
            echo "domain=${{ matrix.domain_test }}" >> $GITHUB_OUTPUT
          else
            echo "target=dev" >> $GITHUB_OUTPUT
            echo "domain=${{ matrix.domain_dev }}" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to ${{ steps.env.outputs.target }}
        run: |
          rsync -avz --delete \
            customer-portal/frontend/dist/ \
            root@91.98.71.87:/var/www/destinations/${{ matrix.destination }}/customer-portal/
```

### 5.2 Destination-Aware Agent Jobs

```yaml
# .github/workflows/scheduled-poi-sync.yml
name: Scheduled POI Sync

on:
  schedule:
    # Tier 1 POIs - dagelijks 06:00 UTC per destination
    - cron: '0 6 * * *'  # Calpe
    - cron: '15 6 * * *' # Texel
    - cron: '30 6 * * *' # Alicante

jobs:
  sync-pois:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        destination: [calpe, texel, alicante]
    steps:
      - name: Trigger POI Sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"destination": "${{ matrix.destination }}", "tier": 1}' \
            https://api.holidaibutler.com/agents/data-sync/trigger
```

---

## Deel 6: Module-specifieke Aanpassingen

### 6.1 READMEFIRST.md Template

**Elk module MOET een READMEFIRST.md bevatten:**

```markdown
# [Module Naam] - READMEFIRST

> **Versie**: X.Y.Z
> **Laatste update**: [Datum]
> **Verantwoordelijke**: [Naam/Team]

## Quick Start

1. Lees eerst: `docs/CLAUDE.md` (agent context)
2. Environment: `cp .env.example .env`
3. Dependencies: `npm install`
4. Start: `npm run dev`

## Module Overzicht

[Korte beschrijving van de module]

## Destination Support

| Destination | Status | Specifieke features |
|-------------|--------|---------------------|
| Calpe       | Live   | [features] |
| Texel       | WIP    | [features] |
| Alicante    | Planned | [features] |

## Dependencies

- **Interne modules**: [lijst]
- **Externe services**: [lijst]

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DESTINATION_ID` | Yes | Actieve destination |
| ... | ... | ... |

## API Endpoints

[Korte endpoint overzicht]

## Testing

npm test
npm run test:e2e

## Deployment

[Deployment instructies]

## Known Issues

[Actuele bekende problemen]

## Changelog

Zie `CHANGELOG.md`
```

### 6.2 HoliBot Multi-Destination

```javascript
// platform-core/src/services/holibot/destinationContext.js
export class DestinationContextManager {
  constructor(destinationId) {
    this.destinationId = destinationId;
    this.config = loadDestinationConfig(destinationId);
  }

  getSystemPrompt() {
    return `
You are HoliBot, an AI travel assistant for ${this.config.destination.name}.

Destination Context:
- Location: ${this.config.destination.name}, ${this.config.destination.region}
- Country: ${this.config.destination.country}
- Timezone: ${this.config.destination.timezone}
- Languages: ${this.config.destination.languages.join(', ')}
- Currency: ${this.config.destination.currency}

Available features: ${Object.entries(this.config.features)
  .filter(([_, enabled]) => enabled)
  .map(([feature]) => feature)
  .join(', ')}

Always provide responses in the user's preferred language.
Recommendations should be based on local POIs with destination_id = '${this.destinationId}'.
    `.trim();
  }

  async getPOIs(category, tier = null) {
    const query = { destination_id: this.destinationId, category };
    if (tier) query.tier = tier;
    return await POI.findAll({ where: query });
  }
}
```

### 6.3 Admin Module Partner Access

```javascript
// admin-module/src/middleware/destinationAuth.js
export const destinationAccessMiddleware = async (req, res, next) => {
  const userId = req.user.id;
  const requestedDestination = req.params.destinationId || req.body.destinationId;

  // Check user's destination permissions
  const userDestinations = await UserDestination.findAll({
    where: { user_id: userId }
  });

  const hasAccess = userDestinations.some(
    ud => ud.destination_id === requestedDestination &&
         ['admin', 'editor'].includes(ud.role)
  );

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Insufficient permissions for this destination'
    });
  }

  req.destinationId = requestedDestination;
  req.userRole = userDestinations.find(
    ud => ud.destination_id === requestedDestination
  ).role;

  next();
};
```

---

## Deel 7: POI Image Storage Strategy

### 7.1 Gestructureerde Media Opslag

```
/var/www/api.holidaibutler.com/storage/destinations/
├── calpe/
│   └── poi-images/
│       ├── [poi_id]/
│       │   ├── main.jpg           # Hoofdafbeelding
│       │   ├── gallery/
│       │   │   ├── 1.jpg
│       │   │   ├── 2.jpg
│       │   │   └── ...
│       │   └── thumbnail.jpg
│       └── ...
├── texel/
│   └── poi-images/
│       └── [zelfde structuur]
└── alicante/
    └── poi-images/
        └── [zelfde structuur]
```

### 7.2 Apify Image Download Workflow

```javascript
// platform-core/src/services/agents/dataSync/imageDownloader.js
export class POIImageDownloader {
  constructor(destinationId) {
    this.destinationId = destinationId;
    this.basePath = `/var/www/api.holidaibutler.com/storage/destinations/${destinationId}/poi-images`;
  }

  async downloadAndStore(poiId, imageUrls) {
    const poiPath = path.join(this.basePath, String(poiId));
    await fs.mkdir(poiPath, { recursive: true });
    await fs.mkdir(path.join(poiPath, 'gallery'), { recursive: true });

    const results = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const filename = i === 0 ? 'main.jpg' : `gallery/${i}.jpg`;
      const filepath = path.join(poiPath, filename);

      try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        await fs.writeFile(filepath, buffer);

        // Generate thumbnail for main image
        if (i === 0) {
          await this.generateThumbnail(filepath, path.join(poiPath, 'thumbnail.jpg'));
        }

        results.push({ url, filepath, success: true });
      } catch (error) {
        results.push({ url, error: error.message, success: false });
      }
    }

    // Update database with local paths
    await POI.update(
      {
        main_image_local: `/poi-images/${poiId}/main.jpg`,
        images_local: JSON.stringify(
          results.filter(r => r.success).map(r => r.filepath)
        ),
        images_synced_at: new Date()
      },
      { where: { id: poiId, destination_id: this.destinationId } }
    );

    return results;
  }
}
```

---

## Deel 8: GDPR & EU AI Act per Destination

### 8.1 Destination-Aware Consent

```javascript
// Consent categories kunnen per destination/land verschillen
const consentConfig = {
  ES: {  // Spanje
    categories: ['essential', 'analytics', 'personalization', 'marketing'],
    cookieLifetime: 365,
    consentRequired: true
  },
  NL: {  // Nederland
    categories: ['essential', 'analytics', 'personalization', 'marketing'],
    cookieLifetime: 365,
    consentRequired: true,
    additionalNotice: 'Dutch Telecom Act applies'
  }
};

// GDPR Agent uitbreiden voor multi-destination
class MultiDestinationGDPRAgent extends GDPRAgent {
  async handleDeletionRequest(userId, destinationId = null) {
    if (destinationId) {
      // Delete data only for specific destination
      return await this.deleteDestinationData(userId, destinationId);
    } else {
      // Full GDPR erasure across all destinations
      return await this.deleteAllUserData(userId);
    }
  }
}
```

### 8.2 Legal Compliance Checklist per Destination

| Vereiste | Calpe (ES) | Texel (NL) | Alicante (ES) |
|----------|------------|------------|---------------|
| GDPR | Verplicht | Verplicht | Verplicht |
| EU AI Act | Low-risk | Low-risk | Low-risk |
| Cookie consent | AEPD | AP | AEPD |
| Privacy policy | Per destination | Per destination | Per destination |
| Terms of service | Per destination | Per destination | Per destination |
| Taal vereisten | ES + EN | NL + EN | ES + EN |
| BTW behandeling | ES BTW | NL BTW | ES BTW |

---

## Deel 9: MailerLite Multi-Destination

### 9.1 Groepen Structuur

```
MailerLite Account
├── Groups
│   ├── calpe-all-subscribers
│   ├── calpe-newsletter
│   ├── calpe-partners
│   ├── texel-all-subscribers
│   ├── texel-newsletter
│   ├── texel-partners
│   ├── alicante-all-subscribers
│   └── ...
└── Automations
    ├── calpe-welcome-sequence
    ├── calpe-booking-confirmation
    ├── texel-welcome-sequence
    └── ...
```

### 9.2 Dynamic Email Templates

```javascript
// platform-core/src/services/email/destinationTemplates.js
export const getEmailTemplate = (templateName, destinationId) => {
  const config = loadDestinationConfig(destinationId);

  return {
    from: `HolidaiButler ${config.destination.name} <noreply@${config.domains.production.customer}>`,
    replyTo: config.legal.contactEmail,
    branding: config.branding,
    footer: {
      company: `HolidaiButler ${config.destination.name}`,
      address: config.legal.companyAddress,
      unsubscribeGroup: `${destinationId}-all-subscribers`
    }
  };
};
```

---

## Deel 10: Implementatie Roadmap

### Fase 1: Foundation (Week 1-2) - COMPLEET

| Task | Prioriteit | Effort | Status |
|------|------------|--------|--------|
| Database schema migratie (destination_id) | P0 | 4u | COMPLEET |
| Destination config bestanden aanmaken | P0 | 2u | COMPLEET |
| READMEFIRST.md template + aanmaken per module | P1 | 4u | COMPLEET |
| Server directory structuur aanpassen | P0 | 2u | COMPLEET |
| Apache vhost templates maken | P0 | 2u | COMPLEET |

### Fase 2: Texel Deployment (Week 3-4)

| Task | Prioriteit | Effort |
|------|------------|--------|
| texelmaps.nl DNS + SSL configuratie | P0 | 1u |
| Texel destination config | P0 | 2u |
| Texel POI seed data (basis) | P0 | 8u |
| Texel branding assets | P1 | 4u |
| GitHub Actions matrix update | P0 | 2u |
| E2E testen Texel environment | P0 | 4u |

### Fase 3: Alicante Preparation (Week 5-6)

| Task | Prioriteit | Effort |
|------|------------|--------|
| Alicante destination config | P1 | 2u |
| Alicante POI discovery via Apify | P1 | 8u |
| Subdomain setup (alicante.holidaibutler.com) | P1 | 1u |

### Fase 4: Stabilization & Documentation (Week 7-8)

| Task | Prioriteit | Effort |
|------|------------|--------|
| Multi-destination E2E tests | P1 | 8u |
| Documentatie update | P1 | 4u |
| Partner onboarding flow per destination | P2 | 8u |
| Performance monitoring per destination | P2 | 4u |

---

## Deel 11: Kritieke Aandachtspunten

### 11.1 NOOIT Doen

1. **Geen hardcoded destination data in code** - Altijd via config
2. **Geen aparte repositories per destination** - Monorepo behouden
3. **Geen database per destination** - Shared DB met destination_id
4. **Geen copy-paste van modules** - Feature flags gebruiken
5. **Geen deploy zonder backup** - Altijd backup eerst

### 11.2 ALTIJD Doen

1. **READMEFIRST.md eerst lezen** bij elke module
2. **destination_id meegeven** in alle queries
3. **Feature flags checken** voor destination-specifieke features
4. **Deploy volgorde respecteren**: dev -> test -> main
5. **GDPR consent per destination** tracken
6. **POI images lokaal opslaan** op Hetzner

---

## Deel 12: Implementatie Log

> **Instructie**: Dit gedeelte wordt automatisch bijgewerkt na elke voltooide fase.
> Update dit document via Claude Code na elke fase-afronding.

### Fase 1: Foundation - COMPLEET

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 1.1 Database schema migratie | Compleet | 28-01-2026 | Claude Code | INT destination_id (niet VARCHAR), 6 tabellen, backup gemaakt (44.7 MB) |
| 1.2 Destination config bestanden | Compleet | 28-01-2026 | Claude Code | `platform-core/config/destinations/` - shared + 3 destinations |
| 1.3 READMEFIRST.md implementatie | Compleet | 28-01-2026 | Claude Code | Template + 3 module-specifieke files |
| 1.4 Server directory structuur | Compleet | 28-01-2026 | Claude Code | Storage + logs + assets directories, symlink voor backward compat |
| 1.5 Apache vhost templates | Compleet | 28-01-2026 | Claude Code | 5 templates + README.md in `infrastructure/apache/` |

**Fase 1 Status**: COMPLEET (28 januari 2026)

**GitHub Commits:**
1. `feat(core): Multi-Destination Architecture Phase 1` - Database migration, config files
2. `feat(infra): Multi-Destination Phase 1 - Tasks 3-5 complete` - READMEFIRST, Apache templates

### Fase 2: Texel Deployment

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 2.1 DNS + SSL configuratie | Niet gestart | - | - | - |
| 2.2 Texel destination config | Niet gestart | - | - | - |
| 2.3 Texel POI seed data | Niet gestart | - | - | - |
| 2.4 Texel branding assets | Niet gestart | - | - | - |
| 2.5 GitHub Actions matrix | Niet gestart | - | - | - |
| 2.6 E2E tests | Niet gestart | - | - | - |

**Fase 2 Status**: WACHT OP FASE 1

### Fase 3: Alicante Preparation

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 3.1 Alicante config | Niet gestart | - | - | - |
| 3.2 POI discovery via Apify | Niet gestart | - | - | - |
| 3.3 Subdomain setup | Niet gestart | - | - | - |

**Fase 3 Status**: WACHT OP FASE 2

### Fase 4: Stabilization & Documentation

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 4.1 Multi-destination E2E tests | Niet gestart | - | - | - |
| 4.2 Documentatie update | Niet gestart | - | - | - |
| 4.3 Partner onboarding flow | Niet gestart | - | - | - |
| 4.4 Performance monitoring | Niet gestart | - | - | - |

**Fase 4 Status**: WACHT OP FASE 3

---

## Deel 13: Lessons Learned

> **Instructie**: Vul dit aan na elke voltooide fase.

### Fase 1 Lessons Learned (28-01-2026)

**Database Ontwerp:**
- **INT destination_id is beter dan VARCHAR** - Betere performance bij JOIN queries, standaard MySQL FK pattern
- **Aparte `code` kolom voor tekstuele identifier** - Combinatie van INT PK + VARCHAR code geeft flexibiliteit (code kan wijzigen, ID blijft stabiel)
- **Feature flags in JSON kolom** - Maakt per-destination feature toggles mogelijk zonder schema wijzigingen

**Server Configuratie:**
- **RequestHeader boven SetEnv** - HTTP header `X-Destination-ID` is betrouwbaarder voor backend routing dan environment variable
- **Symlinks voor backward compatibility** - Bestaande Calpe POI images blijven werken via symlink naar nieuwe destination-specifieke path
- **Destination-specifieke logs** - Voorkomt log pollution, maakt debugging per destination eenvoudiger

**Development Workflow:**
- **MySQL credentials uit .env** - Root user had geen wachtwoord; altijd applicatie credentials gebruiken
- **GitHub Actions overschrijft handmatige uploads** - CLAUDE.md moest opnieuw geupload na auto-deploy
- **Backup VOOR migratie** - 44.7 MB backup gemaakt voordat schema wijzigingen werden toegepast

**Config Architectuur:**
- **Centrale `index.js` met utility functions** - `getDestinationConfig()`, `isFeatureEnabled()`, `getDestinationByDomain()` maken code cleaner
- **Comprehensive config per destination** - Branding, legal, POI settings, holibot settings in een plek

### Fase 2 Lessons Learned
- *Nog geen - fase niet gestart*

### Fase 3 Lessons Learned
- *Nog geen - fase niet gestart*

### Fase 4 Lessons Learned
- *Nog geen - fase niet gestart*

---

## Deel 14: Risico Register

| Risico | Impact | Kans | Mitigatie | Status |
|--------|--------|------|-----------|--------|
| Database migratie verstoort productie | Hoog | Laag | Backup + maintenance window | Gemitigeerd (backup 44.7 MB gemaakt) |
| DNS propagatie vertraging Texel | Medium | Medium | 48u buffer inplannen | Open (Fase 2) |
| POI data kwaliteit Texel | Medium | Medium | Handmatige review na scraping | Open (Fase 2) |
| Apache config conflict | Hoog | Laag | Test eerst op dev omgeving | Gemitigeerd (templates klaar) |
| GitHub Actions overschrijft server files | Medium | Hoog | Documentatie + handmatige re-upload | Bekend - CLAUDE.md moest hersteld |
| MySQL root zonder wachtwoord | Medium | Laag | Altijd .env credentials gebruiken | Gemitigeerd (credentials gedocumenteerd) |

---

## Deel 15: Beslissingen Log

| Datum | Beslissing | Rationale | Beslisser |
|-------|------------|-----------|-----------|
| 28-01-2026 | Monorepo behouden | 90%+ gedeelde code, eenvoudiger CI/CD | Strategic Advisory |
| 28-01-2026 | Shared DB met destination_id | Kostenefficient, eenvoudiger queries | Strategic Advisory |
| 28-01-2026 | texelmaps.nl als eigen domein | Brand differentiatie, lokale markt | Owner besluit |
| 28-01-2026 | Alicante als subdomain | Deel van HolidaiButler brand | Strategic Advisory |
| 28-01-2026 | INT destination_id i.p.v. VARCHAR | Performance FK constraints, standaard MySQL pattern | Claude Code |
| 28-01-2026 | RequestHeader i.p.v. SetEnv | Betrouwbaarder voor backend routing via HTTP header | Claude Code |
| 28-01-2026 | Symlink voor backward compat | Bestaande Calpe POI images blijven werken zonder code wijzigingen | Claude Code |
| 28-01-2026 | Config in platform-core/config/ | Dicht bij backend code, eenvoudiger imports | Claude Code |

---

## Appendix: Claude Code Implementatie Referentie

### Quick Start Command

```bash
# Start Claude Code sessie
claude

# Laad context
# Lees: docs/strategy/HolidaiButler_Multi_Destination_Strategic_Advisory.md
# Lees: CLAUDE.md
```

### Fase 1 Start Prompt

Zie: `docs/strategy/` voor complete documentatie.

---

**Einde Adviesrapport**

*Dit document is een levend document dat wordt bijgewerkt na elke implementatiefase.*
*Laatst bijgewerkt: 28 januari 2026 - Fase 1 Compleet*
*Volgende review: Na voltooiing Fase 2 (Texel Deployment)*

---

## Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **1.2** | **28-01-2026** | **Fase 1 COMPLEET: Database schema (INT destination_id, 6 tabellen), Apache VHosts (RequestHeader), Directory structuur geüpdatet naar daadwerkelijke implementatie. Implementatie Log, Lessons Learned, Risico Register, Beslissingen Log bijgewerkt met concrete resultaten.** |
| 1.1 | 28-01-2026 | Toegevoegd: Implementatie Log, Lessons Learned, Risico Register, Beslissingen Log |
| 1.0 | 28-01-2026 | Initiele versie - Strategisch Advies compleet |
