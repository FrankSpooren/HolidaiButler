# Fase B Multi-Tenant Scale Command

> **Versie**: 1.0
> **Datum**: 14 mei 2026
> **Eigenaar**: Frank Spooren
> **Status**: ACTIEF — referentie voor alle Claude Code sessies post-v4.93.0
> **Classificatie**: Strategisch / Vertrouwelijk

## Strategische Context

**USP positionering** (bewaken bij elke beslissing):
- **100% EU-First infrastructure** — NOOIT US-vendors voor kerncapaciteit. Geaccepteerde stack: Hetzner DE (server+DB), Mistral FR (LLM), MailerLite LT (email), Simple Analytics NL, SISTRIX DE (SEO), Bugsink NL (monitoring), Threema CH (alerts). ChromaDB Cloud monitor — vervang zodra EU-alternatief productie-rijp is.
- **Tourism content automation niche** — optimaliseer voor POI/Event/Brand workflows. NOOIT generiek "social media tool". Destination-aware altijd.

**Verplichte skills per sessie** (gerefereerd in MEMORY.md):
- `ops` skill bij elke sessie-start + vóór elke taak
- `quality` skill bij code-write of content-creatie
- `ux` skill bij UI-componenten of user flows

**Bindend werkprotocol**: `CLAUDE.md § Stream Timeout Prevention` (1 taak tegelijk, max 150 regels per file, fresh session bij 20+ tool-calls).

## Scope — 3 Tracks, 7 Work-Blokken

| Track | Doel | Blok | Versie |
|-------|------|------|--------|
| T1 — Fase A Residual Gaps | Workflow sealing | Blok 1 | v4.94 |
| T2 — Multi-Tenant Scale | 50-destination schaalbaarheid | Blok 2-5 | v4.95-v5.0 |
| T3 — UX & Compliance Excellence | Boven-minimum EU AI Act | Blok 6-7 | v4.94-v4.96 |

---

## Blok 1: Workflow Sealing (v4.94) — FASE A RESIDUAL

**Doel**: alle FSM-bypasses dichten + publish-betrouwbaarheid op platform-niveau.

**Items in scope**:
- 1.1 **Graph API publish-confirmation** — na elke `publishItem`: Facebook/Instagram Graph API GET op postId → verifieer post bestaat. Indien niet → status='failed' + publish_error. Voorkomt DB-vs-werkelijkheid divergentie (root cause Bosma duplicate-publish incident 14 mei).
- 1.2 **FSM gateway uitbreiden** — refactor 5 endpoints naar `transitionStatus()`: PATCH /items/:id, POST /schedule, DELETE /schedule, POST /auto-schedule, POST /bulk/schedule, POST /publish-now.
- 1.3 **Stap 2 buttons FSM-driven** — `Publiceer alle` + `Plan alle in` gebruiken `getAvailableActions().canPublish/canSchedule`.
- 1.4 **Backup files cleanup** — verwijder `.bak.*` uit productie source tree → naar `/backups/v4.86-v4.93/`.
- 1.5 **End-to-end test 16 mei 10:00 UTC** — verifieer items 248+249 publiceren autonoom + posts live op FB/IG.
- 1.6 **Provenance audit monitoring** — alert wanneer `ai_generation_log` write 3x op rij faalt.

**Acceptance criteria** (alle checkmarks vereist vóór deploy main):
- [ ] `grep -r "UPDATE content_items.*approval_status" src/routes/` toont 0 direct-UPDATE (alleen via transitionStatus())
- [ ] Graph API confirm op alle 4 publishItem-callsites
- [ ] Stap 2 buttons schakelen automatisch enabled/disabled per FSM state
- [ ] `find src -name '*.bak.*'` returnt 0 resultaten
- [ ] 16 mei 10:15 UTC: published_at gevuld + posts visueel verified op Facebook+Instagram
- [ ] PM2 logs zonder audit-write-errors gedurende 24u

**USP-impact**: Tourism-content betrouwbaarheid (geen mislukte event/POI promoties). EU AI Act audit-compleetheid.

**Risico**: LAAG (additief, FSM bestaat al).

**Rollback**: per item via `.bak.*` of `git revert <commit>`.

**Effort**: 3-4 uur.

**Approval Gate 1**: Frank go vóór start. Acceptance verificatie vóór main deploy.

---

## Blok 2: Real-Time Frontend State (v4.95) — TanStack Query + WebSocket

**Doel**: Multi-user concurrent editing zonder state corruption (Frank punt 4: "100% werkelijke use-case op korte termijn").

**Items**:
- 2.1 **TanStack Query installatie** — `useMutation` met `onMutate` (optimistic) + `onError` (automatic rollback) + `onSettled` (invalidate)
- 2.2 **WebSocket real-time push** — broadcast state-changes naar alle subscribers van concept (via NATS+Socket.IO, Foundation Fase 15 stack)
- 2.3 **Per-tenant query partitioning** — destination_id in alle `queryKeys: ['concept', destId, conceptId]`

