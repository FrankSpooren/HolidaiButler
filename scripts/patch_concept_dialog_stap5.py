#!/usr/bin/env python3
"""
Patch ConceptDialog.jsx (admin-module) for i18n + code-mapping.

Replaces 2 occurrences of the hardcoded improveResult render with t()-based logic
that maps improveResult.code → i18n key.

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

# Anchor (occurs 2x). Both match exactly per grep -n earlier.
ANCHOR = """                      {improveResult.improved
                        ? `Content verbeterd! Score: ${improveResult.original_score || '?'} → ${seoData?.overallScore || improveResult.final_score || '?'}/100`
                        : `Niet verbeterd: ${improveResult.reason || 'Score was al hoog genoeg'}`}"""

REPLACEMENT = """                      {improveResult.improved
                        ? t('contentStudio.rewriteResult.improved', {
                            original: improveResult.original_score ?? '?',
                            final: seoData?.overallScore ?? improveResult.final_score ?? '?',
                          })
                        : (improveResult.code === 'SCORE_ALREADY_HIGH'
                            ? t('contentStudio.rewriteResult.notImprovedScoreHigh', { threshold: improveResult.threshold ?? 75 })
                            : improveResult.code === 'AI_UNABLE'
                              ? t('contentStudio.rewriteResult.notImprovedAiUnable')
                              : t('contentStudio.rewriteResult.notImprovedFallback', { reason: improveResult.reason || '' }))}"""

# Also has alternate occurrence with `improveResult.seo_score` in fallback chain
ANCHOR_ALT = """                      {improveResult.improved
                        ? `Content verbeterd! Score: ${improveResult.original_score || '?'} → ${seoData?.overallScore || improveResult.final_score || improveResult.seo_score || '?'}/100`
                        : `Niet verbeterd: ${improveResult.reason || 'Score was al hoog genoeg'}`}"""

REPLACEMENT_ALT = """                      {improveResult.improved
                        ? t('contentStudio.rewriteResult.improved', {
                            original: improveResult.original_score ?? '?',
                            final: seoData?.overallScore ?? improveResult.final_score ?? improveResult.seo_score ?? '?',
                          })
                        : (improveResult.code === 'SCORE_ALREADY_HIGH'
                            ? t('contentStudio.rewriteResult.notImprovedScoreHigh', { threshold: improveResult.threshold ?? 75 })
                            : improveResult.code === 'AI_UNABLE'
                              ? t('contentStudio.rewriteResult.notImprovedAiUnable')
                              : t('contentStudio.rewriteResult.notImprovedFallback', { reason: improveResult.reason || '' }))}"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found")
        return 2

    original = PATH.read_text(encoding='utf-8')
    content = original

    # Idempotency check
    if "contentStudio.rewriteResult.improved" in content:
        print("Already patched. No changes.")
        return 0

    # Replace anchor (first occurrence, regel ~1251)
    cnt1 = content.count(ANCHOR)
    if cnt1 >= 1:
        content = content.replace(ANCHOR, REPLACEMENT, 1)
        print(f"Replaced ANCHOR (1 of {cnt1})")
    else:
        print("WARN: ANCHOR not found exactly")

    # Replace alternate anchor (regel ~1430)
    cnt2 = content.count(ANCHOR_ALT)
    if cnt2 >= 1:
        content = content.replace(ANCHOR_ALT, REPLACEMENT_ALT, 1)
        print(f"Replaced ANCHOR_ALT (1 of {cnt2})")
    else:
        print("WARN: ANCHOR_ALT not found exactly")

    if content == original:
        print("ERROR: No anchors matched, file unchanged")
        return 3

    backup = PATH.with_suffix('.jsx.bak.stap5')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    print(f"Backup:  {backup}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
