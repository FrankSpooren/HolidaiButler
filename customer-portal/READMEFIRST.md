# Customer Portal - READMEFIRST

> **Leestijd**: 5 minuten
> **Versie**: 3.2.0
> **Laatste update**: 28 januari 2026
> **Maintainer**: HolidaiButler Team

---

## Quick Start

1. Lees eerst: `../CLAUDE.md` (project context)
2. Environment setup: `cp .env.example .env`
3. Dependencies: `npm install`
4. Start development: `npm run dev`

---

## Module Overzicht

Customer Portal is de publieke frontend van HolidaiButler - een React 19 applicatie
met Tailwind CSS 4 die toeristen voorziet van AI-powered reisaanbevelingen,
interactieve kaarten en boekingsmogelijkheden.

### Kernfunctionaliteit
- HoliBot AI Chatbot interface
- POI Discovery & Search
- Interactive Maps (Leaflet)
- Event Calendar (Agenda)
- User Authentication
- Multi-language support (i18next)
- Mobile-first responsive design

---

## Multi-Destination Support

| Destination | Status | Domain | Config |
|-------------|--------|--------|--------|
| Calpe | Active | holidaibutler.com | Via API |
| Texel | Planned | texelmaps.nl | Via API |
| Alicante | Planned | alicante.holidaibutler.com | Via API |

### Destination Detection
De portal detecteert de actieve destination via:
1. Domain matching (holidaibutler.com vs texelmaps.nl)
2. Subdomain (alicante.holidaibutler.com)
3. URL parameter (?destination=calpe)
4. User preference (localStorage)

### Destination-Specific Theming
- Brand colors laden uit destination config
- Logo's en assets per destination
- Welcome messages in locale taal

---

## Tech Stack

| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React + TypeScript | 19 |
| Build | Vite | 7 |
| Styling | Tailwind CSS | 4 |
| State | Zustand + TanStack Query | 5 |
| Routing | React Router | 7 |
| Forms | React Hook Form + Zod | - |
| i18n | i18next | - |
| Maps | Leaflet + React-Leaflet | - |
| Animations | Framer Motion | - |
| Payments | Adyen Web SDK | - |

---

## Dependencies

### Backend API
| Endpoint | Doel |
|----------|------|
| `api.holidaibutler.com` | Platform Core API |
| `/api/v1/holibot/*` | HoliBot chatbot |
| `/api/v1/pois/*` | POI data |
| `/api/v1/agenda/*` | Events |
| `/api/v1/auth/*` | Authentication |

### External Services (via API)
- MistralAI (HoliBot responses)
- ChromaDB (semantic search)
- Leaflet tiles (OpenStreetMap)

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | API base URL |
| `VITE_DESTINATION` | No | calpe | Default destination |
| `VITE_GA_ID` | No | - | Google Analytics ID |
| `VITE_ADYEN_CLIENT_KEY` | No | - | Adyen payments |

---

## Directory Structure

```
customer-portal/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Buttons, inputs, etc.
│   │   │   ├── holibot/    # Chat interface
│   │   │   ├── poi/        # POI cards, lists
│   │   │   └── maps/       # Map components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand stores
│   │   ├── utils/          # Helper functions
│   │   ├── i18n/           # Translations
│   │   └── assets/
│   │       └── destinations/
│   │           ├── calpe/      # Calpe assets
│   │           ├── texel/      # Texel assets
│   │           └── alicante/   # Alicante assets
│   ├── public/
│   └── package.json
└── READMEFIRST.md
```

---

## Brand Design System

### Colors (Calpe - Default)
| Naam | Hex | Gebruik |
|------|-----|---------|
| Header Gradient Start | #7FA594 | Header achtergrond |
| Header Gradient End | #4A7066 | - |
| Golden Accent | #D4AF37 | CTAs, highlights |
| Button Primary | #8BA99D | Knoppen |
| Text Primary | #2C3E50 | Hoofdtekst |

### UX Principes
- Miller's Law: Beperk keuzestress (max 7 items)
- Hick's Law: Progressive disclosure
- Fitts' Law: Mobile thumb-friendly CTAs
- WCAG: Accessibility compliance

---

## Testing

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e

# Visual regression
npm run test:visual
```

---

## Deployment

### Via GitHub Actions
- `dev` -> dev.holidaibutler.com
- `test` -> test.holidaibutler.com
- `main` -> holidaibutler.com

### Build Commands
```bash
npm run build          # Production build
npm run preview        # Preview production build
```

---

## Gerelateerde Documentatie

- [CLAUDE.md](../CLAUDE.md) - Project context
- [Platform Core](../platform-core/READMEFIRST.md) - Backend API
- [Design System](../docs/design-system.md) - UI guidelines

---

## Contact

- **Eigenaar**: Frank Spooren (info@holidaibutler.com)
- **Bugs**: GitHub Issues
