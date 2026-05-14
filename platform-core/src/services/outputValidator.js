/**
 * Output Validator Service — Optie D Layer 3 + Layer 3+
 *
 * Validates AI-generated content for hallucination against brand_knowledge sources.
 * Two layers of validation:
 *   1. Entity-level (NER): extract names/places/events/dates → match against KB tokens
 *   2. Sentence-level (Layer 3+): cosine similarity of each sentence vs nearest KB chunk
 *
 * Orchestrates auto-retry on hallucination detection.
 *
 * Usage:
 *   const result = await validateContent(generatedText, sources, { locale, threshold: 0.10 });
 *   if (!result.passed) → retry with reinforced prompt
 *
 * @module outputValidator
 * @version 1.0.0
 */

import embeddingService from './holibot/embeddingService.js';
import logger from '../utils/logger.js';

const DEFAULT_HALLUCINATION_THRESHOLD = 0.10;   // max 10% ungrounded entities
const DEFAULT_SENTENCE_SIM_THRESHOLD = 0.50;    // cosine sim below = ungrounded
const NER_MODEL = 'mistral-small-latest';        // cheaper for NER
const MAX_SENTENCES_TO_VALIDATE = 20;            // performance cap

// ---------------------------------------------------------------------
// 1. NER — extract entities via Mistral
// ---------------------------------------------------------------------

/**
 * Extract named entities from text using Mistral as NER.
 * Returns: { names, places, events, dates, organizations, products }
 */
export async function extractEntities(text, locale = 'en') {
  if (!text || text.trim().length < 20) return { entities: [], raw: null };
  if (!embeddingService.isConfigured) embeddingService.initialize();

  const langLabel = { nl: 'Dutch', en: 'English', de: 'German', fr: 'French', es: 'Spanish' }[locale] || 'English';

  const prompt = `Extract specific named entities from the following ${langLabel} text. Return ONLY a JSON object with these arrays:
{
  "names": [],         // person names, character names, brand names
  "places": [],        // venues, streets, cities, attractions, restaurants
  "events": [],        // specific event names, activities, programs (e.g. "Rad van Fortuin")
  "dates": [],         // specific dates or date references
  "organizations": []  // companies, clubs, official bodies
}
Include ONLY specific named entities (e.g. "Lions Club", "De Bonte Belevenis", "Rad van Fortuin"), NOT generic terms (e.g. "the fair", "the activities", "16 mei" alone unless attached to event name).
Be precise. If unsure, omit. Output ONLY valid JSON, no markdown.

TEXT:
${text}`;

  try {
    const response = await embeddingService.generateChatCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.0, maxTokens: 500, model: NER_MODEL }
    );

    // Parse JSON (strip markdown if present)
    let jsonText = (response || '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    const all = [];
    for (const cat of ['names', 'places', 'events', 'dates', 'organizations']) {
      if (Array.isArray(parsed[cat])) {
        parsed[cat].forEach(e => {
          if (typeof e === 'string' && e.trim().length > 2) {
            all.push({ entity: e.trim(), category: cat });
          }
        });
      }
    }
    return { entities: all, raw: parsed };
  } catch (err) {
    logger.warn(`[OutputValidator] NER failed: ${err.message}`);
    return { entities: [], raw: null, error: err.message };
  }
}

// ---------------------------------------------------------------------
// 2. Entity grounding — match against KB tokens (token-level)
// ---------------------------------------------------------------------

/**
 * Build a normalized token set from source chunks for fast entity matching.
 */
function buildSourceTokens(sources) {
  if (!Array.isArray(sources)) return new Set();
  const allText = sources.map(s => s.content_text || s.text || '').join(' ').toLowerCase();
  // Keep meaningful tokens (3+ chars), strip punctuation
  const tokens = allText
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);
  return new Set(tokens);
}

/**
 * Check if an entity is grounded in source tokens (with fuzzy substring matching).
 * Returns true if entity's significant tokens are present in source.
 */
function isEntityGrounded(entity, sourceTokens, sourceText) {
  const entityLower = entity.toLowerCase();
  // Exact substring match in source text (most reliable)
  if (sourceText.includes(entityLower)) return true;

  // Token-based: all significant tokens of the entity must appear in source
  const entityTokens = entityLower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);
  if (entityTokens.length === 0) return true; // empty / stopwords-only → assume grounded
  return entityTokens.every(t => sourceTokens.has(t));
}

/**
 * Validate entities against KB sources.
 */
export function validateGrounding(entities, sources) {
  if (!Array.isArray(entities) || entities.length === 0) {
    return { groundedCount: 0, ungroundedCount: 0, ungrounded: [], hallucinationRate: 0 };
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    // No KB → cannot ground. All entities are "ungrounded"
    return {
      groundedCount: 0,
      ungroundedCount: entities.length,
      ungrounded: entities,
      hallucinationRate: 1.0,
      reason: 'no_sources',
    };
  }

  const sourceTokens = buildSourceTokens(sources);
  const sourceText = sources.map(s => (s.content_text || s.text || '').toLowerCase()).join(' ');

  const ungrounded = [];
  let grounded = 0;
  for (const ent of entities) {
    if (isEntityGrounded(ent.entity, sourceTokens, sourceText)) {
      grounded++;
    } else {
      ungrounded.push(ent);
    }
  }

  return {
    groundedCount: grounded,
    ungroundedCount: ungrounded.length,
    ungrounded,
    hallucinationRate: entities.length > 0 ? ungrounded.length / entities.length : 0,
  };
}

