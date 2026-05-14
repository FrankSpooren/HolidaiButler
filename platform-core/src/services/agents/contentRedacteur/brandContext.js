/**
 * Brand Context Builder — Assembles full brand profile context for AI prompts
 * Includes: company profile, tone of voice, audience persona, knowledge base chunks.
 *
 * v2.0 — Structured response support
 *   - buildBrandContext() returns string (backward compatible)
 *   - buildBrandContextStructured() returns { contextString, hasInternalSources,
 *     sources, internalSourcesCount } for callers that need source metadata
 *   - Honors brand_knowledge.is_active flag (added in migration 006)
 *   - Excludes filtered sources from contextString (matched only via promptGuardrails REFERENCE block)
 *
 * @version 2.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import { buildToneInstruction } from './toneOfVoice.js';
import logger from '../../../utils/logger.js';

// -------------------------------------------------------------------
// Internal — builds full structured context
// -------------------------------------------------------------------

async function _buildContextInternal(destinationId, personaId, contentKeywords, options = {}) {
  const { includeReferenceInString = true, maxKbChunks = 10, maxCharsPerChunk = 1500 } = options;

  const parts = [];
  let sources = [];
  let hasInternalSources = false;

  try {
    // 1. Brand Profile
    const [[dest]] = await mysqlSequelize.query(
      'SELECT name, display_name, brand_profile, default_language FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );

    if (dest) {
      let profile = {};
      try {
        profile = typeof dest.brand_profile === 'string'
          ? JSON.parse(dest.brand_profile)
          : (dest.brand_profile || {});
      } catch (err) {
        logger.debug('[brandContext] profile parse:', err.message);
      }

      parts.push(`BRAND: ${profile.company_name || dest.display_name || dest.name}`);
      if (profile.industry) parts.push(`INDUSTRY: ${profile.industry}`);
      if (profile.company_description) parts.push(`DESCRIPTION: ${profile.company_description}`);
      if (profile.usps?.length) parts.push(`USPs: ${profile.usps.join(', ')}`);
      if (profile.mission) parts.push(`MISSION: ${profile.mission}`);
      if (profile.vision) parts.push(`VISION: ${profile.vision}`);
      if (profile.core_values?.length) parts.push(`CORE VALUES: ${profile.core_values.join(', ')}`);
      if (profile.seo_keywords?.length) parts.push(`SEO KEYWORDS: ${profile.seo_keywords.join(', ')}`);
      if (dest.default_language) parts.push(`PRIMARY LANGUAGE: ${dest.default_language}`);

      // Content strategy goals
      const goals = profile.content_goals || {};
      if (goals.blogs_per_month !== undefined || goals.posts_per_week !== undefined) {
        const goalParts = [];
        if (goals.blogs_per_month === 0) goalParts.push('NO blogs (blogs_per_month = 0, do NOT suggest blog content)');
        else if (goals.blogs_per_month > 0) goalParts.push(`${goals.blogs_per_month} blogs per month`);
        if (goals.posts_per_week > 0) goalParts.push(`${goals.posts_per_week} social posts per week`);
        if (goalParts.length > 0) parts.push(`CONTENT GOALS: ${goalParts.join(', ')}`);
      }
    }

    // 2. Tone of Voice
    const toneInstruction = await buildToneInstruction(destinationId);
    parts.push('');
    parts.push(toneInstruction);

    // 3. Audience Persona
    if (personaId) {
      const [[persona]] = await mysqlSequelize.query(
        'SELECT * FROM audience_personas WHERE id = :id',
        { replacements: { id: Number(personaId) } }
      );
      if (persona) {
        parts.push('');
        parts.push(`TARGET AUDIENCE: ${persona.name}`);
        if (persona.age_range) parts.push(`- Age: ${persona.age_range}`);
        if (persona.gender) parts.push(`- Gender: ${persona.gender}`);
        if (persona.location) parts.push(`- Location: ${persona.location}`);
        if (persona.language) parts.push(`- Language: ${persona.language}`);
        if (persona.interests) parts.push(`- Interests: ${persona.interests}`);
        if (persona.pain_points) parts.push(`- Pain points: ${persona.pain_points}`);
        if (persona.tone_notes) parts.push(`- Preferred tone: ${persona.tone_notes}`);

        let channels = [];
        try {
          channels = typeof persona.preferred_channels === 'string'
            ? JSON.parse(persona.preferred_channels)
            : (persona.preferred_channels || []);
        } catch (err) {
          logger.debug('[brandContext] channels parse:', err.message);
        }
        if (channels.length) parts.push(`- Preferred channels: ${channels.join(', ')}`);
      }
    }

    // 4. Knowledge Base — only ACTIVE sources
    const [knowledgeItems] = await mysqlSequelize.query(
      `SELECT id, source_name, source_url, source_type, content_text
       FROM brand_knowledge
       WHERE destination_id = :destId
         AND content_text IS NOT NULL
         AND is_active = 1
       ORDER BY created_at DESC
       LIMIT :maxItems`,
      { replacements: { destId: Number(destinationId), maxItems: maxKbChunks } }
    );

    if (knowledgeItems.length > 0) {
      hasInternalSources = true;

      // Keyword-prioritized ordering
      let relevant = knowledgeItems;
      if (Array.isArray(contentKeywords) && contentKeywords.length > 0) {
        const kwLower = contentKeywords.map(k => String(k).toLowerCase());
        relevant = [...knowledgeItems].sort((a, b) => {
          const aText = (a.content_text || '').toLowerCase();
          const bText = (b.content_text || '').toLowerCase();
          const aMatches = kwLower.filter(k => aText.includes(k)).length;
          const bMatches = kwLower.filter(k => bText.includes(k)).length;
          return bMatches - aMatches;
        });
      }

      const topSources = relevant.slice(0, 5);

      // Structured source list (for promptGuardrails REFERENCE block)
      sources = topSources.map(k => ({
        id: k.id,
        source_name: k.source_name || `Source ${k.id}`,
        source_url: k.source_url || null,
        source_type: k.source_type || 'reference',
        content_text: (k.content_text || '').substring(0, maxCharsPerChunk),
      }));

      // Backward-compat: include REFERENCE block in contextString
      if (includeReferenceInString) {
        const chunks = sources.map(s => `[Source: ${s.source_name}]: ${s.content_text}`);
        parts.push('');
        parts.push('REFERENCE MATERIAL (use these facts when relevant — do NOT invent data):');
        parts.push(chunks.join('\n\n'));
      }
    }
  } catch (error) {
    logger.warn('[BrandContext] Error building brand context (non-blocking):', error.message);
  }

  return {
    contextString: parts.join('\n'),
    hasInternalSources,
    sources,
    internalSourcesCount: sources.length,
  };
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

/**
 * Build brand context as a single string (backward compatible).
 * REFERENCE MATERIAL block is included inline.
 *
 * @param {number} destinationId
 * @param {number|null} personaId
 * @param {string[]} contentKeywords
 * @returns {Promise<string>}
 */
