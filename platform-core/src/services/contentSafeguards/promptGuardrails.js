/**
 * Prompt Guardrails — Shared Anti-Hallucination Module
 *
 * Single source of truth for anti-hallucination instructions across ALL AI paths
 * (chatbot RAG, content generation, web search fallback, future AI features).
 *
 * Replaces per-service inline strict-rules patterns with a unified, multi-locale
 * library. Refactored from holibot/ragService.js getContextInstructions() pattern.
 *
 * Languages covered: NL, EN, DE, FR, ES (FR was missing in ragService — now fixed)
 *
 * Usage:
 *   import {
 *     buildAntiHallucinationInstructions,
 *     buildReferenceMaterialBlock,
 *     buildSystemPromptHeader,
 *     buildUnknownEntityWarning,
 *   } from '../contentSafeguards/promptGuardrails.js';
 *
 *   const header = buildSystemPromptHeader('nl', brandContext, sources, {
 *     hasInternalSources: true,
 *     strictMode: true,
 *   });
 *
 * @module contentSafeguards/promptGuardrails
 * @version 1.0.0
 */

import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------
// Locale normalization
// ---------------------------------------------------------------------

const SUPPORTED_LOCALES = ['nl', 'en', 'de', 'fr', 'es'];
const DEFAULT_LOCALE = 'en';

function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;
  const short = locale.toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(short) ? short : DEFAULT_LOCALE;
}

// ---------------------------------------------------------------------
// Anti-hallucination instruction library
// ---------------------------------------------------------------------

/**
 * Strict anti-hallucination rules per locale.
 * Refactored from holibot/ragService.js — extended with FR + content-generation context.
 *
 * Rules:
 *   1. Use ONLY facts from REFERENCE MATERIAL
 *   2. NEVER invent names, dates, prices, locations, activities
 *   3. If a fact is not in reference: say so honestly or omit
 *   4. NEVER combine words from query/topic with reference words to create new names
 *   5. Cite sources when making specific factual claims
 */
