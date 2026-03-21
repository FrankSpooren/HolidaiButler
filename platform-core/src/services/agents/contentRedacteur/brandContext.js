/**
 * Brand Context Builder — Assembles full brand profile context for AI prompts
 * Includes: company profile, tone of voice, audience persona, knowledge base chunks.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import { buildToneInstruction } from './toneOfVoice.js';
import logger from '../../../utils/logger.js';

/**
 * Build full brand context for content generation prompts.
 * @param {number} destinationId
 * @param {number|null} personaId - Optional audience persona to target
 * @param {string[]} contentKeywords - Keywords from the content being generated (for knowledge matching)
 * @returns {string} Context block for system prompt
 */
export async function buildBrandContext(destinationId, personaId = null, contentKeywords = []) {
  const parts = [];

  try {
    // 1. Brand Profile (from destinations.brand_profile JSON)
    const [[dest]] = await mysqlSequelize.query(
      'SELECT name, display_name, brand_profile, default_language FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );

    if (dest) {
      let profile = {};
      try { profile = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {}); } catch { /* empty */ }

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

    // 3. Audience Persona (if selected)
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
        try { channels = typeof persona.preferred_channels === 'string' ? JSON.parse(persona.preferred_channels) : (persona.preferred_channels || []); } catch { /* empty */ }
        if (channels.length) parts.push(`- Preferred channels: ${channels.join(', ')}`);
      }
    }

    // 4. Knowledge Base — relevant chunks
    const [knowledgeItems] = await mysqlSequelize.query(
      'SELECT source_name, content_text FROM brand_knowledge WHERE destination_id = :destId AND content_text IS NOT NULL ORDER BY created_at DESC LIMIT 10',
      { replacements: { destId: Number(destinationId) } }
    );

    if (knowledgeItems.length > 0) {
      // If content keywords provided, prioritize matching items
      let relevant = knowledgeItems;
      if (contentKeywords.length > 0) {
        const kwLower = contentKeywords.map(k => k.toLowerCase());
        relevant = knowledgeItems.sort((a, b) => {
          const aText = (a.content_text || '').toLowerCase();
          const bText = (b.content_text || '').toLowerCase();
          const aMatches = kwLower.filter(k => aText.includes(k)).length;
          const bMatches = kwLower.filter(k => bText.includes(k)).length;
          return bMatches - aMatches;
        });
      }

      // Take top 5 items, max 1500 chars each
      const chunks = relevant.slice(0, 5).map(k => {
        const text = (k.content_text || '').substring(0, 1500);
        return `[Source: ${k.source_name}]: ${text}`;
      });

      if (chunks.length > 0) {
        parts.push('');
        parts.push('REFERENCE MATERIAL (use these facts when relevant — do NOT invent data):');
        parts.push(chunks.join('\n\n'));
      }
    }
  } catch (error) {
    logger.warn('[BrandContext] Error building brand context (non-blocking):', error.message);
  }

  return parts.join('\n');
}

export default { buildBrandContext };