export async function buildBrandContext(destinationId, personaId = null, contentKeywords = []) {
  const result = await _buildContextInternal(destinationId, personaId, contentKeywords, {
    includeReferenceInString: true,
  });
  return result.contextString;
}

/**
 * Build brand context with structured response — for callers needing source metadata.
 * Use this when you intend to render REFERENCE MATERIAL via promptGuardrails
 * (which adds anti-hallucination rules around it).
 *
 * @param {number} destinationId
 * @param {Object} [opts]
 * @param {number|null} [opts.personaId]
 * @param {string[]} [opts.contentKeywords]
 * @param {boolean} [opts.includeReferenceInString=false] - If true, also include REFERENCE in contextString
 * @param {number} [opts.maxKbChunks=10]
 * @param {number} [opts.maxCharsPerChunk=1500]
 * @returns {Promise<{contextString: string, hasInternalSources: boolean, sources: Array, internalSourcesCount: number}>}
 */
export async function buildBrandContextStructured(destinationId, opts = {}) {
  const {
    personaId = null,
    contentKeywords = [],
    includeReferenceInString = false,
    maxKbChunks = 10,
    maxCharsPerChunk = 1500,
  } = opts;

  return _buildContextInternal(destinationId, personaId, contentKeywords, {
    includeReferenceInString,
    maxKbChunks,
    maxCharsPerChunk,
  });
}

export default { buildBrandContext, buildBrandContextStructured };
