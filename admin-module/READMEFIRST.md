# Admin Module - READMEFIRST

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

Admin Module is het beheerportaal van HolidaiButler - een React 18 applicatie
met Material UI voor het beheren van POIs, content, gebruikers, partners en
systeem monitoring.

### Kernfunctionaliteit
- POI Management (CRUD, enrichment, images)
- Q&A Management (approval workflow)
- User Management
- Partner/Admin accounts
- System Dashboard (jobs, health, costs)
- Content moderation
- Analytics & Reporting

---

## Multi-Destination Support

| Destination | Status | Domain | Access |
|-------------|--------|--------|--------|
| Calpe | Active | admin.holidaibutler.com | Full |
| Texel | Planned | admin.texelmaps.nl | TBD |
| Alicante | Planned | admin.alicante.holidaibutler.com | TBD |

### Destination Switching
Admins kunnen switchen tussen destinations via:
- Dropdown in header
- URL parameter (?destination=calpe)
- User preference (stored in session)

### Multi-Destination Data Views
- POI list filtered by destination_id
- Dashboard metrics per destination
- Cross-destination reports for owner

---

## Tech Stack

| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React | 18 |
| Build | Vite | 4 |
| UI Library | Material UI (MUI) | 5 |
| State | Zustand + React Query | 4/3 |
| Routing | React Router | 6 |
| Charts | Recharts | - |
| WYSIWYG | React Quill | - |
| Tables | MUI DataGrid | - |

---

## Dependencies

### Backend API
| Endpoint | Doel |
|----------|------|
| `api.holidaibutler.com` | Platform Core API |
| `/api/admin/pois/*` | POI management |
| `/api/admin/users/*` | User management |
| `/api/admin/qa/*` | Q&A approval |
| `/api/admin/dashboard/*` | System metrics |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | API base URL |
| `VITE_DESTINATION` | No | calpe | Default destination |

---

## User Roles

| Role | POIs | Users | Q&A | System | Destinations |
|------|------|-------|-----|--------|--------------|
| Owner | Full | Full | Full | Full | All |
| Admin | Full | Read | Full | Read | Assigned |
| Editor | Edit | - | Edit | - | Assigned |
| Viewer | Read | - | Read | - | Assigned |

### Destination Access Control
Admins worden gekoppeld aan destinations via `user_destinations` table:
```sql
user_destinations (user_id, destination_id, role)
```

---

## Directory Structure

```
admin-module/
├── src/
│   ├── components/
│   │   ├── common/         # Shared UI components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── poi/            # POI management
│   │   ├── qa/             # Q&A approval
│   │   └── users/          # User management
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── POIList.jsx
│   │   ├── POIEdit.jsx
│   │   ├── QAApproval.jsx
│   │   └── Settings.jsx
│   ├── hooks/
│   ├── stores/
│   ├── services/           # API clients
│   └── utils/
├── public/
└── package.json
```

---

## Key Features

### POI Management
- List/filter/search POIs by destination
- Edit POI details (multi-language)
- Image upload & management
- Content enrichment trigger
- Tier score calculation
- Deactivation workflow (30-day grace)

### Q&A Approval Workflow
- Pending Q&A queue
- Approve/reject with reason
- Edit before approval
- Bulk actions
- Language filter

### System Dashboard
- 35 scheduled jobs status
- Cost controller metrics
- Health check results
- Error logs (Bugsink)
- Agent activity

---

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## Deployment

### Via GitHub Actions
- `dev` -> admin.dev.holidaibutler.com
- `test` -> admin.test.holidaibutler.com
- `main` -> admin.holidaibutler.com

---

## Gerelateerde Documentatie

- [CLAUDE.md](../CLAUDE.md) - Project context
- [Platform Core](../platform-core/READMEFIRST.md) - Backend API

---

## Contact

- **Eigenaar**: Frank Spooren (info@holidaibutler.com)
- **Bugs**: GitHub Issues
