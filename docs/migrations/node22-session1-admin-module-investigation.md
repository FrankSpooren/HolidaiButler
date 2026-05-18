# Node 22 Migration — Sessie 1 Pre-werk: admin-module/backend Onderzoek

**Datum**: 2026-05-18
**Sessie**: FASE B Uitvoer Sessie 1 (pre-werk)
**Plan-referentie**: NODE-22-MIGRATION-PLAN.md §10.1
**Branch**: `feature/node22-session1-prework-2026-05-18`
**Doel**: bepalen of `admin-module/backend` (PM2 id 2, status `stopped`) wordt meegenomen in Wave 2 (Scenario B) of permanent verwijderd (Scenario A).

---

## 1. Inventaris admin-module/backend

| Aspect | Waarde |
|---|---|
| Versie | 2.0.0 |
| Top-level deps | 15 (Express, Sequelize, mysql2, ioredis, JWT, bcryptjs, helmet, multer, winston, express-rate-limit, express-validator, morgan, dotenv, uuid, cors) |
| Native bindings | **0** (geen sharp/profiling/Rust) |
| Code mtime | 2026-04-10 (~5 weken stale t.o.v. peildatum) |
| `node_modules` mtime | 2025-12-10 (~5 maanden oud) |
| PM2 status | `stopped` |
| PM2 restart-total | 1 (alleen initial start, niet operationeel actief) |
| Route files | 14 (`adminAuth.js`, `adminPOI.js`, `adminAgenda.js`, `adminEvents.js`, `adminBookings.js`, `adminReservations.js`, `adminTickets.js`, `adminTransactions.js`, `adminUpload.js`, `adminUsers.js`, `adminPlatform.js`, `monitoring.js`, `customerAuth.js`, `publicPOI.js`) |
| Mount-paths | `/api/admin/*` (12 sub-paths) + `/api/v1/auth` + `/api/v1/pois` (customer-facing) |
| Models | 13 (AdminUser, AgendaDates, Agenda, Booking, Event, PlatformConfig, POIImportHistory, POI, Reservation, Ticket, Transaction, User + index.js) |

## 2. Cross-check platform-core

| Mount-path | Platform-core equivalent | Vervangen? |
|---|---|---|
| `/api/admin/auth` | `/api/v1/admin-portal/auth` (in `adminPortal.js` of via `adminAuth` middleware in platform-core) | Ja |
| `/api/admin/pois` | `/api/v1/admin-portal/pois/*` (in `adminPortal.js` — 323 totaal endpoints) | Ja |
| `/api/admin/agenda` | `/api/v1/admin-portal/agenda/*` of via `agenda-module` | Ja |
| `/api/admin/upload` | `/api/v1/admin-portal/upload/*` | Ja |
| `/api/admin/platform` | `/api/v1/admin-portal/platform/*` | Vermoedelijk ja |
| `/api/admin/users` | `/api/v1/admin-portal/users/*` | Ja |
| `/api/admin/events` | `/api/v1/admin-portal/events/*` (te verifieren) | Onbekend |
| `/api/admin/reservations` | `reservations-module/` + `/api/v1/admin-portal/reservations/*` | Ja |
| `/api/admin/tickets` | `ticketing-module/` + `/api/v1/admin-portal/tickets/*` | Ja |
| `/api/admin/bookings` | `/api/v1/admin-portal/bookings/*` | Vermoedelijk ja |
| `/api/admin/transactions` | `/api/v1/admin-portal/transactions/*` | Vermoedelijk ja |
| `/api/admin/monitoring` | `monitoring.js`-equivalent in platform-core | Ja |

**Bevestiging**: platform-core mountt `/api/v1/admin-portal/*` (323 endpoints in `adminPortal.js`) + `/api/v1/admin-portal/brand-sources/*`. Geen `/api/admin/*` mount in platform-core (uitgezonderd `/api/admin/images/refresh`).

## 3. DB-tabel overlap-analyse

Grep over `platform-core/src/`, `agenda-module/src/`, `ticketing-module/`, `reservations-module/` op SQL queries (`FROM|JOIN|INTO|UPDATE` + tabelnaam):

