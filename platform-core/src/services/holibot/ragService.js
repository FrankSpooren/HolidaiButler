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

  /**
   * Initialize RAG service
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize embedding service
      embeddingService.initialize();

      // Connect to ChromaDB
      await chromaService.connect();

      this.isInitialized = true;
      logger.info('RAG service initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }

  /**
   * Semantic search for POIs using RAG
   * @param {string} query - User query
   * @param {Object} options - Search options
   */
  async search(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();
      const nResults = options.limit || 10;

      // Step 1: Generate embedding for query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Step 2: Search ChromaDB for similar documents
      const results = await chromaService.search(queryEmbedding, nResults, options.filter);

      // Step 3: Format and enrich results
      const enrichedResults = this.enrichResults(results);

      const timeMs = Date.now() - startTime;
      logger.info(`RAG search completed in ${timeMs}ms, found ${enrichedResults.length} results`);

      return {
        success: true,
        query,
        results: enrichedResults,
        totalResults: enrichedResults.length,
        searchTimeMs: timeMs
      };

    } catch (error) {
      logger.error('RAG search error:', error);
      throw error;
    }
  }

  /**
   * Generate AI response with context from retrieved documents
   * @param {string} query - User query
   * @param {Array} context - Retrieved documents for context
   * @param {string} language - Response language
   * @param {Object} userPreferences - User preferences
   */
  async generateResponse(query, context, language = 'nl', userPreferences = {}) {
    try {
      // Build context string from retrieved documents
      const contextString = this.buildContextString(context);

      // Build system prompt
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);

      // Add RAG context to system prompt
      const enhancedSystemPrompt = `${systemPrompt}

Gebruik de volgende informatie uit onze database om de vraag te beantwoorden:

${contextString}

Baseer je antwoord op deze informatie. Als de informatie niet relevant is voor de vraag, geef dan een algemeen behulpzaam antwoord.`;

      // Generate response
      const response = await embeddingService.generateChatCompletion([
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: query }
      ], {
        temperature: 0.7,
        maxTokens: 500
      });

      return response;

    } catch (error) {
      logger.error('Failed to generate RAG response:', error);
      return this.getFallbackResponse(query, language);
    }
  }

  /**
   * Complete RAG pipeline: search + generate response
   * @param {string} query - User query
   * @param {string} language - Response language
   * @param {Object} options - Search and generation options
   */
  async chat(query, language = 'nl', options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();

      // Step 1: Search for relevant context
      const searchResults = await this.search(query, { limit: 5 });

      // Step 2: Generate response with context
      const response = await this.generateResponse(
        query,
        searchResults.results,
        language,
        options.userPreferences || {}
      );

      // Step 3: Extract POI cards to display
      const poiCards = this.extractPOICards(searchResults.results, query);

      const timeMs = Date.now() - startTime;
      logger.info(`RAG chat completed in ${timeMs}ms`);

      return {
        success: true,
        message: response,
        pois: poiCards,
        source: 'rag',
        searchTimeMs: timeMs
      };

    } catch (error) {
      logger.error('RAG chat error:', error);
      return {
        success: true,
        message: this.getFallbackResponse(query, language),
        pois: [],
        source: 'fallback'
      };
    }
  }

  /**
   * Enrich search results with additional metadata
   */
  enrichResults(results) {
    return results.map(result => {
      const metadata = result.metadata || {};

      return {
        id: result.id,
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

  /**
   * Build context string from retrieved documents
   */
  buildContextString(results) {
    if (!results || results.length === 0) {
      return 'Geen specifieke informatie gevonden.';
    }

    return results.slice(0, 5).map((poi, index) => {
      const parts = [`${index + 1}. ${poi.name}`];

      if (poi.category) parts.push(`Categorie: ${poi.category}`);
      if (poi.description) parts.push(`Beschrijving: ${poi.description.substring(0, 200)}...`);
      if (poi.address) parts.push(`Adres: ${poi.address}`);
      if (poi.rating) parts.push(`Beoordeling: ${poi.rating}/5`);

      return parts.join('\n   ');
    }).join('\n\n');
  }

  /**
   * Extract POI cards to display in chat
   */
  extractPOICards(results, query) {
    if (!results || results.length === 0) {
      return [];
    }

    // Return top 3-5 most relevant POIs
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

  /**
   * Fallback response when RAG fails
   */
  getFallbackResponse(query, language) {
    const fallbacks = {
      nl: '👋 Ik ben HoliBot, je persoonlijke gids voor Calpe! Ik help je graag met informatie over stranden, restaurants, bezienswaardigheden en activiteiten. Waar ben je naar op zoek?',
      en: '👋 I\'m HoliBot, your personal guide to Calpe! I\'d be happy to help you with information about beaches, restaurants, attractions and activities. What are you looking for?',
      de: '👋 Ich bin HoliBot, dein persönlicher Führer für Calpe! Ich helfe dir gerne mit Informationen über Strände, Restaurants, Sehenswürdigkeiten und Aktivitäten. Wonach suchst du?',
      es: '👋 Soy HoliBot, tu guía personal de Calpe! Estaré encantado de ayudarte con información sobre playas, restaurantes, atracciones y actividades. ¿Qué estás buscando?',
      sv: '👋 Jag är HoliBot, din personliga guide till Calpe! Jag hjälper dig gärna med information om stränder, restauranger, sevärdheter och aktiviteter. Vad letar du efter?',
      pl: '👋 Jestem HoliBot, Twój osobisty przewodnik po Calpe! Chętnie pomogę Ci z informacjami o plażach, restauracjach, atrakcjach i aktywnościach. Czego szukasz?'
    };

    return fallbacks[language] || fallbacks.nl;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized && chromaService.isReady() && embeddingService.isReady();
  }

  /**
   * Get service statistics
   */
  async getStats() {
    const chromaStats = await chromaService.getStats();

    return {
      isInitialized: this.isInitialized,
      chromaDb: chromaStats,
      mistral: {
        isConfigured: embeddingService.isReady()
      }
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();
export default ragService;