**Acceptance**:
- [ ] Approve-actie geen state-flicker (optimistic correct, geen demotion van scheduled items)
- [ ] 5 concurrent admins binnen 1 destination zien elkaars wijzigingen <2s
- [ ] Cache invalidation via NATS `content.{tenant}.{event}` subjects
- [ ] React Query DevTools beschikbaar in admin dev/test

**USP-impact**: Tourism marketing teams (Lions Club, hotel-keten, gemeente-toerisme) kunnen multi-user samenwerken — concurrentievoordeel vs Buffer/Hootsuite.

**Risico**: MIDDEL (frontend refactor raakt elke mutation).

**Rollback**: Feature flag `frontend.tanstack_query.enabled` per destination.

**Effort**: 6-8 uur.

**Approval Gate 2**: Frank go vóór start. Per-destination beta-test vóór platform-breed.

---

## Blok 3: Backend FSM Productisering (v4.96) — XState + Domain Events

**Doel**: Per-tenant workflow customization geactiveerd (workflow_configurations migration 009 reeds geseeded).

**Items**:
- 3.1 **XState migratie** — vervang ad-hoc `approvalStateMachine.js` met formal XState machine. Visualizable state charts via @xstate/inspector + statelyai.com.
- 3.2 **workflow_configurations activatie** — load per-tenant TRANSITIONS uit DB. Beta: BUTE 1-step approve vs corporate tenant 3-step (legal → marketing → CEO).
- 3.3 **Domain Events via NATS** — emit `content.{tenant}.approved/scheduled/published` events. Foundation Fase 15 NATS JetStream reeds beschikbaar.
- 3.4 **Per-tenant webhook dispatcher** — Slack/Zapier consumer voor Domain Events.

**Acceptance**:
- [ ] XState chart visualizable via @xstate/inspector
- [ ] Per-tenant workflow.transitions in DB werkt (BUTE 1-step + WarreWijzer 2-step beta)
- [ ] NATS subjects `content.{tenant}.{event}` actief
- [ ] Webhook delivery 99% binnen 5s naar custom endpoints

**USP-impact**: Enterprise tourism brands customizen eigen approval-flows. Schaalbaar tot 50 destinations.

**Risico**: MIDDEL-HOOG (raakt content workflow kern).

**Rollback**: `workflow_configurations.enabled=FALSE` per destination → fallback hardcoded TRANSITIONS.

**Effort**: 10-12 uur.

**Approval Gate 3**: Frank go vóór start. Per-tenant beta-test verplicht.

---

## Blok 4: Delayed Publishing Precision (v4.97)

**Doel**: Exacte publicatie-timing per scheduled_at moment (geen 15-min polling-vertraging meer).

**Items**:
- 4.1 **BullMQ delayed-jobs per item** — bij `/schedule`: `queue.add('content-publish-item', {itemId}, {delay: msUntilScheduledAt, jobId: \`publish-${itemId}\`})`
- 4.2 **Reschedule = remove + add** — bij `/reschedule`: `queue.remove(oldJobId)` + add nieuwe delayed job
- 4.3 **15-min polling als safety-net** — behoud `processScheduledPublications` cron voor orphaned items (publish_url NULL + scheduled_at >1u past)

**Acceptance**:
- [ ] Post live binnen 60s van scheduled_at moment (vs huidige max 15min)
- [ ] Reschedule actie verplaatst delayed job correct (geen duplicate posts)
- [ ] Safety-net detecteert orphaned items en publiceert binnen 1u
- [ ] Dedupe-guard + future-schedule-guard blijven actief

**USP-impact**: Tourism event-content live op exact gewenst moment (event-launches, deadlines). Industry-standard precision.

**Risico**: LAAG-MIDDEL (fallback polling blijft draaien).

**Rollback**: Feature flag `publisher.delayed_jobs_enabled=FALSE` → fallback 15-min polling.

**Effort**: 3-4 uur.

**Approval Gate 4**: Frank go vóór start.

---

## Blok 5: Content Caching & Performance (v4.98)

**Doel**: Schaal voor 50 destinations + 5000 items/week (CLAUDE.md groeiroadmap).

**Items**:
- 5.1 **Redis cache per tenant** — concept-listings + content-listings warmed + invalidation via NATS events (Blok 3 dependency)
- 5.2 **Database read replica** — PostgreSQL/MySQL replica voor analytics queries (Master Strategie § D Roadmap)
- 5.3 **TanStack Query stale-while-revalidate** — instant UI + background fresh fetch (Blok 2 dependency)

**Acceptance**:
- [ ] Content-list P95 latency <100ms (was ~500ms)
- [ ] Concept-detail load <200ms
- [ ] Read replica 0 master-load voor analytics queries
- [ ] Cache hit-rate >80% in productie

**USP-impact**: Tourism platform schaalbaarheid in piek-momenten (zomerseizoen, evenement-launches massale content publishing).

**Risico**: MIDDEL (Redis-failure modes, replica lag).

