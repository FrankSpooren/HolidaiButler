/**
 * Brand Profile Bootstrap Handler
 *
 * POST /api/v1/admin-portal/brand-profile/bootstrap
 *
 * Genereert volledige brand_profile JSON voor destination via:
 *   - destinations.branding (payoff, toneOfVoice, lat/lng, brandName, navicon, etc.)
 *   - brand_knowledge items (PDF/URL/text uploaded via existing Knowledge Base)
 *   - top-N POIs voor lokale herkenningspunten
 *   - destination naam + supported_languages + default_language
 *
 * Output: 7 brand_profile-velden (company_description, industry, usps, mission,
 * vision, core_values, seo_keywords, content_goals) met provenance + validation +
 * audit log naar ai_generation_log. NIET auto-opgeslagen: reviewer moet via
 * bestaande PUT /brand-profile accepteren.
 *
 * Integratie-first:
 *   - buildBrandContextStructured (reeds in alle AI-paden)
 *   - embeddingService.generateChatCompletion (Mistral wrapper)
 *   - validateContent (outputValidator.js — Layer 3 NER grounding)
 *   - buildProvenance + saveProvenance (EU AI Act Article 50 signature)
 *   - ai_generation_log INSERT pattern (contentGenerator.js precedent)
 *
 * @version 1.0.0 — BLOK B Page Builder optimization (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/embeddingService.js';
import { validateContent } from '../../services/outputValidator.js';
import { buildProvenance } from '../../services/provenanceService.js';

const SYSTEM_PROMPT = `You are a brand strategist for HolidaiButler, a hyper-local AI-powered tourism platform.
Your task: generate a complete BRAND PROFILE JSON for the given destination, grounded ONLY in REFERENCE MATERIAL provided.

CRITICAL RULES:
- Output STRICT JSON only, no markdown, no commentary.
- Do NOT invent facts not present in the REFERENCE MATERIAL.
- Use destination-specific local features (landmarks, traditions, geography) — NEVER generic tourism phrases ("discover the most beautiful places", "your ideal getaway").
- USPs must name concrete local differentiators (e.g. "Peñón de Ifach climbing trails" not "stunning views").
- Match the destination's primary language for tone reference.
- content_goals: blogs_per_month and posts_per_week as integers (sensible defaults: 4 / 5).

OUTPUT JSON SCHEMA:
{
  "company_description": "2-3 sentence positioning of the destination",
  "industry": "tourism subsector (e.g. 'coastal Mediterranean tourism', 'wadden island ecotourism')",
  "usps": ["3-5 concrete local differentiators"],
  "mission": "1 sentence purpose statement",
  "vision": "1 sentence aspirational outcome",
  "core_values": ["3-5 values rooted in local culture/character"],
  "seo_keywords": ["8-12 long-tail destination-specific keywords"],
  "content_goals": { "blogs_per_month": int, "posts_per_week": int }
}`;

function getBrandDestId(req) {
  return Number(req.query.destinationId || req.body?.destinationId || req.user?.destinationScope || 0);
}

export async function handleBrandProfileBootstrap(req, res) {
  const startedAt = Date.now();
  let aiLogId = null;
  const destId = getBrandDestId(req);

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    // 1. Read destination + check brand_profile state (unless forceRegenerate)
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, brand_profile, branding, default_language, supported_languages
       FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    let bpExisting = {};
    try { bpExisting = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }
    const isEmpty = !bpExisting || Object.keys(bpExisting).length === 0;
    if (!isEmpty && !req.body?.forceRegenerate) {
      return res.status(409).json({
        success: false,
        error: { code: 'BRAND_PROFILE_EXISTS', message: 'Brand profile already populated. Set forceRegenerate=true to overwrite.' }
      });
    }

    // 2. Parse branding for tone/payoff hints
    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }

    // 3. Read top-30 POIs as local-feature signal
    const [pois] = await mysqlSequelize.query(
      `SELECT name, category, description_en FROM poi
       WHERE destination_id = :destId AND status = 'published'
       ORDER BY rating DESC, review_count DESC LIMIT 30`,
      { replacements: { destId } }
    ).catch(() => [[]]);

    // 4. buildBrandContextStructured for knowledge + sources
    const bcStruct = await buildBrandContextStructured(destId, {
      includeReferenceInString: true,
      maxKbChunks: 8,
    });

    const sourceLang = dest.default_language || 'en';

    // 5. Build user prompt
    const poiList = (pois || []).slice(0, 15).map(p => `- ${p.name} (${p.category || 'attraction'})`).join('\n');
    const userPrompt = [
      `DESTINATION: ${dest.display_name || dest.name}`,
      `PAYOFF: ${branding.payoff || '(none)'}`,
      `TONE OF VOICE: ${branding.toneOfVoice || '(neutral, warm, informative)'}`,
      `PRIMARY LANGUAGE: ${sourceLang}`,
      '',
      'BRAND CONTEXT FROM KNOWLEDGE BASE:',
      bcStruct.contextString || '(no internal sources yet)',
      '',
      'TOP LOCAL POIs (for grounding USPs and SEO keywords):',
      poiList || '(no POIs registered yet)',
      '',
      'Generate the brand_profile JSON now (STRICT JSON, no markdown).'
    ].join('\n');

    // 6. Mistral call (JSON mode)
    const modelName = embeddingService.chatModel || 'mistral-medium-latest';
    const raw = await embeddingService.generateChatCompletion(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { temperature: 0.5, maxTokens: 1800, responseFormat: { type: 'json_object' } }
    );

    let generated = null;
    try {
      generated = typeof raw === 'string' ? JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) : raw;
    } catch (parseErr) {
      logger.warn('[brand-bootstrap] JSON parse failed:', parseErr.message);
      return res.status(502).json({ success: false, error: { code: 'AI_OUTPUT_INVALID', message: 'AI returned non-JSON output' } });
    }

    // 7. Validate (Layer 3 NER grounding against sources)
    const flatText = [
      generated.company_description, generated.industry, generated.mission, generated.vision,
      ...(Array.isArray(generated.usps) ? generated.usps : []),
      ...(Array.isArray(generated.core_values) ? generated.core_values : []),
      ...(Array.isArray(generated.seo_keywords) ? generated.seo_keywords : [])
    ].filter(Boolean).join(' ');

    const validation = await validateContent(flatText, bcStruct.sources || [], {
      locale: sourceLang, skipPerSentence: true,
    }).catch(err => { logger.warn('[brand-bootstrap] validation failed:', err.message); return null; });

    // 8. Build provenance (EU AI Act Article 50 signature)
    const provenance = buildProvenance({
      content: flatText,
      model: modelName,
      operation: 'brand_profile_bootstrap',
      sourceIds: (bcStruct.sources || []).map(s => s.id).filter(Boolean),
      sourceMetadata: bcStruct.sources || [],
      validation,
      locale: sourceLang,
      destinationId: destId,
    });

    // 9. Audit log to ai_generation_log
    try {
      const [insertId] = await mysqlSequelize.query(
        `INSERT INTO ai_generation_log
          (destination_id, content_type, platform, locale, operation, model,
           internal_sources_count, has_internal_sources, soft_warning_shown,
           validation_passed, validation_reasons, status, created_at)
         VALUES (:destId, 'brand_profile', NULL, :locale, 'brand_profile_bootstrap', :model,
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
      logger.warn('[brand-bootstrap] ai_generation_log INSERT failed (non-blocking):', logErr.message);
    }

    // 10. Response — reviewer must accept via existing PUT /brand-profile
    return res.json({
      success: true,
      data: {
        generated,
        provenance: { signature: provenance.signature, model: modelName, generated_at: new Date().toISOString(), operation: 'brand_profile_bootstrap' },
        validation: {
          passed: validation?.passed ?? null,
          ungrounded_entities: validation?.ungroundedEntities || [],
          hallucination_rate: validation?.hallucinationRate ?? null,
          reasons: validation?.reasons || []
        },
        sources_used: (bcStruct.sources || []).map(s => ({ id: s.id, source_name: s.source_name, source_url: s.source_url, source_type: s.source_type })),
        sources_count: (bcStruct.sources || []).length,
        has_internal_sources: bcStruct.hasInternalSources,
        elapsed_ms: Date.now() - startedAt,
        ai_generation_log_id: aiLogId
      }
    });
  } catch (error) {
    logger.error('[brand-bootstrap] error:', error);
    return res.status(500).json({ success: false, error: { code: 'BOOTSTRAP_ERROR', message: error.message } });
  }
}
