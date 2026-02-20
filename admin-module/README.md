# HolidaiButler Admin Portal

Enterprise admin dashboard for the HolidaiButler tourism platform.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 4 | Build tool |
| Material-UI (MUI) | 5.14 | Component library |
| Zustand | 4.4 | State management |
| @tanstack/react-query | 4.36 | Server state |
| Axios | 1.5 | HTTP client |
| i18next | 23.5 | Internationalization (NL/EN) |
| Recharts | 2.9 | Charts |
| Bugsink/Sentry | 8.48 | Error monitoring |

## Setup

```bash
npm install
cp .env.development .env
npm run dev
```

Dev server: http://localhost:3010 (proxy to localhost:3001).

## Build

```bash
npm run build
```

Output: `dist/` (SPA, deployed to Apache with RewriteRule).

## Deployment

Automated via GitHub Actions: `.github/workflows/deploy-admin-module.yml`

| Branch | Environment | URL |
|--------|------------|-----|
| dev | Development | https://admin.dev.holidaibutler.com |
| test | Test | https://admin.test.holidaibutler.com |
| main | Production | https://admin.holidaibutler.com |

## Architecture

**Backend**: Admin API endpoints live in `platform-core/src/routes/adminPortal.js` (unified backend on port 3001). No separate admin backend.

**Auth**: JWT access token (8h) + refresh token (7d). Rate limit: 5 login attempts per 15 minutes.

## Project Structure

```
admin-module/
├── src/
│   ├── api/            # Axios client, auth & dashboard services
│   ├── components/
│   │   ├── auth/       # ProtectedRoute
│   │   ├── common/     # LoadingSpinner, ErrorBanner
│   │   ├── dashboard/  # KpiCard, DestinationCard, SystemHealthCard
│   │   └── layout/     # AdminLayout, Sidebar, Header
│   ├── hooks/          # useAuth, useDashboard
│   ├── i18n/           # NL/EN translations
│   ├── pages/          # Login, Dashboard, Agents, Placeholder, NotFound
│   ├── stores/         # Zustand auth store (localStorage persist)
│   └── utils/          # Formatters, destination config
├── .env.development    # Dev API URL
├── .env.test           # Test API URL + Bugsink DSN
├── .env.production     # Prod API URL + Bugsink DSN
├── vite.config.js      # Port 3010, proxy, aliases
├── index.html
└── package.json
```
