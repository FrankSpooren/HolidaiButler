#!/usr/bin/env python3
"""
KRITIEKE FIX — Frank productie blocker.
Bug: items in 'scheduled' state geven verwarrende UI bij Approve all actie.
- Button blijft enabled (suggereert work needed)
- Snackbar says "Alle kanalen goedgekeurd" zelfs als 0 items affected
- Chips kleur voor scheduled is 'warning' (oranje) - look not-done

Fixes (minimum-invasive):
1. Approve button disable: items.every in approved/scheduled/publishing/published
   → button uit wanneer alle items minimaal de approve-fase gepasseerd zijn
2. handleStatusUpdate snackbar: gebruik server response 'approved_items' count
   → "X items goedgekeurd, Y al gepland" ipv generieke "Alle kanalen goedgekeurd"

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

# ---------------------------------------------------------------------
# Fix 1: Approve button disable conditie
# ---------------------------------------------------------------------
A1 = """                    <Button size="small" variant="contained" color="success"
                      onClick={() => handleStatusUpdate('approved', 'all')} startIcon={<CheckIcon />}
                      disabled={items.every(i => i.approval_status === 'approved' || i.approval_status === 'published')}>
                      Approve alle
                    </Button>"""

R1 = """                    <Button size="small" variant="contained" color="success"
                      onClick={() => handleStatusUpdate('approved', 'all')} startIcon={<CheckIcon />}
                      disabled={items.every(i => ['approved', 'scheduled', 'publishing', 'published'].includes(i.approval_status))}>
                      Approve alle
                    </Button>"""

# ---------------------------------------------------------------------
# Fix 2: handleStatusUpdate gebruik server response voor accurate snackbar
# ---------------------------------------------------------------------
A2 = """  const handleStatusUpdate = async (status, scope = 'all') => {
    try {
      if (status === 'approved' && scope === 'all' && concept?.id) {
        // Approve ALL platforms at once via concept-level endpoint
        await contentService.approveConcept(concept.id);
        // Optimistic update: mark all items approved in local state
        setItems(prev => prev.map(it => it.approval_status !== 'published' && it.approval_status !== 'deleted'
          ? { ...it, approval_status: 'approved' } : it));
      } else {
        // Single item update (reject, or single-platform action)
        const itemId = items[activeTab]?.id;
        if (!itemId) return;
        await contentService.updateItem(itemId, { approval_status: status });
        // Optimistic update for single item
        setItems(prev => prev.map((it, idx) => idx === activeTab ? { ...it, approval_status: status } : it));
      }
      await loadConcept();
      const itemIdReload = items[activeTab]?.id;
      if (itemIdReload) loadApprovalLog(itemIdReload);
      setSnackMsg({ severity: 'success', text: status === 'approved' ? 'Alle kanalen goedgekeurd' : 'Afgewezen' });
    } catch (err) {
      setSnackMsg({ severity: 'error', text: err.message || 'Status update mislukt' });
    }
  };"""

R2 = """  const handleStatusUpdate = async (status, scope = 'all') => {
    try {
      if (status === 'approved' && scope === 'all' && concept?.id) {
        // Approve ALL platforms at once via concept-level endpoint (FSM-aware)
        const result = await contentService.approveConcept(concept.id);
        const approvedCount = result?.data?.approved_items ?? result?.approved_items ?? 0;
        // KRITIEKE FIX: alleen draft/pending_review items optimistic markeren
        // (scheduled/publishing/published BEHOUDEN hun state — geen demotion)
        const approvableStates = ['draft', 'pending_review', 'in_review', 'reviewed', 'changes_requested', 'rejected', 'failed'];
        setItems(prev => prev.map(it =>
          approvableStates.includes(it.approval_status)
            ? { ...it, approval_status: 'approved' }
            : it
        ));
        await loadConcept();
        const itemIdReload = items[activeTab]?.id;
        if (itemIdReload) loadApprovalLog(itemIdReload);
        // Accurate snackbar based on server response
        if (approvedCount === 0) {
          setSnackMsg({ severity: 'info', text: 'Alle items al goedgekeurd of voorbij goedkeuringsfase' });
        } else if (approvedCount === items.length) {
          setSnackMsg({ severity: 'success', text: 'Alle kanalen goedgekeurd' });
        } else {
          setSnackMsg({ severity: 'success', text: `${approvedCount} van ${items.length} kanalen goedgekeurd (overige reeds verder in workflow)` });
        }
      } else {
        // Single item update (reject, or single-platform action)
        const itemId = items[activeTab]?.id;
        if (!itemId) return;
        await contentService.updateItem(itemId, { approval_status: status });
        setItems(prev => prev.map((it, idx) => idx === activeTab ? { ...it, approval_status: status } : it));
        await loadConcept();
        const itemIdReload = items[activeTab]?.id;
        if (itemIdReload) loadApprovalLog(itemIdReload);
        setSnackMsg({ severity: 'success', text: status === 'approved' ? 'Goedgekeurd' : 'Afgewezen' });
      }
    } catch (err) {
      setSnackMsg({ severity: 'error', text: err.message || 'Status update mislukt' });
    }
  };"""


PATCHES = [
    ('approve-button-disable-fix', A1, R1),
    ('handleStatusUpdate-accurate-snackbar', A2, R2),
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

    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.jsx.bak.critical-fix')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
