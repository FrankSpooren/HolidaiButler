/**
 * AI Quality Orchestrator — Optie D integration layer
 *
 * Wraps AI generation calls with:
 *   - Output validation (NER + per-sentence similarity)
 *   - Auto-retry with reinforced prompts on hallucination
 *   - Provenance signing (EU AI Act Layer 5)
 *   - Audit logging to ai_generation_log
 *
 * Used by all 5 AI generate paths in contentGenerator.js.
 *
 * @module aiQualityOrchestrator
 * @version 1.0.0
 */

import { validateContent } from './outputValidator.js';
import { buildProvenance } from './provenanceService.js';
import featureFlagService from './featureFlagService.js';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_HALLUCINATION_THRESHOLD = 0.10;

/**
 * Validate generated content, retry on failure, build provenance, log audit.
 *
 * @param {Object} params
 * @param {string} params.text - Generated content
 * @param {Array} params.sources - brand_knowledge sources used in generation
 * @param {Function} params.regenerateFn - async fn(reinforcement: string) → returns new text (for retry)
 * @param {Object} params.context - { destinationId, contentItemId, contentType, platform, locale, operation, model, userId }
 * @param {Object} [params.options]
 * @param {number} [params.options.maxRetries=2]
 * @param {boolean} [params.options.skipPerSentence=true] - skip Layer 3+ per default (latency)
 * @returns {Promise<{text, validation, provenance, retries, softWarning}>}
 */
export async function validateAndRetryWithProvenance(params) {
  const { text, sources, regenerateFn, context = {}, options = {} } = params;
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    skipPerSentence = true,
  } = options;

  const {
    destinationId = null,
    contentItemId = null,
    contentType = null,
    platform = null,
    locale = 'en',
    operation = 'generate',
    model = null,
    userId = null,
  } = context;

  const startedAt = Date.now();

  // Resolve hallucination threshold from feature flag (per-destination override allowed)
  let threshold = DEFAULT_HALLUCINATION_THRESHOLD;
  try {
    const flagVal = await featureFlagService.getValue('ai_content.hallucination_threshold', {
      scopeType: 'destination', scopeId: Number(destinationId) || 0, fallback: DEFAULT_HALLUCINATION_THRESHOLD,
    });
    if (typeof flagVal === 'number' && flagVal >= 0 && flagVal <= 1) threshold = flagVal;
  } catch (_e) { /* use default */ }

  let currentText = text;
  let validation = await validateContent(currentText, sources, {
    locale, hallucinationThreshold: threshold, skipPerSentence,
  });
  let retries = 0;

  // Retry loop on validation failure
  while (!validation.passed && retries < maxRetries && typeof regenerateFn === 'function') {
    retries++;
    const reinforcement = buildReinforcementInstruction(validation, locale);
    logger.info(`[AIQuality] Validation failed (retry ${retries}/${maxRetries}). Hallucination rate: ${validation.hallucinationRate.toFixed(2)}. Ungrounded: ${validation.ungroundedEntities.map(e => e.entity).join(', ')}`);

    try {
      const retried = await regenerateFn(reinforcement);
      if (retried && retried.length > 20) {
        currentText = retried;
        validation = await validateContent(currentText, sources, {
          locale, hallucinationThreshold: threshold, skipPerSentence,
        });
      } else {
        break;
      }
    } catch (err) {
      logger.warn(`[AIQuality] Retry ${retries} failed: ${err.message}`);
      break;
    }
  }

  // Build provenance
  const sourceIds = sources.map(s => s.brand_knowledge_id || s.id).filter(Boolean);
  const provenance = buildProvenance({
    content: currentText,
    model: model || 'unknown',
    operation,
    sourceIds,
    sourceMetadata: sources,
    validation,
    locale,
    destinationId,
  });

  // Soft warning if hasInternalSources was false (no KB)
  const softWarning = sources.length === 0;

  // Audit log
  await writeAuditLog({
    destinationId, contentItemId, contentType, platform, locale, operation, model,
    sources, validation, retries, softWarning, userId,
    durationMs: Date.now() - startedAt,
  });

  return {
    text: currentText,
    validation,
    provenance,
    retries,
    softWarning,
  };
}

