#!/usr/bin/env python3
"""
Laag 3c2: Replace status chips in ContentStudioPage + ContentCalendarTab
met WorkflowStatusChip voor consistency.

- ContentStudioPage.jsx local StatusChip → delegates to WorkflowStatusChip
- ContentCalendarTab.jsx <Chip label={item.approval_status}> → WorkflowStatusChip

Idempotent.
"""
import sys
from pathlib import Path

# ---------------------------------------------------------------------
# ContentStudioPage.jsx — refactor local StatusChip
# ---------------------------------------------------------------------
SP_PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/pages/ContentStudioPage.jsx')

SP_IMPORT_A = "import { useTranslation } from 'react-i18next';"
SP_IMPORT_R = """import { useTranslation } from 'react-i18next';
import WorkflowStatusChip from '../components/common/WorkflowStatusChip.jsx';"""

SP_STATUSCHIP_A = """function StatusChip({ status, size = 'small', sx: extraSx = {} }) {
  const { t } = useTranslation();
  const customSx = STATUS_SX[status] || {};
  return (
    <Chip
      label={t(`contentStudio.status.${status}`, status)}
      size={size}
      sx={{ fontWeight: 600, fontSize: 11, ...customSx, ...extraSx }}
    />
  );
}"""

SP_STATUSCHIP_R = """function StatusChip({ status, size = 'small', sx: extraSx = {} }) {
  // v4.93.0 — delegates to single source of truth WorkflowStatusChip
  return <WorkflowStatusChip status={status} size={size} showIcon={false} sx={{ fontSize: 11, ...extraSx }} />;
}"""

# ---------------------------------------------------------------------
# ContentCalendarTab.jsx — replace raw enum chip with WorkflowStatusChip
# ---------------------------------------------------------------------
CAL_PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/pages/ContentCalendarTab.jsx')

CAL_IMPORT_A = "import { useTranslation } from 'react-i18next';"
CAL_IMPORT_R = """import { useTranslation } from 'react-i18next';
import WorkflowStatusChip from '../components/common/WorkflowStatusChip.jsx';"""

CAL_CHIP_A = """                      <Chip label={item.approval_status} size="small" sx={{ bgcolor: STATUS_COLORS[item.approval_status], color: 'common.white', fontSize: 11 }} />"""

CAL_CHIP_R = """                      <WorkflowStatusChip status={item.approval_status} item={item} size="small" sx={{ fontSize: 11 }} />"""


def patch_file(path, patches, marker):
    if not path.exists():
        return False, f"{path}: NOT FOUND"
    content = path.read_text(encoding='utf-8')
    original = content
    statuses = []
    for label, anchor, replacement in patches:
        if replacement in content:
            statuses.append(f"  {label}: already applied")
            continue
        if anchor not in content:
            statuses.append(f"  {label}: FAIL anchor not found")
            return False, statuses
        if content.count(anchor) > 1:
            statuses.append(f"  {label}: FAIL anchor not unique")
            return False, statuses
        content = content.replace(anchor, replacement, 1)
        statuses.append(f"  {label}: applied")
    if content != original:
        backup = path.with_suffix(path.suffix + '.bak.' + marker)
        backup.write_text(original, encoding='utf-8')
        path.write_text(content, encoding='utf-8')
        statuses.append(f"  PATCHED: {path}")
    return True, statuses


def main():
    print("=== ContentStudioPage.jsx ===")
    ok, st = patch_file(SP_PATH, [
        ('imports-workflow', SP_IMPORT_A, SP_IMPORT_R),
        ('local-StatusChip-delegate', SP_STATUSCHIP_A, SP_STATUSCHIP_R),
    ], 'wf-cs')
    if isinstance(st, list):
        for s in st: print(s)
    else:
        print(st)
    if not ok: return 3

    print("\n=== ContentCalendarTab.jsx ===")
    ok, st = patch_file(CAL_PATH, [
        ('imports-workflow', CAL_IMPORT_A, CAL_IMPORT_R),
        ('calendar-chip-replace', CAL_CHIP_A, CAL_CHIP_R),
    ], 'wf-cal')
    if isinstance(st, list):
        for s in st: print(s)
    else:
        print(st)
    if not ok: return 3

    print("\nDone.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
