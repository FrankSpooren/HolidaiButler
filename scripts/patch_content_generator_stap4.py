#!/usr/bin/env python3
"""
Patch contentGenerator.js for Stap 4 hardening.

Changes (surgical, minimum-risk):
1. Add featureFlagService import (after existing imports)
2. improveExistingContent: read SEO threshold from feature flag
3. improveExistingContent: structured response with `code` + `threshold` (UI i18n fix)
4. improveExistingContent: structured response on "AI could not improve" branch
5. Add ai_generation_log audit write (basic) in improveExistingContent

Idempotent: if anchors already replaced, exits 0.
"""
import sys
import re
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/contentRedacteur/contentGenerator.js')

# ---------------------------------------------------------------------
# Anchors and replacements
# ---------------------------------------------------------------------

# 1. Import featureFlagService — insert after existing imports
ANCHOR_IMPORT = "import { buildBrandContext } from './brandContext.js';"
NEW_IMPORT = "import { buildBrandContext } from './brandContext.js';\nimport featureFlagService from '../../featureFlagService.js';\nimport { mysqlSequelize as _mysqlForAudit } from '../../../config/database.js';"

# 2. Replace the SCORE_ALREADY_HIGH return block — add code + threshold
ANCHOR_SCORE_HIGH = """  if (currentSeo.overallScore >= SEO_MINIMUM_SCORE) {
    return {
      improved: false,
      reason: `Score already at ${currentSeo.overallScore}/100 (≥${SEO_MINIMUM_SCORE})`,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      checks: currentSeo.checks,
    };
  }"""

REPLACEMENT_SCORE_HIGH = """  // Read SEO threshold from feature flag (overrideable per destination, fallback hardcoded)
  let _minScore = SEO_MINIMUM_SCORE;
  try {
    const flagVal = await featureFlagService.getValue('ai_content.seo_min_score', {
      scopeType: 'destination', scopeId: Number(destinationId) || 0, fallback: SEO_MINIMUM_SCORE,
    });
    if (typeof flagVal === 'number' && flagVal > 0) _minScore = flagVal;
  } catch (_e) { /* fallback to hardcoded */ }

  if (currentSeo.overallScore >= _minScore) {
    // Structured response for i18n-friendly UI rendering (code + threshold)
    const result = {
      improved: false,
      code: 'SCORE_ALREADY_HIGH',
      threshold: _minScore,
      reason: `Score already at ${currentSeo.overallScore}/100 (≥${_minScore})`,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      checks: currentSeo.checks,
    };
    // Audit log (non-blocking)
    try {
      await _mysqlForAudit.query(
        `INSERT INTO ai_generation_log
          (destination_id, content_item_id, content_type, locale, operation, model,
           internal_sources_count, external_sources_used, has_internal_sources,
           soft_warning_shown, validation_passed, status, created_at)
         VALUES (:destId, :itemId, :ctype, :locale, 'improve', NULL, 0, 0, 0, 0, NULL, 'success', NOW())`,
        { replacements: {
          destId: Number(destinationId) || null,
          itemId: contentItem.id || null,
          ctype: contentType,
          locale: primaryLang,
        }}
      );
    } catch (_e) { /* audit non-blocking */ }
    return result;
  }"""

# 3. AI could not improve branch — add code field
ANCHOR_AI_UNABLE = """  return {
    improved: false,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
  };
}"""

REPLACEMENT_AI_UNABLE = """  return {
    improved: false,
    code: 'AI_UNABLE',
    threshold: _minScore,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
  };
}"""


def replace_unique(content, anchor, replacement, label):
    if replacement in content:
        return content, f"skip-{label} (already applied)"
    count = content.count(anchor)
    if count == 0:
        return None, f"FAIL-{label} (anchor not found)"
    if count > 1:
        return None, f"FAIL-{label} (anchor found {count}x — not unique)"
    return content.replace(anchor, replacement, 1), f"ok-{label}"


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found")
        return 2

    original = PATH.read_text(encoding='utf-8')
    content = original
    results = []

    # 1. Import
    new_content, status = replace_unique(content, ANCHOR_IMPORT, NEW_IMPORT, 'import')
    if new_content is None and 'already applied' not in status:
        print(status)
        return 3
    if new_content:
        content = new_content
    results.append(status)

    # 2. Score-high block
    new_content, status = replace_unique(content, ANCHOR_SCORE_HIGH, REPLACEMENT_SCORE_HIGH, 'score-high')
    if new_content is None and 'already applied' not in status:
        print(status)
        return 4
    if new_content:
        content = new_content
    results.append(status)

    # 3. AI unable branch
    new_content, status = replace_unique(content, ANCHOR_AI_UNABLE, REPLACEMENT_AI_UNABLE, 'ai-unable')
    if new_content is None and 'already applied' not in status:
        print(status)
        return 5
    if new_content:
        content = new_content
    results.append(status)

    if content == original:
        print("No changes (all anchors already applied).")
        for r in results: print(" ", r)
        return 0

    # Backup + write
    backup = PATH.with_suffix('.js.bak.stap4')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    print(f"Backup:  {backup}")
    for r in results: print(" ", r)
    return 0


if __name__ == '__main__':
    sys.exit(main())
