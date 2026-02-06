# HolidaiButler Multi-Destination Architecture
## Strategisch Adviesrapport

**Datum**: 5 februari 2026
**Auteur**: Claude (Strategic Analysis)
**Versie**: 2.5
**Classificatie**: Strategisch / Vertrouwelijk
**Status**: FASE 4 Full LLM Content Run COMPLEET - 2.515 POIs (1.442 Calpe + 1.073 Texel) gegenereerd via Mistral Medium. Kosten EUR 8,93. 100% succespercentage. Alle content in staging voor review.

---

## Document Status & Tracking

| Fase | Status | Start | Einde | Verantwoordelijke |
|------|--------|-------|-------|-------------------|
| **Fase 1: Foundation** | ✅ COMPLEET | 28-01-2026 | 28-01-2026 | Claude Code |
| **Fase 2: Texel Deployment** | ✅ COMPLEET | 29-01-2026 | 29-01-2026 | Claude Code |
| **Fase 3: Texel Data Quality** | ✅ COMPLEET | 02-02-2026 | 02-02-2026 | Claude Code |
| **Fase 3b: LLM Content Enrichment** | ✅ PILOT COMPLEET | 05-02-2026 | 05-02-2026 | Claude Code |
| **Fase 4: Full LLM Content Run** | ✅ COMPLEET | 05-02-2026 | 05-02-2026 | Claude Code |
| **Fase 5: Alicante Preparation** | 🟡 GEREED | - | - | Claude Code |
| **Fase 6: Stabilization** | ⏸️ WACHT | - | - | Claude Code |

**Laatste update**: 6 februari 2026 - Fase 4 Full LLM Content Run COMPLEET (2.515 POIs, Mistral Medium, EUR 8,93, 100% success, alle content in staging)

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

### Fase 4: Full LLM Content Run (Week 5) - COMPLEET

| Task | Prioriteit | Effort | Status |
|------|------------|--------|--------|
| Prompt optimalisatie (woordenaantal, markdown, openings) | P0 | 2u | COMPLEET |
| Volledige LLM generatie (2.515 POIs) | P0 | 5u | COMPLEET |
| Kwaliteitsanalyse & rapportage | P0 | 2u | COMPLEET |
| Staging tabel vullen | P0 | 1u | COMPLEET |

### Fase 5: Alicante Preparation (Week 6-7)

| Task | Prioriteit | Effort |
|------|------------|--------|
| Alicante destination config | P1 | 2u |
| Alicante POI discovery via Apify | P1 | 8u |
| Subdomain setup (alicante.holidaibutler.com) | P1 | 1u |

### Fase 6: Stabilization & Documentation (Week 8-9)

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

### Fase 2: Texel Deployment - IN PROGRESS

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 2.1 DNS + SSL configuratie | ✅ Compleet | 29-01-2026 | Claude Code | DNS via Hetzner, SSL certbot, geldig t/m 29-04-2026 |
| 2.2 Texel destination activeren | ✅ Compleet | 29-01-2026 | Claude Code | is_active=1, texelmaps.nl domain |
| 2.3 Texel data import | ✅ Compleet | 29-01-2026 | Claude Code | POI: 1,772, Categories: 671, QnA: 96,093, Reviews: 3,929 |
| 2.4 Texel branding assets | ✅ Compleet | 29-01-2026 | Claude Code | Placeholder logo SVG, kleurstelling toegepast |
| 2.5 GitHub Actions matrix | ✅ Compleet | 29-01-2026 | Claude Code | Matrix deployment calpe/texel, VITE_DESTINATION_ID |
| 2.6 E2E tests | ⏳ Optioneel | - | - | Basis health checks in workflow, E2E later |

**Fase 2 Status**: ✅ COMPLEET (5/6 taken compleet, E2E optioneel)

