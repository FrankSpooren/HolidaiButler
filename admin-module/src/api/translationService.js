import client from './client.js';

/**
 * Auto-translate texts via Mistral AI (V.6.6)
 * @param {Array<{key: string, value: string}>} texts - Texts to translate
 * @param {string} sourceLang - Source language code (e.g. 'en')
 * @param {string[]} targetLangs - Target language codes (e.g. ['nl', 'de', 'es'])
 * @returns {Promise<Record<string, Record<string, string>>>} translations keyed by key, then by lang
 */
export async function translateTexts(texts, sourceLang = 'en', targetLangs = ['nl', 'de', 'es']) {
  const { data } = await client.post('/translate', { texts, sourceLang, targetLangs });
  return data.data?.translations || {};
}
