#!/usr/bin/env python3
"""
Update Master Strategie:
1. Version bump 8.33 → 8.34
2. Add changelog entry sessie 14 mei 2026
3. Add Workflow Architecture Patterns section (Deel 4 of 8)
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/docs/strategy/HolidaiButler_Master_Strategie.md')

# Version bump
A1 = """**Datum**: 11 mei 2026
**Versie**: 8.33"""
R1 = """**Datum**: 14 mei 2026
**Versie**: 8.34"""

# Append to changelog (after | Versie | Datum | Wijzigingen | header row)
A2 = """| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **8.21**"""

R2 = """| Versie | Datum | Wijzigingen |
|--------|-------|-------------|
| **8.34** | **2026-05-14** | **Integrale Workflow Status + Publisher Safety Guards + Validated RAG (v4.86-v4.93.0)**. Doorlopende sessie. **v4.90.0 Optie D Validated RAG**: 5-laagse anti-hallucinatie architectuur (promptGuardrails 5 locales + brandKnowledgeSearch ChromaDB + outputValidator Mistral-NER + provenanceService SHA-256 EU AI Act + ai-quality dashboard). Foundation: featureFlagService polymorphic scope, websiteScraperService Wix SSR, mistralAgentsService EU fallback, aiQualityOrchestrator. **v4.91 UI Hardening**: ConceptDialog hallucination badge + ungrounded entities chips + auto-retry orchestrator + score-regression guard + handleImprove all paths body update. **v4.92.0 DTO/Resource + FSM + Data Reparatie**: ContentItemResource.V1 (versioned schemas Pattern Laravel API Resources/Spring DTOs), approvalStateMachine.js (15-state FSM, canTransition + transitionStatus gateway), migration 008 data reparatie Jumbo + platform-breed orphaned items. **v4.93.0 Integrale Workflow Status**: 5 UI-statussen (Concept/Goedgekeurd/Ingepland/Gepubliceerd + aux) vervangen 13 DB-enum mix. workflowStatus.js single source of truth (5 locales + colors + icons + FSM actions). WorkflowStatusChip + WorkflowProgressIndicator (Stijl B badge-rij). Platform-brede refactor: ConceptDialog header + per-platform chips + Stap 3 + Approve button (FSM-driven canApprove), ContentStudioPage local StatusChip delegated, ContentCalendarTab chip + popup Approve action + MISSED indicator. **CRITICAL Publisher Safety Guards 3-laags**: dedupe-guard (publish_url/published_at check), status-guard (alleen approved/scheduled/publishing/failed), future-schedule-guard (scheduled_at>NOW blokkeert tenzij force:true). **Migration 009 workflow_configurations** Fase B prep (per-tenant FSM transitions/approval_steps/publish_rules), default workflow seeded voor 5 destinations. **DB migrations**: 006/006a/007/008/009. **Incidenten**: 3 ongeautoriseerde FB publicaties veroorzaakt door autonome publishItem() calls — alle 3 door Frank verwijderd, future-schedule-guard live tegen herhaling. Permanent protocol: 0 backend publish zonder schriftelijke per-actie toestemming. CLAUDE.md v4.93.0. |
| **8.21**"""

# Add new section under Deel 4 Architectuur — Workflow Patterns
A3 = """## Deel 5: Lessons Learned"""

R3 = """### Deel 4.8: Content Workflow Architecture Patterns (v4.93.0)

**5 UI-statussen** (single source of truth via `admin-module/src/lib/workflowStatus.js`):

| UI-status | DB-enum mapping | Color | Stage |
|-----------|----------------|-------|-------|
| Concept | draft, pending_review, in_review, reviewed, changes_requested, generating | grey | 1 |
| Goedgekeurd | approved | green | 2 |
| Ingepland | scheduled, publishing | blue | 3 |
| Gepubliceerd | published | dark green | 4 |
| Afgewezen | rejected | red | 0 (terminal) |
| Mislukt | failed | orange | 3 (recovery) |
| Gearchiveerd | archived | grey | 4 (terminal) |

**Rendering pipeline**: ALLE status-displays in Content Studio gebruiken `<WorkflowStatusChip>` of `<WorkflowProgressIndicator>` (Stijl B badge-rij). Geen ad-hoc emoji/enum-string renderings meer.

**FSM Gateway** (`platform-core/src/services/approvalStateMachine.js`): 15-state TRANSITIONS matrix. `canTransition(from, to)`, `transitionStatus(itemId, newStatus, options)`, `bulkTransitionStatus`, `deriveConceptStatus`. Pattern: DDD Aggregate met Invariants.

**Publisher Safety Guards** (defense-in-depth 3-laags):
1. **Dedupe-guard**: blokkeer als `publish_url` OF `published_at` gezet → 409 ALREADY_PUBLISHED
2. **Status-guard**: alleen approved/scheduled/publishing/failed → 409 INVALID_STATE
3. **Future-schedule-guard**: scheduled_at > NOW() blokkeert tenzij `options.force=true` → 409 PUBLISH_TOO_EARLY

**Validated RAG** (anti-hallucination, Optie D — v4.90-v4.93):
- Layer 1: `promptGuardrails.js` (5 locales strikte regels)
- Layer 3: `outputValidator.js` (Mistral-NER + entity grounding + per-zin similarity)
- Layer 5: `provenanceService.js` (EU AI Act SHA-256 signature + tamper detection)

**Multi-tenant Workflow Configuration** (Fase B prep): `workflow_configurations` tabel (migration 009). Per-tenant FSM transitions + approval_steps + publish_rules. Default workflow geseeded voor alle 5 destinations. Activatie post-5e destination (lions club 1-step, corporate 3-step legal/marketing/CEO).

---

## Deel 5: Lessons Learned"""


def apply_patch(content, label, anchor, replacement):
    if replacement in content:
        return content, f"  {label}: already applied"
    count = content.count(anchor)
    if count == 0:
        return None, f"  {label}: FAIL anchor not found"
    if count > 1:
        return None, f"  {label}: FAIL anchor not unique ({count}x)"
    return content.replace(anchor, replacement, 1), f"  {label}: applied"


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    original = PATH.read_text(encoding='utf-8')
    content = original

    for label, anchor, replacement in [
        ('version-bump', A1, R1),
        ('changelog-append', A2, R2),
        ('workflow-patterns-section', A3, R3),
    ]:
        new_content, status = apply_patch(content, label, anchor, replacement)
        print(status)
        if new_content is None and 'already applied' not in status:
            return 3
        if new_content: content = new_content

    if content == original:
        print("No changes."); return 0
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
