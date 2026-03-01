# _archive — Legacy Standalone Modules

Gearchiveerd op 1 maart 2026 (Fase III).

Deze mappen bevatten de oorspronkelijke standalone microservices (CommonJS) die als
referentie dienden voor het porten van logica naar `platform-core/` (ESM, single-port 3001).

## Inhoud

| Map | Beschrijving | Geport naar |
|-----|--------------|-------------|
| `payment-module/` | Adyen payment microservice (poort 3004) | `platform-core/src/services/payment/` |
| `modules/payment-module/` | Duplicaat payment module | `platform-core/src/services/payment/` |
| `modules/ticketing-module/` | Ticketing microservice (poort 3005) | `platform-core/src/services/ticketing/` (Blok B) |
| `modules/agenda-module/` | Agenda microservice (poort 3006) | `platform-core/src/routes/agenda.js` (reeds actief) |
| `modules/reservations-module/` | Reserveringen microservice | `platform-core/src/services/reservation/` (Blok C) |

## Waarom gearchiveerd?

**Architectuurbeslissing Fase III**: Single-port architectuur in `platform-core` (poort 3001).
De standalone microservices (poorten 3004-3006) draaien NIET als aparte PM2 processen.
Alle business logic is geport van CommonJS naar ESM en geïntegreerd in platform-core.

## Status

- **NIET actief** — deze code wordt niet uitgevoerd
- **Alleen referentie** — raadpleeg voor oorspronkelijke business logic
- Kan veilig verwijderd worden zodra alle Blokken (A-F) compleet zijn
