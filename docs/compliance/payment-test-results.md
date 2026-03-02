# Payment Test Matrix — HolidaiButler
## Uitgevoerd: 02-03-2026
## Omgeving: TEST (Adyen ADYEN_ENVIRONMENT=TEST)

### Voorvereisten
- Adyen test merchant account: geconfigureerd (ADYEN_MERCHANT_ACCOUNT in .env)
- Test API keys: geconfigureerd (ADYEN_API_KEY, ADYEN_CLIENT_KEY, ADYEN_HMAC_KEY in .env)
- Adyen environment: TEST (bevestigd via .env check)
- Frontend Drop-in: Vereist browser-interactie voor iDEAL/Card flows

### BLOKKERENDE OPMERKING

Adyen Drop-in/Components vereist een browser-based frontend voor betalingsflows (iDEAL redirect, Card form, 3DS challenge). Deze tests kunnen NIET via curl/CLI worden uitgevoerd. De test scenarios zijn gedocumenteerd voor toekomstige handmatige E2E testing wanneer de customer-portal frontend live is.

Webhook-gerelateerde tests (11-15) en session/timeout tests (16-17) zijn WEL verifieerbaar via code review en zijn hieronder gedocumenteerd.

## Test Scenario's

### 2.1 iDEAL Transacties (primaire betaalmethode NL)
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 1 | iDEAL succes | Selecteer iDEAL → test bank → confirm | payment_transactions.status = 'captured', webhook ontvangen | BLOCKED | Vereist Adyen Drop-in frontend |
| 2 | iDEAL geannuleerd | Selecteer iDEAL → test bank → cancel | status = 'cancelled', inventory/slot released | BLOCKED | Vereist Adyen Drop-in frontend |
| 3 | iDEAL pending | Selecteer iDEAL → test bank → pending | status = 'pending', inventory reserved | BLOCKED | Vereist Adyen Drop-in frontend |

### 2.2 Credit Card Transacties
| # | Scenario | Test Kaart | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 4 | Card succes | 4111 1111 1111 1111 | status = 'captured' | BLOCKED | Vereist Adyen Drop-in frontend |
| 5 | Card 3DS challenge | 4212 3456 7890 1237 | 3DS challenge → authenticatie → captured | BLOCKED | Vereist Adyen Drop-in frontend |
| 6 | Card decline | 4000 0000 0000 0002 | status = 'refused', error_code aanwezig | BLOCKED | Vereist Adyen Drop-in frontend |
| 7 | Card insufficient funds | 4000 0000 0000 0036 | status = 'refused', reason = 'Insufficient funds' | BLOCKED | Vereist Adyen Drop-in frontend |

### 2.3 Refund Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 8 | Full refund | Admin: refund op captured transactie | status = 'refunded', payment_refunds record aangemaakt | BLOCKED | Vereist eerst een captured transactie |
| 9 | Partial refund | Admin: partial refund (50%) | status = 'partially_refunded', correct bedrag in refund record | BLOCKED | Vereist eerst een captured transactie |
| 10 | Refund failed payment | Admin: refund op niet-captured | Error: kan niet refunden, 400 response | BLOCKED | Vereist eerst een captured transactie |

### 2.4 Webhook Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 11 | Webhook AUTHORISATION | Adyen stuurt AUTHORISATION notification | payment_transactions record bijgewerkt | VERIFIED (code) | adyenService.js:192+ — verifyHMACSignature + handleWebhook case 'AUTHORISATION' |
| 12 | Webhook CANCELLATION | Adyen stuurt CANCELLATION notification | status bijgewerkt, inventory/slot released | VERIFIED (code) | handleWebhook case 'CANCELLATION' releases inventory |
| 13 | Webhook REFUND | Adyen stuurt REFUND notification | payment_refunds record aangemaakt/bijgewerkt | VERIFIED (code) | handleWebhook case 'REFUND' creates refund record |
| 14 | Duplicate webhook | Zelfde notification 2x sturen | Idempotent verwerking, geen duplicate records | VERIFIED (code) | Idempotency via PSP reference unique check |
| 15 | Invalid HMAC webhook | Notification met verkeerde HMAC | 401 Unauthorized, niet verwerkt | VERIFIED (code) | verifyHMACSignature returns false → 401 response + crypto.timingSafeEqual |

### 2.5 Session/Timeout Scenario's
| # | Scenario | Test Actie | Verwacht Resultaat | Status | Notities |
|---|----------|-----------|-------------------|--------|----------|
| 16 | Session expired | Start checkout → wacht > 15 min | Session expired, inventory released, BullMQ job verified | VERIFIED (code) | ticketingService.js:226 — expires_at = NOW() + 15min. BullMQ `release-expired-ticket-reservations` job runs every minute |
| 17 | Browser close | Start checkout → sluit browser | Na 15 min: session expired via BullMQ cleanup | VERIFIED (code) | inventoryService.js:197 — `expires_at < NOW()` query in releaseExpiredReservations() |

## Samenvatting
| Categorie | Tests | PASS | BLOCKED | VERIFIED (code) |
|-----------|-------|------|---------|-----------------|
| iDEAL | 3 | 0 | 3 | 0 |
| Credit Card | 4 | 0 | 4 | 0 |
| Refund | 3 | 0 | 3 | 0 |
| Webhook | 5 | 0 | 0 | 5 |
| Session/Timeout | 2 | 0 | 0 | 2 |
| **Totaal** | **17** | **0** | **10** | **7** |

## Conclusie

- **10 tests BLOCKED**: Vereisen Adyen Drop-in frontend (browser-interactie) voor iDEAL, Card, en Refund flows. Het TEST environment is correct geconfigureerd (ADYEN_ENVIRONMENT=TEST) — tests kunnen worden uitgevoerd zodra customer-portal frontend live is.
- **7 tests VERIFIED via code review**: Webhook handling (HMAC verificatie, idempotency, alle event types) en session timeout mechanisme zijn correct geïmplementeerd en verifieerbaar in code.

**Actie vereist**: Handmatige E2E testing via browser wanneer customer-portal frontend operationeel is. De 10 BLOCKED tests moeten dan alsnog worden uitgevoerd en dit document bijgewerkt.

*Audit datum: 02-03-2026 | Auditor: Claude Code (automated) | Review: Frank Spooren*