/**
 * Build a reinforcement instruction for retry, based on what failed validation.
 */
function buildReinforcementInstruction(validation, locale) {
  const lang = locale.slice(0, 2);
  const ungrounded = validation.ungroundedEntities.map(e => `"${e.entity}"`).join(', ');

  const messages = {
    nl: `STRICT RETRY: De vorige output bevatte specifieke feiten die NIET in het REFERENCE MATERIAL staan: ${ungrounded}. Schrijf opnieuw en gebruik UITSLUITEND feiten uit het REFERENCE MATERIAL. Vervang verzonnen termen door algemene bewoordingen of laat ze weg.`,
    en: `STRICT RETRY: The previous output contained specific facts NOT in REFERENCE MATERIAL: ${ungrounded}. Rewrite using ONLY facts from REFERENCE MATERIAL. Replace fabricated terms with generic wording or omit them.`,
    de: `STRICT RETRY: Die vorherige Ausgabe enthielt spezifische Fakten, die NICHT im REFERENCE MATERIAL stehen: ${ungrounded}. Schreibe neu und verwende AUSSCHLIESSLICH Fakten aus dem REFERENCE MATERIAL.`,
    fr: `STRICT RETRY : La sortie précédente contenait des faits spécifiques NON présents dans le REFERENCE MATERIAL : ${ungrounded}. Réécris en utilisant UNIQUEMENT les faits du REFERENCE MATERIAL.`,
    es: `STRICT RETRY: La salida anterior contenía hechos específicos NO presentes en el REFERENCE MATERIAL: ${ungrounded}. Reescribe usando SOLO hechos del REFERENCE MATERIAL.`,
  };

  return messages[lang] || messages.en;
}

/**
 * Write to ai_generation_log table (non-blocking).
 */
async function writeAuditLog(entry) {
  try {
    await mysqlSequelize.query(
      `INSERT INTO ai_generation_log
        (destination_id, content_item_id, content_type, platform, locale, operation, model,
         internal_sources_count, external_sources_used, has_internal_sources,
         soft_warning_shown, validation_passed, validation_reasons,
         duration_ms, status, user_id, created_at)
       VALUES
        (:destId, :itemId, :ctype, :platform, :locale, :op, :model,
         :sourceCount, 0, :hasIS,
         :softWarn, :validPassed, :validReasons,
         :duration, :status, :userId, NOW())`,
      {
        replacements: {
          destId: entry.destinationId || null,
          itemId: entry.contentItemId || null,
          ctype: entry.contentType || null,
          platform: entry.platform || null,
          locale: entry.locale || null,
          op: entry.operation || 'generate',
          model: entry.model || null,
          sourceCount: Array.isArray(entry.sources) ? entry.sources.length : 0,
          hasIS: Array.isArray(entry.sources) && entry.sources.length > 0 ? 1 : 0,
          softWarn: entry.softWarning ? 1 : 0,
          validPassed: entry.validation?.passed === true ? 1 : (entry.validation?.passed === false ? 0 : null),
          validReasons: entry.validation?.reasons ? JSON.stringify({
            reasons: entry.validation.reasons,
            ungrounded_entities: entry.validation.ungroundedEntities || [],
            hallucination_rate: entry.validation.hallucinationRate || 0,
            entity_count: entry.validation.entityCount || 0,
            retries: entry.retries || 0,
          }) : null,
          duration: entry.durationMs || null,
          status: entry.validation?.passed === false ? 'validation_failed' : 'success',
          userId: entry.userId || null,
        },
      }
    );
  } catch (err) {
    // Audit failure must not break generation
    logger.warn(`[AIQuality] Audit log write failed: ${err.message}`);
  }
}

export default { validateAndRetryWithProvenance };
