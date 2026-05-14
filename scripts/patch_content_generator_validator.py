#!/usr/bin/env python3
"""
Wire Output Validator + Provenance into contentGenerator.js
(Optie D D-2 + Layer 5 integration)

Patches:
1. Add imports for outputValidator, provenanceService, aiQualityOrchestrator
2. improveExistingContent: validate + provenance on success path
3. generateContent: validate + provenance on primary content

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/contentRedacteur/contentGenerator.js')

# ---------------------------------------------------------------------
# 1. Add imports
# ---------------------------------------------------------------------
A1 = "import { buildBrandContext, buildBrandContextStructured } from './brandContext.js';"
R1 = """import { buildBrandContext, buildBrandContextStructured } from './brandContext.js';
import { validateContent as _validateContent } from '../../outputValidator.js';
import { buildProvenance as _buildProvenance } from '../../provenanceService.js';
import { validateAndRetryWithProvenance as _validateRetry } from '../../aiQualityOrchestrator.js';"""

# ---------------------------------------------------------------------
# 2. improveExistingContent success path — validate + provenance
# ---------------------------------------------------------------------
A2 = """  const improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  if (improved) {
    return {
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
    };
  }"""

R2 = """  const improved = await improveContent(content, currentSeo, { destinationId, contentType, keywords, targetPlatform: contentItem.target_platform });

  if (improved) {
    // Optie D Layer 3 + Layer 5: validate output for hallucinations + sign provenance
    let _validation = null;
    let _provenance = null;
    let _softWarning = false;
    try {
      const _bc = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      _softWarning = !_bc.hasInternalSources;
      _validation = await _validateContent(improved.body_en || '', _bc.sources || [], {
        locale: contentItem.target_language || contentItem.language || 'nl',
        skipPerSentence: true, // performance: NER + grounding only on hot path
      });
      _provenance = _buildProvenance({
        content: improved.body_en || '',
        model: embeddingService.chatModel || 'mistral-small-latest',
        operation: 'improve',
        sourceIds: (_bc.sources || []).map(s => s.id).filter(Boolean),
        sourceMetadata: _bc.sources || [],
        validation: _validation,
        locale: contentItem.target_language || contentItem.language || 'nl',
        destinationId,
      });
      // Audit log (non-blocking)
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
            locale: contentItem.target_language || contentItem.language || 'nl',
            model: embeddingService.chatModel || null,
            srcCount: (_bc.sources || []).length,
            hasIS: _bc.hasInternalSources ? 1 : 0,
            softWarn: _softWarning ? 1 : 0,
            validPassed: _validation?.passed === true ? 1 : (_validation?.passed === false ? 0 : null),
            validReasons: _validation ? JSON.stringify({
              reasons: _validation.reasons,
              ungrounded_entities: _validation.ungroundedEntities,
              hallucination_rate: _validation.hallucinationRate,
              entity_count: _validation.entityCount,
            }) : null,
            status: _validation?.passed === false ? 'validation_failed' : 'success',
          }}
        );
      } catch (_logErr) { logger.warn('[improveExistingContent] audit log failed: ' + _logErr.message); }
    } catch (_e) {
      logger.warn('[improveExistingContent] validation/provenance failed: ' + _e.message);
    }

    return {
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
    };
  }"""

# ---------------------------------------------------------------------
# 3. generateContent — validate + provenance after primary content gen
# Anchor near the end of generateContent (just before return)
# Look for distinctive marker
# ---------------------------------------------------------------------
A3 = """    // Sanitize — safety net strips any remaining markdown artifacts
    const sanitizedBody = sanitizeContent(body, contentType, platform);"""

R3 = """    // Sanitize — safety net strips any remaining markdown artifacts
    const sanitizedBody = sanitizeContent(body, contentType, platform);

    // Optie D Layer 3 + Layer 5: validate + sign provenance (non-blocking)
    let _genValidation = null;
    let _genProvenance = null;
    let _genSoftWarning = false;
    try {
      const _bcStruct = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      _genSoftWarning = !_bcStruct.hasInternalSources;
      _genValidation = await _validateContent(sanitizedBody || '', _bcStruct.sources || [], {
        locale: destSourceLang, skipPerSentence: true,
      });
      _genProvenance = _buildProvenance({
        content: sanitizedBody || '',
        model: modelName,
        operation: 'generate',
        sourceIds: (_bcStruct.sources || []).map(s => s.id).filter(Boolean),
        sourceMetadata: _bcStruct.sources || [],
        validation: _genValidation,
        locale: destSourceLang,
        destinationId,
      });
      try {
        await _mysqlForAudit.query(
          `INSERT INTO ai_generation_log
            (destination_id, content_type, platform, locale, operation, model,
             internal_sources_count, has_internal_sources, soft_warning_shown,
             validation_passed, validation_reasons, status, created_at)
           VALUES (:destId, :ctype, :platform, :locale, 'generate', :model,
                   :srcCount, :hasIS, :softWarn, :validPassed, :validReasons, :status, NOW())`,
          { replacements: {
            destId: Number(destinationId) || null,
            ctype: contentType,
            platform: platform || null,
            locale: destSourceLang,
            model: modelName,
            srcCount: (_bcStruct.sources || []).length,
            hasIS: _bcStruct.hasInternalSources ? 1 : 0,
            softWarn: _genSoftWarning ? 1 : 0,
            validPassed: _genValidation?.passed === true ? 1 : (_genValidation?.passed === false ? 0 : null),
            validReasons: _genValidation ? JSON.stringify({
              reasons: _genValidation.reasons,
              ungrounded_entities: _genValidation.ungroundedEntities,
              hallucination_rate: _genValidation.hallucinationRate,
              entity_count: _genValidation.entityCount,
            }) : null,
            status: _genValidation?.passed === false ? 'validation_failed' : 'success',
          }}
        );
      } catch (_logErr) { /* non-blocking */ }
    } catch (_e) {
      logger.warn('[generateContent] validation/provenance failed: ' + _e.message);
    }"""


PATCHES = [
    ('imports', A1, R1),
    ('improveExistingContent-validate', A2, R2),
    ('generateContent-validate', A3, R3),
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
        print(f"ERROR: {PATH} not found")
        return 2

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

    print("Patch results:")
    for s in statuses: print(s)

    if content == original:
        print("\nNo changes.")
        return 0

    backup = PATH.with_suffix('.js.bak.validator')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"\nPatched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
