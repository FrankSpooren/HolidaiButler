#!/usr/bin/env python3
"""
Integrate Finite State Machine into critical endpoints.

Patches:
1. Add approvalStateMachine import
2. /content/concepts/:id/approve: skip items in scheduled/publishing/published states (Issue D fix)
3. /content/items/:id/reschedule: ALSO set approval_status='scheduled' when setting scheduled_at (Issue C fix)
4. syncConceptStatusByConceptId: use FSM's deriveConceptStatus (reads scheduled_at)

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/routes/adminPortal.js')

# ---------------------------------------------------------------------
# 1. Import FSM (after ContentItemResource import)
# ---------------------------------------------------------------------
A1 = "import ContentItemResource from '../resources/ContentItemResource.js';"
R1 = """import ContentItemResource from '../resources/ContentItemResource.js';
import { canTransition, deriveConceptStatus as _fsmDeriveConceptStatus, InvalidTransitionError } from '../services/approvalStateMachine.js';"""

# ---------------------------------------------------------------------
# 2. /content/concepts/:id/approve — skip scheduled items (Issue D)
# ---------------------------------------------------------------------
A2 = """    // Approve all items at once
    const itemIds = items.map(i => i.id);
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'approved', approved_by = :userId, updated_at = NOW()
       WHERE concept_id = :conceptId AND approval_status NOT IN ('deleted', 'published')`,
      { replacements: { conceptId, userId } }
    );"""

R2 = """    // Approve all items — but only those in approve-able states (FSM whitelist)
    // Issue D fix: exclude scheduled/publishing/published items (no regression)
    const approvableStates = ['draft', 'pending_review', 'in_review', 'reviewed', 'changes_requested', 'rejected', 'failed'];
    const itemIds = items.filter(i => approvableStates.includes(i.approval_status)).map(i => i.id);
    const skippedCount = items.length - itemIds.length;
    if (itemIds.length > 0) {
      await mysqlSequelize.query(
        `UPDATE content_items SET approval_status = 'approved', approved_by = :userId, updated_at = NOW()
         WHERE id IN (:itemIds)`,
        { replacements: { itemIds, userId } }
      );
    }
    if (skippedCount > 0) {
      logger.info(`[ConceptApprove] Concept ${conceptId}: approved ${itemIds.length} items, skipped ${skippedCount} (already scheduled/publishing/published)`);
    }"""

# ---------------------------------------------------------------------
# 3. /content/items/:id/reschedule — also set approval_status='scheduled'
# ---------------------------------------------------------------------
A3 = """    const parsedScheduledAt = String(scheduled_at).replace('T', ' ').replace(/\\.\\d{3}Z$/, '').slice(0, 19);
    const [, meta] = await mysqlSequelize.query(
      `UPDATE content_items SET scheduled_at = :scheduledAt, updated_at = NOW()
       WHERE id = :id AND approval_status NOT IN ('published','rejected','failed')`,
      { replacements: { scheduledAt: parsedScheduledAt, id: Number(id) } }
    );"""

R3 = """    const parsedScheduledAt = String(scheduled_at).replace('T', ' ').replace(/\\.\\d{3}Z$/, '').slice(0, 19);
    // Issue C fix: set approval_status='scheduled' alongside scheduled_at to maintain state consistency
    const [, meta] = await mysqlSequelize.query(
      `UPDATE content_items SET scheduled_at = :scheduledAt, approval_status = 'scheduled', updated_at = NOW()
       WHERE id = :id AND approval_status NOT IN ('published','rejected','failed','publishing')`,
      { replacements: { scheduledAt: parsedScheduledAt, id: Number(id) } }
    );"""

# ---------------------------------------------------------------------
# 4. syncConceptStatusByConceptId — use FSM's deriveConceptStatus (reads scheduled_at)
# ---------------------------------------------------------------------
A4 = """async function syncConceptStatusByConceptId(conceptId) {
  try {
    const [items] = await mysqlSequelize.query(
      "SELECT approval_status FROM content_items WHERE concept_id = :conceptId AND approval_status != 'deleted'",
      { replacements: { conceptId: Number(conceptId) } }
    );
    if (items.length === 0) return;
    // Derive: highest priority status among all items
    let highest = 0;
    for (const it of items) {
      const idx = CONCEPT_STATUS_PRIORITY.indexOf(it.approval_status);
      if (idx > highest) highest = idx;
    }
    const derivedStatus = CONCEPT_STATUS_PRIORITY[highest] || 'draft';
    await mysqlSequelize.query(
      'UPDATE content_concepts SET approval_status = :status, updated_at = NOW() WHERE id = :conceptId',
      { replacements: { status: derivedStatus, conceptId: Number(conceptId) } }
    );
  } catch (err) {
    logger.debug('[syncConceptStatusByConceptId] Non-blocking error:', err.message);
  }
}"""

R4 = """async function syncConceptStatusByConceptId(conceptId) {
  try {
    // v4.92.0 Issue C fix: use FSM deriveConceptStatus which considers BOTH
    // approval_status AND scheduled_at to detect "approved but actually scheduled" inconsistencies
    const [items] = await mysqlSequelize.query(
      "SELECT approval_status, scheduled_at FROM content_items WHERE concept_id = :conceptId AND approval_status != 'deleted'",
      { replacements: { conceptId: Number(conceptId) } }
    );
    if (items.length === 0) return;
    const derivedStatus = _fsmDeriveConceptStatus(items);
    await mysqlSequelize.query(
      'UPDATE content_concepts SET approval_status = :status, updated_at = NOW() WHERE id = :conceptId',
      { replacements: { status: derivedStatus, conceptId: Number(conceptId) } }
    );
  } catch (err) {
    logger.debug('[syncConceptStatusByConceptId] Non-blocking error:', err.message);
  }
}"""


PATCHES = [
    ('imports-fsm', A1, R1),
    ('concept-approve-whitelist', A2, R2),
    ('reschedule-sync-status', A3, R3),
    ('sync-concept-use-fsm', A4, R4),
]


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
    statuses = []
    for label, anchor, replacement in PATCHES:
        new_content, status = apply_patch(content, label, anchor, replacement)
        statuses.append(status)
        if new_content is None and 'already applied' not in status:
            for s in statuses: print(s)
            return 3
        if new_content: content = new_content

    print('FSM integration:')
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.js.bak.fsm')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
