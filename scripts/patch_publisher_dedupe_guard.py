#!/usr/bin/env python3
"""
CRITICAL Laag 2a: Publisher Dedupe Guard

Voorkomt elke duplicate publicatie:
- Check published_at IS NOT NULL OR publish_url IS NOT NULL VÓÓR publish
- Indien JA → throw DuplicatePublishError (HTTP 409)
- processScheduledPublications query filtert al-published items uit

ROOT CAUSE preventie:
- Mijn fix: items met past scheduled_at zonder published_at tracking → re-published
- Met dedupe guard: zelfs als DB state inconsistent is, publisher CHECKED publish_url
- Defense-in-depth: 2 lagen check (query filter + per-item check)

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/publisher/index.js')

# ---------------------------------------------------------------------
# 1. publishItem entry: add dedupe check immediately
# ---------------------------------------------------------------------
A1 = """  async publishItem(contentItemId) {
    const [items] = await mysqlSequelize.query(
      `SELECT ci.*, sa.id as social_account_id, sa.access_token_encrypted, sa.account_id as platform_account_id,
              sa.metadata as account_metadata, sa.status as account_status, sa.target_language as account_target_language
       FROM content_items ci
       LEFT JOIN social_accounts sa ON sa.destination_id = ci.destination_id AND sa.platform = ci.target_platform AND sa.status = 'active'
       WHERE ci.id = :id`,
      { replacements: { id: contentItemId }, type: mysqlSequelize.QueryTypes.SELECT }
    );

    const item = Array.isArray(items) ? items : [items];
    if (!item.length || !item[0]) {
      throw new Error(`Content item ${contentItemId} not found`);
    }
    const contentItem = item[0] || items;"""

R1 = """  async publishItem(contentItemId) {
    const [items] = await mysqlSequelize.query(
      `SELECT ci.*, sa.id as social_account_id, sa.access_token_encrypted, sa.account_id as platform_account_id,
              sa.metadata as account_metadata, sa.status as account_status, sa.target_language as account_target_language
       FROM content_items ci
       LEFT JOIN social_accounts sa ON sa.destination_id = ci.destination_id AND sa.platform = ci.target_platform AND sa.status = 'active'
       WHERE ci.id = :id`,
      { replacements: { id: contentItemId }, type: mysqlSequelize.QueryTypes.SELECT }
    );

    const item = Array.isArray(items) ? items : [items];
    if (!item.length || !item[0]) {
      throw new Error(`Content item ${contentItemId} not found`);
    }
    const contentItem = item[0] || items;

    // v4.93.0 CRITICAL DEDUPE GUARD — voorkomt elke duplicate publicatie
    // Indien item al gepubliceerd (publish_url OR published_at gezet) → block re-publish
    if (contentItem.publish_url || contentItem.published_at) {
      const err = new Error(`Item ${contentItemId} reeds gepubliceerd (publish_url: ${contentItem.publish_url || 'set'}, published_at: ${contentItem.published_at || 'set'}). Re-publish geblokkeerd door dedupe-guard.`);
      err.code = 'ALREADY_PUBLISHED';
      err.statusCode = 409;
      logger.warn(`[Publisher] DEDUPE-GUARD blocked re-publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }

    // v4.93.0 STATUS GUARD — alleen items in publish-able state mogen
    if (!['approved', 'scheduled', 'publishing', 'failed'].includes(contentItem.approval_status)) {
      const err = new Error(`Item ${contentItemId} state '${contentItem.approval_status}' is not publish-able. Allowed: approved, scheduled, publishing, failed.`);
      err.code = 'INVALID_STATE_FOR_PUBLISH';
      err.statusCode = 409;
      logger.warn(`[Publisher] STATUS-GUARD blocked publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }"""

# ---------------------------------------------------------------------
# 2. processScheduledPublications: ALSO filter out already-published items
# ---------------------------------------------------------------------
A2 = """  async processScheduledPublications() {
    const [scheduled] = await mysqlSequelize.query(
      `SELECT id, destination_id FROM content_items WHERE approval_status = 'scheduled' AND scheduled_at <= NOW()`,
      { type: mysqlSequelize.QueryTypes.SELECT }
    );"""

R2 = """  async processScheduledPublications() {
    // v4.93.0 DEDUPE in query: filter items die al published_at OR publish_url hebben
    // Defense-in-depth: zelfs als query niet zou filteren, publishItem dedupe-guard zou blocken
    const [scheduled] = await mysqlSequelize.query(
      `SELECT id, destination_id FROM content_items
       WHERE approval_status = 'scheduled'
         AND scheduled_at <= NOW()
         AND published_at IS NULL
         AND (publish_url IS NULL OR publish_url = '')`,
      { type: mysqlSequelize.QueryTypes.SELECT }
    );"""

PATCHES = [
    ('publishItem-dedupe-guard', A1, R1),
    ('processScheduled-dedupe-filter', A2, R2),
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

    print("Publisher Dedupe Guard patches:")
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.js.bak.dedupe-guard')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
