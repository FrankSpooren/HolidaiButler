#!/usr/bin/env python3
"""
v4.91.0 hardening — Frank feedback fixes:
1. Validation + provenance OOK op SCORE_ALREADY_HIGH + AI_UNABLE paden (niet alleen success)
2. AI_UNABLE pad: sanitize originele body (strip bullets/em-dash) + return body_en
3. SUCCESS pad: auto-retry orchestrator (max 2 retries op hallucinatie)
4. improveContent: accept optional additionalInstructions param voor retry reinforcement
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/contentRedacteur/contentGenerator.js')

# ---------------------------------------------------------------------
# 1. improveContent signature + additionalInstructions support
# ---------------------------------------------------------------------
A1 = """async function improveContent(content, seoResult, options = {}) {
  const { destinationId, contentType, keywords = [], targetPlatform } = options;
  const MAX_ROUNDS = 2; // Two improvement rounds — balance between quality and response time
  const modelName = embeddingService.chatModel || 'mistral-small-latest';"""

R1 = """async function improveContent(content, seoResult, options = {}) {
  const { destinationId, contentType, keywords = [], targetPlatform, additionalInstructions = '' } = options;
  const MAX_ROUNDS = 2; // Two improvement rounds — balance between quality and response time
  const modelName = embeddingService.chatModel || 'mistral-small-latest';"""

# ---------------------------------------------------------------------
# 2. improveContent: inject additionalInstructions in systemPrompt
# ---------------------------------------------------------------------
A2 = """    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken (SEO/format) WHILE ensuring factual accuracy against REFERENCE MATERIAL.

${_improveHeader}"""

R2 = """    // v4.91.0: append retry reinforcement from orchestrator on failed validation rounds
    const _retryReinforcement = additionalInstructions
      ? `\\n\\n${additionalInstructions}\\n`
      : '';

    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken (SEO/format) WHILE ensuring factual accuracy against REFERENCE MATERIAL.

${_improveHeader}${_retryReinforcement}"""

# ---------------------------------------------------------------------
# 3. SCORE_ALREADY_HIGH branch: add validation + provenance (informational)
# ---------------------------------------------------------------------
A3 = """  if (currentSeo.overallScore >= _minScore) {
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

R3 = """  if (currentSeo.overallScore >= _minScore) {
    // v4.91.0: validate origineel against KB ook bij SCORE_ALREADY_HIGH (informational)
    let _shValidation = null;
    let _shProvenance = null;
    let _shSoftWarning = false;
    let _shSources = [];
    let _shHasIS = false;
    try {
      const _bc = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      _shSources = _bc.sources;
      _shHasIS = _bc.hasInternalSources;
      _shSoftWarning = !_bc.hasInternalSources;
      _shValidation = await _validateContent(primaryBody || '', _bc.sources || [], {
        locale: primaryLang, skipPerSentence: true,
      });
      _shProvenance = _buildProvenance({
        content: primaryBody || '',
        model: embeddingService.chatModel || 'mistral-small-latest',
        operation: 'improve_validate_only',
        sourceIds: (_bc.sources || []).map(s => s.id).filter(Boolean),
        sourceMetadata: _bc.sources || [],
        validation: _shValidation,
        locale: primaryLang,
        destinationId,
      });
    } catch (_e) { logger.warn('[score-high] validation/provenance failed: ' + _e.message); }

    // Audit log (with validation)
    try {
      await _mysqlForAudit.query(
        `INSERT INTO ai_generation_log
          (destination_id, content_item_id, content_type, platform, locale, operation, model,
           internal_sources_count, has_internal_sources, soft_warning_shown,
           validation_passed, validation_reasons, status, created_at)
         VALUES (:destId, :itemId, :ctype, :platform, :locale, 'improve', :model,
                 :srcCount, :hasIS, :softWarn, :validPassed, :validReasons, :status, NOW())`,
        { replacements: {
          destId: Number(destinationId) || null,
          itemId: contentItem.id || null,
          ctype: contentType,
          platform: contentItem.target_platform || null,
          locale: primaryLang,
          model: embeddingService.chatModel || null,
          srcCount: _shSources.length,
          hasIS: _shHasIS ? 1 : 0,
          softWarn: _shSoftWarning ? 1 : 0,
          validPassed: _shValidation?.passed === true ? 1 : (_shValidation?.passed === false ? 0 : null),
          validReasons: _shValidation ? JSON.stringify({
            reasons: _shValidation.reasons,
            ungrounded_entities: _shValidation.ungroundedEntities,
            hallucination_rate: _shValidation.hallucinationRate,
            entity_count: _shValidation.entityCount,
            note: 'validation on original (no AI improve needed)',
          }) : null,
          status: _shValidation?.passed === false ? 'validation_failed' : 'success',
        }}
      );
    } catch (_e) { /* audit non-blocking */ }

    return {
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

# ---------------------------------------------------------------------
# 4. SUCCESS branch: auto-retry via orchestrator
# ---------------------------------------------------------------------
A4 = """  const improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  if (improved) {
    // Optie D Layer 3 + Layer 5: validate output for hallucinations + sign provenance"""

R4 = """  let improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

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
    }

    // Optie D Layer 3 + Layer 5: validate output for hallucinations + sign provenance"""

# ---------------------------------------------------------------------
# 5. AI_UNABLE branch: sanitize origineel + validation + provenance + return body_en
# ---------------------------------------------------------------------
A5 = """  return {
    improved: false,
    code: 'AI_UNABLE',
    threshold: _minScore,
    reason: 'AI could not improve the score — manual editing recommended',
    seo_score: currentSeo.overallScore,
    seo_grade: currentSeo.grade,
    checks: currentSeo.checks,
  };
}"""

R5 = """  // v4.91.0 AI_UNABLE pad: sanitize origineel + validate + provenance + return cleaned body
  const _sanitizedOriginal = sanitizeContent(primaryBody || '', contentType, contentItem.target_platform);
  let _aiUnValidation = null;
  let _aiUnProvenance = null;
  let _aiUnSoftWarning = false;
  let _aiUnSources = [];
  let _aiUnHasIS = false;
  try {
    const _bc = await buildBrandContextStructured(destinationId, {
      contentKeywords: keywords, includeReferenceInString: false,
    });
    _aiUnSources = _bc.sources;
    _aiUnHasIS = _bc.hasInternalSources;
    _aiUnSoftWarning = !_bc.hasInternalSources;
    _aiUnValidation = await _validateContent(_sanitizedOriginal, _bc.sources || [], {
      locale: primaryLang, skipPerSentence: true,
    });
    _aiUnProvenance = _buildProvenance({
      content: _sanitizedOriginal,
      model: embeddingService.chatModel || 'mistral-small-latest',
      operation: 'improve_failed',
      sourceIds: (_bc.sources || []).map(s => s.id).filter(Boolean),
      sourceMetadata: _bc.sources || [],
      validation: _aiUnValidation,
      locale: primaryLang,
      destinationId,
    });
  } catch (_e) { logger.warn('[ai-unable] validation/provenance failed: ' + _e.message); }

  // Audit log
  try {
    await _mysqlForAudit.query(
      `INSERT INTO ai_generation_log
        (destination_id, content_item_id, content_type, platform, locale, operation, model,
         internal_sources_count, has_internal_sources, soft_warning_shown,
         validation_passed, validation_reasons, status, created_at)
       VALUES (:destId, :itemId, :ctype, :platform, :locale, 'improve', :model,
               :srcCount, :hasIS, :softWarn, :validPassed, :validReasons, :status, NOW())`,
      { replacements: {
        destId: Number(destinationId) || null,
        itemId: contentItem.id || null,
        ctype: contentType,
        platform: contentItem.target_platform || null,
        locale: primaryLang,
        model: embeddingService.chatModel || null,
        srcCount: _aiUnSources.length,
        hasIS: _aiUnHasIS ? 1 : 0,
        softWarn: _aiUnSoftWarning ? 1 : 0,
        validPassed: _aiUnValidation?.passed === true ? 1 : (_aiUnValidation?.passed === false ? 0 : null),
        validReasons: _aiUnValidation ? JSON.stringify({
          reasons: _aiUnValidation.reasons,
          ungrounded_entities: _aiUnValidation.ungroundedEntities,
          hallucination_rate: _aiUnValidation.hallucinationRate,
          entity_count: _aiUnValidation.entityCount,
          note: 'AI improvement failed - validation on sanitized original',
        }) : null,
        status: 'validation_failed',
      }}
    );
  } catch (_e) { /* audit non-blocking */ }

  return {
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


PATCHES = [
    ('improveContent-signature', A1, R1),
    ('improveContent-systemPrompt-reinforcement', A2, R2),
    ('SCORE_ALREADY_HIGH-validation', A3, R3),
    ('improveContent-auto-retry', A4, R4),
    ('AI_UNABLE-sanitize-validation', A5, R5),
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

    print("v4.91.0 patches:")
    for s in statuses: print(s)
    if content == original:
        print("\nNo changes."); return 0
    backup = PATH.with_suffix('.js.bak.v491')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"\nPatched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
