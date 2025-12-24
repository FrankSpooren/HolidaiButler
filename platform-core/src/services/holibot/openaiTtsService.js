/**
 * OpenAI Text-to-Speech Service
 * HolidaiButler 2.0 Enterprise - Premium Voice Output
 *
 * Features:
 * - Natural, warm voices with emotional intonation
 * - Multi-language support (all 6 languages)
 * - Zero Data Retention for GDPR compliance
 * - Voice: "nova" - warm, friendly, perfect for vacation assistant
 * - Fallback to "alloy" if needed
 *
 * OpenAI TTS Voices:
 * - alloy: neutral, balanced
 * - echo: warm, conversational
 * - fable: expressive, storytelling
 * - onyx: deep, authoritative
 * - nova: warm, friendly, natural (RECOMMENDED)
 * - shimmer: gentle, soothing
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

// Voice configuration - nova is warm and friendly, perfect for a vacation assistant
const VOICE_CONFIG = {
  primary: 'nova',      // Warm, friendly, natural
  fallback: 'alloy',    // Neutral fallback
  model: 'tts-1',       // Standard quality (tts-1-hd for higher quality)
  speed: 1.0,           // Normal speed (0.25 to 4.0)
};

// In-memory cache for audio (max 100 entries, 1 hour TTL)
const audioCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Preprocess text for natural TTS output
 * - Removes markdown formatting
 * - Removes emojis
 * - Cleans up for natural speech
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

class OpenAITTSService {
  constructor() {
    this.client = null;
    this.isAvailable = false;
    this.initializeClient();
  }

  /**
   * Initialize OpenAI client
   */
  async initializeClient() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        logger.warn('OpenAI TTS: No API key configured (OPENAI_API_KEY), service disabled');
        this.isAvailable = false;
        return;
      }

      this.client = new OpenAI({
        apiKey: apiKey,
      });

      // Test the connection with a minimal request
      // OpenAI doesn't have a simple "test" endpoint, so we just verify the client was created
      this.isAvailable = true;
      logger.info('OpenAI TTS: Service initialized successfully', {
        voice: VOICE_CONFIG.primary,
        model: VOICE_CONFIG.model
      });
    } catch (error) {
      logger.error('OpenAI TTS: Initialization failed:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Generate cache key from text and voice
   */
  getCacheKey(text, voice) {
    const hash = crypto.createHash('md5').update(`openai:${voice}:${text}`).digest('hex');
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
   * Convert text to speech using OpenAI
   * @param {string} text - Text to convert (max 4096 characters)
   * @param {string} language - Language code (nl, en, de, es, sv, pl) - not used by OpenAI but kept for API compatibility
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

    // Clean and limit text (OpenAI limit is 4096 chars)
    const cleanText = preprocessTextForSpeech(text).substring(0, 4096);
    if (cleanText.length === 0) {
      return {
        success: false,
        error: 'Text is empty'
      };
    }

    const voice = VOICE_CONFIG.primary;

    // Check cache first
    const cacheKey = this.getCacheKey(cleanText, voice);
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug('OpenAI TTS: Serving from cache', { language, textLength: cleanText.length });
      return {
        success: true,
        audio: cached.audio,
        contentType: 'audio/mp3',
        cached: true
      };
    }

    try {
      logger.info('OpenAI TTS: Synthesizing speech', {
        language,
        textLength: cleanText.length,
        voice: voice,
        model: VOICE_CONFIG.model
      });

      // Call OpenAI TTS API
      const response = await this.client.audio.speech.create({
        model: VOICE_CONFIG.model,
        voice: voice,
        input: cleanText,
        response_format: 'mp3',
        speed: VOICE_CONFIG.speed,
      });

      // Get audio as buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = buffer.toString('base64');

      // Cache the result
      this.cleanupCache();
      audioCache.set(cacheKey, {
        audio: audioBase64,
        timestamp: Date.now()
      });

      logger.info('OpenAI TTS: Speech synthesized successfully', {
        language,
        audioSize: audioBase64.length,
        voice: voice
      });

      return {
        success: true,
        audio: audioBase64,
        contentType: 'audio/mp3',
        cached: false
      };

    } catch (error) {
      logger.error('OpenAI TTS: Synthesis failed:', error.message);

      // Try fallback voice if primary fails
      if (voice === VOICE_CONFIG.primary && VOICE_CONFIG.fallback) {
        logger.info('OpenAI TTS: Trying fallback voice:', VOICE_CONFIG.fallback);
        try {
          const fallbackResponse = await this.client.audio.speech.create({
            model: VOICE_CONFIG.model,
            voice: VOICE_CONFIG.fallback,
            input: cleanText,
            response_format: 'mp3',
            speed: VOICE_CONFIG.speed,
          });

          const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
          const audioBase64 = buffer.toString('base64');

          return {
            success: true,
            audio: audioBase64,
            contentType: 'audio/mp3',
            cached: false
          };
        } catch (fallbackError) {
          logger.error('OpenAI TTS: Fallback also failed:', fallbackError.message);
        }
      }

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
      provider: 'openai',
      voice: VOICE_CONFIG.primary,
      model: VOICE_CONFIG.model,
      languages: ['nl', 'en', 'de', 'es', 'sv', 'pl'], // OpenAI auto-detects language
      cacheSize: audioCache.size
    };
  }
}

export const openaiTtsService = new OpenAITTSService();
export default openaiTtsService;
