/**
 * RAG (Retrieval Augmented Generation) Service
 * Combines ChromaDB semantic search with Mistral AI for intelligent responses
 *
 * Version 2.2 - Enterprise Level Improvements:
 * - Stricter anti-hallucination rules
 * - Event/agenda integration
 * - POI validation for follow-ups
 * - Improved context handling
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

  /**
   * Check if query is asking about events/activities
   * @param {string} query - User query
   * @returns {boolean} - True if asking about events
   */
  isEventQuery(query) {
    const lowerQuery = query.toLowerCase();
    const eventPatterns = [
      /\b(event|events|evenement|evenementen|activiteit|activiteiten|happening|happenings)\b/,
      /\b(festival|festivals|feest|fiesta|fiestas)\b/,
      /\b(concert|concerts|show|shows|optreden|voorstelling)\b/,
      /\b(markt|market|markets|mercado)\b/,
      /\b(vandaag|morgen|dit weekend|deze week|today|tomorrow|this weekend|this week)\b.*\b(doen|do|te doen|to do|bezoeken|visit)\b/,
      /\bwat\s+is\s+er\s+(te doen|gaande|happening)\b/,
      /\bwhat('s| is)\s+(on|happening)\b/,
      /\b(agenda|program|programma|kalender|calendar)\b/
    ];
    return eventPatterns.some(pattern => pattern.test(lowerQuery));
  }

  /**
   * Search specifically for events/agenda items
   * @param {string} query - User query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Event results
   */
  async searchEvents(query, limit = 10) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      // Search with filter for agenda/event type
      const results = await chromaService.search(queryEmbedding, limit * 2, {
        where: { type: 'agenda' }
      });
      const enrichedResults = this.enrichResults(results);
      // Lower threshold for events since they may have less detailed descriptions
      const filteredResults = enrichedResults.filter(r => (r.similarity || 0) >= 0.35);
      logger.info(`Event search found ${filteredResults.length} results`);
      return filteredResults.slice(0, limit);
    } catch (error) {
      logger.warn('Event search failed, returning empty:', error.message);
      return [];
    }
  }

  getContextInstructions(language, hasGoodResults = true) {
    // STRICTER anti-hallucination rules when no good results
    const noResultsWarning = {
      nl: '\n\nBELANGRIJK: Er zijn GEEN relevante resultaten gevonden in de database. Je MOET eerlijk zeggen dat je geen specifieke informatie hebt over wat de gebruiker vraagt. Noem GEEN namen van restaurants, stranden of plaatsen - je kent ze niet. Bied aan om naar iets anders te zoeken.',
      en: '\n\nIMPORTANT: NO relevant results were found in the database. You MUST honestly say you do not have specific information about what the user is asking. Do NOT mention any names of restaurants, beaches or places - you do not know them. Offer to search for something else.',
      de: '\n\nWICHTIG: KEINE relevanten Ergebnisse wurden gefunden. Du MUSST ehrlich sagen, dass du keine Informationen hast. Nenne KEINE Namen von Restaurants, Straenden oder Orten. Biete an, etwas anderes zu suchen.',
      es: '\n\nIMPORTANTE: NO se encontraron resultados relevantes. DEBES decir honestamente que no tienes informacion. NO menciones nombres de restaurantes, playas o lugares. Ofrece buscar otra cosa.',
      sv: '\n\nVIKTIGT: INGA relevanta resultat hittades. Du MASTE aerligt saega att du inte har information. Naemn INGA namn pa restauranger, straender eller platser. Erbjud att soeka efter nagot annat.',
      pl: '\n\nWAZNE: NIE znaleziono odpowiednich wynikow. MUSISZ uczciwie powiedziec, ze nie masz informacji. NIE wymieniaj nazw restauracji, plaz ani miejsc. Zaoferuj szukanie czegos innego.'
    };

    const instructions = {
      nl: {
        useContext: 'Gebruik UITSLUITEND de volgende informatie uit onze database om de vraag te beantwoorden:',
        baseOnContext: `STRIKTE REGELS (OVERTREDING IS VERBODEN):
1. Noem ALLEEN plaatsen die LETTERLIJK in bovenstaande database-informatie staan met hun EXACTE naam
2. Als je een restaurant, strand of plek noemt, MOET de exacte naam in de context staan
3. VERZIN NOOIT namen zoals "El Rodat", "Casa Maria" of andere namen die niet in de context staan
4. Als er geen goede resultaten zijn, zeg dan: "Ik kan geen specifieke informatie vinden in mijn database over [onderwerp]. Wil je dat ik naar iets anders zoek?"
5. Geef GEEN algemene suggesties met verzonnen namen - dit is VERBODEN
6. Als je twijfelt of een naam in de context staat: NOEM HET NIET`,
        noInfo: 'Geen specifieke informatie gevonden.',
        category: 'Categorie',
        description: 'Beschrijving',
        address: 'Adres',
        rating: 'Beoordeling'
      },
      en: {
        useContext: 'Use EXCLUSIVELY the following information from our database to answer the question:',
        baseOnContext: `STRICT RULES (VIOLATION IS FORBIDDEN):
1. Only mention places that are LITERALLY listed in the database information above with their EXACT name
2. If you mention a restaurant, beach or place, the exact name MUST be in the context
3. NEVER invent names like "El Rodat", "Casa Maria" or other names not in the context
4. If there are no good results, say: "I cannot find specific information in my database about [topic]. Would you like me to search for something else?"
5. Do NOT give general suggestions with made-up names - this is FORBIDDEN
6. If you are unsure whether a name is in the context: DO NOT MENTION IT`,
        noInfo: 'No specific information found.',
        category: 'Category',
        description: 'Description',
        address: 'Address',
        rating: 'Rating'
      },
      de: {
        useContext: 'Verwende AUSSCHLIESSLICH die folgenden Informationen aus unserer Datenbank:',
        baseOnContext: `STRIKTE REGELN (VERSTOSS VERBOTEN):
1. Nenne NUR Orte, die WOERTLICH in den obigen Datenbankinformationen stehen
2. Erfinde NIEMALS Namen wie "El Rodat" oder andere nicht genannte Namen
3. Wenn keine guten Ergebnisse vorliegen, sage ehrlich, dass du nichts finden kannst
4. Gib KEINE allgemeinen Vorschlaege mit erfundenen Namen`,
        noInfo: 'Keine spezifischen Informationen gefunden.',
        category: 'Kategorie',
        description: 'Beschreibung',
        address: 'Adresse',
        rating: 'Bewertung'
      },
      es: {
        useContext: 'Utiliza EXCLUSIVAMENTE la siguiente informacion de nuestra base de datos:',
        baseOnContext: `REGLAS ESTRICTAS (VIOLAR ES PROHIBIDO):
1. Menciona SOLO lugares que estan LITERALMENTE en la informacion anterior
2. NUNCA inventes nombres como "El Rodat" u otros nombres no mencionados
3. Si no hay buenos resultados, di honestamente que no puedes encontrar informacion
4. NO des sugerencias generales con nombres inventados`,
        noInfo: 'No se encontro informacion especifica.',
        category: 'Categoria',
        description: 'Descripcion',
        address: 'Direccion',
        rating: 'Valoracion'
      },
      sv: {
        useContext: 'Anvand ENDAST foljande information fran var databas:',
        baseOnContext: `STRIKTA REGLER: Namn ENDAST platser som finns i databasinformationen. Hitta ALDRIG pa namn. Om ingen information finns, sag det aerligt.`,
        noInfo: 'Ingen specifik information hittades.',
        category: 'Kategori',
        description: 'Beskrivning',
        address: 'Adress',
        rating: 'Betyg'
      },
      pl: {
        useContext: 'Uzyj TYLKO ponizszych informacji z naszej bazy danych:',
        baseOnContext: `SCISLE ZASADY: Wymien TYLKO miejsca z powyzszych informacji. NIGDY nie wymyslaj nazw. Jesli nie ma informacji, powiedz uczciwie.`,
        noInfo: 'Nie znaleziono konkretnych informacji.',
        category: 'Kategoria',
        description: 'Opis',
        address: 'Adres',
        rating: 'Ocena'
      }
    };

    const result = instructions[language] || instructions.nl;

    // Add extra warning when no good results
    if (!hasGoodResults) {
      result.baseOnContext += (noResultsWarning[language] || noResultsWarning.nl);
    }

    return result;
  }

  async generateResponse(query, context, language = 'nl', userPreferences = {}, conversationHistory = []) {
    try {
      const hasGoodResults = context && context.length > 0;
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language, hasGoodResults);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;

      // Build messages array with conversation history for context
      const messages = [
        { role: 'system', content: enhancedSystemPrompt }
      ];

      // Include recent conversation history (last 6 messages) for context
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        for (const msg of recentHistory) {
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

      const response = await embeddingService.generateChatCompletion(messages, { temperature: 0.5, maxTokens: 500 });
      return response;
    } catch (error) {
      logger.error('Failed to generate RAG response:', error);
      return this.getFallbackResponse(query, language);
    }
  }

  /**
   * Generate streaming response with RAG context
   */
  async *generateStreamingResponse(query, context, language = 'nl', userPreferences = {}, conversationHistory = []) {
    try {
      const hasGoodResults = context && context.length > 0;
      const contextString = this.buildContextString(context, language);
      const systemPrompt = embeddingService.buildSystemPrompt(language, userPreferences);
      const contextInstructions = this.getContextInstructions(language, hasGoodResults);
      const enhancedSystemPrompt = `${systemPrompt}\n\n${contextInstructions.useContext}\n\n${contextString}\n\n${contextInstructions.baseOnContext}`;

      const messages = [
        { role: 'system', content: enhancedSystemPrompt }
      ];

      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        for (const msg of recentHistory) {
          if (!msg || typeof msg !== 'object') continue;
          const role = msg.role;
          const content = msg.content || msg.message;
          if ((role === 'user' || role === 'assistant') && content && content.trim()) {
            messages.push({ role, content: content.trim() });
          }
        }
      }

      messages.push({ role: 'user', content: query });

      const generator = embeddingService.generateStreamingChatCompletion(messages, { temperature: 0.5, maxTokens: 500 });

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
   */
  extractPOINamesFromHistory(conversationHistory) {
    const poiNames = [];
    if (!conversationHistory || !Array.isArray(conversationHistory)) return poiNames;

    const excludeWords = new Set([
      'ik', 'je', 'we', 'de', 'het', 'een', 'van', 'in', 'op', 'met', 'voor', 'naar', 'bij', 'om', 'als', 'maar', 'ook', 'nog', 'wel', 'niet', 'kan', 'kun', 'wil', 'zou', 'heb', 'heeft', 'zijn', 'was', 'waren', 'wordt', 'worden', 'deze', 'die', 'dat', 'dit', 'hier', 'daar', 'waar', 'wat', 'wie', 'hoe', 'waarom', 'wanneer',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before',
      'tip', 'dag', 'day', 'today', 'week', 'calpe', 'calp', 'spain', 'spanje', 'alicante', 'costa', 'blanca',
      'restaurant', 'restaurants', 'beach', 'beaches', 'strand', 'stranden', 'hotel', 'hotels', 'bar', 'bars', 'cafe', 'museum', 'park', 'viewpoint', 'uitzichtpunt',
      'beoordeling', 'rating', 'adres', 'address', 'telefoon', 'phone', 'website', 'openingstijden', 'hours',
      'italiaans', 'italian', 'spaans', 'spanish', 'mediterraan', 'mediterranean', 'authentiek', 'authentic', 'populaire', 'popular', 'gezellig', 'leuk', 'mooi', 'prachtig', 'fantastisch', 'geweldig',
      // Additional common words to exclude
      'old', 'town', 'castle', 'church', 'centre', 'center', 'area', 'region', 'nearby', 'local', 'great', 'beautiful', 'nice', 'good', 'best', 'top', 'famous', 'traditional', 'modern', 'historic', 'historical'
    ]);

    const excludePhrases = [
      'middellandse zee', 'mediterranean sea', 'costa blanca', 'mar mediterraneo',
      'tip van de dag', 'daily tip', 'tip of the day',
      'italiaanse gerechten', 'italian cuisine', 'italian dishes',
      'spaanse keuken', 'spanish cuisine',
      'populaire optie', 'popular option', 'goede keuzes', 'good choices',
      'old town', 'calpe castle', 'playa de', 'penon de ifach', 'ifach rock'
    ];

    const priorityNames = [];

    for (const msg of conversationHistory) {
      if (!msg || msg.role !== 'assistant') continue;
      const content = msg.content || msg.message || '';

      // Pattern 0: POI names in format "Name is een..."
      const poiIsPattern = /\b([A-Z][A-Za-zÀ-ÿ]+(?:\s+(?:de|del|la|los|las|el|van|&|-)?\s*[A-Z][a-zÀ-ÿ]+)*)\s+(?:is een|is a|ist ein|es un|är en)\s/g;
      let match;
      while ((match = poiIsPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 0b: POI names with address
      const poiAddressPattern = /\b([A-Z][A-Za-zÀ-ÿ]+(?:\s+(?:de|del|la|&)?\s*[A-Z][a-zÀ-ÿ]+)*)\s+(?:op|at|aan|en)\s+(?:C\.|Calle|Av\.|Avenida|Carrer)/g;
      while ((match = poiAddressPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 1: Names with ratings
      const ratingPattern = /(?:^|[.\n]\s*)([A-Z][A-Za-zÀ-ÿ\s&\-'|]+?)(?:\s*[\(\|]\s*(?:rating|beoordeling)?:?\s*\d+(?:\.\d+)?(?:\/5)?)/gi;
      while ((match = ratingPattern.exec(content)) !== null) {
        let name = match[1].trim();
        if (/^(Het|De|Een|El|La|Los|Las|The|A|An)\s+/i.test(name)) continue;
        if (name.length > 2 && name.length < 60) {
          poiNames.push(name);
        }
      }

      // Pattern 1b: "Name met beoordeling X/5"
      const ratingPattern2 = /([A-Z][A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)\s+(?:met\s+)?(?:een\s+)?beoordeling\s+(?:van\s+)?\d/gi;
      while ((match = ratingPattern2.exec(content)) !== null) {
        let name = match[1].trim();
        if (/^(Het|De|Een|El|La|Los|Las|The|A|An)\s+/i.test(name)) continue;
        if (name.length > 3 && name.length < 50) {
          priorityNames.push(name);
        }
      }

      // Pattern 2: Names after "Tip van de dag:"
      const tipPattern = /(?:tip van de dag|daily tip|tip of the day)[:\s]+([A-Z][A-Za-zÀ-ÿ\s&\-'#@]+?)(?:\s*[-–]|\s*\.|\s*!|\s+is\s|\s+biedt|\s+offers)/gi;
      while ((match = tipPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 60) {
          poiNames.push(name);
        }
      }

      // Pattern 3: Capitalized proper nouns
      const properNounPattern = /\b([A-Z][a-zÀ-ÿ]+(?:\s+(?:de|del|la|los|las|el|van|von|of|the|&|-)?\s*[A-Z][a-zÀ-ÿ]+)+)\b/g;
      while ((match = properNounPattern.exec(content)) !== null) {
        const name = match[1].trim();
        const words = name.toLowerCase().split(/\s+/);
        const hasProperName = words.some(w => !excludeWords.has(w) && w.length > 2);
        if (hasProperName && name.length > 4 && name.length < 50) {
          poiNames.push(name);
        }
      }

      // Pattern 4: List items
      const listPattern = /(?:^|\n)\s*(?:[-•*]|\d+\.)\s*([A-Z][A-Za-zÀ-ÿ\s&\-'|]+?)(?:\s*[-–:]|\s*\n|$)/gm;
      while ((match = listPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 60) {
          poiNames.push(name);
        }
      }
    }

    const allNames = [...priorityNames, ...poiNames];
    const uniqueNames = [...new Set(allNames.map(n => n.replace(/\s+/g, ' ').trim()))]
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
   * Validate if extracted POI name exists in database
   * @param {string} poiName - Name to validate
   * @returns {Promise<boolean>} - True if POI exists
   */
  async validatePOIName(poiName) {
    try {
      const results = await this.search(poiName, { limit: 3, similarityThreshold: 0.55 });
      // Check if any result has high similarity and matching name
      const hasMatch = results.results.some(r => {
        const similarity = r.similarity || 0;
        const nameLower = (r.name || '').toLowerCase();
        const queryLower = poiName.toLowerCase();
        // High similarity OR name contains the search term
        return similarity >= 0.6 || nameLower.includes(queryLower) || queryLower.includes(nameLower);
      });
      logger.info('POI validation', { poiName, hasMatch, resultCount: results.totalResults });
      return hasMatch;
    } catch (error) {
      logger.warn('POI validation failed:', error.message);
      return false;
    }
  }

  hasPronounReference(query) {
    const lowerQuery = query.toLowerCase();

    const dutchPatterns = [
      /\b(dat|die|deze|dit)\s+(restaurant|plek|strand|uitzichtpunt|locatie|plaats|bar|cafe|museum|park|hotel|lunch)\b/,
      /\b(daar|erover|hierover|ernaartoe|erheen)\b/,
      /\bvan\s+(dat|die|deze)\b/,
      /\bmeer\s+(over|info|informatie|weten)\b/,
      /\bhoe\s+kom\s+ik\s+(er|daar)\b/,
      /\bopeningstijden\b/,
      /\bwat\s+kost\b/,
      /\bis\s+(het|dat|die)\s+(open|gesloten|duur|goedkoop)\b/,
      /\bwat\s+zijn\s+de\s+(openingstijden|prijzen|reviews)\b/,
      /\bhoe\s+laat\s+(open|dicht)\b/,
      /\bkan\s+ik\s+(reserveren|boeken)\b/
    ];

    const englishPatterns = [
      /\b(that|this|the)\s+(restaurant|place|beach|viewpoint|location|bar|cafe|museum|park|hotel|lunch)\b/,
      /\btell\s+me\s+more\s+about\s+(that|this|the|it)\b/,
      /\bmore\s+(about|info|information)\b/,
      /\bhow\s+do\s+i\s+get\s+(there|to)\b/,
      /\bopening\s+hours\b/,
      /\bhow\s+much\b/,
      /\bis\s+it\s+(open|closed|expensive|cheap)\b/,
      /\bwhat\s+about\s+(that|this|the)\b/
    ];

    const germanPatterns = [
      /\b(das|dieser|diese|dieses)\s+(restaurant|ort|strand|aussichtspunkt|bar|cafe|museum|park|hotel)\b/,
      /\b(dort|daruber|dorthin)\b/,
      /\bmehr\s+(uber|info|informationen)\b/,
      /\boffnungszeiten\b/
    ];

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
   * Now includes POI validation
   */
  async buildEnhancedSearchQuery(query, conversationHistory, intentContext = {}) {
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return query;
    }

    const isFollowUp = intentContext.isFollowUp || this.hasPronounReference(query);
    if (!isFollowUp) {
      return query;
    }

    const recentMessages = conversationHistory.slice(-6);
    const enhancements = [];

    // Extract POI names from conversation history
    const poiNames = this.extractPOINamesFromHistory(recentMessages);

    // Validate and use only POIs that exist in database
    for (const poiName of poiNames) {
      const isValid = await this.validatePOIName(poiName);
      if (isValid) {
        enhancements.push(poiName);
        logger.info('Validated POI name for follow-up', { poiName });
        break; // Use only the first valid POI
      } else {
        logger.warn('POI name not found in database, skipping', { poiName });
      }
    }

    // Extract category terms
    const contextTerms = [];
    for (const msg of recentMessages) {
      if (!msg || typeof msg !== 'object') continue;
      const content = (msg.content || msg.message || '').toLowerCase();

      if (content.includes('restaurant') || content.includes('dinner') || content.includes('food') || content.includes('eten') || content.includes('lunch')) {
        contextTerms.push('restaurant');
      }
      if (content.includes('beach') || content.includes('strand') || content.includes('playa')) {
        contextTerms.push('beach');
      }
      if (content.includes('uitzicht') || content.includes('viewpoint') || content.includes('mirador')) {
        contextTerms.push('viewpoint');
      }
      if (content.includes('museum') || content.includes('cultuur') || content.includes('culture')) {
        contextTerms.push('museum culture');
      }
      if (content.includes('wandel') || content.includes('hike') || content.includes('hiking')) {
        contextTerms.push('hiking');
      }
    }

    const uniqueTerms = [...new Set(contextTerms)];
    if (uniqueTerms.length > 0 && enhancements.length === 0) {
      // Only add category terms if no POI name was found
      enhancements.push(...uniqueTerms);
    }

    if (enhancements.length > 0) {
      const enhancedQuery = `${query} ${enhancements.join(' ')} Calpe`;
      logger.info('Enhanced search query for follow-up', {
        original: query,
        enhanced: enhancedQuery,
        poiNamesFound: poiNames.length,
        validatedPOIs: enhancements.filter(e => poiNames.includes(e)).length
      });
      return enhancedQuery;
    }

    return query;
  }

  /**
   * Streaming RAG chat pipeline with event support
   */
  async chatStream(query, language = 'nl', options = {}) {
    if (!this.isInitialized) await this.initialize();

    try {
      const startTime = Date.now();
      const conversationHistory = options.conversationHistory || [];
      const intentContext = options.intentContext || {};

      // Check if this is an event query
      const isEventQuery = this.isEventQuery(query);
      let eventResults = [];

      if (isEventQuery) {
        logger.info('Event query detected, searching events');
        eventResults = await this.searchEvents(query, 5);
      }

      // Enhance search query for follow-ups (now async)
      const searchQuery = await this.buildEnhancedSearchQuery(query, conversationHistory, intentContext);

      // Search for POIs
      const searchResults = await this.search(searchQuery, { limit: 5 });

      // Combine event and POI results (events first if event query)
      let combinedResults = isEventQuery
        ? [...eventResults, ...searchResults.results].slice(0, 5)
        : searchResults.results;

      const searchTimeMs = Date.now() - startTime;
      const poiCards = this.extractPOICards(combinedResults, query);

      return {
        success: true,
        searchTimeMs,
        pois: poiCards,
        source: isEventQuery ? 'rag-events-stream' : 'rag-stream',
        hasEvents: eventResults.length > 0,
        stream: this.generateStreamingResponse(
          query,
          combinedResults,
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

      // Check if this is an event query
      const isEventQuery = this.isEventQuery(query);
      let eventResults = [];

      if (isEventQuery) {
        logger.info('Event query detected, searching events');
        eventResults = await this.searchEvents(query, 5);
      }

      // Enhance search query (now async)
      const searchQuery = await this.buildEnhancedSearchQuery(query, conversationHistory, intentContext);

      const searchResults = await this.search(searchQuery, { limit: 5 });

      // Combine results
      let combinedResults = isEventQuery
        ? [...eventResults, ...searchResults.results].slice(0, 5)
        : searchResults.results;

      const response = await this.generateResponse(
        query,
        combinedResults,
        language,
        options.userPreferences || {},
        conversationHistory
      );
      const poiCards = this.extractPOICards(combinedResults, query);
      const timeMs = Date.now() - startTime;
      logger.info(`RAG chat completed in ${timeMs}ms`);
      return {
        success: true,
        message: response,
        pois: poiCards,
        source: isEventQuery ? 'rag-events' : 'rag',
        hasEvents: eventResults.length > 0,
        searchTimeMs: timeMs
      };
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
        category: metadata.category || metadata.type || 'General',
        subcategory: metadata.subcategory || null,
        description: result.document || metadata.description || '',
        address: metadata.address || metadata.location_address || null,
        latitude: parseFloat(metadata.latitude) || null,
        longitude: parseFloat(metadata.longitude) || null,
        rating: parseFloat(metadata.rating) || null,
        reviewCount: parseInt(metadata.review_count) || 0,
        priceLevel: metadata.price_level || null,
        thumbnailUrl: metadata.thumbnail_url || null,
        openingHours: metadata.opening_hours || null,
        phone: metadata.phone || null,
        website: metadata.website || null,
        // Event-specific fields
        eventDates: metadata.event_dates || null,
        locationName: metadata.location_name || null,
        type: metadata.type || 'poi',
        similarity: result.similarity,
        distance: result.distance
      };
    });
  }

  buildContextString(results, language = 'nl') {
    const labels = this.getContextInstructions(language);
    if (!results || results.length === 0) return labels.noInfo;
    return results.slice(0, 5).map((item, index) => {
      const parts = [`${index + 1}. ${item.name}`];
      if (item.category) parts.push(`${labels.category}: ${item.category}`);
      if (item.type === 'agenda' && item.eventDates) {
        parts.push(`Dates: ${item.eventDates}`);
      }
      if (item.description) parts.push(`${labels.description}: ${item.description.substring(0, 200)}...`);
      if (item.address || item.locationName) parts.push(`${labels.address}: ${item.address || item.locationName}`);
      if (item.rating) parts.push(`${labels.rating}: ${item.rating}/5`);
      return parts.join('\n   ');
    }).join('\n\n');
  }

  extractPOICards(results, query) {
    if (!results || results.length === 0) return [];
    return results.slice(0, 5).map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description?.substring(0, 100) + '...',
      rating: item.rating,
      thumbnailUrl: item.thumbnailUrl,
      address: item.address || item.locationName,
      similarity: item.similarity,
      type: item.type || 'poi',
      eventDates: item.eventDates
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
