/**
 * Chat Search Service
 * Handles POI search and intent detection for HoliBot
 */

import logger from '../../utils/logger.js';

class SearchService {
  constructor() {
    // Category mappings for intent detection
    this.categoryMappings = {
      // Beach & Nature
      'strand': 'Beaches & Nature',
      'beach': 'Beaches & Nature',
      'playa': 'Beaches & Nature',
      'natuur': 'Beaches & Nature',
      'nature': 'Beaches & Nature',
      'park': 'Beaches & Nature',
      'wandel': 'Beaches & Nature',
      'hike': 'Beaches & Nature',
      'zee': 'Beaches & Nature',
      'sea': 'Beaches & Nature',

      // Food & Drinks
      'restaurant': 'Food & Drinks',
      'eten': 'Food & Drinks',
      'food': 'Food & Drinks',
      'tapas': 'Food & Drinks',
      'bar': 'Food & Drinks',
      'cafe': 'Food & Drinks',
      'koffie': 'Food & Drinks',
      'coffee': 'Food & Drinks',
      'diner': 'Food & Drinks',
      'lunch': 'Food & Drinks',
      'ontbijt': 'Food & Drinks',
      'breakfast': 'Food & Drinks',

      // Culture & History
      'museum': 'Culture & History',
      'geschiedenis': 'Culture & History',
      'history': 'Culture & History',
      'cultuur': 'Culture & History',
      'culture': 'Culture & History',
      'kerk': 'Culture & History',
      'church': 'Culture & History',
      'kasteel': 'Culture & History',
      'castle': 'Culture & History',
      'monument': 'Culture & History',

      // Active & Sports
      'sport': 'Active',
      'actief': 'Active',
      'active': 'Active',
      'duik': 'Active',
      'dive': 'Active',
      'fiets': 'Active',
      'bike': 'Active',
      'golf': 'Active',
      'tennis': 'Active',
      'zwem': 'Active',
      'swim': 'Active',

      // Recreation & Entertainment
      'kinderen': 'Recreation',
      'kids': 'Recreation',
      'family': 'Recreation',
      'gezin': 'Recreation',
      'pretpark': 'Recreation',
      'entertainment': 'Recreation',
      'fun': 'Recreation',

      // Shopping
      'winkel': 'Shopping',
      'shop': 'Shopping',
      'markt': 'Shopping',
      'market': 'Shopping',
      'souvenirs': 'Shopping',

      // Nightlife
      'nachtleven': 'Nightlife',
      'nightlife': 'Nightlife',
      'club': 'Nightlife',
      'disco': 'Nightlife',
      'uitgaan': 'Nightlife'
    };
  }

  /**
   * Search POIs based on user query
   * @param {string} query - User search query
   * @param {string} sessionId - Session ID for context
   * @param {Object} context - Session context
   */
  async searchPOIs(query, sessionId, context = {}) {
    try {
      // Detect intent from query
      const intent = this.detectIntent(query);

      // Get POI model
      let POI = null;
      try {
        const module = await import('../../models/POI.js');
        POI = module.default;
      } catch (error) {
        logger.warn('POI model not available, using sample data');
        return this.getSampleResults(query, intent);
      }

      // Build search criteria
      const where = { status: 'active' };
      const { Op } = await import('sequelize');

      // Category filter based on intent
      if (intent.category) {
        where.category = intent.category;
      }

      // Text search in name and description
      if (query.trim()) {
        where[Op.or] = [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } }
        ];
      }

      // Exclude previously displayed POIs for variety
      if (context.displayedPOIs?.length > 0) {
        where.id = { [Op.notIn]: context.displayedPOIs.slice(0, 10) };
      }

      const pois = await POI.findAll({
        where,
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit: 10
      });

      // Generate text response
      const textResponse = this.generateTextResponse(query, pois, intent);

      logger.info('Chat search completed', {
        query,
        intent,
        results: pois.length
      });