### Fase 3: Texel Data Kwaliteitsreview - COMPLEET

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 3.1 POI data synchronisatie | ✅ Compleet | 02-02-2026 | Claude Code | 1,772→1,739 POIs (97 deleted, 64 added), google_placeid als unique identifier |
| 3.2 Category hiërarchie update | ✅ Compleet | 02-02-2026 | Claude Code | 671→129 categories (14 level 1 + 115 level 2), 7 button categories met kleuren |
| 3.3 Visibility flags implementatie | ✅ Compleet | 02-02-2026 | Claude Code | is_searchable_only (161 POIs), is_hidden_category (411 POIs) |
| 3.4 Frontend category buttons | ✅ Compleet | 02-02-2026 | Claude Code | 7 Texel categories met specifieke kleuren in categoryConfig.ts |
| 3.5 Search functionaliteit | ✅ Compleet | 02-02-2026 | Claude Code | Browse mode hides flags, search mode shows all POIs |
| 3.6 Data kwaliteit check | ✅ Compleet | 02-02-2026 | Claude Code | Geen markdown gevonden in descriptions |
| 3.7 POI quality filters | ✅ Compleet | 02-02-2026 | Claude Code | Rating >= 4, reviews >= 3, images >= 3, enriched description required |
| 3.8 Category mix percentages | ✅ Compleet | 02-02-2026 | Claude Code | Texel browse view: 7 categories met specifieke verdelingen |
| 3.9 MapView improvements | ✅ Compleet | 02-02-2026 | Claude Code | perCategory=7 (~50 POIs), zoom=11 voor Texel eiland, category colors fixed |
| 3.10 MapView zoom fix | ✅ Compleet | 03-02-2026 | Claude Code | Zoom 11→10 voor volledig Texel eiland zichtbaarheid |
| 3.11 GeoJSON per_category bug | ✅ Compleet | 03-02-2026 | Claude Code | Variable shadowing fix: limit→perCategoryLimit, categories→distinctCategories |
| 3.12 GitHub Actions recovery | ✅ Compleet | 03-02-2026 | Claude Code | Outage (runner issues) opgelost, alle 6 workflows successvol deployed |
| 3.13 Branding Finalisatie | ✅ Compleet | 03-02-2026 | Claude Code | TexelMaps logo, VVV Texel partner, hero vuurtoren, kleuren #30c59b/#3572de/#ecde3c, footer fix |
| 3.14 Performance Optimalisatie | ✅ Compleet | 03-02-2026 | Claude Code | Sentry DSN fix, code splitting, lazy loading, -32% bundle size |
| 3.15 Mobile Logo Fix | ✅ Compleet | 03-02-2026 | Claude Code | Logo vergroot voor leesbaarheid (55px→80px), header overlap effect |
| 3.16 CSS Variabelen Migratie | ✅ Compleet | 04-02-2026 | Claude Code | ALLE hardcoded HolidaiButler kleuren (#7FA594, #5E8B7E, #4A7066) → CSS variabelen met Texel fallbacks (#30c59b, #3572de) in 33+ bestanden |
| 3.17 Fase 0A Excel→Hetzner Sync | ✅ Compleet | 04-02-2026 | Claude Code | Sync van AtTexel_POI_FIXED.xlsx: tile_en (0→1675), highlights (0→1675), markdown verwijderd, taalfouten gefixed |
| 3.18 Fase 0B Database Prep | ✅ Compleet | 04-02-2026 | Claude Code | POI schema +21 kolommen, staging tabel poi_content_staging, foto dirs, reviews +6 kolommen, exclusies (Calpe 98, Texel 597), templates 186 POIs |
| 3.19 Fase 2 Lokale Bronnen Scrapen | ✅ Compleet | 05-02-2026 | Claude Code | VVV Texel: 240 POIs via GraphQL API (Next.js __NEXT_DATA__ → gateway-texel.prod.oberon.dev/graphql). Calpe.es: 18 POIs (14 stranden + 4 natuur). POI websites: 276 POIs (154 Texel + 122 Calpe). Totaal 534 staging records (pending). Coverage: Calpe 9%, Texel 30%. |
| 3.20 VVV Texel Contactdata → POI | ✅ Compleet | 05-02-2026 | Claude Code | 115 Texel POIs bijgewerkt: 50 Facebook URLs, 45 Instagram URLs, 73 emails, 21 telefoon, 14 websites. Via VVV Texel GraphQL API → fuzzy match → fill-only-if-empty. Texel contactvelden: website 73%, facebook 45%, instagram 35%, email 53%, phone 70%. |
| 3.21 Fase 3 Stap 1: Database Backup | ✅ Compleet | 05-02-2026 | Claude Code | POI_backup_fase3_20260205_114056.sql (30 MB) op /root/backups/ |
| 3.22 Fase 3 Stap 2: POI Selectie | ✅ Compleet | 05-02-2026 | Claude Code | 50 Texel (Actief/Natuur/Cultuur/Eten/Winkelen, elk 10) + 50 Calpe (Active/Beaches/Culture/Recreation/Food/Shopping). Criteria: rating>=3.5, enriched_detail_description NOT NULL, is_active=1. |
| 3.23 Fase 3 Stap 3: Mistral AI Generatie | ✅ Compleet | 05-02-2026 | Claude Code | 100/100 POIs succesvol. Model: mistral-medium-latest. Kosten: EUR 0.2350 (4.7% budget). Tokens: 61.538 input + 18.656 output = 80.194 totaal. Woordenaantal: min 111, max 152, avg 132, 41% in range. |
| 3.24 Fase 3 Stap 4: Kwaliteitsanalyse | ✅ Compleet | 05-02-2026 | Claude Code | NEW scoort beter op ALLE 9 criteria. Grootste verbeteringen: Herhaling (79%→2%), AIDA (2.0→3.8), ToV (2.8→4.2). Texel OLD onbruikbaar (NL, markdown, 346 woorden). Calpe OLD redelijk maar verouderd (Amerikaans, hardcoded data). |
| 3.25 Fase 3 Stap 5: Vervangingsadvies | ✅ Compleet | 05-02-2026 | Claude Code | Advies: Optie 3 Hybride. Texel: volledige vervanging (OLD is NL, onbruikbaar als EN). Calpe: hybride per categorie. Prompt optimalisatie nodig (woordenaantal + markdown fix). Geschatte kosten volledige run: EUR 6.20 voor ~2.637 POIs. |

**Fase 3 Status**: ✅ COMPLEET (05 februari 2026)

**POI Sync Resultaten:**
- POIs verwijderd: 97 (niet in nieuwe Excel)
- POIs toegevoegd: 64 (zonder google_placeid)
- POIs bijgewerkt: 1,675
- QnA automatisch opgeschoond: 96,093→93,241 (orphaned records)

**7 Texel Button Categories:**
| Categorie | Kleur | ID |
|-----------|-------|-----|
| Actief | #FF6B00 | actief |
| Cultuur & Historie | #004B87 | cultuur |
| Eten & Drinken | #E53935 | eten |
| Gezondheid & Verzorging | #43A047 | gezondheid |
| Natuur | #7CB342 | natuur |
| Praktisch | #607D8B | praktisch |
| Winkelen | #AB47BC | winkelen |

**POI Quality Filters (Browse View):**
- Rating >= 4.0
- Review count >= 3
- Enriched tile description required
- At least 3 images required
- Exclusies: Laadpunten (charging stations), begraafplaatsen (cemeteries)

**Category Mix Percentages (Texel Default Browse):**
| Categorie | Percentage |
|-----------|------------|
| Actief | 20% |
| Cultuur & Historie | 20% |
| Natuur | 20% |
| Eten & Drinken | 15% |
| Winkelen | 10% |
| Gezondheid & Verzorging | 10% |
| Praktisch | 5% |

**MapView Configuratie:**
- perCategory=7 voor ~49 POIs (7 categorieën × 7 POIs)
- Texel zoom level: 10 (toont volledig eiland - 25km)
- Calpe zoom level: 14 (compacte stad)
- Category colors: Texel Dutch categories toegevoegd aan getCategoryColor()
- GeoJSON endpoint: variable shadowing bug gefixed (limit→perCategoryLimit)

### Fase 4: Full LLM Content Run - COMPLEET

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 4.1 Prompt optimalisatie | ✅ Compleet | 05-02-2026 | Claude Code | Striktere woordenaantal (115-125), markdown verbod, opening diversiteit, forbidden openings ("Tucked away", "Nestled in") geëlimineerd |
| 4.2 Volledige LLM generatie run | ✅ Compleet | 05-02-2026 | Claude Code | 2.515 POIs (1.442 Calpe + 1.073 Texel), 100% success, 0 failures, 303 min (~5 uur) |
| 4.3 Quality retry systeem | ✅ Compleet | 05-02-2026 | Claude Code | 1.276 retries (50,7% retry rate) voor woordenaantal compliance |
| 4.4 Kwaliteitsanalyse & rapportage | ✅ Compleet | 05-02-2026 | Claude Code | Markdown 0%, British English 97,6%, AIDA-indicatoren sterk, 2x "in Texel" fout |
| 4.5 Staging tabel vullen | ✅ Compleet | 05-02-2026 | Claude Code | 2.515 records in poi_content_staging (source: mistral_medium_fase4, status: pending) |

**Fase 4 Status**: ✅ COMPLEET (05 februari 2026)

**Fase 4 Kernresultaten:**

| Metriek | Pilot (Fase 3b) | Full Run (Fase 4) | Verschil |
|---------|-----------------|-------------------|----------|
| POIs verwerkt | 100 | 2.515 | +2.415 |
| Succespercentage | 100% | 100% | = |
| Kosten totaal | EUR 0,24 | EUR 8,93 | +3.621% |
| Kosten per POI | EUR 0,00235 | EUR 0,00355 | +51% (door retries) |
| Totaal tokens | 80.194 | 2.768.892 | +3.353% |
| Markdown lekkage | 17% | **0%** | -100% (opgelost) |
| Verboden openingszinnen | 4% | **0%** | -100% (opgelost) |
| British English | n/a | **97,6%** | Nieuw gemeten |
| Gem. woordenaantal | 132 | 135 | +2,3% |
| Retry rate | ~15% | 50,7% | +238% |

**Woordenaantal Distributie (2.515 POIs):**
| Range | Aantal | % |
|-------|--------|---|
| 110-115 | 4 | 0,2% |
| 116-125 | 189 | 7,5% |
| 126-130 | 420 | 16,7% |
| 131-135 | 827 | 32,9% |
| 136-140 | 631 | 25,1% |
| 141-150 | 420 | 16,7% |
| 150+ | 24 | 1,0% |

**Locatiereferenties:**
| Calpe | % | Texel | % |
|-------|---|-------|---|
| Costa Blanca | 75,1% | Wadden(zee) | 63,4% |
| Mediterranean | 69,8% | North Sea | 47,3% |
| Penon de Ifach | 64,1% | Den Burg | 43,5% |
| Chiringuito | 43,2% | De Koog | 22,1% |
| Tapas | 27,8% | Oudeschild | 17,9% |
| "in Calpe" | 5,8% | "on Texel" | 12,8% |
| | | **"in Texel" (FOUT)** | **0,2% (2x)** |

**Opening Diversiteit Issues:**
- 57% begint met "A" — onvoldoende divers
- "The scent of" komt 162x voor (6,4%) — voornaamste repetitiepatroon
- Verboden openingszinnen ("Tucked away", "Nestled in") succesvol geëlimineerd

**AIDA-model Indicatoren:**
| Indicator | Calpe | Texel | Totaal |
|-----------|-------|-------|--------|
| Prijsvermelding | 71,2% | 61,1% | 66,9% |
| Openingstijden | 60,4% | 58,4% | 59,6% |
| Afstandsreferentie | 76,3% | 75,7% | 76,0% |
| Call-to-action | 49,9% | 43,7% | 47,3% |

**Staging Status na Fase 4:**
| Content Source | Aantal | Status |
|---------------|--------|--------|
| mistral_medium_fase4 | 2.515 | pending |
| poi_website | 276 | pending |
| vvv_texel | 240 | pending |
| calpe_es | 18 | pending |
| **Totaal staging** | **3.049** | **pending** |

**Deliverables op Hetzner (/root/):**
- `fase4_full_output.json` (3,4 MB) — alle 2.515 gegenereerde beschrijvingen
- `fase4_generation_report.md` — uitvoeringsrapport met statistieken
- `fase4_quality_analysis.json` — gedetailleerde kwaliteitsmetrieken per destination/categorie
- `fase4_quality_sample.md` — steekproef 20 POIs (10 Texel + 10 Calpe)
- `fase4_quality_flags.json` — quality flags per POI
- `fase4_checkpoint.json` — checkpoint met alle verwerkte POI IDs
- `fase4_exceptions.json` — lege lijst (0 exceptions)
- `texel_old_nl_archive.json` — archief Texel oude NL beschrijvingen

**GitHub Commits:**
- `feat(content): Fase 4 Full LLM Content Run — 2.515 POIs via Mistral Medium`

### Fase 5: Alicante Preparation

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 5.1 Alicante config | Niet gestart | - | - | - |
| 5.2 POI discovery via Apify | Niet gestart | - | - | - |
| 5.3 Subdomain setup | Niet gestart | - | - | - |

**Fase 5 Status**: WACHT OP GOEDKEURING

### Fase 6: Stabilization & Documentation

| Taak | Status | Datum | Uitvoerder | Notities |
|------|--------|-------|------------|----------|
| 6.1 Multi-destination E2E tests | Niet gestart | - | - | - |
| 6.2 Documentatie update | Niet gestart | - | - | - |
| 6.3 Partner onboarding flow | Niet gestart | - | - | - |
| 6.4 Performance monitoring | Niet gestart | - | - | - |

**Fase 6 Status**: WACHT OP FASE 5

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

### Fase 2 Lessons Learned (29-01-2026)

**Database Multi-Tenancy:**
- **Gedeelde QnA tabel met destination_id** - Gebruik de bestaande QnA tabel met destination_id kolom, niet aparte tabellen (QA vs QnA)
- **google_placeid als POI referentie** - QnA gebruikt google_placeid, niet poi_id voor de koppeling
- **Batch inserts voor grote imports** - 96K+ records efficiënt importeren met batch size van 1000

**DNS & SSL:**
- **Hetzner DNS** - DNS transfer van MijnDomein.nl naar Hetzner voor betere integratie
- **Certbot automatisering** - Let's Encrypt certificaten via certbot --apache, auto-renewal geconfigureerd

**GitHub Actions:**
- **Matrix strategy** - Parallelle builds/deploys per destination
- **VITE_DESTINATION_ID** - Frontend destination awareness via environment variable
- **Destination-specific config** - Map coordinates, app name, language per destination

### Fase 3 Lessons Learned (02-02-2026)

**POI Data Synchronisatie:**
- **google_placeid als unique identifier** - Betrouwbaarder dan database ID voor Excel-database sync
- **CRLF line endings probleem** - Windows tekstbestanden hebben \r\n, SQL matching faalde; opgelost met `sed -i 's/\r$//'`
- **NULL category handling** - 97 POIs zonder category; opgelost door DEFAULT 'Uncategorized' en regeneratie SQL

**Category Hiërarchie:**
- **INSERT IGNORE voor duplicates** - Sommige categorienamen kwamen meerdere keren voor in Excel
- **3-level hierarchy** - category (level 1) → subcategory (level 2) → poi_type (level 3)
- **Destination-specifieke kleuren** - Texel heeft eigen kleurenschema (niet Calpe hergebruiken)

**Visibility Flags:**
- **is_searchable_only** - POIs zonder google_placeid, alleen vindbaar via search
- **is_hidden_category** - Accommodatie POIs, verborgen in browse maar searchbaar
- **Backend search mode** - `buildPublicWhereClause(destinationId, isSearchMode)` voor conditionele filtering

**Frontend Multi-Destination:**
- **destination.categories.enabled** - Gebruik enabled filter in plaats van excluded voor cleaner destination-specifieke categorieën
- **CATEGORIES_ARRAY bevat alle** - Filtering per destination gebeurt in POILandingPage via enabled array

**POI Quality Filters:**
- **enriched_tile_description** - Correct kolomnaam (niet 'description'), MistralAI-gegenereerd
- **POI.images JSON column** - Images opgeslagen als JSON array, niet in aparte ImageUrl tabel voor Texel
- **Category mix implementatie** - Client-side shuffling voor gevarieerde presentatie per refresh
- **Exclusion patterns** - Laadpunten via subcategory, begraafplaatsen via name keywords

**MapView Multi-Destination:**
- **Zoom per destination** - Texel (eiland ~25km) vereist zoom 10, Calpe (stad) vereist zoom 14
- **getCategoryColor() uitbreiden** - Beide EN en NL categorienamen in color mapping nodig
- **perCategory parameter** - API limit per category voor gebalanceerde kaart display

### Fase 3 Lessons Learned - Productioneel (03-02-2026)

**Variable Shadowing Bug:**
- **`const limit = parseInt(per_category)`** - Shadowed de outer `limit` query parameter
- **`const categories = await model.findAll(...)`** - Shadowed de outer `categories` query parameter
- **Fix: Rename variables** - `limit`→`perCategoryLimit`, `categories`→`distinctCategories`
- **Impact** - GeoJSON endpoint returneerde alleen 7 POIs (eerste categorie) i.p.v. 49 (7×7)

**MapView Zoom Calibratie:**
- **Texel is 25km eiland** - Zoom 11 was te dichtbij, zoom 10 toont volledig eiland
- **Calpe is compacte stad** - Zoom 14 blijft correct
- **Destination-aware zoom** - `destination.id === 'texel' ? 10 : 14`

**GitHub Actions Outage:**
- **Runner acquisition failures** - "The job was not acquired by Runner of type hosted even after multiple attempts"
- **Internal server errors** - GitHub infrastructure issues, niet code-gerelateerd
- **Recovery** - Version bumps (customer-portal 1.0.1, platform-core 2.1.1) om fresh CI/CD runs te triggeren
- **Deploy volgorde** - ALTIJD dev→test→main met wachttijd tussen elke push
- **Path filters** - Empty commits triggeren GEEN workflows; file changes in paths nodig

**API X-Destination-ID Header:**
- **Frontend apiClient** - Stuurt automatisch `X-Destination-ID: texel` header via axios defaults
- **Backend getDestinationFromRequest()** - Checkt header→query param→default (1=Calpe)
- **Texelmaps.nl Apache** - `RequestHeader set X-Destination-ID "texel"` in vhost config

### Fase 3 Lessons Learned - Branding Finalisatie (03-02-2026)

**TexelMaps Huisstijl:**
- **Definitieve kleuren vastgesteld** - Primary #30c59b (natuur groen), Secondary #3572de (zee blauw), Accent #ecde3c (zongeel)
- **DestinationContext voor dynamische branding** - CSS variabelen worden runtime gezet vanuit vite.config.ts
- **VVV Texel partnership** - Partner badge in USP sectie voor lokale autoriteit en vertrouwen
- **Logo assets** - Transparante PNG voor header, icon versie voor favicon en kleine weergaves

**Frontend Architectuur:**
- **vite.config.ts als single source of truth** - Alle destination-specifieke config op één plek
- **Multi-destination aware componenten** - HeroSection, Footer, USPSection gebruiken useDestination() hook
- **Footer tagline overflow** - `white-space: nowrap` veroorzaakte tekst overlap; opgelost met max-width

**Asset Management:**
- **Assets in public/assets/images/texel/** - Separate directory per destination
- **Server sync** - Assets ook naar `/var/www/api.holidaibutler.com/storage/destinations/texel/branding/`
- **Backup voor deploy** - Altijd backup maken voordat nieuwe versie wordt uitgerold

### Fase 3 Lessons Learned - Performance Optimalisatie (03-02-2026)

**Sentry/Bugsink DSN:**
- **Texel heeft geen eigen Bugsink instance** - HolidaiButler DSN veroorzaakte "Invalid Sentry Dsn" console errors
- **Conditionale initialisatie** - DSN uitgecommenteerd in `.env.texel`, main.tsx try-catch wrapper bleef intact
- **Aparte error monitoring per destination** - Overweeg Texel-specifieke Bugsink instance in productie

**Frontend Performance:**
- **Code splitting met manualChunks** - Vendor dependencies (react, framer-motion, leaflet, sentry) apart gebundeld
- **Route-based lazy loading** - 16 pagina's naar React.lazy(), critical pages laden direct
- **Bundle size reductie** - Main bundle van 1,049 kB naar 713 kB (-32%)
- **Image lazy loading** - `loading="lazy"` attribute op USP logo afbeeldingen

**Mobile Responsiveness:**
- **Logo leesbaarheid** - 55px was te klein op mobiel, 80px biedt goede balans
- **Header overlap effect** - Logo dat over header balk valt creëert visuele connectie met hero
- **Extra small screens (375px)** - Aparte breakpoint voor iPhone SE met 70px logo

### Fase 3 Lessons Learned - CSS Variabelen Migratie (04-02-2026)

**Hardcoded Kleuren Migratie:**
- **33+ bestanden met hardcoded kleuren** - HolidaiButler kleuren (#7FA594, #5E8B7E, #4A7066) waren verspreid door CSS en TSX bestanden
- **Systematische zoekactie met Grep** - Pattern `#7FA594|#5E8B7E|#4A7066` identificeerde alle bestanden
- **CSS variabelen met fallbacks** - `var(--color-primary, #30c59b)` zorgt dat UI automatisch Texel kleuren toont
- **replace_all flag** - Edit tool met replace_all=true voor efficiënte bulk replacements

**Bestanden Categorieën:**
- **CSS bestanden (24+)** - POIDetailPage.css, Homepage.css, Auth.css, Onboarding.css, etc.
- **TSX bestanden (9)** - Inline styles en Tailwind classes in POIDetailPage.tsx, FilterPanel.tsx, etc.
- **Config bestanden (3)** - router.tsx, categoryConfig.ts, ErrorBoundary.tsx

**Root CSS Variabelen:**
- **index.css als single source of truth** - Texel defaults in :root voor hele applicatie
- **DestinationContext runtime injectie** - CSS variabelen worden gezet vanuit destination config
- **Fallback strategie** - Altijd Texel kleur als fallback: `var(--color-primary, #30c59b)`

**Texel Huisstijl Definitief:**
- Primary: #30c59b (natuur groen)
- Secondary: #3572de (zee blauw)
- Accent: #ecde3c (zongeel)

### Fase 2 Lessons Learned - Lokale Bronnen Scrapen (05-02-2026)

**VVV Texel Scraping:**
- **texel.net is een Next.js SPA** - Content laadt dynamisch, maar `__NEXT_DATA__` bevat 720KB embedded JSON
- **GraphQL API ontdekt** - Via JS chunk analyse: `https://gateway-texel.prod.oberon.dev/graphql`
- **CompanySearch query** - 382 bedrijven met naam, beschrijving, adres, coordinaten, contact, categories
- **Rijke beschrijvingen** - 380/382 bedrijven hebben beschrijving >=20 chars, gemiddeld 80-120 woorden
- **240 POIs gematcht** - 63% match rate, fuzzy threshold 0.70
- **197 in target range** - 82% van matches valt in 80-120 woorden range
- **Techniek**: Fetch HTML → extract `<script id="__NEXT_DATA__">` → parse JSON → find GraphQL endpoint in JS chunks → query directly

**Calpe.es Scraping:**
- **14 stranden + 4 natuurgebieden succesvol gescraped** - Calpe.es heeft statische pagina's met bruikbare content
- **Fuzzy matching faalde voor Dutch→Spanish** - Slug namen als "baai-el-collao-o-raco-del-corb" matchten niet goed op "Cala del Raco del Corb"
- **Handmatige POI mapping was noodzakelijk** - 18 calpe.es entries moesten handmatig aan juiste POI IDs gekoppeld worden
- **NL versie van calpe.es** - Bruikbaar als basis voor Nederlandse beschrijvingen

**POI Website Scraping:**
- **Texel: 154/200 succesvol** (77% success rate) - Meta descriptions + OG tags + main content
- **Calpe: 122/200 succesvol** (61% success rate) - Lager door meer dode links en Facebook-only pagina's
- **Facebook URLs niet scrapbaar** - Redirect naar login pagina (400 Bad Request)
- **Veelvoorkomende failures**: 403 Forbidden, DNS resolution failures, SSL expired, connection timeouts
- **Rate limiting cruciaal** - 1 request/seconde voorkomt IP blocks

**Content Kwaliteit:**
- **80 beschrijvingen in target range** (80-120 woorden) - 27% van totaal
- **214 beschrijvingen in medium range** (30-79 woorden) - 73% van totaal
- **Website meta descriptions vaak kort** - Veel sites hebben slechts 1-2 zinnen als meta description
- **Calpe.es content is rijker** - Detail pagina's hebben 100+ woorden beschrijvingen

**Database:**
- **mysql-connector-python 8.0.15 incompatibel met Python 3.12** - `ssl.wrap_socket` verwijderd in Python 3.12+; upgrade naar 9.5.0 nodig
- **POI tabel heet `POI` (uppercase)** - Case-sensitive in queries op Hetzner

**Social Media Status:**
- **Calpe: 0 Facebook/Instagram URLs in database** - Alle social media links ontbreken
- **Texel: 467 Facebook + 364 Instagram URLs** - Beter gevuld vanuit AtTexel import

**VVV Texel Contactdata Toepassing:**
- **Fill-only-if-empty strategie** - Alleen lege velden in POI tabel worden aangevuld, bestaande data niet overschreven
- **115 POIs bijgewerkt** van 382 VVV bedrijven: 132 geen match, 134 al compleet, 1 geen contactdata
- **Fuzzy matching threshold 0.70** - Zelfde als content scraper voor consistente matching
- **Texel contactdekking na update**: website 73%, facebook 45%, instagram 35%, email 53%, phone 70%
- **Calpe contactdata blijft problematisch** - 0% social media, geen lokale bronnen beschikbaar

### Fase 2 Voorbereiding Fase 3 (Google Places / Apify)

**Huidige staging status:**
| Bron | Records | Unique POIs | Status |
|------|---------|-------------|--------|
| vvv_texel | 240 | 240 | pending |
| poi_website | 276 | 276 | pending |
| calpe_es | 18 | 18 | pending |
| **Totaal** | **534** | **534** | **pending** |

**Coverage na Fase 2:**
| Destination | Enrichable | In Staging | Coverage | Gap |
|-------------|-----------|------------|----------|-----|
| Texel | 1142 | 346 | 30% | 796 POIs |
| Calpe | 1495 | 139 | 9% | 1356 POIs |

**Fase 3 Aandachtspunten:**
- Calpe heeft grootste gap (91% nog niet in staging) - prioriteit voor Google Places enrichment
- Texel 70% gap kan deels gedicht worden met Google Places beschrijvingen
- Google Places API levert reviews, descriptions, opening hours, photos - ideaal voor ontbrekende POIs
- Apify actors voor Google Maps scraping: `compass/google-maps-reviews-scraper`, `apify/google-places-api`
- Content moet door AI (MistralAI) herschreven worden naar 80-120 woorden, correct taalgebruik ("op Texel", "in Calpe")
- Staging-first workflow behouden: alle nieuwe content → poi_content_staging → Frank review

### Fase 3 Lessons Learned - LLM Content Enrichment Pilot (05-02-2026)

**Mistral AI Content Generatie:**
- **mistral-medium-latest** levert consistent goede kwaliteit voor POI-beschrijvingen
- **EUR 0.00235 per POI** — extreem kostenefficiënt (100 POIs voor EUR 0.24)
- **80.194 tokens totaal** voor 100 POIs (gemiddeld 802 tokens per POI: 615 input + 187 output)
- **0% fouten** — alle 100 API calls succesvol, geen retries nodig
- **Rate limiting 5 req/sec** werkt goed; geen 429 errors ontvangen

**Content Kwaliteit Bevindingen:**
- **Woordenaantal overshooting** — gemiddeld 132 woorden i.p.v. target 120. Prompt moet strikter: "EXACTLY 115-125 words"
- **Markdown lekkage** — 17% van output bevat `*italic*` of `[hyperlinks]()`. Dubbele mitigatie nodig: strikte prompt + post-processing regex
- **"Tucked" opening pattern** — Mistral herhaalt "Tucked away..." openingszinnen. Prompt moet opening-diversiteit afdwingen
- **AIDA-model werkt** — 3.8/5 gemiddeld, consistent herkenbare Attention→Interest→Desire→Action structuur
- **Categorie-specifieke toon** — Natuur-beschrijvingen zijn langer (avg 141w), Cultuur is meest compact (avg 127w)

**OLD Content Problemen:**
- **Texel OLD is fundamenteel onbruikbaar als EN content**: Nederlands, markdown, 346 woorden gemiddeld, formulaisch
- **Calpe OLD is redelijk maar verouderd**: Amerikaans taalgebruik, hardcoded review data die veroudert
- **48% van OLD bevat `**markdown**`** — structureel probleem in bestaande content pipeline
- **79% van OLD bevat herhaalde zinnen** — "Of je nu... komt", "een must-visit voor iedereen"

**Hybride Strategie:**
- **Texel heeft volledige vervanging nodig** — OLD is NL, niet EN
- **Calpe profiteert van per-categorie selectie** — sommige OLD beschrijvingen bevatten nuttige details (prijzen, certificeringen)
- **Archivering OLD is essentieel** — Texel NL teksten herbruikbaar voor `enriched_detail_description_nl`

### Fase 4 Lessons Learned - Full LLM Content Run (05-02-2026)

**Prompt Optimalisatie:**
- **Verboden openingszinnen werken** — "Tucked away" en "Nestled in" volledig geëlimineerd (0% vs 4% in pilot)
- **Markdown verbod werkt met post-processing** — 0% lekkage (was 17% in pilot). Combinatie van strikte prompt + regex post-processing is effectief
- **Woordenaantal target wordt structureel overschreden** — Model convergeert rond 135 woorden ondanks "EXACTLY 115-125 words" instructie. Dit is een inherente eigenschap van Mistral Medium, niet oplosbaar via prompt engineering alleen
- **Nieuwe repetitiepatronen ontstaan** — Na eliminatie van "Tucked away" vervalt model in "The scent of" (162x, 6,4%). Whack-a-mole effect bij opening constraints

**Productie Run Inzichten:**
- **Retry rate 3x hoger dan pilot** — 50,7% vs ~15%. Veroorzaakt door striktere woordenaantal threshold (>135 triggert retry)
- **Kosten per POI 51% hoger door retries** — EUR 0,00355 vs EUR 0,00235. Elke retry verdubbelt tokens voor die POI
- **Totale kosten 44% boven schatting** — EUR 8,93 vs geschatte EUR 6,20. Budget van EUR 10 was net voldoende
- **5 uur runtime voor 2.515 POIs** — Rate limiting van 5 req/sec effectief, geen 429 errors
- **0 failures** — Mistral Medium API extreem betrouwbaar voor batch processing

**Content Kwaliteit:**
- **British English excellent** — 97,6% compliance. "Practice" (49x) is zowel British als American als zelfstandig naamwoord
- **"in Texel" bijna geëlimineerd** — Slechts 2 van 1.073 Texel-teksten (0,2%). Prompt instructie "on Texel, NOT in Texel" werkt
- **AIDA-structuur goed verankerd** — 67% prijzen, 60% openingstijden, 76% afstandsreferenties. CTA (47%) is zwakste element
- **Lokale verankering sterk** — 64% Calpe noemt Penon de Ifach, 63% Texel noemt Waddenzee
- **Categorie-invloed op woordenaantal** — Food/Shopping schrijft compacter (132-133w), Active/Nature langer (136-138w)

**Staging & Review:**
- **3.049 records totaal in staging** — 2.515 Fase 4 + 534 eerdere bronnen (VVV Texel, POI websites, calpe.es)
- **Smart quotes in alle beschrijvingen** — Typografische aanhalingstekens (''"") en em-dashes (—). Correct voor publicatie maar verifieer frontend rendering
- **Encoding: 0 issues** — Geen corruptie in 2.515 beschrijvingen

**Aanbevelingen voor Fase 5 (Review & Apply):**
1. Accepteer 130-140 als werkbaar woordenaantal bereik, of implementeer post-processing truncatie
2. Identificeer en herschrijf 162 "The scent of" openingszinnen (deduplicatie pass)
3. Fix 2 "in Texel" fouten
4. Verifieer smart quotes rendering in frontend
5. Review prioritering: Beaches & Nature + Culture eerst (bepalend toeristervaring), Practical + Services laatst

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
| LLM content kwaliteit inconsistent | Medium | Medium | Quality retry systeem + handmatige review | Gemitigeerd (0% markdown, 97,6% British EN) |
| Opening repetitie patronen | Laag | Hoog | Post-processing deduplicatie of tweede pass | Open — 162x "The scent of" |
| Woordenaantal boven target | Laag | Hoog | Accepteer 130-140 bereik of truncatie | Open — model convergeert rond 135 |
| Smart quotes rendering | Medium | Laag | Frontend verifiëren | Open — alle 2.515 beschrijvingen bevatten curly quotes |

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
| 03-02-2026 | TexelMaps huisstijl definitief | #30c59b/#3572de/#ecde3c - Texelse identiteit (groen, blauw, geel) | Owner |
| 03-02-2026 | VVV Texel partner badge | Lokale autoriteit, vertrouwen bezoekers, professionele uitstraling | Owner |
| 05-02-2026 | Fase 1 overslaan | Tijdgebrek eigenaar, direct naar Fase 2 lokale bronnen | Owner |
| 05-02-2026 | Staging-first workflow | Alle content via poi_content_staging, review voordat POI update | Claude Code |
| 05-02-2026 | Handmatige POI mapping calpe.es | Fuzzy matching onbetrouwbaar voor Dutch→Spanish namen, expliciet mapping | Claude Code |
| 05-02-2026 | VVV Texel via GraphQL API | Next.js __NEXT_DATA__ → JS chunk analyse → GraphQL endpoint, 382 bedrijven | Claude Code |
| 05-02-2026 | VVV contactdata fill-only-if-empty | Bestaande POI data niet overschrijven, alleen lege velden aanvullen met VVV Texel data | Claude Code |
| 05-02-2026 | SPA techniek niet breed toepasbaar | 90% POI websites is traditioneel HTML, Instagram/Facebook blokkeren scraping, techniek beperkt tot Next.js/React sites met __NEXT_DATA__ | Claude Code |
| 05-02-2026 | Fase 3 LLM Pilot: Optie 3 Hybride | Texel volledige vervanging (OLD=NL, onbruikbaar), Calpe hybride per categorie. NEW scoort beter op ALLE 9 criteria. | Claude Code |
| 05-02-2026 | Mistral Medium voor content generatie | mistral-medium-latest biedt optimale balans kwaliteit/kosten: EUR 0.00235/POI, 0% errors, consistent AIDA-model | Claude Code |
| 05-02-2026 | Prompt optimalisatie nodig voor volledige run | Woordenaantal strikter (115-125), markdown verbod versterken, opening-diversiteit afdwingen | Claude Code |
| 05-02-2026 | Fase 4 Full Run uitvoeren met geoptimaliseerde prompt | Pilot bewees kwaliteit; full run voor alle 2.515 enrichable POIs (Calpe + Texel) | Claude Code |
| 05-02-2026 | 130-140 woorden als werkbaar bereik accepteren | Mistral Medium convergeert structureel rond 135 woorden ondanks "EXACTLY 115-125" instructie; inherente modeleigenschap | Claude Code |
| 05-02-2026 | Quality retry threshold op >135 woorden | Balans tussen kwaliteit en kosten; retry rate 50,7% maar 0% failures | Claude Code |
| 05-02-2026 | Alle content naar staging (niet direct naar POI) | Staging-first workflow behouden voor Frank's review voordat productie POI tabel wordt bijgewerkt | Claude Code |

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
*Laatst bijgewerkt: 6 februari 2026 - Fase 4 Full LLM Content Run COMPLEET*
*Volgende review: Na Frank's review van 3.049 staging records en beslissing over apply naar POI tabel*

---

## Document Changelog

| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **2.5** | **06-02-2026** | **FASE 4 FULL LLM CONTENT RUN: 2.515 POIs (1.442 Calpe + 1.073 Texel) gegenereerd via Mistral Medium Latest. Kosten EUR 8,93 (89,3% van EUR 10 budget). 100% succespercentage, 0 failures. Kwaliteitsverbeteringen: markdown 0% (was 17%), forbidden openings 0% (was 4%), British English 97,6%. Gem. woordenaantal 135 (target 115-125, model convergeert structureel rond 135). Opening diversiteit issue: 57% begint met "A", "The scent of" 162x. Slechts 2x "in Texel" fout (0,2%). 2.768.892 tokens totaal, 1.276 quality retries (50,7%). 3.049 records in staging (2.515 Fase 4 + 534 eerder). Deliverables: fase4_full_output.json, fase4_generation_report.md, fase4_quality_analysis.json, fase4_quality_sample.md, fase4_quality_flags.json op Hetzner /root/. Fasen hernummerd: Alicante→Fase 5, Stabilization→Fase 6.** |
| 2.4 | 05-02-2026 | FASE 3 LLM CONTENT ENRICHMENT PILOT: 100 POIs (50 Texel + 50 Calpe) via Mistral Medium. Kosten EUR 0.24 (4.7% budget). NEW scoort beter op ALLE 9 criteria (grammatica, spelling, ToV, AIDA, herhaling, concreetheid, formatting, naam, woordenaantal). Advies: Optie 3 Hybride — Texel volledige vervanging (OLD=NL, markdown, 346w avg), Calpe hybride per categorie. Prompt optimalisatie nodig (woordenaantal 132→120, markdown fix). Volledige run geschat EUR 6.20 voor ~2.637 POIs. Deliverables: fase3_pilot_output.json, fase3_quality_analysis.md, fase3_replacement_advice.md op Hetzner /root/. |
| 2.3 | 05-02-2026 | VVV TEXEL CONTACTDATA: 115 Texel POIs bijgewerkt met contactdata uit VVV Texel GraphQL API (50 Facebook, 45 Instagram, 73 email, 21 telefoon, 14 website). Fill-only-if-empty strategie. Texel contactdekking: website 73%, facebook 45%, instagram 35%, email 53%, phone 70%. SPA techniek analyse: niet breed toepasbaar (90% POI sites traditioneel HTML). Voorbereiding Fase 3 sectie toegevoegd met coverage gaps en aandachtspunten. |
| 2.2 | 05-02-2026 | FASE 2 LOKALE BRONNEN SCRAPEN: VVV Texel gescraped via GraphQL API (382 bedrijven, 240 POIs gematcht, 197 in 80-120 woorden target). Calpe.es gescraped (18 POIs: 14 stranden + 4 natuur). POI websites gescraped (276 POIs: 154 Texel + 122 Calpe). Totaal 534 records naar poi_content_staging (status=pending). Coverage: Texel 30% (346/1142), Calpe 9% (139/1495). VVV Texel doorbraak: Next.js __NEXT_DATA__ → GraphQL endpoint ontdekt. mysql-connector-python upgrade 8.0.15→9.5.0. Fase 1 overgeslagen. |
| **2.1** | **04-02-2026** | **FASE 0B DATABASE VOORBEREIDING: POI schema uitgebreid (+21 kolommen: google_rating, photos_local_path, content_source, exclusie flags etc). Staging tabel poi_content_staging aangemaakt voor approval workflow. Foto directories /var/www/images/pois/[dest]/. Reviews schema +6 kolommen. Exclusies: Calpe 98 (accommodatie), Texel 597 (411 accommodatie + 132 laadpunten + 49 parking + 5 OV). Template teksten voor 186 Texel POIs (laadpunten/OV/parking). Te verrijken: Calpe 1495, Texel 1142.** |
| 2.0 | 04-02-2026 | FASE 0A EXCEL→HETZNER SYNC: Texel tile descriptions + highlights gesynchroniseerd. tile_en kolom toegevoegd (0→1675 POIs), highlights (0→1675), markdown verwijderd, taalfouten "in Texel"→"op Texel" gefixed. AtTexel_POI_FIXED.xlsx als bron. Backup gemaakt. detail_description NIET gesync (wordt later nieuw gegenereerd). |
| 1.9 | 04-02-2026 | Fase 3 CSS VARIABELEN MIGRATIE: ALLE hardcoded HolidaiButler kleuren (#7FA594, #5E8B7E, #4A7066) vervangen door CSS variabelen met Texel fallbacks (#30c59b, #3572de). 33+ bestanden bijgewerkt (CSS + TSX). index.css :root als single source of truth. Texel huisstijl definitief: Primary #30c59b, Secondary #3572de, Accent #ecde3c. |
| 1.8 | 03-02-2026 | Fase 3 PERFORMANCE: Sentry DSN fix (.env.texel), Code splitting (manualChunks: react/framer-motion/leaflet/sentry), Route-based lazy loading (16 pagina's), Bundle -32% (1049→713 kB). Mobile logo fix: 55px→80px voor leesbaarheid + header overlap effect. |
| 1.7 | 03-02-2026 | Fase 3 BRANDING FINALISATIE: TexelMaps officiële huisstijl (#30c59b/#3572de/#ecde3c), TexelMaps logo met vuurtoren/zeehond/kompas, VVV Texel partner badge, hero vuurtoren afbeelding, "Waddenjuweel" payoff, footer overlap fix. |
| 1.6 | 03-02-2026 | Fase 3 PRODUCTIONEEL: MapView zoom fix (11→10 voor volledig Texel eiland), GeoJSON per_category bug fix (variable shadowing: limit→perCategoryLimit), GitHub Actions outage recovery (6 workflows success), Version bumps (customer-portal 1.0.1, platform-core 2.1.1). |
| 1.5 | 02-02-2026 | Fase 3 UITGEBREID: POI Quality Filters (rating >= 4, reviews >= 3, images >= 3, enriched description), Category mix percentages, Exclusies (Laadpunten, begraafplaatsen), MapView improvements (zoom=11 Texel, category colors, perCategory=7). |
| 1.4 | 02-02-2026 | Fase 3 COMPLEET: Texel Data Kwaliteitsreview - POI sync (1739 POIs), Category hiërarchie (129 categories, 7 button colors), Visibility flags (is_searchable_only, is_hidden_category), Frontend category buttons, Search functionaliteit. Calpe data ongewijzigd (1593 POIs). |
| 1.3 | 29-01-2026 | Fase 2 COMPLEET: Texel Deployment - DNS+SSL (texelmaps.nl), Data import (POI 1772, Categories 671, QnA 96093, Reviews 3929), GitHub Actions matrix deployment, placeholder branding. |
| 1.2 | 28-01-2026 | Fase 1 COMPLEET: Database schema (INT destination_id, 6 tabellen), Apache VHosts (RequestHeader), Directory structuur geüpdatet naar daadwerkelijke implementatie. |
| 1.1 | 28-01-2026 | Toegevoegd: Implementatie Log, Lessons Learned, Risico Register, Beslissingen Log |
| 1.0 | 28-01-2026 | Initiele versie - Strategisch Advies compleet |
