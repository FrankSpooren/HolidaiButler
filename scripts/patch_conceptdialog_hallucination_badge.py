#!/usr/bin/env python3
"""
ConceptDialog.jsx — add hallucination_warning badge + ungrounded entities display.

Replaces single Alert with:
- Primary Alert (improved/not-improved message) — existing
- Secondary Alert (hallucination_warning) — NEW: shows when improveResult.hallucination_warning
  Includes ungrounded entities as chips + provenance signature tooltip

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/admin-module/src/components/content/ConceptDialog.jsx')

# Find both Alert blocks (regel ~1249 en ~1432)
# Pattern: starts with `{improveResult && (` ends with closing `)}` after Alert
ANCHOR = """                  {improveResult && (
                    <Alert severity={improveResult.improved ? 'success' : 'info'} onClose={() => setImproveResult(null)} sx={{ py: 0.5 }}>
                      {improveResult.improved
                        ? t('contentStudio.rewriteResult.improved', {
                            original: improveResult.original_score ?? '?',
                            final: seoData?.overallScore ?? improveResult.final_score ?? '?',
                          })
                        : (improveResult.code === 'SCORE_ALREADY_HIGH'
                            ? t('contentStudio.rewriteResult.notImprovedScoreHigh', { threshold: improveResult.threshold ?? 75 })
                            : improveResult.code === 'AI_UNABLE'
                              ? t('contentStudio.rewriteResult.notImprovedAiUnable')
                              : t('contentStudio.rewriteResult.notImprovedFallback', { reason: improveResult.reason || '' }))}
                    </Alert>
                  )}"""

# Variant with seo_score fallback chain
ANCHOR_ALT = """                  {improveResult && (
                    <Alert severity={improveResult.improved ? 'success' : 'info'} onClose={() => setImproveResult(null)} sx={{ py: 0.5 }}>
                      {improveResult.improved
                        ? t('contentStudio.rewriteResult.improved', {
                            original: improveResult.original_score ?? '?',
                            final: seoData?.overallScore ?? improveResult.final_score ?? improveResult.seo_score ?? '?',
                          })
                        : (improveResult.code === 'SCORE_ALREADY_HIGH'
                            ? t('contentStudio.rewriteResult.notImprovedScoreHigh', { threshold: improveResult.threshold ?? 75 })
                            : improveResult.code === 'AI_UNABLE'
                              ? t('contentStudio.rewriteResult.notImprovedAiUnable')
                              : t('contentStudio.rewriteResult.notImprovedFallback', { reason: improveResult.reason || '' }))}
                    </Alert>
                  )}"""

REPLACEMENT = """                  {improveResult && (
                    <>
                    <Alert severity={improveResult.improved ? 'success' : 'info'} onClose={() => setImproveResult(null)} sx={{ py: 0.5 }}>
                      {improveResult.improved
                        ? t('contentStudio.rewriteResult.improved', {
                            original: improveResult.original_score ?? '?',
                            final: seoData?.overallScore ?? improveResult.final_score ?? improveResult.seo_score ?? '?',
                          })
                        : (improveResult.code === 'SCORE_ALREADY_HIGH'
                            ? t('contentStudio.rewriteResult.notImprovedScoreHigh', { threshold: improveResult.threshold ?? 75 })
                            : improveResult.code === 'AI_UNABLE'
                              ? t('contentStudio.rewriteResult.notImprovedAiUnable')
                              : t('contentStudio.rewriteResult.notImprovedFallback', { reason: improveResult.reason || '' }))}
                    </Alert>
                    {improveResult.hallucination_warning && (
                      <Alert severity="warning" sx={{ py: 0.5, mt: 0.5 }} icon={false}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ fontWeight: 600 }}>
                            {t('contentStudio.rewriteResult.hallucinationDetected', {
                              rate: improveResult.validation?.hallucinationRate
                                ? Math.round(improveResult.validation.hallucinationRate * 100)
                                : 0,
                            })}
                          </Box>
                          {Array.isArray(improveResult.validation?.ungroundedEntities) && improveResult.validation.ungroundedEntities.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {improveResult.validation.ungroundedEntities.slice(0, 8).map((e, i) => (
                                <Chip
                                  key={i}
                                  label={e.entity}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  title={`${e.category}: niet gevonden in Merk Profiel KB`}
                                />
                              ))}
                            </Box>
                          )}
                          {improveResult.provenance?.signature && (
                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}
                                 title={`Provenance signature (EU AI Act): ${improveResult.provenance.signature}`}>
                              {t('contentStudio.rewriteResult.provenanceLabel', { sig: improveResult.provenance.signature.substring(0, 12) })}
                            </Box>
                          )}
                        </Box>
                      </Alert>
                    )}
                    {improveResult.soft_warning && !improveResult.hallucination_warning && (
                      <Alert severity="info" sx={{ py: 0.5, mt: 0.5 }}>
                        {t('contentStudio.rewriteResult.noInternalSources')}
                      </Alert>
                    )}
                    </>
                  )}"""


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found"); return 2

    content = PATH.read_text(encoding='utf-8')

    if "hallucinationDetected" in content:
        print("Already patched."); return 0

    cnt1 = content.count(ANCHOR)
    cnt2 = content.count(ANCHOR_ALT)

    if cnt1 == 0 and cnt2 == 0:
        print("FAIL: Neither anchor found"); return 3

    if cnt1 >= 1:
        content = content.replace(ANCHOR, REPLACEMENT, 1)
        print(f"Replaced ANCHOR ({cnt1} found)")
    if cnt2 >= 1:
        content = content.replace(ANCHOR_ALT, REPLACEMENT, 1)
        print(f"Replaced ANCHOR_ALT ({cnt2} found)")

    backup = PATH.with_suffix('.jsx.bak.v491')
    backup.write_text(PATH.read_text(encoding='utf-8'), encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
