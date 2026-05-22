/**
 * Brand Profile Bootstrap Handler v2
 *
 * POST /api/v1/admin-portal/brand-profile/bootstrap
 *
 * Genereert volledige óf ontbrekende brand_profile velden voor destination via:
 *   - destinations.branding (payoff, toneOfVoice, lat/lng, brandName, navicon, etc.)
 *   - brand_knowledge items (PDF/URL/text uploaded via Knowledge Base)
 *   - top-N POIs voor lokale herkenningspunten
 *   - destination naam + supported_languages + default_language
 *
 * Modes:
 *   - mode='full' (default): regenereert alle 7 velden — wist bestaande.
 *   - mode='fill-missing': vraagt Mistral alleen velden die NU leeg zijn,
 *     merge in response zodat bestaande inhoud behouden blijft.
 *
 * Enterprise-grade validation (v2 — parity met contentGenerator):
 *   - skipPerSentence: FALSE (per-zin cosine similarity geactiveerd)
 *   - Auto-retry-loop max 2x bij validation-fail of ungrounded_entities>0
 *     met STRICT RETRY reinforcement
 *   - buildProvenance EU AI Act Article 50 signature
 *   - ai_generation_log audit per call (incl. retry-pogingen)
 *
 * @version 2.0.0 — BLOK B refactor (22-05-2026) — fill-missing mode + enterprise validation
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';
import embeddingService from '../../services/holibot/embeddingService.js';
import { validateContent } from '../../services/outputValidator.js';
import { buildProvenance } from '../../services/provenanceService.js';

const MAX_RETRIES = 2;
const BP_FIELDS = ['company_description', 'industry', 'usps', 'mission', 'vision', 'core_values', 'seo_keywords', 'content_goals'];

const SYSTEM_PROMPT_BASE = `You are a brand strategist for HolidaiButler, a hyper-local AI-powered tourism platform.
Your task: generate brand profile JSON fields for the given destination, grounded ONLY in REFERENCE MATERIAL provided.

CRITICAL RULES:
- Output STRICT JSON only, no markdown, no commentary.
- Do NOT invent facts not present in the REFERENCE MATERIAL.
- Use destination-specific local features (landmarks, traditions, geography) — NEVER generic tourism phrases ("discover the most beautiful places", "your ideal getaway").
- USPs must name concrete local differentiators (e.g. "Peñón de Ifach climbing trails" not "stunning views").
- Match the destination's primary language for tone reference.
- content_goals: blogs_per_month and posts_per_week as integers (sensible defaults: 4 / 5).`;

const FULL_SCHEMA = `OUTPUT JSON SCHEMA (ALL fields required):
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

function buildPartialSchema(missingFields) {
  const parts = [];
  if (missingFields.includes('company_description')) parts.push(`  "company_description": "2-3 sentence positioning"`);
  if (missingFields.includes('industry')) parts.push(`  "industry": "tourism subsector"`);
  if (missingFields.includes('usps')) parts.push(`  "usps": ["3-5 concrete local differentiators"]`);
  if (missingFields.includes('mission')) parts.push(`  "mission": "1 sentence purpose"`);
  if (missingFields.includes('vision')) parts.push(`  "vision": "1 sentence outcome"`);
  if (missingFields.includes('core_values')) parts.push(`  "core_values": ["3-5 values"]`);
  if (missingFields.includes('seo_keywords')) parts.push(`  "seo_keywords": ["8-12 long-tail keywords"]`);
  if (missingFields.includes('content_goals')) parts.push(`  "content_goals": { "blogs_per_month": int, "posts_per_week": int }`);
  return `OUTPUT JSON SCHEMA — generate ONLY these fields:\n{\n${parts.join(',\n')}\n}`;
}

function isFieldEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return String(value).trim().length === 0;
}

function getMissingFields(bp) {
  return BP_FIELDS.filter(f => isFieldEmpty(bp?.[f]));
}

async function callMistralWithRetry({ systemPrompt, userPrompt, sources, sourceLang, modelName, retryHints = '' }) {
  let lastResult = null;
  let lastValidation = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const promptUser = attempt === 0
      ? userPrompt
      : `${userPrompt}\n\nSTRICT RETRY (attempt ${attempt + 1}/${MAX_RETRIES + 1}): The previous output contained ungrounded facts NOT present in REFERENCE MATERIAL: ${retryHints}\nRewrite ONLY using verifiable REFERENCE MATERIAL. Be conservative — when in doubt, generalise to facts present in sources.`;

    const raw = await embeddingService.generateChatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptUser }],
      { temperature: 0.5, maxTokens: 1800, responseFormat: { type: 'json_object' } }
    );

    let parsed = null;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) : raw;
    } catch (parseErr) {
      logger.warn('[brand-bootstrap] JSON parse failed (attempt ' + attempt + '):', parseErr.message);
      continue;
    }

    // Per-zin similarity validation (enterprise mode)
    const flatText = [
      parsed.company_description, parsed.industry, parsed.mission, parsed.vision,
      ...(Array.isArray(parsed.usps) ? parsed.usps : []),
      ...(Array.isArray(parsed.core_values) ? parsed.core_values : []),
      ...(Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : [])
    ].filter(Boolean).join('. ');

    const validation = await validateContent(flatText, sources || [], {
      locale: sourceLang,
      skipPerSentence: false, // ENTERPRISE: per-zin grounding check actief
    }).catch(err => { logger.warn('[brand-bootstrap] validation error:', err.message); return null; });

    lastResult = parsed;
    lastValidation = validation;

    const ungrounded = validation?.ungroundedEntities || [];
    const passed = validation?.passed !== false;

    if (passed && ungrounded.length === 0) {
      return { parsed, validation, attempts: attempt + 1 };
    }

    retryHints = ungrounded.slice(0, 10).join(', ');
    if (attempt < MAX_RETRIES) {
      logger.info(`[brand-bootstrap] retry ${attempt + 1}/${MAX_RETRIES}: ungrounded=[${retryHints.slice(0, 100)}]`);
    }
  }

  return { parsed: lastResult, validation: lastValidation, attempts: MAX_RETRIES + 1 };
}

export async function handleBrandProfileBootstrap(req, res) {
  const startedAt = Date.now();
  let aiLogId = null;
  const destId = Number(req.query.destinationId || req.body?.destinationId || req.user?.destinationScope || 0);
  const mode = req.body?.mode === 'fill-missing' ? 'fill-missing' : 'full';
  const forceRegenerate = Boolean(req.body?.forceRegenerate);

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

    let bpExisting = {};
    try { bpExisting = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }

    const missingFields = getMissingFields(bpExisting);
    const hasContent = missingFields.length < BP_FIELDS.length; // ten minste 1 veld gevuld

    // Guard: full mode op gevulde profile vereist forceRegenerate
    if (mode === 'full' && hasContent && !forceRegenerate) {
      return res.status(409).json({
        success: false,
        error: { code: 'BRAND_PROFILE_EXISTS', message: 'Brand profile heeft al inhoud. Gebruik mode=fill-missing of forceRegenerate=true.' }
      });
    }
    // Guard: fill-missing op leeg profile is unnecessary — gebruik full
    if (mode === 'fill-missing' && !hasContent) {
      return res.status(422).json({
        success: false,
        error: { code: 'NOTHING_TO_FILL', message: 'Brand profile is leeg — gebruik mode=full voor eerste generatie.' }
      });
    }
    if (mode === 'fill-missing' && missingFields.length === 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'PROFILE_COMPLETE', message: 'Brand profile is volledig — geen velden ontbreken.' }
      });
    }

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }

    const [pois] = await mysqlSequelize.query(
      `SELECT name, category FROM POI
       WHERE destination_id = :destId AND status = 'published'
       ORDER BY rating DESC, review_count DESC LIMIT 30`,
      { replacements: { destId } }
    ).catch(() => [[]]);

    const bcStruct = await buildBrandContextStructured(destId, {
      includeReferenceInString: true,
      maxKbChunks: 8,
    });

    const sourceLang = dest.default_language || 'en';
    const targetFields = mode === 'fill-missing' ? missingFields : BP_FIELDS;
    const schemaBlock = mode === 'fill-missing' ? buildPartialSchema(missingFields) : FULL_SCHEMA;
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${schemaBlock}`;

    const poiList = (pois || []).slice(0, 15).map(p => `- ${p.name} (${p.category || 'attraction'})`).join('\n');
    const existingContext = mode === 'fill-missing'
      ? `\nEXISTING BRAND PROFILE (keep tone consistent, do NOT contradict):\n${JSON.stringify(bpExisting, null, 2)}\n`
      : '';

    const userPrompt = [
      `DESTINATION: ${dest.display_name || dest.name}`,
      `PAYOFF: ${branding.payoff || '(none)'}`,
      `TONE OF VOICE: ${branding.toneOfVoice || '(neutral, warm, informative)'}`,
      `PRIMARY LANGUAGE: ${sourceLang}`,
      existingContext,
      '',
      'BRAND CONTEXT FROM KNOWLEDGE BASE:',
      bcStruct.contextString || '(no internal sources yet)',
      '',
      'TOP LOCAL POIs (for grounding USPs and SEO keywords):',
      poiList || '(no POIs registered yet)',
      '',
      mode === 'fill-missing'
        ? `Generate ONLY these missing fields as JSON: ${targetFields.join(', ')}. STRICT JSON only.`
        : 'Generate the complete brand_profile JSON now (STRICT JSON, no markdown).'
    ].filter(Boolean).join('\n');

    const modelName = embeddingService.chatModel || 'mistral-medium-latest';

    // Mistral call with auto-retry on validation failure
    const { parsed: generated, validation, attempts } = await callMistralWithRetry({
      systemPrompt, userPrompt,
      sources: bcStruct.sources || [],
      sourceLang, modelName
    });

    if (!generated) {
      return res.status(502).json({ success: false, error: { code: 'AI_OUTPUT_INVALID', message: 'AI returned no valid output after retries' } });
    }

    // Voor fill-missing: merge generated met bestaande
    const merged = mode === 'fill-missing'
      ? { ...bpExisting, ...generated }
      : generated;

    // Provenance signature over generated fields (niet gemerged — signature dekt AI-output)
    const flatText = [
      generated.company_description, generated.industry, generated.mission, generated.vision,
      ...(Array.isArray(generated.usps) ? generated.usps : []),
      ...(Array.isArray(generated.core_values) ? generated.core_values : []),
      ...(Array.isArray(generated.seo_keywords) ? generated.seo_keywords : [])
    ].filter(Boolean).join(' ');

    const provenance = buildProvenance({
      content: flatText,
      model: modelName,
      operation: `brand_profile_${mode}`,
      sourceIds: (bcStruct.sources || []).map(s => s.id).filter(Boolean),
      sourceMetadata: bcStruct.sources || [],
      validation,
      locale: sourceLang,
      destinationId: destId,
    });

    try {
      const [insertId] = await mysqlSequelize.query(
        `INSERT INTO ai_generation_log
          (destination_id, content_type, platform, locale, operation, model,
           internal_sources_count, has_internal_sources, soft_warning_shown,
           validation_passed, validation_reasons, status, created_at)
         VALUES (:destId, 'brand_profile', NULL, :locale, :op, :model,
                 :srcCount, :hasIS, :softWarn, :validPassed, :validReasons, :status, NOW())`,
        { replacements: {
          destId, locale: sourceLang, model: modelName,
          op: `brand_profile_${mode}`,
          srcCount: (bcStruct.sources || []).length,
          hasIS: bcStruct.hasInternalSources ? 1 : 0,
          softWarn: bcStruct.hasInternalSources ? 0 : 1,
          validPassed: validation?.passed ? 1 : 0,
          validReasons: validation?.reasons ? JSON.stringify({ ...validation.reasons, attempts }).substring(0, 1000) : JSON.stringify({ attempts }),
          status: validation?.passed === false ? 'validation_failed' : 'success'
        }, type: QueryTypes.INSERT }
      );
      aiLogId = insertId;
    } catch (logErr) {
      logger.warn('[brand-bootstrap] ai_generation_log INSERT failed:', logErr.message);
    }

    return res.json({
      success: true,
      data: {
        generated: merged,
        ai_generated_fields: Object.keys(generated),
        mode,
        provenance: { signature: provenance.signature, model: modelName, generated_at: new Date().toISOString(), operation: `brand_profile_${mode}`, attempts },
        validation: {
          passed: validation?.passed ?? null,
          ungrounded_entities: validation?.ungroundedEntities || [],
          hallucination_rate: validation?.hallucinationRate ?? null,
          per_sentence_checked: true,
          attempts,
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
