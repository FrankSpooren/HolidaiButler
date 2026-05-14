#!/usr/bin/env python3
"""
URGENT: Publisher Future Schedule Guard

Voorkomt vroege publicatie wanneer scheduled_at in toekomst is.
publishItem() voortaan blokkeert als scheduled_at > NOW().

ROOT CAUSE incident: ik riep publishItem(248) direct aan om dedupe-test te doen.
Dedupe-guard liet door (publish_url=NULL). Item ging live op FB ondanks scheduled_at=16 mei toekomst.

Defense-in-depth:
1. Dedupe-guard (al toegevoegd): check published_at + publish_url
2. Status-guard (al toegevoegd): alleen approved/scheduled/publishing/failed
3. **NEW Future-schedule-guard**: scheduled_at > NOW() → block met informatieve melding
4. processScheduledPublications query filter blijft 15-min polling correct
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/publisher/index.js')

A1 = """    // v4.93.0 STATUS GUARD — alleen items in publish-able state mogen
    if (!['approved', 'scheduled', 'publishing', 'failed'].includes(contentItem.approval_status)) {
      const err = new Error(`Item ${contentItemId} state '${contentItem.approval_status}' is not publish-able. Allowed: approved, scheduled, publishing, failed.`);
      err.code = 'INVALID_STATE_FOR_PUBLISH';
      err.statusCode = 409;
      logger.warn(`[Publisher] STATUS-GUARD blocked publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }"""

R1 = """    // v4.93.0 STATUS GUARD — alleen items in publish-able state mogen
    if (!['approved', 'scheduled', 'publishing', 'failed'].includes(contentItem.approval_status)) {
      const err = new Error(`Item ${contentItemId} state '${contentItem.approval_status}' is not publish-able. Allowed: approved, scheduled, publishing, failed.`);
      err.code = 'INVALID_STATE_FOR_PUBLISH';
      err.statusCode = 409;
      logger.warn(`[Publisher] STATUS-GUARD blocked publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }

    // v4.93.0 FUTURE-SCHEDULE GUARD — block publish wanneer scheduled_at in toekomst
    // Voorkomt vroege publicatie via direct publishItem() calls (bv. tests, manual triggers)
    // Override via options.force=true voor expliciete "publish-now" use cases (UI button)
    if (contentItem.scheduled_at && !options?.force) {
      const scheduledTime = new Date(contentItem.scheduled_at).getTime();
      const now = Date.now();
      if (scheduledTime > now) {
        const err = new Error(`Item ${contentItemId} is scheduled for ${contentItem.scheduled_at} (in toekomst). Publish geweigerd. Wacht tot scheduled tijd, of gebruik publishNow met expliciete force=true override.`);
        err.code = 'PUBLISH_TOO_EARLY';
        err.statusCode = 409;
        logger.warn(`[Publisher] FUTURE-SCHEDULE-GUARD blocked publish of item ${contentItemId}: scheduled_at=${contentItem.scheduled_at}, now=${new Date(now).toISOString()}`);
        throw err;
      }
    }"""

# Need to update publishItem signature to accept options parameter
A2 = "  async publishItem(contentItemId) {"
R2 = "  async publishItem(contentItemId, options = {}) {"


PATCHES = [
    ('publishItem-future-schedule-guard', A1, R1),
    ('publishItem-options-param', A2, R2),
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
        print("No changes."); return 0
    backup = PATH.with_suffix('.js.bak.future-guard')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
