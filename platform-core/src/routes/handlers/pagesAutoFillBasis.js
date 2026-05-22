/**
 * Pages Auto-Fill Basis Handler
 *
 * POST /api/v1/admin-portal/pages/auto-fill-basis
 *
 * Genereert Tab-Basis veld-suggesties voor een nieuwe (of bestaande) pagina:
 *   - slug (URL-safe, lowercase, kebab-case)
 *   - title per supported_languages
 *   - seo_title per supported_languages (≤60 chars)
 *   - seo_description per supported_languages (≤160 chars)
 *   - og_image_url (eerste brandVisuals image van destination, indien beschikbaar)
 *
 * Werkwijze:
 *   1. Read destinations.brand_profile + branding + supported_languages + default_language.
 *   2. Indien brand_profile leeg → 422 met code 'BRAND_PROFILE_MISSING' (hint naar bootstrap).
 *   3. Mistral genereert in default_language: 1 set velden.
 *   4. DeepL vertaalt naar overige supported_languages (uit nl/en/de/es/fr).
 *   5. Validation + provenance + ai_generation_log audit.
 *   6. Return: gegenereerde velden + provenance + supportedLanguages-array.
 *
 * Integratie-first:
 *   - buildBrandContextStructured (REFERENCE block met knowledge-grounding)
 *   - embeddingService.generateChatCompletion (Mistral wrapper)
 *   - translationService.translateTexts (DeepL — existing bulk-translate)
 *   - validateContent + buildProvenance (EU AI Act)
 *
 * @version 1.0.0 — BLOK B Page Builder (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';
import { validateContent } from '../../services/outputValidator.js';
import { buildProvenance } from '../../services/provenanceService.js';
import { translateTexts } from '../../services/translationService.js';

const SUPPORTED_I18N = ['nl', 'en', 'de', 'es', 'fr'];

const SYSTEM_PROMPT = `You are an SEO-aware tourism copywriter for HolidaiButler.
Generate "page basis" fields for a destination website page. Output STRICT JSON.

CRITICAL RULES:
- Output STRICT JSON only, no markdown, no commentary.
- Ground every claim in REFERENCE MATERIAL or BRAND CONTEXT — NEVER invent landmarks/dishes/events.
- Use destination-specific local features (e.g. Calpe = "Peñón de Ifach"; Texel = "wadlopen"; etc.).
- NEVER generic tourism phrases ("ontdek de mooiste plekken", "discover the most beautiful places").
- slug: lowercase, kebab-case, ASCII only, max 60 chars.
- title: 40-65 chars, includes destination name + page topic + 1 local-USP keyword.
- seo_title: 50-60 chars, brand-aligned, destination keyword first.
- seo_description: 140-160 chars, includes call-to-action and 2 local-USP keywords.
- All fields in PRIMARY LANGUAGE only — translations are done downstream.

OUTPUT JSON SCHEMA:
{
  "slug": "kebab-case-string",
  "title": "Page title (40-65 chars)",
  "seo_title": "SEO title (50-60 chars)",
  "seo_description": "SEO description (140-160 chars)"
}`;

export async function handlePagesAutoFillBasis(req, res) {
  const startedAt = Date.now();
  let aiLogId = null;
  const destId = Number(req.body?.destinationId || req.query?.destinationId || 0);
  const pageType = String(req.body?.pageType || 'general').slice(0, 50);
  const pageTopic = String(req.body?.pageTopic || '').slice(0, 200);

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, brand_profile, branding, default_language, supported_languages
       FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    let bpObj = {};
    try { bpObj = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }
    if (!bpObj || Object.keys(bpObj).length === 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'BRAND_PROFILE_MISSING', message: 'Brand profile is empty — run POST /brand-profile/bootstrap first.' }
      });
    }

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }

    let supported = [];
    try { supported = typeof dest.supported_languages === 'string' ? JSON.parse(dest.supported_languages) : (dest.supported_languages || []); } catch { /* empty */ }
    const sourceLang = dest.default_language || (supported[0] || 'en');
    // Limit to NL/EN/DE/ES/FR for Pages-tabel kolommen (sv/pl niet in scope)
    const i18nLangs = supported.filter(l => SUPPORTED_I18N.includes(l));
    const targetLangs = i18nLangs.filter(l => l !== sourceLang);

    // buildBrandContextStructured met page-topic als keyword
    const bcStruct = await buildBrandContextStructured(destId, {
      contentKeywords: pageTopic ? [pageTopic] : [],
      includeReferenceInString: true,
      maxKbChunks: 6,
    });

    const userPrompt = [
      `DESTINATION: ${dest.display_name || dest.name}`,
      `PAGE TYPE: ${pageType}`,
      pageTopic ? `PAGE TOPIC: ${pageTopic}` : '',
      `PRIMARY LANGUAGE: ${sourceLang}`,
      `PAYOFF: ${branding.payoff || '(none)'}`,
      `TONE OF VOICE: ${branding.toneOfVoice || '(neutral)'}`,
      '',
      'BRAND CONTEXT:',
      bcStruct.contextString || '(no internal sources yet)',
      '',
      'Generate the page basis fields JSON now (STRICT JSON, PRIMARY LANGUAGE only).'
    ].filter(Boolean).join('\n');

    const modelName = embeddingService.chatModel || 'mistral-medium-latest';
    const raw = await embeddingService.generateChatCompletion(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { temperature: 0.4, maxTokens: 800, responseFormat: { type: 'json_object' } }
    );

    let generated = null;
    try {
      generated = typeof raw === 'string' ? JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) : raw;
    } catch (parseErr) {
      logger.warn('[pages-autofill] JSON parse failed:', parseErr.message);
      return res.status(502).json({ success: false, error: { code: 'AI_OUTPUT_INVALID', message: 'AI returned non-JSON output' } });
    }

    // Normaliseer slug
    const slug = String(generated.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

    // Build i18n objects (start with sourceLang from Mistral)
    const titleI18n = { [sourceLang]: String(generated.title || '').slice(0, 255) };
    const seoTitleI18n = { [sourceLang]: String(generated.seo_title || '').slice(0, 255) };
    const seoDescI18n = { [sourceLang]: String(generated.seo_description || '').slice(0, 1000) };

    // DeepL bulk translate to other supported langs
    if (targetLangs.length > 0) {
      try {
        const fields = [
          { key: 'title', value: titleI18n[sourceLang] },
          { key: 'seo_title', value: seoTitleI18n[sourceLang] },
          { key: 'seo_description', value: seoDescI18n[sourceLang] }
        ];
        const translations = await translateTexts(fields, sourceLang, targetLangs);
        for (const lang of targetLangs) {
          if (translations.title?.[lang]) titleI18n[lang] = translations.title[lang];
          if (translations.seo_title?.[lang]) seoTitleI18n[lang] = translations.seo_title[lang];
          if (translations.seo_description?.[lang]) seoDescI18n[lang] = translations.seo_description[lang];
        }
      } catch (trErr) {
        logger.warn('[pages-autofill] DeepL translate partial fail (non-blocking):', trErr.message);
      }
    }

    // OG image — eerste brandVisuals indien aanwezig
    const ogImageUrl = Array.isArray(branding.brandVisuals) && branding.brandVisuals.length > 0
      ? branding.brandVisuals[0]
      : null;

    // Validation + provenance
    const flatText = [generated.title, generated.seo_title, generated.seo_description].filter(Boolean).join(' ');
    const validation = await validateContent(flatText, bcStruct.sources || [], {
      locale: sourceLang, skipPerSentence: true,
    }).catch(err => { logger.warn('[pages-autofill] validation:', err.message); return null; });

    const provenance = buildProvenance({
      content: flatText,
      model: modelName,
      operation: 'pages_auto_fill_basis',
      sourceIds: (bcStruct.sources || []).map(s => s.id).filter(Boolean),
      sourceMetadata: bcStruct.sources || [],
      validation,
      locale: sourceLang,
      destinationId: destId,
    });

    // Audit log
    try {
      const [insertId] = await mysqlSequelize.query(
        `INSERT INTO ai_generation_log
          (destination_id, content_type, platform, locale, operation, model,
           internal_sources_count, has_internal_sources, soft_warning_shown,
           validation_passed, validation_reasons, status, created_at)
         VALUES (:destId, 'page_basis', NULL, :locale, 'pages_auto_fill_basis', :model,
                 :srcCount, :hasIS, :softWarn, :validPassed, :validReasons, :status, NOW())`,
        { replacements: {
          destId, locale: sourceLang, model: modelName,
          srcCount: (bcStruct.sources || []).length,
          hasIS: bcStruct.hasInternalSources ? 1 : 0,
          softWarn: bcStruct.hasInternalSources ? 0 : 1,
          validPassed: validation?.passed ? 1 : 0,
          validReasons: validation?.reasons ? JSON.stringify(validation.reasons).substring(0, 1000) : null,
          status: validation?.passed === false ? 'validation_failed' : 'success'
        }, type: QueryTypes.INSERT }
      );
      aiLogId = insertId;
    } catch (logErr) {
      logger.warn('[pages-autofill] ai_generation_log INSERT failed:', logErr.message);
    }

    return res.json({
      success: true,
      data: {
        slug,
        title: titleI18n,
        seo_title: seoTitleI18n,
        seo_description: seoDescI18n,
        og_image_url: ogImageUrl,
        supported_languages: i18nLangs,
        default_language: sourceLang,
        provenance: { signature: provenance.signature, model: modelName, generated_at: new Date().toISOString(), operation: 'pages_auto_fill_basis' },
        validation: {
          passed: validation?.passed ?? null,
          ungrounded_entities: validation?.ungroundedEntities || [],
          hallucination_rate: validation?.hallucinationRate ?? null,
          reasons: validation?.reasons || []
        },
        sources_count: (bcStruct.sources || []).length,
        has_internal_sources: bcStruct.hasInternalSources,
        elapsed_ms: Date.now() - startedAt,
        ai_generation_log_id: aiLogId
      }
    });
  } catch (error) {
    logger.error('[pages-autofill] error:', error);
    return res.status(500).json({ success: false, error: { code: 'AUTOFILL_ERROR', message: error.message } });
  }
}
