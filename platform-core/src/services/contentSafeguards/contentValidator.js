/**
 * Content Validator — Fase R5 Safeguards
 * Permanent content validation before any POI description update.
 *
 * Usage:
 *   import { validateContentUpdate, CONTENT_RULES } from '../services/contentSafeguards/contentValidator.js';
 *   const result = validateContentUpdate(newContent, { dataQuality: 'rich', hallucinationRate: 0.15 });
 *   if (!result.approved) { console.error(result.reasons); }
 *
 * @module contentSafeguards/contentValidator
 * @version 1.0.0
 */

// === CONTENT RULES ===
export const CONTENT_RULES = {
  // Hallucination thresholds
  maxHallucinationRate: 0.20,
  maxHallucinationRateNone: 0.30,

  // Word count targets per quality tier
  wordTargets: {
    rich:     { min: 110, max: 140 },
    moderate: { min: 85,  max: 115 },
    minimal:  { min: 55,  max: 85 },
    none:     { min: 30,  max: 60 },
  },

  // Word count tolerance (allow 20% outside range)
  wordCountTolerance: 0.20,

  // Known destinations
  knownDestinations: [1, 2],

  // Embellishment blocklist (from R3 rule 9)
  embellishmentBlocklist: [
    'unique', 'modern', 'cosy', 'cozy', 'convenient', 'charming',
    'inviting', 'vibrant', 'delightful', 'exceptional', 'exquisite',
    'stunning', 'breathtaking', 'magnificent', 'spectacular',
    'world-class', 'must-visit', 'hidden gem', 'best-kept secret',
    'unforgettable', 'unparalleled', 'state-of-the-art',
    'award-winning', 'renowned', 'prestigious', 'iconic',
  ],
};

/**
 * Validate content before writing to production POI table.
 *
 * @param {string} content - The description text to validate
 * @param {Object} options
 * @param {string} [options.dataQuality] - 'rich', 'moderate', 'minimal', 'none'
 * @param {number} [options.hallucinationRate] - 0.0 to 1.0
 * @param {Array} [options.unsupportedClaims] - Array of claim objects with severity
 * @param {number} [options.destinationId] - Destination ID
 * @returns {Object} { approved: boolean, reasons: string[], warnings: string[] }
 */
export function validateContentUpdate(content, options = {}) {
  const {
    dataQuality = 'none',
    hallucinationRate = null,
    unsupportedClaims = [],
    destinationId = null,
  } = options;

  const reasons = [];
  const warnings = [];

  // Rule 1: Empty content
  if (!content || content.trim().length === 0) {
    reasons.push('Empty content');
    return { approved: false, reasons, warnings };
  }

  // Rule 2: HIGH severity claims
  const highClaims = unsupportedClaims.filter(c => c && c.severity === 'HIGH');
  if (highClaims.length > 0) {
    reasons.push(`${highClaims.length} HIGH severity unsupported claim(s)`);
  }

  // Rule 3: Hallucination rate threshold
  if (hallucinationRate !== null) {
    const threshold = dataQuality === 'none'
      ? CONTENT_RULES.maxHallucinationRateNone
      : CONTENT_RULES.maxHallucinationRate;

    if (hallucinationRate > threshold) {
      reasons.push(`Hallucination rate ${(hallucinationRate * 100).toFixed(0)}% exceeds ${(threshold * 100).toFixed(0)}% threshold`);
    }
  }

  // Rule 4: Word count
  const wordCount = content.trim().split(/\s+/).length;
  const targets = CONTENT_RULES.wordTargets[dataQuality] || CONTENT_RULES.wordTargets.none;
  const tolerance = CONTENT_RULES.wordCountTolerance;
  const minWords = Math.floor(targets.min * (1 - tolerance));
  const maxWords = Math.ceil(targets.max * (1 + tolerance));

  if (wordCount < minWords) {
    warnings.push(`Word count ${wordCount} below minimum ${minWords} for ${dataQuality} quality`);
  } else if (wordCount > maxWords) {
    warnings.push(`Word count ${wordCount} above maximum ${maxWords} for ${dataQuality} quality`);
  }

  // Rule 5: Embellishment keywords
  const contentLower = content.toLowerCase();
  const found = CONTENT_RULES.embellishmentBlocklist.filter(word => contentLower.includes(word));
  if (found.length > 0) {
    warnings.push(`Embellishment words: ${found.slice(0, 5).join(', ')}`);
  }

  // Rule 6: Unknown destination
  if (destinationId !== null && !CONTENT_RULES.knownDestinations.includes(destinationId)) {
    reasons.push(`Unknown destination ${destinationId} — requires manual review`);
  }

  return {
    approved: reasons.length === 0,
    reasons,
    warnings,
  };
}

export default { validateContentUpdate, CONTENT_RULES };
