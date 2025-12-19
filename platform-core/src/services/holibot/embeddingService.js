/**
 * Embedding Service
 * Uses Mistral AI for generating text embeddings and chat completions
 */

import { Mistral } from '@mistralai/mistralai';
import logger from '../../utils/logger.js';

class EmbeddingService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.embeddingModel = 'mistral-embed';
    this.chatModel = process.env.MISTRAL_MODEL || 'mistral-small-latest';
  }

  /**
   * Initialize Mistral client
   */
  initialize() {
    if (this.isConfigured) {
      return true;
    }

    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      logger.warn('Mistral API key not configured - embeddings will not work');
      return false;
    }

    try {
      this.client = new Mistral({ apiKey });
      this.isConfigured = true;
      logger.info('Mistral embedding service initialized');
      return true;

    } catch (error) {
      logger.error('Failed to initialize Mistral client:', error);
      return false;
    }
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {number[]} - Embedding vector
   */
  async generateEmbedding(text) {
    if (!this.isConfigured) {
      this.initialize();
    }

    if (!this.client) {
      throw new Error('Mistral client not initialized');
    }

    try {
      const startTime = Date.now();

      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: [text]
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        throw new Error('No embedding returned from Mistral API');
      }

      const timeMs = Date.now() - startTime;
      logger.info(`Generated embedding (${embedding.length} dims) in ${timeMs}ms`);

      return embedding;

    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {number[][]} - Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    if (!this.isConfigured) {
      this.initialize();
    }

    if (!this.client) {
      throw new Error('Mistral client not initialized');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: texts
      });

      return response.data.map(item => {
        if (!item.embedding) {
          throw new Error('No embedding returned from Mistral API');
        }
        return item.embedding;
      });

    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion for conversational responses
   * @param {Array} messages - Array of {role, content} messages
   * @param {Object} options - Temperature, maxTokens, etc.
   * @returns {string} - Generated response
   */
  async generateChatCompletion(messages, options = {}) {
    if (!this.isConfigured) {
      this.initialize();
    }

    if (!this.client) {
      throw new Error('Mistral client not initialized');
    }

    try {
      const startTime = Date.now();

      const response = await this.client.chat.complete({
        model: this.chatModel,
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from Mistral chat completion');
      }

      // Handle content that might be string or ContentChunk[]
      let result;
      if (typeof content === 'string') {
        result = content;
      } else {
        result = content.map(chunk => {
          if (chunk.type === 'text') {
            return chunk.text || '';
          }
          return '';
        }).join('');
      }

      const timeMs = Date.now() - startTime;
      logger.info(`Chat completion generated in ${timeMs}ms`);

      return result;

    } catch (error) {
      logger.error('Failed to generate chat completion:', error);
      throw error;
    }
  }

  /**
   * Build system prompt for HoliBot based on language
   * @param {string} language - Language code (nl, en, de, es, sv, pl)
   * @param {Object} userPreferences - User preferences for personalization
   */
  buildSystemPrompt(language = 'nl', userPreferences = {}) {
    const prompts = {
      nl: `Je bent HoliBot, een vriendelijke en enthousiaste lokale gids voor Calpe, Spanje.
Je helpt toeristen en bezoekers met informatie over:
- Stranden en natuur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurants en eetgelegenheden
- Historische bezienswaardigheden
- Activiteiten en recreatie
- Winkelen en markten
- Evenementen en agenda

Richtlijnen:
- Wees altijd vriendelijk en behulpzaam
- Geef concrete, bruikbare informatie
- Vermeld adressen en locaties wanneer relevant
- Houd antwoorden beknopt maar informatief (max 150 woorden)
- Antwoord in het Nederlands`,

      en: `You are HoliBot, a friendly and enthusiastic local guide for Calpe, Spain.
You help tourists and visitors with information about:
- Beaches and nature (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurants and dining
- Historical attractions
- Activities and recreation
- Shopping and markets
- Events and calendar

Guidelines:
- Always be friendly and helpful
- Give concrete, practical information
- Mention addresses and locations when relevant
- Keep answers concise but informative (max 150 words)
- Answer in English`,

      de: `Du bist HoliBot, ein freundlicher und begeisterter lokaler Führer für Calpe, Spanien.
Du hilfst Touristen und Besuchern mit Informationen über:
- Strände und Natur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurants und Gastronomie
- Historische Sehenswürdigkeiten
- Aktivitäten und Erholung
- Einkaufen und Märkte
- Veranstaltungen und Kalender

Richtlinien:
- Sei immer freundlich und hilfsbereit
- Gib konkrete, praktische Informationen
- Erwähne Adressen und Standorte wenn relevant
- Halte Antworten kurz aber informativ (max 150 Wörter)
- Antworte auf Deutsch`,

      es: `Eres HoliBot, una guía local amigable y entusiasta para Calpe, España.
Ayudas a turistas y visitantes con información sobre:
- Playas y naturaleza (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurantes y gastronomía
- Atracciones históricas
- Actividades y recreación
- Compras y mercados
- Eventos y calendario

Directrices:
- Sé siempre amable y servicial
- Da información concreta y práctica
- Menciona direcciones y ubicaciones cuando sea relevante
- Mantén las respuestas concisas pero informativas (máx 150 palabras)
- Responde en español`,

      sv: `Du är HoliBot, en vänlig och entusiastisk lokal guide för Calpe, Spanien.
Du hjälper turister och besökare med information om:
- Stränder och natur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restauranger och matställen
- Historiska sevärdheter
- Aktiviteter och rekreation
- Shopping och marknader
- Evenemang och kalender

Riktlinjer:
- Var alltid vänlig och hjälpsam
- Ge konkret, praktisk information
- Nämn adresser och platser när det är relevant
- Håll svaren korta men informativa (max 150 ord)
- Svara på svenska`,

      pl: `Jesteś HoliBot, przyjaznym i entuzjastycznym lokalnym przewodnikiem po Calpe w Hiszpanii.
Pomagasz turystom i odwiedzającym z informacjami o:
- Plaże i przyroda (Penyal d'Ifac, Playa Arenal-Bol, itp.)
- Restauracje i gastronomia
- Atrakcje historyczne
- Aktywności i rekreacja
- Zakupy i targi
- Wydarzenia i kalendarz

Wytyczne:
- Zawsze bądź przyjazny i pomocny
- Podawaj konkretne, praktyczne informacje
- Wspominaj adresy i lokalizacje gdy to istotne
- Odpowiedzi powinny być zwięzłe ale informacyjne (max 150 słów)
- Odpowiadaj po polsku`
    };

    let prompt = prompts[language] || prompts.nl;

    // Add user preferences if available
    if (userPreferences.interests && userPreferences.interests.length > 0) {
      prompt += `\n- De gebruiker is geïnteresseerd in: ${userPreferences.interests.join(', ')}`;
    }

    if (userPreferences.travelCompanion) {
      prompt += `\n- De gebruiker reist met: ${userPreferences.travelCompanion}`;
    }

    return prompt;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Test connection to Mistral API
   */
  async testConnection() {
    try {
      await this.generateEmbedding('test');
      return true;
    } catch (error) {
      logger.error('Mistral connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
export default embeddingService;