const ANTI_HALLUCINATION_RULES = {
  nl: {
    header: 'KRITIEKE ANTI-HALLUCINATIE REGELS',
    useOnly: 'Gebruik UITSLUITEND feiten uit het REFERENCE MATERIAL hieronder. Eigen kennis is ondergeschikt.',
    rules: [
      'Noem ALLEEN namen, plaatsen, activiteiten, data, prijzen en evenementen die EXPLICIET in het REFERENCE MATERIAL staan.',
      'VERZIN NOOIT specifieke feiten (namen van attracties, restaurants, activiteiten, prijzen, openingstijden, programma\'s).',
      'Als een specifiek feit NIET in het REFERENCE MATERIAL staat: gebruik algemene bewoordingen of laat het weg. Verzin het NOOIT.',
      'Combineer NOOIT woorden uit het onderwerp met woorden uit het REFERENCE MATERIAL om nieuwe namen te maken.',
      'Bij twijfel: noem het feit niet. Liever korter en correct, dan langer en gefingeerd.',
    ],
    noInfoFallback: 'Geen informatie beschikbaar in REFERENCE MATERIAL. Gebruik alleen algemene, neutrale bewoordingen.',
    unknownEntity: (name) => `BELANGRIJK: "${name}" komt NIET voor in het REFERENCE MATERIAL. Verzin GEEN details over "${name}".`,
    referenceHeader: 'REFERENCE MATERIAL (geverifieerde bronnen — gebruik UITSLUITEND deze feiten)',
  },
  en: {
    header: 'CRITICAL ANTI-HALLUCINATION RULES',
    useOnly: 'Use EXCLUSIVELY facts from the REFERENCE MATERIAL below. Your own knowledge is secondary.',
    rules: [
      'Mention ONLY names, places, activities, dates, prices, and events EXPLICITLY listed in REFERENCE MATERIAL.',
      'NEVER invent specific facts (names of attractions, restaurants, activities, prices, opening hours, programs).',
      'If a specific fact is NOT in REFERENCE MATERIAL: use generic wording or omit it. NEVER fabricate it.',
      'NEVER combine words from the topic with words from REFERENCE MATERIAL to create new names.',
      'When in doubt: do not mention the fact. Shorter and correct beats longer and fabricated.',
    ],
    noInfoFallback: 'No information available in REFERENCE MATERIAL. Use only generic, neutral wording.',
    unknownEntity: (name) => `IMPORTANT: "${name}" is NOT in REFERENCE MATERIAL. Do NOT invent details about "${name}".`,
    referenceHeader: 'REFERENCE MATERIAL (verified sources — use EXCLUSIVELY these facts)',
  },
  de: {
    header: 'KRITISCHE ANTI-HALLUZINATIONS-REGELN',
    useOnly: 'Verwende AUSSCHLIESSLICH Fakten aus dem REFERENCE MATERIAL unten. Eigenes Wissen ist nachrangig.',
    rules: [
      'Nenne NUR Namen, Orte, Aktivitäten, Daten, Preise und Veranstaltungen, die EXPLIZIT im REFERENCE MATERIAL stehen.',
      'ERFINDE NIE spezifische Fakten (Namen von Attraktionen, Restaurants, Aktivitäten, Preise, Öffnungszeiten, Programme).',
      'Wenn ein spezifisches Faktum NICHT im REFERENCE MATERIAL steht: verwende allgemeine Formulierungen oder lasse es weg. ERFINDE es NIE.',
      'Kombiniere NIE Wörter aus dem Thema mit Wörtern aus dem REFERENCE MATERIAL zu neuen Namen.',
      'Im Zweifel: das Faktum nicht erwähnen. Kürzer und korrekt ist besser als länger und erfunden.',
    ],
    noInfoFallback: 'Keine Informationen im REFERENCE MATERIAL verfügbar. Verwende nur allgemeine, neutrale Formulierungen.',
    unknownEntity: (name) => `WICHTIG: "${name}" steht NICHT im REFERENCE MATERIAL. ERFINDE KEINE Details über "${name}".`,
    referenceHeader: 'REFERENCE MATERIAL (verifizierte Quellen — verwende AUSSCHLIESSLICH diese Fakten)',
  },
  fr: {
    header: 'RÈGLES CRITIQUES ANTI-HALLUCINATION',
    useOnly: 'Utilise EXCLUSIVEMENT les faits du REFERENCE MATERIAL ci-dessous. Tes connaissances propres sont secondaires.',
    rules: [
      'Mentionne UNIQUEMENT les noms, lieux, activités, dates, prix et événements EXPLICITEMENT listés dans le REFERENCE MATERIAL.',
      'N\'INVENTE JAMAIS de faits spécifiques (noms d\'attractions, restaurants, activités, prix, horaires, programmes).',
      'Si un fait spécifique n\'est PAS dans le REFERENCE MATERIAL : utilise un langage générique ou omets-le. NE l\'invente JAMAIS.',
      'Ne COMBINE JAMAIS des mots du sujet avec des mots du REFERENCE MATERIAL pour créer de nouveaux noms.',
      'En cas de doute : ne mentionne pas le fait. Plus court et correct vaut mieux que plus long et inventé.',
    ],
    noInfoFallback: 'Aucune information disponible dans le REFERENCE MATERIAL. Utilise uniquement un langage générique et neutre.',
    unknownEntity: (name) => `IMPORTANT : "${name}" N\'EST PAS dans le REFERENCE MATERIAL. N\'INVENTE PAS de détails sur "${name}".`,
    referenceHeader: 'REFERENCE MATERIAL (sources vérifiées — utilise EXCLUSIVEMENT ces faits)',
  },
  es: {
    header: 'REGLAS CRÍTICAS ANTI-ALUCINACIÓN',
    useOnly: 'Usa EXCLUSIVAMENTE hechos del REFERENCE MATERIAL a continuación. Tu conocimiento propio es secundario.',
    rules: [
      'Menciona SOLO nombres, lugares, actividades, fechas, precios y eventos EXPLÍCITAMENTE listados en REFERENCE MATERIAL.',
      'NUNCA inventes hechos específicos (nombres de atracciones, restaurantes, actividades, precios, horarios, programas).',
      'Si un hecho específico NO está en REFERENCE MATERIAL: usa lenguaje genérico u omítelo. NUNCA lo inventes.',
      'NUNCA combines palabras del tema con palabras del REFERENCE MATERIAL para crear nombres nuevos.',
      'En caso de duda: no menciones el hecho. Más corto y correcto es mejor que más largo e inventado.',
    ],
    noInfoFallback: 'No hay información disponible en REFERENCE MATERIAL. Usa solo lenguaje genérico y neutral.',
    unknownEntity: (name) => `IMPORTANTE: "${name}" NO está en REFERENCE MATERIAL. NO inventes detalles sobre "${name}".`,
    referenceHeader: 'REFERENCE MATERIAL (fuentes verificadas — usa EXCLUSIVAMENTE estos hechos)',
  },
};

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Build complete anti-hallucination instruction block for system prompts.
 *
 * @param {string} locale - Language code (nl/en/de/fr/es)
 * @param {Object} [options]
 * @param {boolean} [options.hasReferenceMaterial=true] - Whether reference material follows
 * @param {string} [options.unknownEntity] - Specific entity name to warn about
 * @param {boolean} [options.strictMode=true] - Apply strict mode (always true for content generation)
 * @returns {string} Formatted instruction block
 */
