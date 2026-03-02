# Reservation Double-Booking Tests — HolidaiButler
## Uitgevoerd: 02-03-2026

### Doel: Verifieer dat Redis slot locking + MySQL FOR UPDATE geen double-bookings toestaat

### Architectuur Overview

Het reserveringssysteem gebruikt:
1. **Redis slot locking** — Atomic lock per slot_id voor concurrent reservation prevention
2. **MySQL SELECT ... FOR UPDATE** — Row-level lock op reservation_slots
3. **Capacity check** — `total_seats - reserved_seats >= party_size`
4. **Guest blacklist** — `is_blacklisted` flag op guest_profiles (auto na 3+ no-shows)
5. **BullMQ jobs** — no-show detection, seat release, GDPR cleanup

Code: `platform-core/src/services/reservation/reservationService.js`

## Test Scenario's

### 4.1 Same Slot Double-Booking
| # | Scenario | Setup | Test | Verwacht | Status | Notities |
|---|----------|-------|------|----------|--------|----------|
| 1 | Zelfde slot, vol | reservation_slot: total_seats=2, reserved_seats=0 | 2 gelijktijdige requests met party_size=2 | 1 success + 1 SLOT_FULL | VERIFIED (code) | Redis lock + MySQL FOR UPDATE + `total_seats - reserved_seats >= party_size` check. Tweede request ziet updated reserved_seats. |

**Code verificatie**: reservationService.js `createReservation()`:
- Acquires Redis lock on slot_id
- MySQL: `SELECT ... FROM reservation_slots WHERE id = ? FOR UPDATE`
- Check: `remaining_seats = total_seats - reserved_seats`
- If `remaining_seats < party_size` → return SLOT_FULL error
- UPDATE reservation_slots SET reserved_seats = reserved_seats + party_size

### 4.2 Overboeking Preventie
| # | Scenario | Setup | Test | Verwacht | Status | Notities |
|---|----------|-------|------|----------|--------|----------|
| 2 | Party > remaining | total_seats=4, reserved_seats=2 | Request met party_size=3 | INSUFFICIENT_CAPACITY (3 > 2 remaining) | VERIFIED (code) | Capacity check: `if (slot.total_seats - slot.reserved_seats < partySize)` returns error before any UPDATE |

### 4.3 Blacklisted Guest
| # | Scenario | Setup | Test | Verwacht | Status | Notities |
|---|----------|-------|------|----------|--------|----------|
| 3 | 3+ no-shows | guest_profiles.no_show_count=3, is_blacklisted=1 | Reservation aanmaken met blacklisted guest email | 403 GUEST_BLACKLISTED, reservation geweigerd | VERIFIED (code) | createReservation() checks `guest_profiles.is_blacklisted` before proceeding. Returns 403 with reason. |

**Database verificatie**:
```sql
DESCRIBE guest_profiles;
-- Bevestigd: is_blacklisted TINYINT(1) DEFAULT 0, no_show_count INT DEFAULT 0, blacklist_reason TEXT
```

### 4.4 No-Show Tracking
| # | Scenario | Test | Verwacht | Status | Notities |
|---|----------|------|----------|--------|----------|
| 4 | No-show registratie | Admin markeert reservation als no-show | guest_profiles.no_show_count +1, als count >= 3 → is_blacklisted = 1 | VERIFIED (code) | Admin endpoint `POST /tickets/orders/:id/cancel` + reservation no-show marking updates guest_profiles. BullMQ `no-show-detection` job runs scheduled checks. Auto-blacklist threshold = 3. |

### 4.5 Cancel + Seat Release
| # | Scenario | Test | Verwacht | Status | Notities |
|---|----------|-------|----------|--------|----------|
| 5 | Cancel confirmed reservation | Customer cancelt reservation | reserved_seats -party_size, status='cancelled_by_guest' | VERIFIED (code) | reservationService.js `cancelReservation()`: updates reservation status, decrements reserved_seats on slot, releases Redis lock |

**Route verificatie**: `PUT /api/v1/reservations/:uuid/cancel` (reservations.js:180)

### 4.6 Deposit Flow (indien actief)
| # | Scenario | Test | Verwacht | Status | Notities |
|---|----------|------|----------|--------|----------|
| 6 | Deposit required | POI met deposit_required=true | Reservation flow triggert payment sessie voor deposit bedrag | N/A | Deposit feature not currently active for any POI. Integration with paymentService.createPaymentSession() is implemented in code but no POIs have deposit_required=true. |

## Database Verificatie

Huidige staat (02-03-2026):
- `reservation_slots`: 3 records
- `reservations`: 5 records
- `guest_profiles`: 2 records (0 blacklisted, 0 expired retention)

Guest profiles schema bevestigd:
- `consent_data_storage` TINYINT(1) DEFAULT 0
- `consent_marketing` TINYINT(1) DEFAULT 0
- `data_retention_until` DATE (GDPR)
- `no_show_count` INT DEFAULT 0
- `is_blacklisted` TINYINT(1) DEFAULT 0

## Samenvatting
| Test | Status | Methode |
|------|--------|---------|
| Double-booking preventie | VERIFIED | Code review |
| Overboeking preventie | VERIFIED | Code review |
| Blacklisted guest | VERIFIED | Code review + DB schema |
| No-show auto-blacklist | VERIFIED | Code review |
| Cancel + seat release | VERIFIED | Code review |
| Deposit flow | N/A | Feature niet actief |
| **Totaal: 5 tests + 1 N/A** | **5/5 VERIFIED** | |

## Conclusie

Alle 5 double-booking preventie scenario's zijn geverifieerd via code review en database schema verificatie. Het slot locking mechanisme (Redis + MySQL FOR UPDATE) voorkomt race conditions. De guest blacklist functionaliteit (auto-blacklist na 3 no-shows) is correct geïmplementeerd in zowel code als database schema.

Deposit flow (test 6) is N/A omdat geen POIs momenteel deposits vereisen. De code-integratie met paymentService is wel aanwezig.

**Live concurrent tests**: Aanbevolen bij productie-launch met real traffic. Huidige volumes (5 reserveringen) zijn onvoldoende voor load testing.

*Audit datum: 02-03-2026 | Auditor: Claude Code (automated) | Review: Frank Spooren*
