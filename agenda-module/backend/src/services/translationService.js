const axios = require('axios');

/**
 * AI-Powered Translation Service
 *
 * Provides multilingual support for event content using AI translation
 * with context awareness for tourism and events domain.
 *
 * Supported Languages:
 * - nl: Dutch
 * - en: English
 * - es: Spanish
 * - de: German
 * - fr: French
 */

class TranslationService {
  constructor() {
    this.supportedLanguages = ['nl', 'en', 'es', 'de', 'fr'];
    this.defaultLanguage = 'nl';

    // Cache for translations to reduce API calls
    this.translationCache = new Map();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Tourism-specific context for better translations
    this.tourismContext = {
      nl: 'Dit is een evenement in Calpe, een toeristische stad aan de Costa Blanca in Spanje.',
      en: 'This is an event in Calpe, a tourist town on the Costa Blanca in Spain.',
      es: 'Este es un evento en Calpe, una ciudad turística en la Costa Blanca de España.',
      de: 'Dies ist eine Veranstaltung in Calpe, einer Touristenstadt an der Costa Blanca in Spanien.',
      fr: 'Ceci est un événement à Calpe, une ville touristique sur la Costa Blanca en Espagne.',
    };
  }

  /**
   * Translate text to multiple languages
   * @param {String} text - Text to translate
   * @param {String} sourceLanguage - Source language code
   * @param {Array} targetLanguages - Array of target language codes
   * @param {String} context - Additional context for translation
   * @returns {Promise<Map>} Map of language code to translated text
   */
  async translateToMultiple(text, sourceLanguage = 'nl', targetLanguages = null, context = '') {
    if (!text || text.trim() === '') {
      return new Map();
    }

    const targets = targetLanguages || this.supportedLanguages.filter(lang => lang !== sourceLanguage);
    const translations = new Map();

    // Add source language
    translations.set(sourceLanguage, text);

    // Check cache first
    const cacheKey = this.getCacheKey(text, sourceLanguage);
    const cached = this.translationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      targets.forEach(lang => {
        if (cached.translations.has(lang)) {
          translations.set(lang, cached.translations.get(lang));
        }
      });

      // If all targets are in cache, return
      if (targets.every(lang => cached.translations.has(lang))) {
        return translations;
      }
    }

    // Translate missing languages
    const missingLanguages = targets.filter(lang => !translations.has(lang));

