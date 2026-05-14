#!/usr/bin/env python3
"""
v4.91.1 critical bug fixes — Frank productie verificatie:

A. Auto-retry score guard: only replace `improved` if retried.seo_score >= improved.seo_score
   AND retried hallucinationRate < improved hallucinationRate. Voorkomt SEO regressie.

B. Regression check: after retry loop, if final improved.seo_score < original currentSeo.overallScore,
   force AI_UNABLE pad (no false "Content verbeterd" claims).

Punt 2 (taal): add `body` (alias) + `target_language` to all 3 response paths.
Frontend kan body || body_en || body_nl fallback chain gebruiken. Non-breaking.

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/contentRedacteur/contentGenerator.js')

# ---------------------------------------------------------------------
# A + B: Update auto-retry loop in SUCCESS pad with score guard
# ---------------------------------------------------------------------
A1 = """  let improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  // v4.91.0 auto-retry: if improvement succeeded but validation fails, retry with reinforcement
  if (improved) {
    try {
      const _bcRetry = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      let _retryValidation = await _validateContent(improved.body_en || '', _bcRetry.sources || [], {
        locale: primaryLang, skipPerSentence: true,
      });
      let _retriesRun = 0;
      const MAX_HALLUCINATION_RETRIES = 2;
      while (!_retryValidation.passed && _retriesRun < MAX_HALLUCINATION_RETRIES && _retryValidation.ungroundedEntities?.length > 0) {
        _retriesRun++;
        const ungroundedList = _retryValidation.ungroundedEntities.map(e => `"${e.entity}"`).join(', ');
        const reinforcement = primaryLang === 'nl'
          ? `STRICT RETRY ${_retriesRun}: De vorige output bevatte feiten NIET in REFERENCE MATERIAL: ${ungroundedList}. Schrijf opnieuw en gebruik UITSLUITEND feiten uit REFERENCE MATERIAL. Vervang verzonnen termen door algemene bewoordingen of laat ze weg.`
          : `STRICT RETRY ${_retriesRun}: Previous output contained facts NOT in REFERENCE MATERIAL: ${ungroundedList}. Rewrite using ONLY facts from REFERENCE MATERIAL. Replace fabricated terms with generic wording.`;
        logger.info(`[improveExistingContent] Auto-retry ${_retriesRun}/${MAX_HALLUCINATION_RETRIES} (rate ${_retryValidation.hallucinationRate.toFixed(2)})`);
        const retried = await improveContent(content, currentSeo, {
          destinationId, contentType, keywords, targetPlatform: contentItem.target_platform,
          additionalInstructions: reinforcement,
        });
        if (retried && retried.body_en) {
          improved = retried;
          _retryValidation = await _validateContent(improved.body_en, _bcRetry.sources || [], {
            locale: primaryLang, skipPerSentence: true,
          });
        } else {
          break;
        }
      }
      if (_retriesRun > 0) {
        logger.info(`[improveExistingContent] Auto-retry complete: passed=${_retryValidation.passed}, rate=${_retryValidation.hallucinationRate?.toFixed(2)}, retries=${_retriesRun}`);
      }
      // attach retry result so success-branch audit uses it
      improved._retryValidation = _retryValidation;
      improved._retriesRun = _retriesRun;
    } catch (_e) {
      logger.warn('[improveExistingContent] auto-retry failed: ' + _e.message);
    }"""

R1 = """  let improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  // v4.91.0+v4.91.1 auto-retry with SCORE GUARD: retry only replaces improved if BOTH
  // score >= AND hallucination rate < previous. Prevents SEO regression (Fix A).
  if (improved) {
    try {
      const _bcRetry = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      let _retryValidation = await _validateContent(improved.body_en || '', _bcRetry.sources || [], {
        locale: primaryLang, skipPerSentence: true,
      });
      let _retriesRun = 0;
      const MAX_HALLUCINATION_RETRIES = 2;
      while (!_retryValidation.passed && _retriesRun < MAX_HALLUCINATION_RETRIES && _retryValidation.ungroundedEntities?.length > 0) {
        _retriesRun++;
        const ungroundedList = _retryValidation.ungroundedEntities.map(e => `"${e.entity}"`).join(', ');
        const reinforcement = primaryLang === 'nl'
          ? `STRICT RETRY ${_retriesRun}: De vorige output bevatte feiten NIET in REFERENCE MATERIAL: ${ungroundedList}. Schrijf opnieuw en gebruik UITSLUITEND feiten uit REFERENCE MATERIAL. Vervang verzonnen termen door algemene bewoordingen of laat ze weg.`
          : `STRICT RETRY ${_retriesRun}: Previous output contained facts NOT in REFERENCE MATERIAL: ${ungroundedList}. Rewrite using ONLY facts from REFERENCE MATERIAL. Replace fabricated terms with generic wording.`;
        logger.info(`[improveExistingContent] Auto-retry ${_retriesRun}/${MAX_HALLUCINATION_RETRIES} (rate ${_retryValidation.hallucinationRate.toFixed(2)}, current best score ${improved.seo_score})`);
        const retried = await improveContent(content, currentSeo, {
          destinationId, contentType, keywords, targetPlatform: contentItem.target_platform,
          additionalInstructions: reinforcement,
        });
        if (!retried || !retried.body_en) {
          logger.info(`[improveExistingContent] Retry ${_retriesRun} returned null (no improvement vs original)`);
          break;
        }
        // Validate retry candidate FIRST before deciding to keep
        const _retriedValidation = await _validateContent(retried.body_en, _bcRetry.sources || [], {
          locale: primaryLang, skipPerSentence: true,
        });
        // FIX A: only replace if BOTH SEO score AND hallucination rate improved
        const scoreOk = (retried.seo_score || 0) >= (improved.seo_score || 0);
        const halRateOk = (_retriedValidation.hallucinationRate || 0) < (_retryValidation.hallucinationRate || 1);
        if (scoreOk && halRateOk) {
          logger.info(`[improveExistingContent] Retry accepted: score ${improved.seo_score}->${retried.seo_score}, halRate ${_retryValidation.hallucinationRate.toFixed(2)}->${_retriedValidation.hallucinationRate.toFixed(2)}`);
          improved = retried;
          _retryValidation = _retriedValidation;
        } else {
          logger.info(`[improveExistingContent] Retry rejected: scoreOk=${scoreOk} (${improved.seo_score} vs ${retried.seo_score}), halRateOk=${halRateOk} (${_retryValidation.hallucinationRate.toFixed(2)} vs ${_retriedValidation.hallucinationRate.toFixed(2)}). Keeping previous.`);
          break;
        }
      }
      if (_retriesRun > 0) {
        logger.info(`[improveExistingContent] Auto-retry complete: passed=${_retryValidation.passed}, rate=${_retryValidation.hallucinationRate?.toFixed(2)}, retries=${_retriesRun}, finalScore=${improved.seo_score}`);
      }
      improved._retryValidation = _retryValidation;
      improved._retriesRun = _retriesRun;

      // FIX B: regression check — if final improved score < original, demote to AI_UNABLE pad
      if (improved.seo_score < currentSeo.overallScore) {
        logger.warn(`[improveExistingContent] Regression detected: improved.seo_score (${improved.seo_score}) < original (${currentSeo.overallScore}). Demoting to AI_UNABLE.`);
        improved = null;
      }
    } catch (_e) {
      logger.warn('[improveExistingContent] auto-retry failed: ' + _e.message);
    }"""

# ---------------------------------------------------------------------
# Punt 2: add body + target_language to all 3 return paths
# Path 1: SCORE_ALREADY_HIGH return
# ---------------------------------------------------------------------
A2 = """    return {
      improved: false,
      code: 'SCORE_ALREADY_HIGH',
      threshold: _minScore,
      reason: `Score already at ${currentSeo.overallScore}/100 (≥${_minScore})`,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      checks: currentSeo.checks,
      // v4.91.0 additions
      validation: _shValidation,
      provenance: _shProvenance,
      soft_warning: _shSoftWarning,
      hallucination_warning: _shValidation && !_shValidation.passed,
    };
  }"""

R2 = """    return {
      improved: false,
      code: 'SCORE_ALREADY_HIGH',
      threshold: _minScore,
      reason: `Score already at ${currentSeo.overallScore}/100 (≥${_minScore})`,
      seo_score: currentSeo.overallScore,
      seo_grade: currentSeo.grade,
      checks: currentSeo.checks,
      // v4.91.0 additions
      validation: _shValidation,
      provenance: _shProvenance,
      soft_warning: _shSoftWarning,
      hallucination_warning: _shValidation && !_shValidation.passed,
      // v4.91.1 Punt 2: language-neutral body field
      body: primaryBody || '',
      target_language: primaryLang,
    };
  }"""

# Path 2: SUCCESS return
A3 = """    return {
      improved: true,
      original_score: currentSeo.overallScore,
      final_score: improved.seo_score,
      title: improved.title,
      body_en: improved.body_en,
      meta_description: improved.meta_description,
      seo_score: improved.seo_score,
      seo_grade: improved.seo_grade,
      seo_checks: improved.seo_checks,
      improvement_details: improved.improvement_details,
      // Optie D additions
      validation: _validation,
      provenance: _provenance,
      soft_warning: _softWarning,
      hallucination_warning: _validation && !_validation.passed,
    };"""

R3 = """    return {
      improved: true,
      original_score: currentSeo.overallScore,
      final_score: improved.seo_score,
      title: improved.title,
      body_en: improved.body_en,
      meta_description: improved.meta_description,
      seo_score: improved.seo_score,
      seo_grade: improved.seo_grade,
      seo_checks: improved.seo_checks,
      improvement_details: improved.improvement_details,
      // Optie D additions
      validation: _validation,
      provenance: _provenance,
      soft_warning: _softWarning,
      hallucination_warning: _validation && !_validation.passed,
      // v4.91.1 Punt 2: language-neutral body field
      body: improved.body_en,
      target_language: primaryLang,
    };"""

# Path 3: AI_UNABLE return (with body_en already from v4.91.0)
A4 = """  return {
    improved: false,
    code: 'AI_UNABLE',
    threshold: _minScore,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
    // v4.91.0 additions: return sanitized origineel + validation
    body_en: _sanitizedOriginal,
    sanitized_original: true,
    validation: _aiUnValidation,
    provenance: _aiUnProvenance,
    soft_warning: _aiUnSoftWarning,
    hallucination_warning: _aiUnValidation && !_aiUnValidation.passed,
  };
}"""

R4 = """  return {
    improved: false,
    code: 'AI_UNABLE',
    threshold: _minScore,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
    // v4.91.0 additions: return sanitized origineel + validation
    body_en: _sanitizedOriginal,
    sanitized_original: true,
    validation: _aiUnValidation,
    provenance: _aiUnProvenance,
    soft_warning: _aiUnSoftWarning,
    hallucination_warning: _aiUnValidation && !_aiUnValidation.passed,
    // v4.91.1 Punt 2: language-neutral body field
    body: _sanitizedOriginal,
    target_language: primaryLang,
  };
}"""


PATCHES = [
    ('A+B-auto-retry-score-guard-regression-check', A1, R1),
    ('Punt2-SCORE_ALREADY_HIGH-body-lang', A2, R2),
    ('Punt2-SUCCESS-body-lang', A3, R3),
    ('Punt2-AI_UNABLE-body-lang', A4, R4),
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

    print("v4.91.1 patches:")
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.js.bak.v4911')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"\nPatched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
