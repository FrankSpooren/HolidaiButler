/**
 * Generate Alt-Text Handler
 *
 * POST /api/v1/admin-portal/images/generate-alt-text
 *
 * Genereert WCAG 2.1 AA-conforme alt-text voor afbeelding via Pixtral
 * vision-model + DeepL multi-locale fan-out. Output is destination-specifiek
 * (gebruikt buildBrandContextStructured voor lokale herkenningspunten).
 *
 * Input body: { imageUrl, destinationId, locale?: source-locale (default
 * destination default_language) }
 *
 * Output: { altText: { en, nl, de, es, fr }, sourceLocale, confidence,
 * provenance: { signature, model, generated_at } }
 *
 * Cost tracking: cost_logs MongoDB collection via existing CostLog model
 * (service='mistral', operation='pixtral-alt-text').
 *
 * @version BLOK F4 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';
import { translateTexts } from '../../services/translationService.js';
import { buildProvenance } from '../../services/provenanceService.js';

const COST_PER_CALL_EUR = 0.0015;
const PIXTRAL_MODEL = process.env.MISTRAL_VISION_MODEL || 'pixtral-12b-2409';
const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];

async function logCost(destId, cost) {
  try {
    const mod = await import('../../services/orchestrator/costController/models/CostLog.js').catch(() => null);
    if (!mod?.default) return;
    const CostLog = mod.default;
    await CostLog.create({
      service: 'mistral',
      operation: 'pixtral-alt-text',
      cost_eur: cost,
      destination_id: destId,
      metadata: { model: PIXTRAL_MODEL },
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn('[generate-alt-text] cost-log failed (non-blocking):', err.message);
  }
}

async function callPixtralAlt(imageUrl, brandContextString, locale) {
  const localeNames = { nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' };
  const targetLangName = localeNames[locale] || 'English';

  const systemPrompt = `You are an accessibility expert generating WCAG 2.1 AA-conforme alt-text for tourism imagery.

CRITICAL RULES:
- Output ONE concise sentence (max 125 chars).
- Output in ${targetLangName}.
- Describe WHAT is visible (geographic features, landmarks, dishes, activities)
  with destination-specific terminology from REFERENCE MATERIAL when applicable.
- Never invent landmarks not visible in the image.
- Use concrete nouns over abstractions ("Peñón de Ifach" not "large rock").
- Skip "image of" or "picture showing" prefixes (screen readers add these).
- No markdown, plain text only.`;

  const userPrompt = `BRAND CONTEXT (destination-specific terms):
${brandContextString || '(no internal sources)'}

Describe the image at this URL for alt-text in ${targetLangName}.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: [
      { type: 'text', text: userPrompt },
      { type: 'image_url', image_url: imageUrl },
    ]},
  ];

  try {
    const raw = await embeddingService.generateChatCompletion(messages, {
      model: PIXTRAL_MODEL,
      temperature: 0.4,
      maxTokens: 200,
    });
    if (typeof raw !== 'string') return null;
    return raw.trim().replace(/^["']|["']$/g, '').substring(0, 125);
  } catch (err) {
    logger.warn('[generate-alt-text] Pixtral call failed:', err.message);
    return null;
  }
}

export async function handleGenerateAltText(req, res) {
  const startedAt = Date.now();
  const { imageUrl, destinationId, locale: requestedLocale } = req.body || {};

  if (!imageUrl) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_IMAGE_URL', message: 'imageUrl required' } });
  }
  const destId = Number(destinationId || 0);
  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, default_language, supported_languages FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    let supported = [];
    try { supported = typeof dest.supported_languages === 'string' ? JSON.parse(dest.supported_languages) : (dest.supported_languages || []); } catch { /* empty */ }
    const i18nLangs = supported.filter(l => SUPPORTED_LOCALES.includes(l));
    const sourceLocale = requestedLocale && SUPPORTED_LOCALES.includes(requestedLocale)
      ? requestedLocale
      : (dest.default_language || (i18nLangs[0] || 'en'));

    const bcStruct = await buildBrandContextStructured(destId, {
      includeReferenceInString: true,
      maxKbChunks: 3,
    });

    const altSource = await callPixtralAlt(imageUrl, bcStruct.contextString, sourceLocale);
    if (!altSource) {
      return res.status(502).json({ success: false, error: { code: 'PIXTRAL_FAILED', message: 'Vision model returned no usable alt-text' } });
    }

    // DeepL fan-out naar supported_languages \ sourceLocale
    const altText = { [sourceLocale]: altSource };
    const targetLangs = i18nLangs.filter(l => l !== sourceLocale);
    if (targetLangs.length > 0) {
      try {
        const tr = await translateTexts(
          [{ key: 'alt', value: altSource }],
          sourceLocale,
          targetLangs,
          { destinationId: destId }
        );
        targetLangs.forEach(l => {
          if (tr.alt?.[l]) altText[l] = tr.alt[l];
        });
      } catch (err) {
        logger.warn('[generate-alt-text] DeepL fan-out partial fail:', err.message);
      }
    }
    // Fill missing locales met empty string voor consistente i18n-object structure
    SUPPORTED_LOCALES.forEach(l => { if (!(l in altText)) altText[l] = ''; });

    const provenance = buildProvenance({
      content: altSource,
      model: PIXTRAL_MODEL,
      operation: 'alt_text_generation',
      sourceIds: (bcStruct.sources || []).map(s => s.id).filter(Boolean),
      sourceMetadata: bcStruct.sources || [],
      validation: null,
      locale: sourceLocale,
      destinationId: destId,
    });

    // Cost-tracking (non-blocking)
    logCost(destId, COST_PER_CALL_EUR).catch(() => {});

    return res.json({
      success: true,
      data: {
        altText,
        sourceLocale,
        supported_languages: i18nLangs,
        provenance: { signature: provenance.signature, model: PIXTRAL_MODEL, generated_at: new Date().toISOString(), operation: 'alt_text_generation' },
        elapsed_ms: Date.now() - startedAt,
        confidence: bcStruct.hasInternalSources ? 'high' : 'medium',
        has_internal_sources: bcStruct.hasInternalSources,
      }
    });
  } catch (error) {
    logger.error('[generate-alt-text] error:', error);
    return res.status(500).json({ success: false, error: { code: 'ALT_TEXT_ERROR', message: error.message } });
  }
}
