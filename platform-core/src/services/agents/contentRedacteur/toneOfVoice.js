/**
 * Tone of Voice Configuration — Per-destination tone templates
 * Used by De Redacteur Agent for content generation.
 *
 * @version 1.0.0
 */

const DESTINATION_TONES = {
  1: { // Calpe
    name: 'Calpe',
    personality: 'warm, Mediterranean, sun-kissed',
    adjectives: ['charming', 'vibrant', 'sun-drenched', 'picturesque', 'authentic'],
    audience: 'European tourists (30-70) seeking Mediterranean charm, good food, and coastal beauty',
    avoidWords: ['cheap', 'touristy', 'overcrowded', 'basic'],
    samplePhrases: [
      'Nestled along the Costa Blanca coastline',
      'Where Mediterranean flavors meet stunning sea views',
      'A hidden gem waiting to be discovered',
    ],
    languages: { primary: 'en', secondary: ['es', 'nl', 'de'] },
  },
  2: { // Texel
    name: 'Texel',
    personality: 'adventurous, nature-loving, authentic Dutch island life',
    adjectives: ['windswept', 'authentic', 'unspoiled', 'adventurous', 'cozy'],
    audience: 'European tourists (30-70) seeking nature, outdoor activities, and authentic island culture',
    avoidWords: ['boring', 'remote', 'cold', 'empty'],
    samplePhrases: [
      'On the windswept shores of Texel',
      'Where sheep outnumber tourists and nature reigns supreme',
      'An island escape like no other in the Netherlands',
    ],
    languages: { primary: 'nl', secondary: ['en', 'de'] },
  },
  4: { // WarreWijzer
    name: 'WarreWijzer',
    personality: 'slow-living, reconnecting with nature, back to basics',
    adjectives: ['serene', 'mindful', 'enchanting', 'rustic', 'rejuvenating'],
    audience: 'Families (up to 14y), active seniors (55-75) from BE/NL/DE seeking slow living and nature',
    avoidWords: ['boring', 'isolated', 'primitive', 'old-fashioned'],
    samplePhrases: [
      'Bij WarreWijzer vind je rust en ruimte',
      'Terug naar de essentie, omringd door natuur',
      'Op het domein waar sprookjes tot leven komen',
    ],
    languages: { primary: 'nl', secondary: ['fr', 'de', 'en'] },
  },
};

// Default tone for unknown destinations
const DEFAULT_TONE = {
  name: 'Generic',
  personality: 'informative, inviting, professional',
  adjectives: ['welcoming', 'diverse', 'memorable', 'unique', 'authentic'],
  audience: 'European tourists seeking unique travel experiences',
  avoidWords: ['cheap', 'boring', 'overcrowded'],
  samplePhrases: ['Discover a destination like no other'],
  languages: { primary: 'en', secondary: ['nl', 'de', 'es'] },
};

/**
 * Get tone configuration for a destination
 */
export function getTone(destinationId) {
  return DESTINATION_TONES[destinationId] || DEFAULT_TONE;
}

/**
 * Build a tone-of-voice instruction block for Mistral AI prompts
 */
export function buildToneInstruction(destinationId) {
  const tone = getTone(destinationId);
  return `TONE OF VOICE:
- Personality: ${tone.personality}
- Target audience: ${tone.audience}
- Preferred adjectives: ${tone.adjectives.join(', ')}
- NEVER use: ${tone.avoidWords.join(', ')}
- Destination name: ${tone.name}
- Example phrases for inspiration: "${tone.samplePhrases[0]}"`;
}

/**
 * Get supported languages for a destination (ordered by priority)
 */
export function getLanguages(destinationId) {
  const tone = getTone(destinationId);
  return [tone.languages.primary, ...tone.languages.secondary];
}

export default { getTone, buildToneInstruction, getLanguages, DESTINATION_TONES };
