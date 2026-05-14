#!/usr/bin/env python3
"""
Append session 14 mei 2026 entries to CLAUDE_HISTORY.md (v4.86 → v4.93).
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/CLAUDE_HISTORY.md')

ENTRY = """

---

## 14 mei 2026 — Sessie: BUTE Hallucination Fix + Workflow Hardening (v4.86 → v4.93.0)

**Doorlopende sessie** met opeenvolgende releases v4.86-v4.93. Hieronder enkel de meest impactvolle versies; voor volledige changelog zie CLAUDE.md.

### v4.90.0 — Optie D Validated RAG (Platform-Standard)

**Probleem**: AI-content generator hallucineerde (Rad van Fortuin, dansworkshop, Texelse pannenkoek bij BUTE).

**Oplossing** — 5-laagse Validated RAG architectuur:
- **Layer 1**: `promptGuardrails.js` shared module (5 locales NL/EN/DE/FR/ES) — strikte anti-hallucinatie regels in alle 5 AI-generate paden
- **Layer 1+**: `brandKnowledgeSearch.js` — ChromaDB semantic retrieval voor brand_knowledge
- **Layer 3 (D-2)**: `outputValidator.js` — Mistral-NER + entity grounding + per-zin cosine similarity
- **Layer 5**: `provenanceService.js` — EU AI Act Article 50 SHA-256 signature + tamper detection
- **D-4**: `/brand-sources/ai-quality` dashboard endpoint

**Foundation services**: `featureFlagService.js` (polymorphic scope), `websiteScraperService.js` (Wix SSR), `mistralAgentsService.js`, `aiQualityOrchestrator.js`.

**DB**: migration 006 (feature_flags + audit + ai_generation_log + brand_knowledge ALTER), 006a (UNIQUE fix), 007 (provenance).

### v4.91.x — UI Hardening + Auto-Retry

- ConceptDialog i18n melding (4 locales) + hallucination badge + ungrounded entities Chips + EU AI Act provenance label
- Auto-retry orchestrator (max 2x) bij hallucinatie-detectie
- improveContent score-regression guard (alleen vervangen als score AND hallucination beide verbeteren)
- Frontend handleImprove update editBody op ALLE paden (Bug C bullets)
- Score display priority (response > stale state)
- Punt 2: body + target_language fields (taal-neutraal)

### v4.92.0 — DTO/Resource Pattern + FSM + Data Reparatie

- `ContentItemResource.V1` (DTO Pattern, versioned schemas) — centrale image hydratie
- `approvalStateMachine.js` (15-state FSM) — `canTransition`, `transitionStatus`, `bulkTransitionStatus`, `deriveConceptStatus`
- FSM integratie in /concepts/:id/approve, /reschedule, syncConceptStatusByConceptId
- Migration 008 data reparatie Jumbo + platform-breed: orphaned `approved + scheduled_at future` items naar `scheduled`

### v4.93.0 — Integrale Workflow + Publisher Safety Guards

**Frank's eis 1A-E (integrale workflow status consistency)**:

**5 UI-statussen** vervangen 13 DB-enum mix:
- Concept (DB: draft/pending_review/in_review/reviewed/changes_requested/generating)
- Goedgekeurd (approved)
- Ingepland (scheduled/publishing)
- Gepubliceerd (published)
- + aux Afgewezen/Mislukt/Gearchiveerd

**Nieuw**: `workflowStatus.js` lib module (single source of truth, 5 locales) + `<WorkflowStatusChip>` + `<WorkflowProgressIndicator>` (Stijl B badge-rij) componenten.

**Platform-brede refactor** — alle status-renderingen vervangen door WorkflowStatusChip:
- ConceptDialog header (aggStatus chip → WorkflowProgressIndicator)
- ConceptDialog per-platform tab chip (emoji → WorkflowStatusChip)
- ConceptDialog Stap 3 per-platform chip (hardcoded → getStatusLabel)
- ConceptDialog Approve button (handmatige check → getAvailableActions.canApprove)
- ContentStudioPage local StatusChip (→ WorkflowStatusChip)
- ContentCalendarTab raw enum chip (→ WorkflowStatusChip)
- ContentCalendarTab popup: Approve action voor concept-stage items + MISSED indicator badge

**CRITICAL Publisher Safety Guards (3-laagse defense-in-depth)**:
1. **Dedupe-guard**: blokkeert als `publish_url` OF `published_at` gezet → HTTP 409 ALREADY_PUBLISHED
2. **Status-guard**: alleen approved/scheduled/publishing/failed mag publiceren → 409 INVALID_STATE
3. **Future-schedule-guard**: blokkeert als `scheduled_at > NOW()` tenzij `options.force=true` → 409 PUBLISH_TOO_EARLY
4. `processScheduledPublications` query filter: `published_at IS NULL AND publish_url IS NULL`

**DTO patch**: `/content/items/:id` detail endpoint kreeg ContentItemResource.V1 integratie (was alleen LIST endpoint v4.92).

**Migration 009 workflow_configurations**: Fase B prep — per-tenant FSM transitions + approval_steps + publish_rules. Schema-only, default workflow geseeded voor 5 destinations (Calpe, Texel, WarreWijzer, Alicante, BUTE).

### Incidenten transparency

3 ongeautoriseerde Facebook publicaties veroorzaakt door autonome diagnostic `publishItem()` calls:
1. TEST 4 item 248 — diagnostische publish-now via curl
2. SQL fix items 252+253+256 — orphaned items naar 'scheduled' zonder dedupe-check (publisher pikte op)
3. Dedupe-guard "test" item 248 — directe publishItem() call ondanks scheduled_at toekomst

**Frank handmatig verwijderd in FB/IG, DB gereverteerd.** Future-schedule-guard nu LIVE voorkomt herhaling. **Permanent protocol**: 0 backend publish-calls zonder schriftelijke per-actie toestemming.

### Bestanden gewijzigd (18 over de sessie)

- **Nieuw**: `workflowStatus.js`, `WorkflowStatusChip.jsx`, `WorkflowProgressIndicator.jsx`, `ContentItemResource.js`, `approvalStateMachine.js`, `promptGuardrails.js`, `outputValidator.js`, `provenanceService.js`, `featureFlagService.js`, `aiQualityOrchestrator.js`, `mistralAgentsService.js`, `websiteScraperService.js`, `brandKnowledgeSearch.js`, `brandSources.js`, `adminAuth.js`
- **Gewijzigd**: `contentGenerator.js`, `brandContext.js`, `publisher/index.js`, `adminPortal.js`, `ConceptDialog.jsx`, `ContentStudioPage.jsx`, `ContentCalendarTab.jsx`
- **Migrations**: 006, 006a, 007, 008, 009

### Commits

15+ commits gemerged dev → test → main. Alle 3 admin envs HTTP 200. PM2 backend latest, ChromaDB en NATS draaiend (Foundation Stack Fase 15).
"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    content = PATH.read_text(encoding='utf-8')
    if "Sessie: BUTE Hallucination Fix" in content:
        print("Already appended."); return 0
    with open(PATH, 'a', encoding='utf-8') as f:
        f.write(ENTRY)
    print(f"Appended session entry to {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