      return {
        pois: pois.map(p => this.formatPOI(p)),
        textResponse,
        intent,
        totalResults: pois.length
      };

    } catch (error) {
      logger.error('Search POIs error:', error);
      return this.getSampleResults(query, { primaryIntent: 'general' });
    }
  }

  /**
   * Detect user intent from query
   */
  detectIntent(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);

    let category = null;
    let primaryIntent = 'search';
    const secondaryIntents = [];

    // Check for category keywords
    for (const word of words) {
      for (const [keyword, cat] of Object.entries(this.categoryMappings)) {
        if (word.includes(keyword) || keyword.includes(word)) {
          category = cat;
          break;
        }
      }
      if (category) break;
    }

    // Detect question types
    if (queryLower.match(/^(wat|where|waar|hoe|how|welke|which)/)) {
      primaryIntent = 'question';
    }
    if (queryLower.match(/(beste|best|top|aanbev|recommend)/)) {
      primaryIntent = 'recommendation';
    }
    if (queryLower.match(/(open|geopend|openingstijd|hours|tijd)/)) {
      secondaryIntents.push('opening_hours');
    }
    if (queryLower.match(/(prijs|price|kost|cost|goedkoop|cheap|duur|expensive)/)) {
      secondaryIntents.push('price');
    }
    if (queryLower.match(/(kind|child|family|gezin|kinderen)/)) {
      secondaryIntents.push('family_friendly');
    }
    if (queryLower.match(/(vegetar|vegan|gluten)/)) {
      secondaryIntents.push('dietary');
    }

    return {
      primaryIntent,
      category,
      secondaryIntents,
      raw: queryLower
    };
  }

  /**
   * Handle follow-up questions based on previous results
   */
  handleFollowUp(query, previousResults, intent) {
    const queryLower = query.toLowerCase();

    // Ordinal references
    const ordinals = {
      'eerste': 0, 'first': 0, 'een': 0, 'one': 0,
      'tweede': 1, 'second': 1, 'twee': 1, 'two': 1,
      'derde': 2, 'third': 2, 'drie': 2, 'three': 2,
      'laatste': previousResults.length - 1, 'last': previousResults.length - 1
    };

    // Check for ordinal reference
    for (const [word, index] of Object.entries(ordinals)) {
      if (queryLower.includes(word) && previousResults[index]) {
        return [previousResults[index]];
      }
    }

    // If asking about "this" or "that", return first result
    if (queryLower.match(/\b(dit|that|this|deze|het)\b/)) {
      return previousResults.slice(0, 1);
    }

    return previousResults;
  }

  /**
   * Generate natural text response
   */
  generateTextResponse(query, pois, intent) {
    if (pois.length === 0) {
      return this.getNoResultsResponse(query, intent);
    }

    const count = pois.length;
    const categoryName = intent.category || 'locaties';

    if (intent.primaryIntent === 'recommendation') {
      return `Hier zijn mijn ${count} beste aanbevelingen voor ${categoryName} in Calpe! 🌟`;
    }

    if (intent.category) {
      return `Ik heb ${count} ${categoryName.toLowerCase()} gevonden die bij je zoekopdracht passen.`;
    }

    return `Hier zijn ${count} plekken die mogelijk interessant voor je zijn.`;
  }

  /**
   * Get response when no results found
   */
  getNoResultsResponse(query, intent) {
    if (intent.category) {
      return `Ik heb helaas geen ${intent.category.toLowerCase()} gevonden voor "${query}". Probeer een andere zoekterm of vraag me om algemene aanbevelingen!`;
    }
    return `Ik heb geen resultaten gevonden voor "${query}". Kan ik je helpen met stranden, restaurants, of bezienswaardigheden in Calpe?`;
  }

  /**
   * Format POI for API response
   */
  formatPOI(poi) {
    const data = poi.toJSON ? poi.toJSON() : poi;
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      description: data.description,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      rating: data.rating,
      reviewCount: data.review_count,
      priceLevel: data.price_level,
      thumbnailUrl: data.thumbnail_url,
      displayAsCard: true,
      displayReason: 'search_result'
    };
  }

  /**
   * Get sample results when database unavailable
   */
  getSampleResults(query, intent) {
    const samplePOIs = [
      {
        id: 1,
        name: 'Penyal d\'Ifac',
        category: 'Beaches & Nature',
        description: 'Iconische rots en natuurreservaat met wandelroutes',
        address: 'Parque Natural del Penyal d\'Ifac',
        latitude: 38.6327,
        longitude: 0.0778,
        rating: 4.8,
        reviewCount: 245,
        displayAsCard: true,
        displayReason: 'top_rated'
      },
      {
        id: 2,
        name: 'Playa Arenal-Bol',
        category: 'Beaches & Nature',
        description: 'Hoofdstrand met gouden zand en alle faciliteiten',
        address: 'Av. de los Ejércitos Españoles',
        latitude: 38.6448,
        longitude: 0.0598,
        rating: 4.5,
        reviewCount: 189,
        displayAsCard: true,
        displayReason: 'popular'
      },
      {
        id: 3,
        name: 'Restaurante El Puerto',
        category: 'Food & Drinks',
        description: 'Verse vis en zeevruchten met havenuitzicht',
        address: 'Puerto de Calpe',
        latitude: 38.6445,
        longitude: 0.0441,
        rating: 4.7,
        reviewCount: 312,
        displayAsCard: true,
        displayReason: 'recommended'
      }
    ];

    // Filter by category if detected
    let filtered = samplePOIs;
    if (intent.category) {
      filtered = samplePOIs.filter(p => p.category === intent.category);
      if (filtered.length === 0) filtered = samplePOIs;
    }

    return {
      pois: filtered,
      textResponse: `Hier zijn enkele populaire plekken in Calpe. Voor meer resultaten, probeer specifiekere zoektermen!`,
      intent,
      totalResults: filtered.length
    };
  }
}

export const searchService = new SearchService();
export default searchService;
