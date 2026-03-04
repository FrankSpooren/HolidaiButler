# Fase IV Feature Flag Activatieplan — Staged Rollout
## Datum: 04-03-2026
## Status: GEDOCUMENTEERD (activatie volgt na Fase IV sign-off)

---

## Overzicht Feature Flags

| Flag | Calpe | Texel | Alicante | Scope |
|------|-------|-------|----------|-------|
| hasBooking | true | false | false | Customer portal booking UI |
| hasTicketing | true | false | false | Ticket purchase flow |
| hasReservations | true | false | false | Reservation booking flow |
| hasChatToBook | true | false | false | Chatbot booking intents |
| hasGuestCheckout | true | false | false | Guest checkout (no account) |
| hasIntermediary | **false** | false | false | Intermediary transaction flow |
| hasFinancial | **false** | false | false | Financial settlement process |
| hasDeposits | false | false | false | Bewust uitgeschakeld |
| hasDynamicPricing | false | false | false | Bewust uitgeschakeld |

---

## 4-Weken Staged Rollout Plan

### Week 1: Test-omgeving
| Actie | Detail |
|-------|--------|
| **Omgeving** | admin.test.holidaibutler.com + api test mode |
| **Flags** | hasIntermediary=true, hasFinancial=true |
| **Test scope** | 10 test-transacties: alle 6 states doorlopen (voorstel→review) |
| **Validatie** | Admin dashboard KPIs, funnel chart, CSV export, settlement creatie |
| **Go/No-Go** | Alle 10 transacties succesvol + 0 errors in PM2 logs |

### Week 2: Productie Calpe — Observatie
| Actie | Detail |
|-------|--------|
| **Omgeving** | admin.holidaibutler.com (productie) |
| **Flags** | hasChatToBook=true (al actief sinds IV-0), hasIntermediary=false |
| **Doel** | Observeren dat chatbot booking intents correct werken zonder intermediary |
| **Validatie** | Chatbot logs: booking intents gedetecteerd, friendly fallback indien nodig |
| **Go/No-Go** | 0 chatbot errors, correct intent routing |

### Week 3: Productie Calpe — Intermediair Pilot
| Actie | Detail |
|-------|--------|
| **Omgeving** | admin.holidaibutler.com (productie) |
| **Flags** | hasIntermediary=true (ACTIVEREN) |
| **Scope** | 1 testpartner (met Frank's goedkeuring), max 5 echte transacties |
| **Validatie** | Volledige flow: voorstel→toestemming→bevestiging→delen→review + QR validatie |
| **Go/No-Go** | Partner feedback positief, 0 financial discrepancies, admin dashboard correct |

### Week 4: Evaluatie + Besluit
| Actie | Detail |
|-------|--------|
| **Review** | KPI analyse: conversieratio, gemiddeld transactiebedrag, partner tevredenheid |
| **Besluit Texel** | Op basis van Calpe resultaten: Texel uitrol ja/nee + timing |
| **hasFinancial** | Activeren zodra eerste settlement batch nodig is (verwacht: einde maand) |
| **Documentatie** | Resultaten vastleggen in compliance docs |

---

## Rollback Procedure

Bij kritieke issues tijdens Week 3:
1. `hasIntermediary=false` zetten in destination config
2. Bestaande transacties in 'voorstel' of 'toestemming' status: handmatig annuleren via admin portal
3. Bevestigde/gedeelde transacties: voucher blijft geldig, afwikkelen via handmatig proces
4. PM2 restart na config wijziging

---

## Verantwoordelijkheden

| Wie | Actie |
|-----|-------|
| **Frank** | Go/No-Go besluit per week, partner selectie Week 3 |
| **Claude** | Config wijzigingen, monitoring, documentatie |
| **Testpartner** | Feedback op flow, UX, communicatie |

---

## Afhankelijkheden

- Adyen E2E test PASS (bevestigd in IV-0)
- Admin portal live met IntermediaryPage (bevestigd in IV-E)
- Minimaal 1 partner met contract_status='active' in database
- PCI DSS + GDPR compliance items afgevinkt (dit document + addendum)
