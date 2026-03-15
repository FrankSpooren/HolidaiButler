/**
 * Tone of Voice Configuration — Data-driven per destination
 * Reads from destinations.branding.toneOfVoice (Admin Portal → BrandingPage).
 * Falls back to hardcoded defaults if no DB config exists.
 *
 * @version 2.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

// Hardcoded fallback defaults (used when branding.toneOfVoice is not configured)
const FALLBACK_TONES = {
  1: { // Calpe
    personality: 'warm, Mediterranean, sun-kissed',
    adjectives: 'charming, vibrant, sun-drenched, picturesque, authentic',
    audience: 'European tourists (30-70) seeking Mediterranean charm, good food, and coastal beauty',
    avoidWords: 'cheap, touristy, overcrowded, basic',
    samplePhrases: 'Nestled along the Costa Blanca coastline, Where Mediterranean flavors meet stunning sea views',
    brandValues: 'authenticity, hospitality, Mediterranean lifestyle, gastronomy',
    coreKeywords: 'Calpe, Costa Blanca, Mediterranean, Peñón de Ifach',
    formalAddress: 'je',
    languages: { primary: 'en', secondary: ['es', 'nl', 'de'] },
    name: 'Calpe',
  },
  2: { // Texel
    personality: 'adventurous, nature-loving, authentic Dutch island life',
    adjectives: 'windswept, authentic, unspoiled, adventurous, cozy',
    audience: 'European tourists (30-70) seeking nature, outdoor activities, and authentic island culture',
    avoidWords: 'boring, remote, cold, empty',
    samplePhrases: 'On the windswept shores of Texel, Where sheep outnumber tourists and nature reigns supreme',
    brandValues: 'nature, authenticity, adventure, sustainability, island culture',
    coreKeywords: 'Texel, Wadden Sea, island, nature, beach, cycling',
    formalAddress: 'je',
    languages: { primary: 'nl', secondary: ['en', 'de'] },
    name: 'Texel',
  },
  4: { // WarreWijzer
    personality: 'slow-living, reconnecting with nature, back to basics',
    adjectives: 'serene, mindful, enchanting, rustic, rejuvenating',
    audience: 'Families (up to 14y), active seniors (55-75) from BE/NL/DE seeking slow living and nature',
    avoidWords: 'boring, isolated, primitive, old-fashioned',
    samplePhrases: 'Bij WarreWijzer vind je rust en ruimte, Terug naar de essentie omringd door natuur',
    brandValues: 'slow living, nature, family, sustainability, tranquility',
    coreKeywords: 'WarreWijzer, Warredal, Maaseik, Limburg, natuur, rust',
    formalAddress: 'je',
    languages: { primary: 'nl', secondary: ['fr', 'de', 'en'] },
    name: 'WarreWijzer',
  },
};

const DEFAULT_TONE = {
  personality: 'informative, inviting, professional',
  adjectives: 'welcoming, diverse, memorable, unique, authentic',
  audience: 'European tourists seeking unique travel experiences',
  avoidWords: 'cheap, boring, overcrowded',
  samplePhrases: 'Discover a destination like no other',
  brandValues: 'quality, authenticity, hospitality',
  coreKeywords: '',
  formalAddress: 'je',
  languages: { primary: 'en', secondary: ['nl', 'de', 'es'] },
  name: 'Generic',
};

// In-memory cache (refreshed on getTone)
let toneCache = {};
let toneCacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tone configuration for a destination — DB-first, hardcoded fallback
 */
export async function getTone(destinationId) {
  const now = Date.now();

  // Try DB cache
  if (now < toneCacheExpiry && toneCache[destinationId]) {
    return toneCache[destinationId];
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      'SELECT branding, display_name FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );

    if (dest) {
      const branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {});
      const dbTone = branding.toneOfVoice;

      if (dbTone && dbTone.personality) {
        // DB config exists — merge with fallback for any missing fields
        const fallback = FALLBACK_TONES[destinationId] || DEFAULT_TONE;
        const merged = {
          personality: dbTone.personality || fallback.personality,
          adjectives: dbTone.adjectives || fallback.adjectives,
          audience: dbTone.audience || fallback.audience,
          avoidWords: dbTone.avoidWords || fallback.avoidWords,
          samplePhrases: dbTone.samplePhrases || fallback.samplePhrases,
          brandValues: dbTone.brandValues || fallback.brandValues || '',
          coreKeywords: dbTone.coreKeywords || fallback.coreKeywords || '',
          formalAddress: dbTone.formalAddress || fallback.formalAddress || 'je',
          languages: fallback.languages,
          name: dest.display_name || fallback.name,
        };

        toneCache[destinationId] = merged;
        toneCacheExpiry = now + CACHE_TTL;
        return merged;
      }
    }
  } catch (err) {
    logger.warn('[ToneOfVoice] DB lookup failed, using hardcoded fallback:', err.message);
  }

  // Hardcoded fallback
  const fallback = FALLBACK_TONES[destinationId] || DEFAULT_TONE;
  toneCache[destinationId] = fallback;
  toneCacheExpiry = now + CACHE_TTL;
  return fallback;
}

/**
 * Synchronous getTone for backward compatibility — uses cache or hardcoded
 */
export function getToneSync(destinationId) {
  if (toneCache[destinationId]) return toneCache[destinationId];
  return FALLBACK_TONES[destinationId] || DEFAULT_TONE;
}

/**
 * Build a tone-of-voice instruction block for Mistral AI prompts
 * Now includes brand values, core keywords, and formal address preference
 */
export async function buildToneInstruction(destinationId) {
  const tone = await getTone(destinationId);

  const addressMap = {
    je: 'Use informal address (je/jij in Dutch, you in English, tú in Spanish, du in German)',
    u: 'Use formal address (u in Dutch, Sie in German, usted in Spanish)',
    mixed: 'Use formal address for informational content, informal for social media posts',
  };

  let instruction = `TONE OF VOICE:
- Personality: ${tone.personality}
- Target audience: ${tone.audience}
- Preferred adjectives: ${tone.adjectives}
- NEVER use these words: ${tone.avoidWords}
- Destination name: ${tone.name}
- Address style: ${addressMap[tone.formalAddress] || addressMap.je}`;

  if (tone.brandValues) {
    instruction += `\n- Brand values (weave these into messaging): ${tone.brandValues}`;
  }

  if (tone.coreKeywords) {
    instruction += `\n- Core destination keywords (use naturally): ${tone.coreKeywords}`;
  }

  if (tone.samplePhrases) {
    const phrases = tone.samplePhrases.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
    if (phrases.length > 0) {
      instruction += `\n- Example phrases for style inspiration: "${phrases[0]}"`;
      if (phrases[1]) instruction += `, "${phrases[1]}"`;
    }
  }

  return instruction;
}

/**
 * Get supported languages for a destination (ordered by priority)
 */
export function getLanguages(destinationId) {
  const tone = toneCache[destinationId] || FALLBACK_TONES[destinationId] || DEFAULT_TONE;
  return [tone.languages.primary, ...tone.languages.secondary];
}

/**
 * Clear cache (useful after branding update)
 */
export function clearToneCache() {
  toneCache = {};
  toneCacheExpiry = 0;
}

export default { getTone, getToneSync, buildToneInstruction, getLanguages, clearToneCache };
