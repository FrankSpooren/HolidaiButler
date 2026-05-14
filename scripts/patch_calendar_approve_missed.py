#!/usr/bin/env python3
"""
Laag 4c: Calendar popup Approve action + MISSED badge

1. Approve button voor concept-stage items in kalender popup
2. MISSED indicator: items met approval_status='approved' + scheduled_at past + published_at NULL

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/pages/ContentCalendarTab.jsx')

# ---------------------------------------------------------------------
# Add Approve button voor concept-stage (draft/pending_review/etc)
# ---------------------------------------------------------------------
A1 = """                      {item.approval_status === 'approved' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<ScheduleIcon />}
                            onClick={() => setScheduleDialog(item)}>
                            {t('contentStudio.calendar.schedule', 'Inplannen')}
                          </Button>
                          <Button size="small" variant="contained" startIcon={<PublishIcon />}
                            onClick={() => handlePublishNow(item.id, accounts[0]?.id)}
                            disabled={publishMut.isPending || accounts.length === 0}>
                            {t('contentStudio.calendar.publishNow', 'Nu publiceren')}
                          </Button>
                        </>
                      )}"""

R1 = """                      {/* v4.93.0 Approve voor concept-stage items in Kalender */}
                      {['draft', 'pending_review', 'in_review', 'reviewed', 'changes_requested'].includes(item.approval_status) && (
                        <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />}
                          onClick={async () => {
                            try {
                              await contentService.updateItem(item.id, { approval_status: 'approved' });
                              setAutoFillSnack('Goedgekeurd');
                              await refetch();
                            } catch (e) {
                              setAutoFillSnack(`Goedkeuring mislukt: ${e.message}`);
                            }
                          }}>
                          {t('contentStudio.calendar.approve', 'Goedkeuren')}
                        </Button>
                      )}
                      {item.approval_status === 'approved' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<ScheduleIcon />}
                            onClick={() => setScheduleDialog(item)}>
                            {t('contentStudio.calendar.schedule', 'Inplannen')}
                          </Button>
                          <Button size="small" variant="contained" startIcon={<PublishIcon />}
                            onClick={() => handlePublishNow(item.id, accounts[0]?.id)}
                            disabled={publishMut.isPending || accounts.length === 0}>
                            {t('contentStudio.calendar.publishNow', 'Nu publiceren')}
                          </Button>
                        </>
                      )}"""

# ---------------------------------------------------------------------
# MISSED indicator in subtitle
# ---------------------------------------------------------------------
A2 = """                    <Typography variant="caption" color="text.secondary">
                      {item.approval_status === 'failed' ? `Mislukt${item.publish_error ? ': ' + item.publish_error.substring(0, 60) : ''}` :
                       item.approval_status === 'published' && item.published_at ? `Gepubliceerd: ${new Date(item.published_at).toLocaleString('nl-NL')}` :
                       item.scheduled_at ? `Gepland: ${new Date(item.scheduled_at).toLocaleString('nl-NL')}` : ''}
                    </Typography>"""

R2 = """                    <Typography variant="caption" color="text.secondary">
                      {item.approval_status === 'failed' ? `Mislukt${item.publish_error ? ': ' + item.publish_error.substring(0, 60) : ''}` :
                       item.approval_status === 'published' && item.published_at ? `Gepubliceerd: ${new Date(item.published_at).toLocaleString('nl-NL')}` :
                       item.scheduled_at ? `Gepland: ${new Date(item.scheduled_at).toLocaleString('nl-NL')}` : ''}
                    </Typography>
                    {/* v4.93.0 MISSED indicator: scheduled_at in past + niet gepubliceerd */}
                    {item.scheduled_at && !item.published_at && new Date(item.scheduled_at) < new Date() && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, p: 0.5, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ed6c02' }}>
                        <ErrorOutlineIcon sx={{ fontSize: 16, color: '#ed6c02' }} />
                        <Typography variant="caption" sx={{ color: '#ed6c02', fontWeight: 600 }}>
                          GEMIST: niet gepubliceerd op gepland tijdstip — herplan of publiceer nu
                        </Typography>
                      </Box>
                    )}"""

# Need CheckIcon + ErrorOutlineIcon imports
A3 = "import CancelIcon from '@mui/icons-material/Cancel';"
R3 = """import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';"""


PATCHES = [
    ('imports-icons', A3, R3),
    ('calendar-approve-button', A1, R1),
    ('missed-indicator', A2, R2),
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
    backup = PATH.with_suffix('.jsx.bak.calendar-approve-missed')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
