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

  initialize() {
    if (this.isConfigured) return true;
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

  async generateEmbedding(text) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const startTime = Date.now();
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: [text]
      });
      const embedding = response.data[0]?.embedding;
      if (!embedding) throw new Error('No embedding returned from Mistral API');
      const timeMs = Date.now() - startTime;
      logger.info(`Generated embedding (${embedding.length} dims) in ${timeMs}ms`);
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: texts
      });
      return response.data.map(item => {
        if (!item.embedding) throw new Error('No embedding returned from Mistral API');
        return item.embedding;
      });
    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async generateChatCompletion(messages, options = {}) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const startTime = Date.now();
      const response = await this.client.chat.complete({
        model: this.chatModel,
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from Mistral chat completion');
      let result;
      if (typeof content === 'string') {
        result = content;
      } else {
        result = content.map(chunk => {
          if (chunk.type === 'text') return chunk.text || '';
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
   * Generate streaming chat completion for real-time responses
   * @param {Array} messages - Array of {role, content} messages
   * @param {Object} options - Temperature, maxTokens, etc.
   * @returns {AsyncGenerator} - Async generator yielding text chunks
   */
  async *generateStreamingChatCompletion(messages, options = {}) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');

    try {
      const startTime = Date.now();
      logger.info('Starting streaming chat completion');

      const stream = await this.client.chat.stream({
        model: this.chatModel,
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500
      });

      let totalTokens = 0;

      for await (const event of stream) {
        if (event.data?.choices?.[0]?.delta?.content) {
          const content = event.data.choices[0].delta.content;
          totalTokens++;
          yield content;
        }
      }

      const timeMs = Date.now() - startTime;
      logger.info(`Streaming chat completion finished in ${timeMs}ms, ${totalTokens} chunks`);

    } catch (error) {
      logger.error('Failed to generate streaming chat completion:', error);
      throw error;
    }
  }

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

      de: `Du bist HoliBot, ein freundlicher und begeisterter lokaler Fuehrer fuer Calpe, Spanien.
Du hilfst Touristen und Besuchern mit Informationen ueber:
- Straende und Natur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurants und Gastronomie
- Historische Sehenswuerdigkeiten
- Aktivitaeten und Erholung
- Einkaufen und Maerkte
- Veranstaltungen und Kalender

Richtlinien:
- Sei immer freundlich und hilfsbereit
- Gib konkrete, praktische Informationen
- Erwaehne Adressen und Standorte wenn relevant
- Halte Antworten kurz aber informativ (max 150 Woerter)
- Antworte auf Deutsch`,

      es: `Eres HoliBot, una guia local amigable y entusiasta para Calpe, Espana.
Ayudas a turistas y visitantes con informacion sobre:
- Playas y naturaleza (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurantes y gastronomia
- Atracciones historicas
- Actividades y recreacion
- Compras y mercados
- Eventos y calendario

Directrices:
- Se siempre amable y servicial
- Da informacion concreta y practica
- Menciona direcciones y ubicaciones cuando sea relevante
- Manten las respuestas concisas pero informativas (max 150 palabras)
- Responde en espanol`,

      sv: `Du aer HoliBot, en vaenlig och entusiastisk lokal guide foer Calpe, Spanien.
Du hjaelper turister och besoekare med information om:
- Straender och natur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restauranger och matstaellen
- Historiska sevaerdheter
- Aktiviteter och rekreation
- Shopping och marknader
- Evenemang och kalender

Riktlinjer:
- Var alltid vaenlig och hjaelpsam
- Ge konkret, praktisk information
- Naemn adresser och platser naer det aer relevant
- Hall svaren korta men informativa (max 150 ord)
- Svara pa svenska`,

      pl: `Jestes HoliBot, przyjaznym i entuzjastycznym lokalnym przewodnikiem po Calpe w Hiszpanii.
Pomagasz turystom i odwiedzajacym z informacjami o:
- Plaze i przyroda (Penyal d'Ifac, Playa Arenal-Bol, itp.)
- Restauracje i gastronomia
- Atrakcje historyczne
- Aktywnosci i rekreacja
- Zakupy i targi
- Wydarzenia i kalendarz

Wytyczne:
- Zawsze badz przyjazny i pomocny
- Podawaj konkretne, praktyczne informacje
- Wspominaj adresy i lokalizacje gdy to istotne
- Odpowiedzi powinny byc zwiezle ale informacyjne (max 150 slow)
- Odpowiadaj po polsku`
    };

    let prompt = prompts[language] || prompts.nl;

    if (userPreferences.interests && userPreferences.interests.length > 0) {
      prompt += `\n- De gebruiker is geinteresseerd in: ${userPreferences.interests.join(', ')}`;
    }
    if (userPreferences.travelCompanion) {
      prompt += `\n- De gebruiker reist met: ${userPreferences.travelCompanion}`;
    }

    return prompt;
  }

  isReady() {
    return this.isConfigured && this.client !== null;
  }

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

export const embeddingService = new EmbeddingService();
export default embeddingService;
