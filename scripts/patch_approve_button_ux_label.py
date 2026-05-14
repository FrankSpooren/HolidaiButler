#!/usr/bin/env python3
"""
KRITIEK UX FIX: Approve button label + state feedback wanneer items reeds goedgekeurd.

Frank's verwarring: "Bij geen enkel is Approve all-knop actief/beschikbaar"
Root cause: items zijn al ≥approved → button correct disabled, maar GEEN visuele
indicatie dat dit succes is. Frank denkt "knop kapot".

Fix: dynamische label/icon op basis van state:
- Indien items te approven (some draft/pending/etc): "Approve alle" — actieve groene knop
- Indien alle items reeds approved+: "✓ Alle goedgekeurd" — disabled met success-icon (visueel duidelijk = klaar)

Pre-Fase A workaround. Fase A WorkflowStatusChip + ProgressIndicator vervangen dit volledig.

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

ANCHOR = """                    <Button size="small" variant="contained" color="success"
                      onClick={() => handleStatusUpdate('approved', 'all')} startIcon={<CheckIcon />}
                      disabled={items.every(i => ['approved', 'scheduled', 'publishing', 'published'].includes(i.approval_status))}>
                      Approve alle
                    </Button>"""

REPLACEMENT = """                    {(() => {
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

# Add CheckCircleIcon import if missing
IMPORT_ANCHOR = "import CheckIcon from '@mui/icons-material/Check';"
IMPORT_REPLACEMENT = """import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2
    original = PATH.read_text(encoding='utf-8')
    content = original

    # Apply import if needed
    if "CheckCircleIcon" not in content:
        if IMPORT_ANCHOR in content:
            content = content.replace(IMPORT_ANCHOR, IMPORT_REPLACEMENT, 1)
            print("  import-CheckCircleIcon: added")
        else:
            print("  import-CheckCircleIcon: anchor not found - skipping (may already be there)")

    # Apply button fix
    if "Alle goedgekeurd" in content or "Alles gepubliceerd" in content:
        print("  approve-button-ux-fix: already applied")
    else:
        cnt = content.count(ANCHOR)
        if cnt == 0:
            print(f"  approve-button-ux-fix: FAIL anchor not found")
            return 3
        if cnt > 1:
            print(f"  approve-button-ux-fix: FAIL anchor not unique ({cnt}x)")
            return 4
        content = content.replace(ANCHOR, REPLACEMENT, 1)
        print(f"  approve-button-ux-fix: applied")

    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.jsx.bak.ux-approve-label')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
