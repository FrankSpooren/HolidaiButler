#!/usr/bin/env python3
"""
Laag 3c+3d: Integraal WorkflowStatus rendering in ConceptDialog.

Vervangt 3 ad-hoc status-renderings + FSM-driven button states:
1. Header aggStatus chip → WorkflowProgressIndicator (Stijl B badge-rij 4 stages)
2. Per-platform tab chip (regel 1211 emoji) → WorkflowStatusChip
3. Per-platform Stap 3 chip (regel 1819) → WorkflowStatusChip
4. Approve button disable → getAvailableActions().canApprove
5. (Frank punt 1E) Sync Stap 1 + Stap 3 → beide gebruiken WorkflowStatus

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

# ---------------------------------------------------------------------
# 1. Imports
# ---------------------------------------------------------------------
A1 = "import AnimatedScoreChip from '../common/AnimatedScoreChip.jsx';"
R1 = """import AnimatedScoreChip from '../common/AnimatedScoreChip.jsx';
import WorkflowStatusChip from '../common/WorkflowStatusChip.jsx';
import WorkflowProgressIndicator from '../common/WorkflowProgressIndicator.jsx';
import { getAvailableActions } from '../../lib/workflowStatus.js';"""

# ---------------------------------------------------------------------
# 2. Header aggStatus chip → WorkflowProgressIndicator
# ---------------------------------------------------------------------
A2 = """                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                  <Chip label={t(`contentStudio.contentTypes.${concept.content_type}`, CONTENT_TYPE_FALLBACKS[concept.content_type] || concept.content_type)} size="small" variant="outlined" />
                  <Chip label={aggStatus.label} size="small" color={aggStatus.color} />"""

R2 = """                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                  <Chip label={t(`contentStudio.contentTypes.${concept.content_type}`, CONTENT_TYPE_FALLBACKS[concept.content_type] || concept.content_type)} size="small" variant="outlined" />
                  {/* v4.93.0 Workflow Progress (Stijl B) — vervangt aggStatus chip */}
                  <WorkflowProgressIndicator items={items} compact />"""

# ---------------------------------------------------------------------
# 3. Per-platform tab chip emoji → WorkflowStatusChip
# ---------------------------------------------------------------------
A3 = """                      <Chip label={item.approval_status === 'published' ? '✓' : item.approval_status === 'scheduled' ? '⏳' : item.approval_status === 'approved' ? '✔' : item.approval_status === 'failed' ? '✗' : '—'}
                        size="small" variant={item.approval_status === 'scheduled' ? 'outlined' : 'filled'}
                        color={STATUS_COLORS[item.approval_status] || 'default'}
                        sx={{ height: 18, fontSize: 10, ml: 0.5, minWidth: 24, fontWeight: 700,
                          ...(item.approval_status === 'scheduled' ? { borderColor: '#ed6c02', color: '#ed6c02', borderWidth: 2 } : {})
                        }} />"""

R3 = """                      {/* v4.93.0 WorkflowStatusChip vervangt emoji chip */}
                      <WorkflowStatusChip status={item.approval_status} item={item} size="small" showIcon={false}
                        sx={{ height: 18, fontSize: 10, ml: 0.5, '& .MuiChip-label': { px: 0.75 } }} />"""

# ---------------------------------------------------------------------
# 4. Stap 3 per-platform chip → WorkflowStatusChip (line ~1819)
# ---------------------------------------------------------------------
A4 = """                          label={isPublished ? 'Live' : isScheduled ? 'Ingepland' : it.approval_status === 'approved' ? 'Goedgekeurd' : it.approval_status === 'failed' ? 'Mislukt' : it.approval_status === 'draft' ? 'Concept' : it.approval_status === 'rejected' ? 'Afgewezen' : it.approval_status}"""

R4 = """                          label={(() => { const { getStatusLabel } = require('../../lib/workflowStatus.js'); return getStatusLabel(it.approval_status, 'nl', it); })()}"""

# We use require here - but it's ESM. Let me use a different approach: just import the helper at top
# Actually since this is a chip prop, simpler: use the WorkflowStatusChip directly to replace the parent <Chip>
# But that may break other props on the parent Chip. Let me do alternative: inline a function call to getStatusLabel.

# Better approach: import getStatusLabel at top and use it inline.

# Update import patch
IMPORT_REPLACEMENT_V2 = """import AnimatedScoreChip from '../common/AnimatedScoreChip.jsx';
import WorkflowStatusChip from '../common/WorkflowStatusChip.jsx';
import WorkflowProgressIndicator from '../common/WorkflowProgressIndicator.jsx';
import { getAvailableActions, getStatusLabel as _wfGetStatusLabel } from '../../lib/workflowStatus.js';"""

R4_FINAL = """                          label={_wfGetStatusLabel(it.approval_status, 'nl', it)}"""

# ---------------------------------------------------------------------
# 5. Approve button disable → FSM-driven canApprove (Frank punt 1E)
# ---------------------------------------------------------------------
# Current is the (() => { ... })() with allApprovedOrHigher
A5 = """                    {(() => {
                      const allApprovedOrHigher = items.every(i => ['approved', 'scheduled', 'publishing', 'published'].includes(i.approval_status));
                      const allPublished = items.length > 0 && items.every(i => i.approval_status === 'published');
                      return (
                        <Button size="small" variant="contained"
                          color={allApprovedOrHigher ? 'success' : 'success'}
                          onClick={() => handleStatusUpdate('approved', 'all')}
                          startIcon={allApprovedOrHigher ? <CheckCircleIcon /> : <CheckIcon />}
                          disabled={allApprovedOrHigher}
                          sx={allApprovedOrHigher ? {
                            opacity: 0.85,
                            '&.Mui-disabled': {
                              bgcolor: 'success.main',
                              color: 'common.white',
                              opacity: 0.8,
                            },
                          } : {}}>
                          {allPublished ? '✓ Alles gepubliceerd' : allApprovedOrHigher ? '✓ Alle goedgekeurd' : 'Approve alle'}
                        </Button>
                      );
                    })()}"""

R5 = """                    {(() => {
                      // v4.93.0 FSM-driven action availability (Frank punt 1E)
                      const wfActions = getAvailableActions(items);
                      const allPublished = items.length > 0 && items.every(i => i.approval_status === 'published');
                      const allApprovedOrHigher = !wfActions.canApprove;
                      return (
                        <Button size="small" variant="contained"
                          color="success"
                          onClick={() => handleStatusUpdate('approved', 'all')}
                          startIcon={allApprovedOrHigher ? <CheckCircleIcon /> : <CheckIcon />}
                          disabled={allApprovedOrHigher}
                          sx={allApprovedOrHigher ? {
                            opacity: 0.85,
                            '&.Mui-disabled': {
                              bgcolor: 'success.main',
                              color: 'common.white',
                              opacity: 0.8,
                            },
                          } : {}}>
                          {allPublished ? '✓ Alles gepubliceerd' : allApprovedOrHigher ? '✓ Alle goedgekeurd' : 'Approve alle'}
                        </Button>
                      );
                    })()}"""


PATCHES = [
    ('imports-workflow', A1, IMPORT_REPLACEMENT_V2),
    ('header-aggStatus-replace', A2, R2),
    ('platform-tab-chip-replace', A3, R3),
    ('stap3-per-platform-chip-replace', A4, R4_FINAL),
    ('approve-button-fsm-driven', A5, R5),
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

    print("WorkflowStatus integration patches:")
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.jsx.bak.workflow-integration')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
