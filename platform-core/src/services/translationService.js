/**
 * Translation Service (Fase V.6)
 * Mistral AI-powered translation for multi-language content
 */

import logger from '../utils/logger.js';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Translate texts using Mistral AI
 * @param {Array<{key: string, value: string}>} texts - Texts to translate
 * @param {string} sourceLang - Source language code (en, nl, de, es)
 * @param {string[]} targetLangs - Target language codes
 * @returns {Object} translations keyed by text key, then by target language
 */
export async function translateTexts(texts, sourceLang, targetLangs) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not configured');
  }

  const langNames = { en: 'English', nl: 'Dutch', de: 'German', es: 'Spanish', fr: 'French' };
  const sourceName = langNames[sourceLang] || sourceLang;
  const translations = {};

  for (const targetLang of targetLangs) {
    if (targetLang === sourceLang) continue;

    const targetName = langNames[targetLang] || targetLang;
    const textsBlock = texts.map(t => `[${t.key}]: ${t.value}`).join('\n');

    const systemPrompt = `You are a professional translator for a tourism platform. Translate from ${sourceName} to ${targetName}. Rules:
- Keep the tone informative yet inviting, targeted at European tourists
- Preserve formatting (markdown, links, HTML tags)
- Do NOT translate proper nouns (POI names, street names, local terms)
- Return ONLY a JSON object with the translation keys and translated values
- Example input: [headline]: Welcome to Calpe
- Example output: {"headline": "Welkom in Calpe"}`;

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: textsBlock },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error(`[TranslationService] Mistral API error (${response.status}):`, errText);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      logger.error('[TranslationService] Failed to parse Mistral response:', content);
      throw new Error('Failed to parse translation response');
    }

    // Merge into translations object
    for (const t of texts) {
      if (!translations[t.key]) translations[t.key] = {};
      translations[t.key][targetLang] = parsed[t.key] || '';
    }

    logger.info(`[TranslationService] Translated ${texts.length} texts ${sourceLang}→${targetLang}`);
  }

  return translations;
}
