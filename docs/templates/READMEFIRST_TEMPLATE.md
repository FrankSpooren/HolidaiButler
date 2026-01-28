# [MODULE_NAME] - READMEFIRST

> **Leestijd**: 5 minuten
> **Versie**: X.Y.Z
> **Laatste update**: [DATUM]
> **Maintainer**: HolidaiButler Team

---

## Quick Start

1. Lees eerst: `CLAUDE.md` (project context)
2. Environment setup: `cp .env.example .env`
3. Dependencies: `npm install`
4. Start development: `npm run dev`

---

## Module Overzicht

[BESCHRIJVING VAN DE MODULE - 2-3 zinnen]

### Kernfunctionaliteit
- [Functie 1]
- [Functie 2]
- [Functie 3]

---

## Multi-Destination Support

| Destination | Status | Specifieke Features | Config |
|-------------|--------|---------------------|--------|
| Calpe | Active | [features] | `config/destinations/calpe.config.js` |
| Texel | Planned | [features] | `config/destinations/texel.config.js` |
| Alicante | Planned | [features] | `config/destinations/alicante.config.js` |

### Destination Routing
Alle API endpoints accepteren:
- Header: `X-Destination-ID: calpe`
- Query parameter: `?destination=calpe`
- Default: `calpe` (indien niet gespecificeerd)

---

## Dependencies

### Interne Modules
| Module | Relatie | Communicatie |
|--------|---------|--------------|
| [module] | [relatie] | [API/Events/Direct] |

### Externe Services
| Service | Doel | Credentials |
|---------|------|-------------|
| [service] | [doel] | `.env: SERVICE_API_KEY` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment mode |
| `DESTINATION_ID` | No | calpe | Default destination |
| [OTHER VARS] | | | |

---

## API Endpoints

### Base URL
- Production: `https://api.holidaibutler.com/[path]`
- Test: `https://api.test.holidaibutler.com/[path]`
- Dev: `https://api.dev.holidaibutler.com/[path]`

### Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | No |
| [METHOD] | [ENDPOINT] | [DESC] | [AUTH] |

---

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

---

## Deployment

### Via GitHub Actions
Push naar de juiste branch triggert automatische deployment:
- `dev` -> dev.holidaibutler.com
- `test` -> test.holidaibutler.com
- `main` -> holidaibutler.com

### Deployment Volgorde (KRITIEK)
**ALTIJD deployen in volgorde: dev -> test -> main**

```bash
git push origin dev          # Wacht op completion
git push origin dev:test     # Wacht op completion
git push origin dev:main     # Productie
```

---

## Gerelateerde Documentatie

- [CLAUDE.md](../CLAUDE.md) - Project context
- [CLAUDE_AGENTS_MASTERPLAN.md](../docs/CLAUDE_AGENTS_MASTERPLAN.md) - Agent architectuur
- [Multi-Destination Config](../platform-core/config/destinations/) - Destination configs

---

## Contact

- **Eigenaar**: Frank Spooren (info@holidaibutler.com)
- **Bugs**: GitHub Issues
- **Security**: info@holidaibutler.com
