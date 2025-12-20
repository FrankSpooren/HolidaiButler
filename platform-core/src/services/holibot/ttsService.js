/**
 * Google Cloud Text-to-Speech Service
 * HoliBot 2.0 Enterprise - Voice Output
 *
 * Features:
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - High-quality WaveNet voices
 * - Audio caching for repeated requests
 * - Fallback to Standard voices if WaveNet unavailable
 */

import textToSpeech from '@google-cloud/text-to-speech';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

// Voice configuration per language
const VOICE_CONFIG = {
  nl: { languageCode: 'nl-NL', name: 'nl-NL-Wavenet-B', ssmlGender: 'FEMALE' },
  en: { languageCode: 'en-GB', name: 'en-GB-Wavenet-A', ssmlGender: 'FEMALE' },
  de: { languageCode: 'de-DE', name: 'de-DE-Wavenet-C', ssmlGender: 'FEMALE' },
  es: { languageCode: 'es-ES', name: 'es-ES-Wavenet-C', ssmlGender: 'FEMALE' },
  sv: { languageCode: 'sv-SE', name: 'sv-SE-Wavenet-A', ssmlGender: 'FEMALE' },
  pl: { languageCode: 'pl-PL', name: 'pl-PL-Wavenet-A', ssmlGender: 'FEMALE' },
};

// Standard voice fallbacks (lower quality but always available)
const STANDARD_VOICE_CONFIG = {
  nl: { languageCode: 'nl-NL', name: 'nl-NL-Standard-B', ssmlGender: 'FEMALE' },
  en: { languageCode: 'en-GB', name: 'en-GB-Standard-A', ssmlGender: 'FEMALE' },
  de: { languageCode: 'de-DE', name: 'de-DE-Standard-C', ssmlGender: 'FEMALE' },
  es: { languageCode: 'es-ES', name: 'es-ES-Standard-C', ssmlGender: 'FEMALE' },
  sv: { languageCode: 'sv-SE', name: 'sv-SE-Standard-A', ssmlGender: 'FEMALE' },
  pl: { languageCode: 'pl-PL', name: 'pl-PL-Standard-A', ssmlGender: 'FEMALE' },
};

// In-memory cache for audio (max 100 entries, 1 hour TTL)
const audioCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

class TTSService {
  constructor() {
    this.client = null;
    this.isAvailable = false;
    this.initializeClient();
  }

  /**
   * Initialize Google Cloud TTS client
   */
  async initializeClient() {
    try {
      // Check if credentials are configured
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                            process.env.GOOGLE_CLOUD_PROJECT;

      if (!hasCredentials) {
        logger.warn('Google Cloud TTS: No credentials configured, service disabled');
        this.isAvailable = false;
        return;
      }

      this.client = new textToSpeech.TextToSpeechClient();

      // Test the connection by listing voices
      await this.client.listVoices({ languageCode: 'nl-NL' });

      this.isAvailable = true;
      logger.info('Google Cloud TTS: Service initialized successfully');
    } catch (error) {
      logger.error('Google Cloud TTS: Initialization failed:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Generate cache key from text and language
   */
  getCacheKey(text, language) {
    const hash = crypto.createHash('md5').update(`${language}:${text}`).digest('hex');
    return hash;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of audioCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        audioCache.delete(key);
      }
    }

    // If still over limit, remove oldest entries
    if (audioCache.size > CACHE_MAX_SIZE) {
      const entries = Array.from(audioCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, audioCache.size - CACHE_MAX_SIZE);
      toRemove.forEach(([key]) => audioCache.delete(key));
    }
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert (max 5000 characters)
   * @param {string} language - Language code (nl, en, de, es, sv, pl)
   * @returns {Promise<{success: boolean, audio?: string, contentType?: string, error?: string}>}
   */
  async synthesize(text, language = 'nl') {
    // Check if service is available
    if (!this.isAvailable || !this.client) {
      return {
        success: false,
        error: 'TTS service not available'
      };
    }

    // Validate input
    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: 'Text is required'
      };
    }

    // Clean and limit text
    const cleanText = text.trim().substring(0, 5000);
    if (cleanText.length === 0) {
      return {
        success: false,
        error: 'Text is empty'
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(cleanText, language);
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug('TTS: Serving from cache', { language, textLength: cleanText.length });
      return {
        success: true,
        audio: cached.audio,
        contentType: 'audio/mp3',
        cached: true
      };
    }

    try {
      // Get voice config for language
      const voiceConfig = VOICE_CONFIG[language] || VOICE_CONFIG.en;
      const standardVoice = STANDARD_VOICE_CONFIG[language] || STANDARD_VOICE_CONFIG.en;

      // Build request
      const request = {
        input: { text: cleanText },
        voice: voiceConfig,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0,
          volumeGainDb: 0,
        },
      };

      logger.info('TTS: Synthesizing speech', {
        language,
        textLength: cleanText.length,
        voice: voiceConfig.name
      });

      let response;
      try {
        // Try WaveNet voice first
        [response] = await this.client.synthesizeSpeech(request);
      } catch (wavenetError) {
        // Fallback to Standard voice
        logger.warn('TTS: WaveNet voice failed, trying Standard voice:', wavenetError.message);
        request.voice = standardVoice;
        [response] = await this.client.synthesizeSpeech(request);
      }

      // Convert audio to base64
      const audioBase64 = response.audioContent.toString('base64');

      // Cache the result
      this.cleanupCache();
      audioCache.set(cacheKey, {
        audio: audioBase64,
        timestamp: Date.now()
      });

      logger.info('TTS: Speech synthesized successfully', {
        language,
        audioSize: audioBase64.length
      });

      return {
        success: true,
        audio: audioBase64,
        contentType: 'audio/mp3',
        cached: false
      };

    } catch (error) {
      logger.error('TTS: Synthesis failed:', error.message);
      return {
        success: false,
        error: error.message || 'Speech synthesis failed'
      };
    }
  }

  /**
   * Check if TTS service is available
   */
  checkAvailability() {
    return {
      available: this.isAvailable,
      languages: Object.keys(VOICE_CONFIG),
      cacheSize: audioCache.size
    };
  }
}

export const ttsService = new TTSService();
export default ttsService;