export function buildAntiHallucinationInstructions(locale, options = {}) {
  const {
    hasReferenceMaterial = true,
    unknownEntity = null,
    strictMode = true,
  } = options;

  const lang = normalizeLocale(locale);
  const rules = ANTI_HALLUCINATION_RULES[lang];

  const parts = [];
  parts.push(`### ${rules.header} ###`);
  parts.push(rules.useOnly);
  parts.push('');

  rules.rules.forEach((rule, idx) => {
    parts.push(`${idx + 1}. ${rule}`);
  });

  if (!hasReferenceMaterial) {
    parts.push('');
    parts.push(`⚠ ${rules.noInfoFallback}`);
  }

  if (unknownEntity) {
    parts.push('');
    parts.push(rules.unknownEntity(unknownEntity));
  }

  if (strictMode) {
    parts.push('');
    parts.push(lang === 'nl'
      ? 'STRICT MODE: Output wordt geverifieerd. Hallucinaties leiden tot afwijzing.'
      : lang === 'de'
      ? 'STRICT MODE: Output wird verifiziert. Halluzinationen führen zur Ablehnung.'
      : lang === 'fr'
      ? 'STRICT MODE: La sortie est vérifiée. Les hallucinations entraînent un rejet.'
      : lang === 'es'
      ? 'STRICT MODE: La salida se verifica. Las alucinaciones provocan rechazo.'
      : 'STRICT MODE: Output is verified. Hallucinations lead to rejection.');
  }

  return parts.join('\n');
}

/**
 * Build REFERENCE MATERIAL block from source chunks.
 *
 * @param {Array<{source_name, content_text, source_type, source_url}>} sources
 * @param {string} locale
 * @param {Object} [options]
 * @param {number} [options.maxChunks=10]
 * @param {number} [options.maxCharsPerChunk=1500]
 * @returns {string} Formatted reference material block (empty string if no sources)
 */
export function buildReferenceMaterialBlock(sources, locale, options = {}) {
  const { maxChunks = 10, maxCharsPerChunk = 1500 } = options;
  const lang = normalizeLocale(locale);
  const rules = ANTI_HALLUCINATION_RULES[lang];

  if (!Array.isArray(sources) || sources.length === 0) {
    return '';
  }

  const validSources = sources
    .filter(s => s && (s.content_text || s.text))
    .slice(0, maxChunks);

  if (validSources.length === 0) return '';

  const chunks = validSources.map((s, idx) => {
    const text = (s.content_text || s.text || '').toString().substring(0, maxCharsPerChunk);
    const name = s.source_name || s.name || `Source ${idx + 1}`;
    const type = s.source_type || s.type || 'reference';
    const url = s.source_url || s.url;
    const meta = url ? `${name} (${type}, ${url})` : `${name} (${type})`;
    return `[${idx + 1}] ${meta}\n${text}`;
  });

  return [
    `### ${rules.referenceHeader} ###`,
    '',
    chunks.join('\n\n---\n\n'),
  ].join('\n');
}