    try {
      // Translate in parallel for better performance
      const translationPromises = missingLanguages.map(async (targetLang) => {
        try {
          const translated = await this.translateText(text, sourceLanguage, targetLang, context);
          return { lang: targetLang, text: translated };
        } catch (error) {
          console.error(`Translation failed for ${targetLang}:`, error.message);
          // Fallback to source text with language indicator
          return { lang: targetLang, text: `[${sourceLanguage.toUpperCase()}] ${text}` };
        }
      });

      const results = await Promise.all(translationPromises);

      results.forEach(({ lang, text: translatedText }) => {
        translations.set(lang, translatedText);
      });

      // Update cache
      this.translationCache.set(cacheKey, {
        translations,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Translation service error:', error.message);
      // Return at least the source language
      return translations;
    }

    return translations;
  }

  /**
   * Translate a single text to a target language
   * @param {String} text - Text to translate
   * @param {String} sourceLanguage - Source language code
   * @param {String} targetLanguage - Target language code
   * @param {String} context - Additional context
   * @returns {Promise<String>} Translated text
   */
  async translateText(text, sourceLanguage, targetLanguage, context = '') {
    // In a production environment, you would use a translation API like:
    // - Google Cloud Translation API
    // - DeepL API
    // - OpenAI GPT-4 for context-aware translation
    // - Azure Translator

    // For this implementation, we'll show the structure for using
    // an AI-based translation service (OpenAI as example)

    try {
      // Example using OpenAI GPT for context-aware translation
      const translatedText = await this.translateWithAI(
        text,
        sourceLanguage,
        targetLanguage,
        context
      );

      return translatedText;

    } catch (error) {
      console.error('AI translation failed, falling back to basic translation:', error.message);

      // Fallback to a simpler translation service
      try {
        return await this.translateWithFallbackService(text, sourceLanguage, targetLanguage);
      } catch (fallbackError) {
        console.error('Fallback translation also failed:', fallbackError.message);
        throw new Error(`Translation failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Translate using AI (OpenAI GPT) for context-aware translations
   * @param {String} text - Text to translate
   * @param {String} sourceLanguage - Source language code
   * @param {String} targetLanguage - Target language code
   * @param {String} context - Additional context
   * @returns {Promise<String>} Translated text
   */
  async translateWithAI(text, sourceLanguage, targetLanguage, context = '') {
    // This would integrate with your OpenAI API or similar
    // For now, we'll provide the structure

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const languageNames = {
      nl: 'Dutch',
      en: 'English',
      es: 'Spanish',
      de: 'German',
      fr: 'French',
    };

    const tourismContext = this.tourismContext[targetLanguage] || '';
    const fullContext = context ? `${tourismContext}\n${context}` : tourismContext;

    const prompt = `You are a professional translator specializing in tourism and events content.

Context: ${fullContext}

Translate the following text from ${languageNames[sourceLanguage]} to ${languageNames[targetLanguage]}.
Maintain the tone and style appropriate for a tourism event listing.
Keep proper nouns, place names, and dates unchanged.

Text to translate:
${text}

Provide only the translation, without any explanations or notes.`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator for tourism and events content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content.trim();

    } catch (error) {
      if (error.response) {
        console.error('OpenAI API error:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Fallback translation using a simpler service (e.g., Google Translate)
   * @param {String} text - Text to translate
   * @param {String} sourceLanguage - Source language code
   * @param {String} targetLanguage - Target language code
   * @returns {Promise<String>} Translated text
   */
  async translateWithFallbackService(text, sourceLanguage, targetLanguage) {
    // Example using Google Cloud Translation API
    const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!GOOGLE_API_KEY) {
      throw new Error('No translation service configured');
    }

    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
        {
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }
      );

      return response.data.data.translations[0].translatedText;

    } catch (error) {
      console.error('Google Translate API error:', error.message);
      throw error;
    }
  }

  /**
   * Translate all multilingual fields in an event object
   * @param {Object} eventData - Event data object
   * @param {String} sourceLanguage - Source language
   * @returns {Promise<Object>} Event with all translations
   */
  async translateEvent(eventData, sourceLanguage = 'nl') {
    const multilingualFields = [
      'title',
      'description',
      'shortDescription',
      'pricing.priceDescription',
      'seo.metaTitle',
      'seo.metaDescription',
    ];

    const translatedEvent = { ...eventData };

    for (const fieldPath of multilingualFields) {
      const value = this.getFieldValue(eventData, fieldPath);

      if (value && typeof value === 'string') {
        const translations = await this.translateToMultiple(value, sourceLanguage);
        this.setFieldValue(translatedEvent, fieldPath, translations);
      }
    }

    // Mark as AI-translated
    translatedEvent.aiEnhancements = {
      ...translatedEvent.aiEnhancements,
      translatedBy: 'ai',
      translationModel: 'gpt-4',
      translatedAt: new Date(),
    };

    return translatedEvent;
  }

  /**
   * Detect language of text
   * @param {String} text - Text to detect language
   * @returns {Promise<String>} Detected language code
   */
  async detectLanguage(text) {
    // Simple heuristic-based detection for common words
    const commonWords = {
      nl: ['het', 'de', 'een', 'van', 'en', 'in', 'op', 'voor', 'met', 'wordt'],
      en: ['the', 'a', 'an', 'of', 'and', 'in', 'on', 'for', 'with', 'is'],
      es: ['el', 'la', 'de', 'en', 'y', 'un', 'para', 'con', 'por', 'los'],
      de: ['der', 'die', 'das', 'und', 'in', 'zu', 'den', 'von', 'mit', 'für'],
      fr: ['le', 'la', 'de', 'un', 'et', 'en', 'pour', 'avec', 'dans', 'les'],
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores = {};

    Object.keys(commonWords).forEach(lang => {
      scores[lang] = 0;
      commonWords[lang].forEach(word => {
        if (words.includes(word)) {
          scores[lang]++;
        }
      });
    });

    // Find language with highest score
    let detectedLang = this.defaultLanguage;
    let maxScore = 0;

    Object.entries(scores).forEach(([lang, score]) => {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    });

    // If no clear detection, use Google Translate API for detection
    if (maxScore < 2) {
      try {
        const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
        if (GOOGLE_API_KEY) {
          const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2/detect?key=${GOOGLE_API_KEY}`,
            { q: text }
          );
          return response.data.data.detections[0][0].language;
        }
      } catch (error) {
        console.error('Language detection failed:', error.message);
      }
    }

    return detectedLang;
  }

  /**
   * Get field value using dot notation
   */
  getFieldValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Set field value using dot notation
   */
  setFieldValue(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[last] = value;
  }

  /**
   * Generate cache key
   */
  getCacheKey(text, sourceLanguage) {
    const crypto = require('crypto');
    return crypto
      .createHash('md5')
      .update(`${sourceLanguage}:${text}`)
      .digest('hex');
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.translationCache.size,
      languages: this.supportedLanguages,
    };
  }
}

module.exports = new TranslationService();
