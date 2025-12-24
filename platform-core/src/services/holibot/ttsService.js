/**
 * Google Cloud Text-to-Speech Service
 * HoliBot 2.0 Enterprise - Voice Output
 *
 * Features:
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - Premium Chirp3-HD voices - Google's highest quality TTS
 * - Native pronunciation for all supported languages
 * - SSML support for better phrasing and pauses
 * - Text preprocessing (removes markdown, emojis)
 * - Audio caching for repeated requests
 * - Fallback to Wavenet voices if Chirp3-HD unavailable
 */

import textToSpeech from '@google-cloud/text-to-speech';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

// Voice configuration per language - using Chirp3-HD voices (highest quality available)
// Chirp3-HD is Google's latest and most natural voice technology with native pronunciation
// Voice "Aoede" selected for warm, friendly female voice across all languages
const VOICE_CONFIG = {
  nl: { languageCode: 'nl-NL', name: 'nl-NL-Chirp3-HD-Aoede' }, // Native Dutch female - warm & friendly
  en: { languageCode: 'en-GB', name: 'en-GB-Chirp3-HD-Aoede' }, // Native British female - warm & friendly
  de: { languageCode: 'de-DE', name: 'de-DE-Chirp3-HD-Aoede' }, // Native German female - warm & friendly
  es: { languageCode: 'es-ES', name: 'es-ES-Chirp3-HD-Aoede' }, // Native Spanish female - warm & friendly
  sv: { languageCode: 'sv-SE', name: 'sv-SE-Chirp3-HD-Aoede' }, // Native Swedish female - warm & friendly
  pl: { languageCode: 'pl-PL', name: 'pl-PL-Chirp3-HD-Aoede' }, // Native Polish female - warm & friendly
};

// Wavenet voice fallbacks (high quality fallback)
const FALLBACK_VOICE_CONFIG = {
  nl: { languageCode: 'nl-NL', name: 'nl-NL-Wavenet-F', ssmlGender: 'FEMALE' },
  en: { languageCode: 'en-GB', name: 'en-GB-Wavenet-A', ssmlGender: 'FEMALE' },
  de: { languageCode: 'de-DE', name: 'de-DE-Wavenet-C', ssmlGender: 'FEMALE' },
  es: { languageCode: 'es-ES', name: 'es-ES-Wavenet-C', ssmlGender: 'FEMALE' },
  sv: { languageCode: 'sv-SE', name: 'sv-SE-Wavenet-A', ssmlGender: 'FEMALE' },
  pl: { languageCode: 'pl-PL', name: 'pl-PL-Wavenet-A', ssmlGender: 'FEMALE' },
};

// In-memory cache for audio (max 100 entries, 1 hour TTL)
const audioCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Preprocess text for natural TTS output
 * - Removes markdown formatting (**, *, #, -, etc.)
 * - Removes emojis and special characters
 * - Converts bullet points to natural phrasing
 * - Adds appropriate pauses
 */
function preprocessTextForSpeech(text) {
  let processed = text;

  // Remove emoji patterns (Unicode emoji ranges)
  processed = processed.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');

  // Remove markdown headers (# ## ###)
  processed = processed.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers (**text**, *text*, __text__, _text_)
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1');
  processed = processed.replace(/\*([^*]+)\*/g, '$1');
  processed = processed.replace(/__([^_]+)__/g, '$1');
  processed = processed.replace(/_([^_]+)_/g, '$1');

  // Convert bullet points to natural phrasing
  processed = processed.replace(/^[-•*]\s+/gm, '');
  processed = processed.replace(/^\d+\.\s+/gm, '');

  // Remove markdown links [text](url) -> keep text
  processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove inline code backticks
  processed = processed.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks
  processed = processed.replace(/```[\s\S]*?```/g, '');

  // Clean up multiple spaces and newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/[ \t]+/g, ' ');

  // Remove standalone special characters
  processed = processed.replace(/[★☆●○◆◇▪▫]/g, '');

  // Trim each line
  processed = processed.split('\n').map(line => line.trim()).join('\n');

  // Final cleanup
  processed = processed.trim();

  return processed;
}

/**
 * Convert text to SSML for more natural speech
 * - Adds pauses at paragraph breaks
 * - Improves phrasing for lists
 */
function textToSSML(text, language = 'nl') {
  // First preprocess the text
  const cleanText = preprocessTextForSpeech(text);

  // Escape XML special characters
  let ssml = cleanText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Add pauses at paragraph breaks (double newlines)
  ssml = ssml.replace(/\n\n+/g, '<break time="600ms"/>');

  // Add shorter pauses at single newlines
  ssml = ssml.replace(/\n/g, '<break time="300ms"/>');

  // Add pauses after sentences (., !, ?)
  ssml = ssml.replace(/([.!?])\s+/g, '$1<break time="400ms"/>');

  // Add pauses after colons
  ssml = ssml.replace(/:\s+/g, ':<break time="300ms"/>');

  // Wrap in speak tags
  return `<speak>${ssml}</speak>`;
}

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
      const fallbackVoice = FALLBACK_VOICE_CONFIG[language] || FALLBACK_VOICE_CONFIG.en;

      // Convert text to SSML for natural speech
      const ssmlText = textToSSML(cleanText, language);

      // Build request with SSML
      const request = {
        input: { ssml: ssmlText },
        voice: voiceConfig,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,  // Slightly slower for clarity
          pitch: 0,
          volumeGainDb: 2.0,  // Slightly louder
          effectsProfileId: ['headphone-class-device'], // Optimized for headphones/speakers
        },
      };

      logger.info('TTS: Synthesizing speech with SSML', {
        language,
        textLength: cleanText.length,
        ssmlLength: ssmlText.length,
        voice: voiceConfig.name
      });

      let response;
      try {
        // Try Chirp3-HD voice first (highest quality)
        [response] = await this.client.synthesizeSpeech(request);
      } catch (chirpError) {
        // Fallback to Wavenet voice
        logger.warn('TTS: Chirp3-HD voice failed, trying Wavenet fallback:', chirpError.message);
        request.voice = fallbackVoice;
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
// TTS Enabled za 20 dec 2025 21:40:04