// ---------------------------------------------------------------------
// 3. Per-sentence semantic similarity (Layer 3+)
// ---------------------------------------------------------------------

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ÿ])/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

/**
 * Compute per-sentence grounding via embedding similarity vs source chunks.
 */
export async function validatePerSentence(text, sources, threshold = DEFAULT_SENTENCE_SIM_THRESHOLD) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return { sentences: [], ungroundedCount: 0, avgSimilarity: 0, reason: 'no_sources' };
  }
  if (!embeddingService.isConfigured) embeddingService.initialize();

  const sentences = splitSentences(text).slice(0, MAX_SENTENCES_TO_VALIDATE);
  if (sentences.length === 0) return { sentences: [], ungroundedCount: 0, avgSimilarity: 0 };

  try {
    // Embed sources (once) + sentences (batch)
    const sourceTexts = sources.map(s => (s.content_text || s.text || '').substring(0, 1500));
    const sourceEmbs = await Promise.all(sourceTexts.map(t => embeddingService.generateEmbedding(t)));
    const sentenceEmbs = await Promise.all(sentences.map(s => embeddingService.generateEmbedding(s)));

    const results = sentences.map((sentence, i) => {
      let maxSim = 0;
      for (const srcEmb of sourceEmbs) {
        const sim = cosineSimilarity(sentenceEmbs[i], srcEmb);
        if (sim > maxSim) maxSim = sim;
      }
      return { sentence: sentence.substring(0, 200), similarity: Number(maxSim.toFixed(3)), grounded: maxSim >= threshold };
    });

    const ungrounded = results.filter(r => !r.grounded);
    const avgSim = results.reduce((s, r) => s + r.similarity, 0) / results.length;

    return {
      sentences: results,
      ungroundedCount: ungrounded.length,
      avgSimilarity: Number(avgSim.toFixed(3)),
      ungroundedRate: results.length > 0 ? ungrounded.length / results.length : 0,
    };
  } catch (err) {
    logger.warn(`[OutputValidator] per-sentence validation failed: ${err.message}`);
    return { sentences: [], ungroundedCount: 0, avgSimilarity: 0, error: err.message };
  }
}

// ---------------------------------------------------------------------
// 4. Orchestrator
// ---------------------------------------------------------------------

/**
 * Run full validation pipeline. Returns aggregate verdict.
 *
 * @param {string} text - Generated text to validate
 * @param {Array} sources - brand_knowledge sources
 * @param {Object} [options]
 * @param {string} [options.locale='en']
 * @param {number} [options.hallucinationThreshold=0.10]
 * @param {number} [options.sentenceSimThreshold=0.50]
 * @param {boolean} [options.skipPerSentence=false] - skip Layer 3+ (saves embedding calls)
 * @returns {Promise<{passed, hallucinationRate, ungroundedEntities, perSentence, reasons}>}
 */
export async function validateContent(text, sources, options = {}) {
  const {
    locale = 'en',
    hallucinationThreshold = DEFAULT_HALLUCINATION_THRESHOLD,
    sentenceSimThreshold = DEFAULT_SENTENCE_SIM_THRESHOLD,
    skipPerSentence = false,
  } = options;

  if (!text || text.trim().length < 30) {
    return {
      passed: true,
      hallucinationRate: 0,
      ungroundedEntities: [],
      perSentence: null,
      reasons: ['content_too_short'],
    };
  }

  // Layer 3: NER + KB cross-check
  const { entities } = await extractEntities(text, locale);
  const grounding = validateGrounding(entities, sources);

  // Layer 3+: per-sentence semantic similarity (parallel with NER would be ideal, but Mistral rate limits)
  const perSentence = skipPerSentence ? null : await validatePerSentence(text, sources, sentenceSimThreshold);

  // Verdict: pass if both layers below threshold
  const reasons = [];
  let passed = true;

  if (grounding.hallucinationRate > hallucinationThreshold) {
    passed = false;
    reasons.push(`entity_hallucination_rate ${grounding.hallucinationRate.toFixed(2)} > ${hallucinationThreshold}`);
  }
  if (perSentence && perSentence.ungroundedRate > 0.30) {
    passed = false;
    reasons.push(`sentence_ungrounded_rate ${perSentence.ungroundedRate.toFixed(2)} > 0.30`);
  }
  if (grounding.reason === 'no_sources' && entities.length > 0) {
    // No KB but AI made specific claims — flag but don't block (handled by hasInternalSources warning upstream)
    reasons.push('no_sources_available');
  }

  return {
    passed,
    hallucinationRate: grounding.hallucinationRate,
    ungroundedEntities: grounding.ungrounded,
    groundedEntities: grounding.groundedCount,
    perSentence,
    reasons,
    entityCount: entities.length,
  };
}

export default {
  extractEntities,
  validateGrounding,
  validatePerSentence,
  validateContent,
};
