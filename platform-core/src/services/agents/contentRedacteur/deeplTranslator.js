/**
 * DeepL Translation Service — EU-compliant high-quality translations
 * Uses DeepL API (Cologne, Germany) for superior European language quality.
 * Falls back to Mistral AI translations if DeepL is not configured.
 *
 * @version 1.0.0
 */

import logger from '../../../utils/logger.js';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2'; // Use api.deepl.com for Pro

/**
 * DeepL language codes differ from our internal codes
 */
const LANG_MAP = {
  en: 'EN',
  nl: 'NL',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
};

/**
 * Formality preference per destination language
 */
const FORMALITY_CONFIG = {
  1: { de: 'less', nl: 'default', es: 'default', fr: 'default' }, // Calpe: informal German
  2: { de: 'less', nl: 'default', es: 'default', fr: 'default' }, // Texel: informal German
  4: { de: 'default', nl: 'default', fr: 'more', es: 'default' }, // WarreWijzer: formal French
};

/**
 * Terms that should NOT be translated (proper nouns, brand names)
 */
const DO_NOT_TRANSLATE = [
  'HolidaiButler', 'HoliBot', 'Tessa', 'WarreWijzer', 'Wijze Warre',
  'Peñón de Ifach', 'Costa Blanca', 'Calpe', 'Texel', 'Den Burg',
  'Wadden Sea', 'Wattenmeer', 'De Koog', 'Den Hoorn', 'Oudeschild',
];

/**
 * Check if DeepL API is configured
 */
export function isConfigured() {
  return !!process.env.DEEPL_API_KEY;
}

/**
 * Translate text using DeepL API
 * @param {string} text - Text to translate (source language auto-detected or EN)
 * @param {string} targetLang - Target language code (en, nl, de, es, fr)
 * @param {Object} options - { sourceLang, destinationId, formality }
 * @returns {string} Translated text
 */
export async function translateWithDeepL(text, targetLang, options = {}) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DeepL API key not configured — set DEEPL_API_KEY in .env');
  }

  const deepLTarget = LANG_MAP[targetLang];
  if (!deepLTarget) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  const deepLSource = options.sourceLang ? LANG_MAP[options.sourceLang] : undefined;

  // Determine formality
  const destId = options.destinationId || 1;
  const formalityConfig = FORMALITY_CONFIG[destId] || {};
  const formality = options.formality || formalityConfig[targetLang] || 'default';

  const params = new URLSearchParams();
  params.append('text', text);
  params.append('target_lang', deepLTarget);
  if (deepLSource) params.append('source_lang', deepLSource);
  if (formality !== 'default' && ['de', 'nl', 'fr', 'es'].includes(targetLang)) {
    params.append('formality', formality);
  }
  // Preserve formatting
  params.append('preserve_formatting', '1');
  params.append('tag_handling', 'html');

  try {
    const baseUrl = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';
    const response = await fetch(`${baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepL API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    let translated = data.translations?.[0]?.text || text;

    // Restore any terms that were incorrectly translated
    for (const term of DO_NOT_TRANSLATE) {
      // Simple restoration — replace common mistranslations back to original
      const lower = term.toLowerCase();
      if (text.includes(term) && !translated.includes(term)) {
        // Try to find a close match and replace
        const regex = new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        translated = translated.replace(regex, term);
      }
    }

    return translated;
  } catch (error) {
    logger.error(`[DeepL] Translation to ${targetLang} failed:`, error.message);
    throw error;
  }
}

/**
 * Batch translate multiple texts
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language
 * @param {Object} options
 * @returns {string[]} Array of translated texts
 */
export async function batchTranslate(texts, targetLang, options = {}) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) throw new Error('DeepL API key not configured');

  const deepLTarget = LANG_MAP[targetLang];
  if (!deepLTarget) throw new Error(`Unsupported target language: ${targetLang}`);

  const params = new URLSearchParams();
  for (const text of texts) {
    params.append('text', text);
  }
  params.append('target_lang', deepLTarget);
  params.append('preserve_formatting', '1');

  const destId = options.destinationId || 1;
  const formalityConfig = FORMALITY_CONFIG[destId] || {};
  const formality = formalityConfig[targetLang] || 'default';
  if (formality !== 'default') params.append('formality', formality);

  const baseUrl = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';
  const response = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`DeepL batch translate error: ${response.status}`);
  }

  const data = await response.json();
  return data.translations?.map(t => t.text) || texts;
}

/**
 * Get DeepL API usage (remaining characters)
 */
export async function getUsage() {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return null;

  const baseUrl = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';
  const response = await fetch(`${baseUrl}/usage`, {
    headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` },
  });

  if (!response.ok) return null;
  return response.json();
}

export default { translateWithDeepL, batchTranslate, isConfigured, getUsage };
