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
        useContext: 'Gebruik ALLEEN de volgende informatie uit onze database om de vraag te beantwoorden:',
        baseOnContext: 'KRITISCHE REGEL: Noem ALLEEN plaatsen, restaurants, stranden of adressen die EXPLICIET in bovenstaande database-informatie staan. Verzin NOOIT namen of details die niet in de context staan. Als er geen relevante informatie is, zeg dan eerlijk dat je het niet in je database kunt vinden en bied aan om naar iets anders te zoeken.',
        noInfo: 'Geen specifieke informatie gevonden.',
        category: 'Categorie',
        description: 'Beschrijving',
        address: 'Adres',
        rating: 'Beoordeling'
      },
      en: {
        useContext: 'Use ONLY the following information from our database to answer the question:',
        baseOnContext: 'CRITICAL RULE: Only mention places, restaurants, beaches, or addresses that are EXPLICITLY listed in the database information above. NEVER make up or invent names or details not in the context. If no relevant information is available, honestly say you cannot find it in your database and offer to search for something else.',
        noInfo: 'No specific information found.',
        category: 'Category',
        description: 'Description',
        address: 'Address',
        rating: 'Rating'
      },
      de: {
        useContext: 'Verwende NUR die folgenden Informationen aus unserer Datenbank, um die Frage zu beantworten:',
        baseOnContext: 'KRITISCHE REGEL: Nenne NUR Orte, Restaurants, Straende oder Adressen, die EXPLIZIT in den obigen Datenbankinformationen stehen. Erfinde NIEMALS Namen oder Details, die nicht im Kontext stehen. Wenn keine relevanten Informationen verfuegbar sind, sage ehrlich, dass du es nicht in deiner Datenbank finden kannst.',
        noInfo: 'Keine spezifischen Informationen gefunden.',
        category: 'Kategorie',
        description: 'Beschreibung',
        address: 'Adresse',
        rating: 'Bewertung'
      },
      es: {
        useContext: 'Utiliza SOLO la siguiente informacion de nuestra base de datos para responder la pregunta:',
        baseOnContext: 'REGLA CRITICA: Menciona SOLO lugares, restaurantes, playas o direcciones que esten EXPLICITAMENTE en la informacion de la base de datos anterior. NUNCA inventes nombres o detalles que no esten en el contexto. Si no hay informacion relevante, di honestamente que no puedes encontrarlo en tu base de datos.',
        noInfo: 'No se encontro informacion especifica.',
        category: 'Categoria',
        description: 'Descripcion',
        address: 'Direccion',
        rating: 'Valoracion'
      },
      sv: {
        useContext: 'Anvand ENDAST foljande information fran var databas for att svara pa fragan:',
        baseOnContext: 'KRITISK REGEL: Namn ENDAST platser, restauranger, strander eller adresser som UTTRYCKLIGEN finns i databasinformationen ovan. Hitta ALDRIG pa namn eller detaljer som inte finns i kontexten. Om ingen relevant information finns, sag aerligt att du inte kan hitta det i din databas.',
        noInfo: 'Ingen specifik information hittades.',
        category: 'Kategori',
        description: 'Beskrivning',
        address: 'Adress',
        rating: 'Betyg'
      },
      pl: {
        useContext: 'Uzyj TYLKO ponizszych informacji z naszej bazy danych, aby odpowiedziec na pytanie:',
        baseOnContext: 'KRYTYCZNA ZASADA: Wymien TYLKO miejsca, restauracje, plaze lub adresy, ktore sa WYRAZNIE wymienione w powyzszych informacjach z bazy danych. NIGDY nie wymyslaj nazw ani szczegolow, ktorych nie ma w kontekscie. Jesli nie ma odpowiednich informacji, powiedz szczerze, ze nie mozesz tego znalezc w swojej bazie danych.',
        noInfo: 'Nie znaleziono konkretnych informacji.',
        category: 'Kategoria',
        description: 'Opis',
        address: 'Adres',
        rating: 'Ocena'
      }
    };
    return instructions[language] || instructions.nl;
  }

  async generateResponse(query, context, language = 'nl', userPreferences = {}, conversationHistory = []) {
    try {
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;

      // Build messages array with conversation history for context
      const messages = [
        { role: 'system', content: enhancedSystemPrompt }
      ];

      // Include recent conversation history (last 6 messages) for context
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        for (const msg of recentHistory) {
          // Skip invalid or empty messages
          if (!msg || typeof msg !== 'object') continue;
          const role = msg.role;
          const content = msg.content || msg.message;
          if ((role === 'user' || role === 'assistant') && content && content.trim()) {
            messages.push({ role, content: content.trim() });
          }
        }
      }

      // Add current query
      messages.push({ role: 'user', content: query });

      const response = await embeddingService.generateChatCompletion(messages, { temperature: 0.7, maxTokens: 500 });
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
   * @param {Array} conversationHistory - Previous messages for context
   * @returns {AsyncGenerator} - Async generator yielding text chunks
   */
  async *generateStreamingResponse(query, context, language = 'nl', userPreferences = {}, conversationHistory = []) {
    try {
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;

      // Build messages array with conversation history for context
      const messages = [
        { role: 'system', content: enhancedSystemPrompt }
      ];

      // Include recent conversation history (last 6 messages) for context
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        for (const msg of recentHistory) {
          // Skip invalid or empty messages
          if (!msg || typeof msg !== 'object') continue;
          const role = msg.role;
          const content = msg.content || msg.message;
          if ((role === 'user' || role === 'assistant') && content && content.trim()) {
            messages.push({ role, content: content.trim() });
          }
        }
      }

      // Add current query
      messages.push({ role: 'user', content: query });

      const generator = embeddingService.generateStreamingChatCompletion(messages, { temperature: 0.7, maxTokens: 500 });

      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Failed to generate streaming RAG response:', error);
      yield this.getFallbackResponse(query, language);
    }
  }

  /**
   * Extract POI names mentioned in conversation history
   * Looks for proper nouns (capitalized words) in assistant responses
   * @param {Array} conversationHistory - Recent conversation messages
   * @returns {Array} - Array of extracted POI names
   */
  extractPOINamesFromHistory(conversationHistory) {
    const poiNames = [];
    if (!conversationHistory || !Array.isArray(conversationHistory)) return poiNames;

    // Common words and phrases to exclude (not POI names)
    const excludeWords = new Set([
      'ik', 'je', 'we', 'de', 'het', 'een', 'van', 'in', 'op', 'met', 'voor', 'naar', 'bij', 'om', 'als', 'maar', 'ook', 'nog', 'wel', 'niet', 'kan', 'kun', 'wil', 'zou', 'heb', 'heeft', 'zijn', 'was', 'waren', 'wordt', 'worden', 'deze', 'die', 'dat', 'dit', 'hier', 'daar', 'waar', 'wat', 'wie', 'hoe', 'waarom', 'wanneer',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before',
      'tip', 'dag', 'day', 'today', 'week', 'calpe', 'calp', 'spain', 'spanje', 'alicante', 'costa', 'blanca',
      'restaurant', 'restaurants', 'beach', 'beaches', 'strand', 'stranden', 'hotel', 'hotels', 'bar', 'bars', 'cafe', 'museum', 'park', 'viewpoint', 'uitzichtpunt',
      'beoordeling', 'rating', 'adres', 'address', 'telefoon', 'phone', 'website', 'openingstijden', 'hours',
      'italiaans', 'italian', 'spaans', 'spanish', 'mediterraan', 'mediterranean', 'authentiek', 'authentic', 'populaire', 'popular', 'gezellig', 'leuk', 'mooi', 'prachtig', 'fantastisch', 'geweldig'
    ]);

    // Full phrases to completely exclude (geographical/descriptive terms, not POI names)
    const excludePhrases = [
      'middellandse zee', 'mediterranean sea', 'costa blanca', 'mar mediterraneo',
      'tip van de dag', 'daily tip', 'tip of the day',
      'italiaanse gerechten', 'italian cuisine', 'italian dishes',
      'spaanse keuken', 'spanish cuisine',
      'populaire optie', 'popular option', 'goede keuzes', 'good choices'
    ];

    // Priority POI names (names with ratings are most reliable)
    const priorityNames = [];

    // Process assistant messages to find POI names
    for (const msg of conversationHistory) {
      if (!msg || msg.role !== 'assistant') continue;
      const content = msg.content || msg.message || '';

      // Pattern 0 (HIGHEST PRIORITY): POI names in format "Name is een..." or "Name op Adres"
      // e.g., "Spasso Calpe is een gezellig Italiaans restaurant"
      const poiIsPattern = /\b([A-Z][A-Za-zÀ-ÿ]+(?:\s+(?:de|del|la|los|las|el|van|&|-)?\s*[A-Z][a-zÀ-ÿ]+)*)\s+(?:is een|is a|ist ein|es un|är en)\s/g;
      let match;
      while ((match = poiIsPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 0b: POI names mentioned with address "Name op/at/aan Adres"
      const poiAddressPattern = /\b([A-Z][A-Za-zÀ-ÿ]+(?:\s+(?:de|del|la|&)?\s*[A-Z][a-zÀ-ÿ]+)*)\s+(?:op|at|aan|en)\s+(?:C\.|Calle|Av\.|Avenida|Carrer)/g;
      while ((match = poiAddressPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 1: Look for names followed by ratings like "Spasso Calpe (4/5)" or "beoordeling 4/5"
      // Exclude Dutch/Spanish articles at the start (Het, De, Een, El, La, Los, Las)
      const ratingPattern = /(?:^|[.\n]\s*)([A-Z][A-Za-zÀ-ÿ\s&\-'|]+?)(?:\s*[\(\|]\s*(?:rating|beoordeling)?:?\s*\d+(?:\.\d+)?(?:\/5)?)/gi;
      while ((match = ratingPattern.exec(content)) !== null) {
        let name = match[1].trim();
        // Skip if it starts with common articles
        if (/^(Het|De|Een|El|La|Los|Las|The|A|An)\s+/i.test(name)) {
          continue;
        }
        if (name.length > 2 && name.length < 60) {
          poiNames.push(name);
        }
      }

      // Pattern 1b: Look for "Name met beoordeling X/5" or "Name with rating X"
      const ratingPattern2 = /([A-Z][A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)\s+(?:met\s+)?(?:een\s+)?beoordeling\s+(?:van\s+)?\d/gi;
      while ((match = ratingPattern2.exec(content)) !== null) {
        let name = match[1].trim();
        if (/^(Het|De|Een|El|La|Los|Las|The|A|An)\s+/i.test(name)) {
          continue;
        }
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 2: Look for names after "Tip van de dag:" or similar
      const tipPattern = /(?:tip van de dag|daily tip|tip of the day)[:\s]+([A-Z][A-Za-zÀ-ÿ\s&\-'#@]+?)(?:\s*[-–]|\s*\.|\s*!|\s+is\s|\s+biedt|\s+offers)/gi;
      while ((match = tipPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 60) {
          poiNames.push(name);
        }
      }

      // Pattern 3: Look for capitalized proper nouns (2+ words starting with capitals)
      const properNounPattern = /\b([A-Z][a-zÀ-ÿ]+(?:\s+(?:de|del|la|los|las|el|van|von|of|the|&|-)?\s*[A-Z][a-zÀ-ÿ]+)+)\b/g;
      while ((match = properNounPattern.exec(content)) !== null) {
        const name = match[1].trim();
        const words = name.toLowerCase().split(/\s+/);
        // Skip if all words are common/excluded
        const hasProperName = words.some(w => !excludeWords.has(w) && w.length > 2);
        if (hasProperName && name.length > 4 && name.length < 50) {
          poiNames.push(name);
        }
      }

      // Pattern 4: Look for names in formatted lists like "- Spasso Calpe" or "1. Restaurant Name"
      const listPattern = /(?:^|\n)\s*(?:[-•*]|\d+\.)\s*([A-Z][A-Za-zÀ-ÿ\s&\-'|]+?)(?:\s*[-–:]|\s*\n|$)/gm;
      while ((match = listPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 60) {
          poiNames.push(name);
        }
      }
    }

    // Combine priority names first, then other names
    const allNames = [...priorityNames, ...poiNames];

    // Remove duplicates and clean up
    const uniqueNames = [...new Set(allNames.map(n => n.replace(/\s+/g, ' ').trim()))]
      // Filter out excluded phrases
      .filter(name => {
        const lowerName = name.toLowerCase();
        return !excludePhrases.some(phrase => lowerName.includes(phrase) || phrase.includes(lowerName));
      });

    logger.debug('Extracted POI names from history', {
      count: uniqueNames.length,
      priorityCount: priorityNames.length,
      names: uniqueNames.slice(0, 5)
    });
    return uniqueNames;
  }

  /**
   * Check if query contains pronoun/reference patterns that need context
   * @param {string} query - User query
   * @returns {boolean} - True if query uses pronouns/references
   */
  hasPronounReference(query) {
    const lowerQuery = query.toLowerCase();

    // Dutch pronoun patterns
    const dutchPatterns = [
      /\b(dat|die|deze|dit)\s+(restaurant|plek|strand|uitzichtpunt|locatie|plaats|bar|cafe|museum|park|hotel)\b/,
      /\b(daar|erover|hierover|ernaartoe|erheen)\b/,
      /\bvan\s+(dat|die|deze)\b/,
      /\bmeer\s+(over|info|informatie|weten)\b/,
      /\bhoe\s+kom\s+ik\s+(er|daar)\b/,
      /\bopeningstijden\b/,  // Just "openingstijden" implies asking about something mentioned
      /\bwat\s+kost\b/,
      /\bis\s+(het|dat|die)\s+(open|gesloten|duur|goedkoop)\b/,
      /\bwat\s+zijn\s+de\s+(openingstijden|prijzen|reviews)\b/,  // "Wat zijn de openingstijden"
      /\bhoe\s+laat\s+(open|dicht)\b/,  // "Hoe laat open"
      /\bkan\s+ik\s+(reserveren|boeken)\b/  // "Kan ik reserveren"
    ];

    // English pronoun patterns
    const englishPatterns = [
      /\b(that|this|the)\s+(restaurant|place|beach|viewpoint|location|bar|cafe|museum|park|hotel)\b/,
      /\b(there|about it|to it|it)\b/,
      /\bmore\s+(about|info|information)\b/,
      /\bhow\s+do\s+i\s+get\s+(there|to)\b/,
      /\bopening\s+hours\b/,
      /\bhow\s+much\b/,
      /\bis\s+it\s+(open|closed|expensive|cheap)\b/
    ];

    // German pronoun patterns
    const germanPatterns = [
      /\b(das|dieser|diese|dieses)\s+(restaurant|ort|strand|aussichtspunkt|bar|cafe|museum|park|hotel)\b/,
      /\b(dort|daruber|dorthin)\b/,
      /\bmehr\s+(uber|info|informationen)\b/,
      /\boffnungszeiten\b/
    ];

    // Spanish pronoun patterns
    const spanishPatterns = [
      /\b(ese|esa|este|esta|el|la)\s+(restaurante|lugar|playa|mirador|bar|cafe|museo|parque|hotel)\b/,
      /\b(alli|sobre eso|mas info)\b/,
      /\bhorario\b/
    ];

    const allPatterns = [...dutchPatterns, ...englishPatterns, ...germanPatterns, ...spanishPatterns];
    return allPatterns.some(pattern => pattern.test(lowerQuery));
  }

  /**
   * Build enhanced search query for follow-up questions
   * Extracts POI names and key context from conversation history
   * @param {string} query - Current user query
   * @param {Array} conversationHistory - Recent conversation messages
   * @param {Object} intentContext - Intent analysis results
   * @returns {string} - Enhanced search query
   */
  buildEnhancedSearchQuery(query, conversationHistory, intentContext = {}) {
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return query;
    }

    // Check if this is a follow-up or uses pronoun references
    const isFollowUp = intentContext.isFollowUp || this.hasPronounReference(query);
    if (!isFollowUp) {
      return query;
    }

    const recentMessages = conversationHistory.slice(-6);
    const enhancements = [];

    // Step 1: Extract POI names from conversation history
    const poiNames = this.extractPOINamesFromHistory(recentMessages);
    if (poiNames.length > 0) {
      // Use the most recently mentioned POI (last in the list based on conversation order)
      const mostRecentPOI = poiNames[poiNames.length - 1];
      enhancements.push(mostRecentPOI);
      logger.info('Added POI name to search query', { poiName: mostRecentPOI });
    }

    // Step 2: Extract category terms for additional context
    const contextTerms = [];
    for (const msg of recentMessages) {
      if (!msg || typeof msg !== 'object') continue;
      const content = (msg.content || msg.message || '').toLowerCase();

      // Extract category terms
      if (content.includes('restaurant') || content.includes('dinner') || content.includes('food') || content.includes('eten') || content.includes('lunch')) {
        contextTerms.push('restaurant');
      }
      if (content.includes('beach') || content.includes('strand') || content.includes('playa') || content.includes('zee') || content.includes('sea')) {
        contextTerms.push('beach');
      }
      if (content.includes('uitzicht') || content.includes('viewpoint') || content.includes('mirador') || content.includes('panorama')) {
        contextTerms.push('viewpoint');
      }
      if (content.includes('museum') || content.includes('cultuur') || content.includes('culture') || content.includes('history') || content.includes('geschiedenis')) {
        contextTerms.push('museum culture');
      }
      if (content.includes('wandel') || content.includes('hike') || content.includes('walk') || content.includes('hiking')) {
        contextTerms.push('hiking');
      }
    }

    // Add unique category terms
    const uniqueTerms = [...new Set(contextTerms)];
    if (uniqueTerms.length > 0) {
      enhancements.push(...uniqueTerms);
    }

    // Build enhanced query
    if (enhancements.length > 0) {
      const enhancedQuery = `${query} ${enhancements.join(' ')} Calpe`;
      logger.info('Enhanced search query for follow-up', {
        original: query,
        enhanced: enhancedQuery,
        poiNamesFound: poiNames.length,
        categoryTerms: uniqueTerms
      });
      return enhancedQuery;
    }

    return query;
  }

  /**
   * Streaming RAG chat pipeline
   * @param {string} query - User query
   * @param {string} language - Response language
   * @param {Object} options - Options including userPreferences, conversationHistory, intentContext
   * @returns {Object} - Contains searchResults and streaming generator
   */
  async chatStream(query, language = 'nl', options = {}) {
    if (!this.isInitialized) await this.initialize();

    try {
      const startTime = Date.now();
      const conversationHistory = options.conversationHistory || [];
      const intentContext = options.intentContext || {};

      // Step 1: Enhance search query for follow-ups
      const searchQuery = this.buildEnhancedSearchQuery(query, conversationHistory, intentContext);

      // Step 2: Search for relevant context (non-streaming)
      const searchResults = await this.search(searchQuery, { limit: 5 });
      const searchTimeMs = Date.now() - startTime;

      // Step 3: Return search results and streaming generator with conversation context
      const poiCards = this.extractPOICards(searchResults.results, query);

      return {
        success: true,
        searchTimeMs,
        pois: poiCards,
        source: 'rag-stream',
        // Generator for streaming response with conversation history
        stream: this.generateStreamingResponse(
          query,
          searchResults.results,
          language,
          options.userPreferences || {},
          conversationHistory
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
      const conversationHistory = options.conversationHistory || [];
      const intentContext = options.intentContext || {};

      // Enhance search query for follow-ups
      const searchQuery = this.buildEnhancedSearchQuery(query, conversationHistory, intentContext);

      const searchResults = await this.search(searchQuery, { limit: 5 });
      const response = await this.generateResponse(
        query,
        searchResults.results,
        language,
        options.userPreferences || {},
        conversationHistory
      );
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
