/**
 * RAG (Retrieval Augmented Generation) Service
 * Combines ChromaDB semantic search with Mistral AI for intelligent responses
 */

import { chromaService } from './chromaService.js';
import { embeddingService } from './embeddingService.js';
import logger from '../../utils/logger.js';

class RAGService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;
    try {
      embeddingService.initialize();
      await chromaService.connect();
      this.isInitialized = true;
      logger.info('RAG service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }

  async search(query, options = {}) {
    if (!this.isInitialized) await this.initialize();
    try {
      const startTime = Date.now();
      const nResults = options.limit || 50;
      const similarityThreshold = options.similarityThreshold || 0.45;
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const results = await chromaService.search(queryEmbedding, nResults, options.filter);
      const enrichedResults = this.enrichResults(results);
      // Filter by similarity threshold for quality
      const filteredResults = enrichedResults.filter(r => (r.similarity || 0) >= similarityThreshold);
      const timeMs = Date.now() - startTime;
      logger.info(`RAG search completed in ${timeMs}ms, found ${filteredResults.length} quality results (threshold: ${similarityThreshold})`);
      return { success: true, query, results: filteredResults, totalResults: filteredResults.length, searchTimeMs: timeMs };
    } catch (error) {
      logger.error('RAG search error:', error);
      throw error;
    }
  }

  getContextInstructions(language) {
    const instructions = {
      nl: {
        useContext: 'Gebruik de volgende informatie uit onze database om de vraag te beantwoorden:',
        baseOnContext: 'Baseer je antwoord op deze informatie. Als de informatie niet relevant is voor de vraag, geef dan een algemeen behulpzaam antwoord.',
        noInfo: 'Geen specifieke informatie gevonden.',
        category: 'Categorie',
        description: 'Beschrijving',
        address: 'Adres',
        rating: 'Beoordeling'
      },
      en: {
        useContext: 'Use the following information from our database to answer the question:',
        baseOnContext: 'Base your answer on this information. If the information is not relevant to the question, provide a generally helpful answer.',
        noInfo: 'No specific information found.',
        category: 'Category',
        description: 'Description',
        address: 'Address',
        rating: 'Rating'
      },
      de: {
        useContext: 'Verwende die folgenden Informationen aus unserer Datenbank, um die Frage zu beantworten:',
        baseOnContext: 'Basiere deine Antwort auf diesen Informationen. Wenn die Informationen nicht relevant sind, gib eine allgemein hilfreiche Antwort.',
        noInfo: 'Keine spezifischen Informationen gefunden.',
        category: 'Kategorie',
        description: 'Beschreibung',
        address: 'Adresse',
        rating: 'Bewertung'
      },
      es: {
        useContext: 'Utiliza la siguiente informacion de nuestra base de datos para responder la pregunta:',
        baseOnContext: 'Basa tu respuesta en esta informacion. Si la informacion no es relevante para la pregunta, proporciona una respuesta generalmente util.',
        noInfo: 'No se encontro informacion especifica.',
        category: 'Categoria',
        description: 'Descripcion',
        address: 'Direccion',
        rating: 'Valoracion'
      },
      sv: {
        useContext: 'Anvand foljande information fran var databas for att svara pa fragan:',
        baseOnContext: 'Basera ditt svar pa denna information. Om informationen inte ar relevant for fragan, ge ett generellt hjalpsamt svar.',
        noInfo: 'Ingen specifik information hittades.',
        category: 'Kategori',
        description: 'Beskrivning',
        address: 'Adress',
        rating: 'Betyg'
      },
      pl: {
        useContext: 'Uzyj ponizszych informacji z naszej bazy danych, aby odpowiedziec na pytanie:',
        baseOnContext: 'Oprzyj swoja odpowiedz na tych informacjach. Jesli informacje nie sa istotne dla pytania, udziel ogolnie pomocnej odpowiedzi.',
        noInfo: 'Nie znaleziono konkretnych informacji.',
        category: 'Kategoria',
        description: 'Opis',
        address: 'Adres',
        rating: 'Ocena'
      }
    };
    return instructions[language] || instructions.nl;
  }

  async generateResponse(query, context, language = 'nl', userPreferences = {}) {
    try {
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;
      const response = await embeddingService.generateChatCompletion([
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: query }
      ], { temperature: 0.7, maxTokens: 500 });
      return response;
    } catch (error) {
      logger.error('Failed to generate RAG response:', error);
      return this.getFallbackResponse(query, language);
    }
  }

  /**
   * Generate streaming response with RAG context
   * @param {string} query - User query
   * @param {Array} context - Retrieved documents for context
   * @param {string} language - Response language
   * @param {Object} userPreferences - User preferences
   * @returns {AsyncGenerator} - Async generator yielding text chunks
   */
  async *generateStreamingResponse(query, context, language = 'nl', userPreferences = {}) {
    try {
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;

      const generator = embeddingService.generateStreamingChatCompletion([
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: query }
      ], { temperature: 0.7, maxTokens: 500 });

      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Failed to generate streaming RAG response:', error);
      yield this.getFallbackResponse(query, language);
    }
  }

  /**
   * Streaming RAG chat pipeline
   * @param {string} query - User query
   * @param {string} language - Response language
   * @param {Object} options - Options including userPreferences
   * @returns {Object} - Contains searchResults and streaming generator
   */
  async chatStream(query, language = 'nl', options = {}) {
    if (!this.isInitialized) await this.initialize();

    try {
      const startTime = Date.now();

      // Step 1: Search for relevant context (non-streaming)
      const searchResults = await this.search(query, { limit: 5 });
      const searchTimeMs = Date.now() - startTime;

      // Step 2: Return search results and streaming generator
      const poiCards = this.extractPOICards(searchResults.results, query);

      return {
        success: true,
        searchTimeMs,
        pois: poiCards,
        source: 'rag-stream',
        // Generator for streaming response
        stream: this.generateStreamingResponse(
          query,
          searchResults.results,
          language,
          options.userPreferences || {}
        )
      };
    } catch (error) {
      logger.error('RAG chat stream error:', error);
      return {
        success: false,
        error: error.message,
        pois: [],
        source: 'fallback'
      };
    }
  }

  async chat(query, language = 'nl', options = {}) {
    if (!this.isInitialized) await this.initialize();
    try {
      const startTime = Date.now();
      const searchResults = await this.search(query, { limit: 5 });
      const response = await this.generateResponse(query, searchResults.results, language, options.userPreferences || {});
      const poiCards = this.extractPOICards(searchResults.results, query);
      const timeMs = Date.now() - startTime;
      logger.info(`RAG chat completed in ${timeMs}ms`);
      return { success: true, message: response, pois: poiCards, source: 'rag', searchTimeMs: timeMs };
    } catch (error) {
      logger.error('RAG chat error:', error);
      return { success: true, message: this.getFallbackResponse(query, language), pois: [], source: 'fallback' };
    }
  }

  enrichResults(results) {
    return results.map(result => {
      const metadata = result.metadata || {};
      return {
        id: metadata.id || result.id,
        name: metadata.name || metadata.title || 'Unknown',
        category: metadata.category || 'General',
        subcategory: metadata.subcategory || null,
        description: result.document || metadata.description || '',
        address: metadata.address || null,
        latitude: parseFloat(metadata.latitude) || null,
        longitude: parseFloat(metadata.longitude) || null,
        rating: parseFloat(metadata.rating) || null,
        reviewCount: parseInt(metadata.review_count) || 0,
        priceLevel: metadata.price_level || null,
        thumbnailUrl: metadata.thumbnail_url || null,
        openingHours: metadata.opening_hours || null,
        phone: metadata.phone || null,
        website: metadata.website || null,
        similarity: result.similarity,
        distance: result.distance
      };
    });
  }

  buildContextString(results, language = 'nl') {
    const labels = this.getContextInstructions(language);
    if (!results || results.length === 0) return labels.noInfo;
    return results.slice(0, 5).map((poi, index) => {
      const parts = [`${index + 1}. ${poi.name}`];
      if (poi.category) parts.push(`${labels.category}: ${poi.category}`);
      if (poi.description) parts.push(`${labels.description}: ${poi.description.substring(0, 200)}...`);
      if (poi.address) parts.push(`${labels.address}: ${poi.address}`);
      if (poi.rating) parts.push(`${labels.rating}: ${poi.rating}/5`);
      return parts.join('\n   ');
    }).join('\n\n');
  }

  extractPOICards(results, query) {
    if (!results || results.length === 0) return [];
    return results.slice(0, 5).map(poi => ({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      description: poi.description?.substring(0, 100) + '...',
      rating: poi.rating,
      thumbnailUrl: poi.thumbnailUrl,
      address: poi.address,
      similarity: poi.similarity
    }));
  }

  getFallbackResponse(query, language) {
    const fallbacks = {
      nl: 'Ik ben HoliBot, je persoonlijke gids voor Calpe! Ik help je graag met informatie over stranden, restaurants, bezienswaardigheden en activiteiten. Waar ben je naar op zoek?',
      en: 'I am HoliBot, your personal guide to Calpe! I would be happy to help you with information about beaches, restaurants, attractions and activities. What are you looking for?',
      de: 'Ich bin HoliBot, dein Fuehrer fuer Calpe! Ich helfe dir gerne mit Informationen ueber Straende, Restaurants, Sehenswuerdigkeiten und Aktivitaeten. Wonach suchst du?',
      es: 'Soy HoliBot, tu guia personal de Calpe! Estare encantado de ayudarte con informacion sobre playas, restaurantes, atracciones y actividades. Que estas buscando?',
      sv: 'Jag aer HoliBot, din personliga guide till Calpe! Jag hjaelper dig gaerna med information om straender, restauranger, sevaerdheter och aktiviteter. Vad letar du efter?',
      pl: 'Jestem HoliBot, Twoj osobisty przewodnik po Calpe! Chetnie pomoge Ci z informacjami o plazach, restauracjach, atrakcjach i aktywnosciach. Czego szukasz?'
    };
    return fallbacks[language] || fallbacks.nl;
  }

  isReady() {
    return this.isInitialized && chromaService.isReady() && embeddingService.isReady();
  }

  async getStats() {
    const chromaStats = await chromaService.getStats();
    return {
      isInitialized: this.isInitialized,
      chromaDb: chromaStats,
      mistral: { isConfigured: embeddingService.isReady() }
    };
  }
}

export const ragService = new RAGService();
export default ragService;