/**
 * Build complete system prompt header with guardrails + reference material.
 * This is the main entry point for AI services.
 *
 * @param {string} locale
 * @param {string} brandContextString - Pre-built brand context (from brandContext.js)
 * @param {Array} sources - Source chunks for REFERENCE MATERIAL
 * @param {Object} [options]
 * @param {boolean} [options.hasInternalSources]
 * @param {boolean} [options.strictMode=true]
 * @param {string} [options.unknownEntity]
 * @returns {string} Complete system prompt header
 */
export function buildSystemPromptHeader(locale, brandContextString, sources, options = {}) {
  const { hasInternalSources, strictMode = true, unknownEntity = null } = options;

  const referenceBlock = buildReferenceMaterialBlock(sources, locale);
  const guardrails = buildAntiHallucinationInstructions(locale, {
    hasReferenceMaterial: referenceBlock.length > 0,
    unknownEntity,
    strictMode,
  });

  const parts = [];
  if (brandContextString && brandContextString.trim()) {
    parts.push(brandContextString.trim());
    parts.push('');
  }
  parts.push(guardrails);

  if (referenceBlock) {
    parts.push('');
    parts.push(referenceBlock);
  } else if (hasInternalSources === false) {
    // Explicit signal that no internal sources are available
    const lang = normalizeLocale(locale);
    const msg = {
      nl: '⚠ Geen interne merk-bronnen beschikbaar. Wees extra terughoudend met specifieke claims.',
      en: '⚠ No internal brand sources available. Be extra cautious with specific claims.',
      de: '⚠ Keine internen Markenquellen verfügbar. Sei besonders vorsichtig mit spezifischen Behauptungen.',
      fr: '⚠ Aucune source de marque interne disponible. Sois particulièrement prudent avec les affirmations spécifiques.',
      es: '⚠ No hay fuentes internas de marca disponibles. Sé especialmente cauteloso con afirmaciones específicas.',
    };
    parts.push('');
    parts.push(msg[lang]);
  }

  return parts.join('\n');
}

/**
 * Build unknown-entity warning for chatbot scenarios.
 * Used by ragService when user asks about an entity not in DB.
 *
 * @param {string} entityName
 * @param {string} locale
 * @returns {string}
 */
export function buildUnknownEntityWarning(entityName, locale) {
  const lang = normalizeLocale(locale);
  return ANTI_HALLUCINATION_RULES[lang].unknownEntity(entityName);
}

/**
 * Backward-compat helper for ragService.js refactor.
 * Returns the labeled-fields object shape (category/description/address/rating)
 * that ragService.getContextInstructions() previously provided inline.
 *
 * @param {string} locale
 * @returns {Object}
 */
export function getLabeledFields(locale) {
  const lang = normalizeLocale(locale);
  const labels = {
    nl: { category: 'Categorie', description: 'Beschrijving', address: 'Adres', rating: 'Beoordeling', noInfo: 'Geen informatie gevonden.' },
    en: { category: 'Category', description: 'Description', address: 'Address', rating: 'Rating', noInfo: 'No info found.' },
    de: { category: 'Kategorie', description: 'Beschreibung', address: 'Adresse', rating: 'Bewertung', noInfo: 'Keine Info.' },
    fr: { category: 'Catégorie', description: 'Description', address: 'Adresse', rating: 'Évaluation', noInfo: 'Aucune info trouvée.' },
    es: { category: 'Categoría', description: 'Descripción', address: 'Dirección', rating: 'Valoración', noInfo: 'Sin info.' },
  };
  return labels[lang];
}

/**
 * Get supported locales.
 * @returns {string[]}
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

export default {
  buildAntiHallucinationInstructions,
  buildReferenceMaterialBlock,
  buildSystemPromptHeader,
  buildUnknownEntityWarning,
  getLabeledFields,
  getSupportedLocales,
};