**Rollback**: Cache uitschakelen via feature flag per layer.

**Effort**: 8-10 uur.

**Approval Gate 5**: Frank go vóór start.

---

## Blok 6: Reviewer Quality UX (v4.94/v4.95)

**Doel**: Reviewer kan AI-output kwaliteit visueel beoordelen — boven-minimum EU AI Act compliance.

**Items**:
- 6.1 **Hover-citations per zin** — semantic highlighting in ConceptDialog editor: hover op zin >20 chars → tooltip met bron uit `provenance.source_ids`
- 6.2 **AI Quality Dashboard UI** — frontend page op `/admin-portal/ai-quality` (endpoint LIVE v4.90). Per destination: hallucination rate trend (30/90 dagen), ungrounded entities top-10, retry-rate metrics

**Acceptance**:
- [ ] Hover-tooltip werkt op zinnen >20 chars
- [ ] Dashboard grafiek trends laatste 30/90 dagen
- [ ] Per-destination drill-down + export naar CSV

**USP-impact**: EU AI Act Article 50 transparantie boven minimum-compliance. Marketingvoordeel voor B2B tourism prospects.

**Risico**: LAAG (read-only features).

**Effort**: 5-6 uur.

**Approval Gate 6**: Frank go.

---

## Blok 7: EU AI Act Provenance UI (v4.95)

**Doel**: Auditeerbare provenance signature zichtbaar in admin UI — regulatory inspection-ready.

**Items**:
- 7.1 **Provenance panel in ConceptDialog** — toon `provenance` JSON metadata: signature, model, source_ids, generated_at, validation_result, tamper-status
- 7.2 **Export provenance** — PDF audit-report per content_item voor regulatory inspecties (NL Autoriteit Persoonsgegevens, EU AI Act inspectie)
- 7.3 **Provenance verify endpoint** — POST `/content/items/:id/verify-provenance` → returns valid/tampered status (gebruikt `verifyProvenance()` reeds aanwezig in provenanceService)

**Acceptance**:
- [ ] Reviewer ziet provenance metadata per item in panel
- [ ] PDF export getest met BUTE audit (signature visible, sources cited)
- [ ] Tamper-detection: modify content → signature mismatch detected + reviewer alert

**USP-impact**: 100% compliance excellence — verkoopargument voor enterprise tourism brands met regulatory scrutiny (overheids-toerisme, beursnoteerde hotel-ketens).

**Risico**: LAAG.

**Effort**: 6-7 uur.

**Approval Gate 7**: Frank go.

---

## Dependencies + Aanbevolen Volgorde

```
Blok 1 (Workflow Sealing) ──┐
                            ├─→ vereist vóór Blok 4 (delayed publishing)
Blok 6 (Reviewer UX) ───────┘  (FSM gateway compleet)

Blok 2 (TanStack Query) ────┐
                            ├─→ vereist vóór Blok 5 (caching layer)
Blok 3 (FSM Productize) ────┘  (Domain Events foundation)

Blok 4 (Delayed Publish) — onafhankelijk
Blok 7 (Provenance UI) — onafhankelijk
```

**Aanbevolen sequencing**:
1. Blok 1 (Workflow Sealing) — eerst, dicht resterende gaps
2. Blok 6 (Reviewer UX) — parallel mogelijk met Blok 1
3. Blok 4 (Delayed Publishing) — na Blok 1
4. Blok 7 (Provenance UI) — parallel met Blok 4
5. Blok 2 (TanStack Query) — vóór Blok 3 + 5
6. Blok 3 (FSM Productisering) — vóór Blok 5
7. Blok 5 (Performance) — laatst

## Hoe deze command gebruiken (per sessie)

In jouw command-prompt naar Claude:

> "Pak Blok 1 op uit `docs/strategy/Fase_B_Multi_Tenant_Scale_Command.md`"

Voor specifiek item:
> "Implementeer Blok 1.2 (FSM gateway uitbreiden) conform Fase_B Command"

Voor parallel:
> "Werk parallel aan Blok 6.1 (hover-citations) en Blok 4.1 (delayed jobs)"

## Cross-references

- `CLAUDE.md` § Strategische Roadmap (verwijst naar dit document)
- `CLAUDE.md` § Stream Timeout Prevention (bindend per sessie)
- `MEMORY.md` § ANTI-PATTERN REGISTER (6-punts enterprise checklist verplicht)
- `HolidaiButler_Master_Strategie.md` § Deel 4.8 Content Workflow Architecture Patterns
- `/skills/ops` — verplicht bij sessie-start
- `/skills/quality` — bij code/content
- `/skills/ux` — bij UI-werk

## Approval Gate Sign-Off Template

Per Blok: na acceptance criteria 100% verified, Frank signeert:

```
Blok: __
Versie: __
Datum: __
Acceptance: ✓ alle criteria voldaan
Frank: ✓ goedgekeurd voor main deploy
```

Geen Blok start zonder Approval Gate sign-off van vorige work-block.