| Tabel | Refs in andere modules | Status |
|---|---|---|
| `admin_users` | 40 | Hoog overlap — platform-core gebruikt auth-tabel |
| `POI` | 210 | Massaal gebruik elders |
| `reservations` | 39 | Reservations-module + platform-core admin-portal |
| `agenda` | 32 | Agenda-module gebruikt actief |
| `agenda_dates` | 21 | Agenda-module |
| `tickets` | 16 | Ticketing-module + admin-portal |
| `users` | 16 | Platform-core auth |
| `transactions` | 6 | Marginaal gebruik elders |
| `bookings` | 5 | Marginaal gebruik elders |
| `events` | **0** | **Wees** — geen actieve consumer |
| `platform_config` | **0** | **Wees** — geen actieve consumer |
| `POI_ImportExportHistory` | **0** | **Wees** — geen actieve consumer |

## 4. Apache routing-check

- Geen `ProxyPass`-statement naar admin-module poort/socket gevonden in `/etc/apache2/sites-enabled/*.conf`
- `/var/log/apache2/api.holidaibutler.com-access.log` toont geen `/api/admin/<route>` verkeer
- **Conclusie**: admin-module is niet bereikbaar van buiten via Apache reverse proxy

## 5. Verdict — Scenario A onderbouwd

| Criterium | Bewijs voor A (verwijderen) | Bewijs voor B (meenemen Wave 2) |
|---|---|---|
| PM2 status | Stopped + 1 restart total | — |
| Externe bereikbaarheid | Apache routeert niet | — |
| Code-versheid | mtime 5 weken oud, deps 5 maanden oud | — |
| Endpoint-migratie | 9 van 12 mount paths gedekt door `/api/v1/admin-portal/*` | 3 paths (events/bookings/transactions) onzeker |
| Tabel-isolatie | Alleen 3 wees-tabellen (events, platform_config, POI_ImportExportHistory) — kandidaat voor archive | 3 wees-tabellen kunnen restdata bevatten |
| Native bindings | 0 (geen Node 22 rebuild-overhead bij verwijderen) | — |

**Aanbeveling**: **Scenario A** — `git rm -r admin-module/backend/` + remove uit toekomstige `ecosystem.config.js` Wave 2 + commit `chore(cleanup): permanent verwijderen admin-module/backend (gemigreerd naar /api/v1/admin-portal/*)`. Wave 2 wordt skip.

**Pre-condities voor Scenario A uitvoer** (vóór Wave 2):
1. Verifieer met 3 directe DB-queries dat de wees-tabellen `events`, `platform_config`, `POI_ImportExportHistory` ofwel leeg zijn ofwel hun rijen elders worden gemirrored. Bij niet-leeg + niet-gemirrored: archive-script schrijven vóór `git rm`.
2. Frank bevestigt dat `admin-module/backend/.env` geen unieke productie-credentials bevat die niet elders zijn opgenomen.
3. Backup `admin-module/backend/` tar.gz naar `/root/backups/2026-05-18-node22-session1/admin-module-backend.tar.gz` vóór `git rm`.

## 6. Implicatie voor Wave-volgorde

Plan §5.2 Wave 2 (conditioneel `admin-module/backend` cutover, 0–1.5u): **wordt skip**. Effort-totaal Sessie 3 wordt ~25u i.p.v. ~26.5u (range uit plan §7.1).

Wave-volgorde post-skip:
- Wave 1: `holidaibutler-agenda` (24u soak)
- ~~Wave 2: admin-module~~ (skip)
- Wave 3: `holidaibutler-ticketing` (48u soak)
- Wave 4: `hb-websites` (24u soak)
- Wave 5: `platform-core` atomic (72u soak)

## 7. Onzekerheden voor Frank's review

1. `/api/admin/events` heeft 0 tabel-refs in andere modules. Kan duiden op (a) volledig dood feature of (b) data die nooit gemigreerd is. Te verifieren via `SELECT COUNT(*) FROM events`.
2. `platform_config` 0 refs in andere modules — riskant indien runtime-config hieruit gelezen wordt door niet-gemoduleerde scripts. `grep -rE "platform_config" /var/www/api.holidaibutler.com/ --include='*.js'` aanbevolen voor full-tree scan.
3. `POI_ImportExportHistory` 0 refs in andere modules — vermoedelijk historische audit-tabel zonder consumer.

Deze 3 onzekerheden zijn **lichte verificatie-vragen vóór Scenario A uitvoer** in Wave 2-window — geen blocker voor Sessie 1 pre-werk afronden.
