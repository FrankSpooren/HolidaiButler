/**
 * Intent Detection Service for HoliBot
 * Analyzes user queries to understand intent and extract entities
 *
 * Features:
 * - Intent classification (search, directions, recommendation, info, greeting, etc.)
 * - Entity extraction (POI names, categories, time, location)
 * - Context awareness from conversation history
 * - Follow-up suggestion generation
 */

import logger from '../../utils/logger.js';

class IntentService {
  constructor() {
    // Intent patterns with keywords and regex
    this.intentPatterns = {
      // Greetings
      greeting: {
        keywords: {
          nl: ['hallo', 'hoi', 'goedemorgen', 'goedemiddag', 'goedenavond', 'hey', 'hi'],
          en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
          de: ['hallo', 'guten morgen', 'guten tag', 'guten abend', 'hi', 'hey'],
          es: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches'],
          sv: ['hej', 'hallå', 'god morgon', 'god dag'],
          pl: ['cześć', 'dzień dobry', 'dobry wieczór', 'hej']
        },
        priority: 1
      },

      // Asking for directions
      directions: {
        keywords: {
          nl: ['hoe kom ik', 'route naar', 'waar is', 'waar ligt', 'waar vind ik', 'locatie van', 'adres van', 'navigeer naar'],
          en: ['how do i get to', 'directions to', 'where is', 'where can i find', 'location of', 'address of', 'navigate to', 'how to reach'],
          de: ['wie komme ich', 'weg nach', 'wo ist', 'wo finde ich', 'adresse von', 'route zu'],
          es: ['cómo llego', 'donde está', 'donde queda', 'dirección de', 'cómo ir a'],
          sv: ['hur kommer jag till', 'var ligger', 'var finns', 'vägen till'],
          pl: ['jak dojść', 'gdzie jest', 'gdzie znajdę', 'adres', 'droga do']
        },
        priority: 2
      },

      // Asking for recommendations
      recommendation: {
        keywords: {
          nl: ['beste', 'aanrader', 'tip', 'suggestie', 'wat is goed', 'waar kan ik', 'leukste', 'mooiste', 'lekkerste', 'populairste', 'aanbevelen'],
          en: ['best', 'recommend', 'suggestion', 'tip', 'good place', 'where should i', 'nicest', 'most popular', 'top rated'],
          de: ['beste', 'empfehlung', 'tipp', 'wo kann ich', 'schönste', 'beliebteste'],
          es: ['mejor', 'recomendación', 'sugerencia', 'dónde puedo', 'más popular'],
          sv: ['bästa', 'rekommendation', 'tips', 'var kan jag', 'populäraste'],
          pl: ['najlepsze', 'polecenie', 'gdzie mogę', 'najpopularniejsze']
        },
        priority: 2
      },

      // Searching for specific category
      category_search: {
        keywords: {
          nl: ['restaurant', 'strand', 'stranden', 'museum', 'winkel', 'bar', 'cafe', 'hotel', 'supermarkt', 'apotheek', 'ziekenhuis', 'wandelen', 'fietsen'],
          en: ['restaurant', 'beach', 'beaches', 'museum', 'shop', 'bar', 'cafe', 'hotel', 'supermarket', 'pharmacy', 'hospital', 'hiking', 'cycling'],
          de: ['restaurant', 'strand', 'strände', 'museum', 'geschäft', 'bar', 'cafe', 'hotel', 'supermarkt', 'apotheke', 'krankenhaus', 'wandern', 'radfahren'],
          es: ['restaurante', 'playa', 'playas', 'museo', 'tienda', 'bar', 'café', 'hotel', 'supermercado', 'farmacia', 'hospital', 'senderismo'],
          sv: ['restaurang', 'strand', 'stränder', 'museum', 'butik', 'bar', 'café', 'hotell', 'supermarket', 'apotek', 'sjukhus', 'vandring'],
          pl: ['restauracja', 'plaża', 'plaże', 'muzeum', 'sklep', 'bar', 'kawiarnia', 'hotel', 'supermarket', 'apteka', 'szpital', 'wędrówki']
        },
        priority: 3
      },

      // Asking for opening hours
      opening_hours: {
        keywords: {
          nl: ['openingstijden', 'open', 'geopend', 'dicht', 'gesloten', 'wanneer open', 'hoe laat'],
          en: ['opening hours', 'open', 'closed', 'when open', 'what time', 'hours of operation'],
          de: ['öffnungszeiten', 'geöffnet', 'geschlossen', 'wann geöffnet'],
          es: ['horario', 'abierto', 'cerrado', 'a qué hora'],
          sv: ['öppettider', 'öppet', 'stängt', 'när öppnar'],
          pl: ['godziny otwarcia', 'otwarte', 'zamknięte', 'o której']
        },
        priority: 2
      },

      // Price/cost inquiry
      price_inquiry: {
        keywords: {
          nl: ['prijs', 'kosten', 'duur', 'goedkoop', 'budget', 'hoeveel kost', 'wat kost'],
          en: ['price', 'cost', 'expensive', 'cheap', 'budget', 'how much', 'affordable'],
          de: ['preis', 'kosten', 'teuer', 'günstig', 'budget', 'wie viel kostet'],
          es: ['precio', 'costo', 'caro', 'barato', 'cuánto cuesta'],
          sv: ['pris', 'kostnad', 'dyr', 'billig', 'budget', 'hur mycket kostar'],
          pl: ['cena', 'koszt', 'drogi', 'tani', 'ile kosztuje']
        },
        priority: 2
      },

      // Weather inquiry
      weather: {
        keywords: {
          nl: ['weer', 'temperatuur', 'regen', 'zon', 'bewolkt', 'warm', 'koud'],
          en: ['weather', 'temperature', 'rain', 'sun', 'cloudy', 'warm', 'cold', 'forecast'],
          de: ['wetter', 'temperatur', 'regen', 'sonne', 'bewölkt', 'warm', 'kalt'],
          es: ['tiempo', 'temperatura', 'lluvia', 'sol', 'nublado', 'calor', 'frío'],
          sv: ['väder', 'temperatur', 'regn', 'sol', 'molnigt', 'varmt', 'kallt'],
          pl: ['pogoda', 'temperatura', 'deszcz', 'słońce', 'pochmurno', 'ciepło', 'zimno']
        },
        priority: 2
      },

      // Events/activities
      events: {
        keywords: {
          nl: ['evenement', 'festival', 'concert', 'markt', 'activiteit', 'wat te doen', 'agenda', 'uitgaan'],
          en: ['event', 'festival', 'concert', 'market', 'activity', 'what to do', 'things to do', 'nightlife'],
          de: ['veranstaltung', 'festival', 'konzert', 'markt', 'aktivität', 'was tun', 'ausgehen'],
          es: ['evento', 'festival', 'concierto', 'mercado', 'actividad', 'qué hacer'],
          sv: ['evenemang', 'festival', 'konsert', 'marknad', 'aktivitet', 'vad göra'],
          pl: ['wydarzenie', 'festiwal', 'koncert', 'targ', 'aktywność', 'co robić']
        },
        priority: 2
      },

      // Help/general info
      help: {
        keywords: {
          nl: ['help', 'hulp', 'wat kun je', 'wat kan je', 'informatie', 'uitleg'],
          en: ['help', 'what can you', 'information', 'explain', 'tell me about'],
          de: ['hilfe', 'was kannst du', 'information', 'erklär'],
          es: ['ayuda', 'qué puedes', 'información', 'explica'],
          sv: ['hjälp', 'vad kan du', 'information', 'förklara'],
          pl: ['pomoc', 'co możesz', 'informacja', 'wyjaśnij']
        },
        priority: 4
      },

      // Thank you / goodbye
      closing: {
        keywords: {
          nl: ['bedankt', 'dankje', 'dank je wel', 'tot ziens', 'doei', 'dag'],
          en: ['thank you', 'thanks', 'goodbye', 'bye', 'see you'],
          de: ['danke', 'vielen dank', 'auf wiedersehen', 'tschüss'],
          es: ['gracias', 'adiós', 'hasta luego'],
          sv: ['tack', 'hejdå', 'vi ses'],
          pl: ['dziękuję', 'dzięki', 'do widzenia', 'cześć']
        },
        priority: 1
      }
    };

    // Category mappings for entity extraction
    this.categoryMappings = {
      restaurant: 'Food & Drinks',
      restaurants: 'Food & Drinks',
      eten: 'Food & Drinks',
      food: 'Food & Drinks',
      beach: 'Beaches & Nature',
      beaches: 'Beaches & Nature',
      strand: 'Beaches & Nature',
      stranden: 'Beaches & Nature',
      playa: 'Beaches & Nature',
      museum: 'Culture & History',
      musea: 'Culture & History',
      culture: 'Culture & History',
      hiking: 'Active',
      wandelen: 'Active',
      cycling: 'Active',
      fietsen: 'Active',
      sport: 'Active',
      shopping: 'Shopping',
      winkelen: 'Shopping',
      winkel: 'Shopping',
      nightlife: 'Nightlife',
      bar: 'Nightlife',
      club: 'Nightlife'
    };
  }

  /**
   * Analyze a user query to detect intent and extract entities
   * @param {string} query - User query
   * @param {string} language - Language code
   * @param {Array} conversationHistory - Previous messages for context
   * @returns {Object} Analysis result
   */
  analyzeQuery(query, language = 'nl', conversationHistory = []) {
    const normalizedQuery = query.toLowerCase().trim();
    const result = {
      originalQuery: query,
      language,
      intents: [],
      primaryIntent: null,
      entities: {
        categories: [],
        poiMentions: [],
        timeReferences: [],
        locationReferences: []
      },
      context: {
        isFollowUp: false,
        referencedFromHistory: null
      },
      suggestedFollowUps: []
    };

    // Detect intents
    result.intents = this.detectIntents(normalizedQuery, language);
    result.primaryIntent = result.intents[0]?.intent || 'general_search';

    // Extract entities
    result.entities = this.extractEntities(normalizedQuery, language);

    // Analyze conversation context
    if (conversationHistory.length > 0) {
      result.context = this.analyzeContext(normalizedQuery, conversationHistory);
    }

    // Generate follow-up suggestions based on intent
    result.suggestedFollowUps = this.generateFollowUpSuggestions(result.primaryIntent, result.entities, language);

    logger.debug('Query analysis result', {
      query: query.substring(0, 50),
      primaryIntent: result.primaryIntent,
      entityCount: Object.values(result.entities).flat().length
    });

    return result;
  }

  /**
   * Detect intents from query
   */
  detectIntents(query, language) {
    const detectedIntents = [];

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      const keywords = intentData.keywords[language] || intentData.keywords.en || [];

      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          detectedIntents.push({
            intent: intentName,
            keyword,
            confidence: this.calculateConfidence(query, keyword),
            priority: intentData.priority
          });
          break; // One match per intent is enough
        }
      }
    }

    // Sort by confidence and priority
    detectedIntents.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.priority - b.priority;
    });

    return detectedIntents;
  }

  /**
   * Calculate confidence score for keyword match
   */
  calculateConfidence(query, keyword) {
    // Higher confidence if keyword is more prominent in query
    const keywordRatio = keyword.length / query.length;
    const isAtStart = query.startsWith(keyword) ? 0.2 : 0;
    return Math.min(0.5 + keywordRatio + isAtStart, 1.0);
  }

  /**
   * Extract entities from query
   */
  extractEntities(query, language) {
    const entities = {
      categories: [],
      poiMentions: [],
      timeReferences: [],
      locationReferences: []
    };

    // Extract categories
    for (const [keyword, category] of Object.entries(this.categoryMappings)) {
      if (query.includes(keyword)) {
        if (!entities.categories.includes(category)) {
          entities.categories.push(category);
        }
      }
    }

    // Extract time references
    const timePatterns = {
      nl: ['vandaag', 'morgen', 'vanavond', 'vanmiddag', 'vanochtend', 'weekend', 'deze week'],
      en: ['today', 'tomorrow', 'tonight', 'this afternoon', 'this morning', 'weekend', 'this week'],
      de: ['heute', 'morgen', 'heute abend', 'heute nachmittag', 'wochenende', 'diese woche'],
      es: ['hoy', 'mañana', 'esta noche', 'esta tarde', 'fin de semana', 'esta semana'],
      sv: ['idag', 'imorgon', 'ikväll', 'i eftermiddag', 'helgen', 'denna vecka'],
      pl: ['dzisiaj', 'jutro', 'dziś wieczorem', 'po południu', 'weekend', 'ten tydzień']
    };

    const langTimePatterns = timePatterns[language] || timePatterns.en;
    for (const timeRef of langTimePatterns) {
      if (query.includes(timeRef)) {
        entities.timeReferences.push(timeRef);
      }
    }

    // Extract location references (Calpe-specific)
    const locationPatterns = ['calpe', 'calp', 'arenal', 'fossa', 'ifach', 'peñon', 'penon', 'puerto', 'haven', 'centro', 'centrum'];
    for (const location of locationPatterns) {
      if (query.includes(location)) {
        entities.locationReferences.push(location);
      }
    }

    return entities;
  }

  /**
   * Analyze conversation context for follow-up detection
   */
  analyzeContext(query, conversationHistory) {
    const context = {
      isFollowUp: false,
      referencedFromHistory: null,
      previousTopics: []
    };

    // Check for pronouns/references that indicate follow-up
    const followUpIndicators = {
      nl: ['daar', 'die', 'dat', 'deze', 'hij', 'zij', 'het', 'er', 'ook', 'nog', 'meer', 'andere'],
      en: ['there', 'that', 'this', 'it', 'they', 'also', 'more', 'another', 'other'],
      de: ['dort', 'das', 'diese', 'es', 'sie', 'auch', 'mehr', 'andere'],
      es: ['allí', 'eso', 'esto', 'también', 'más', 'otro'],
      sv: ['där', 'det', 'den', 'också', 'mer', 'annan'],
      pl: ['tam', 'to', 'też', 'więcej', 'inny']
    };

    // Simple check - if query starts with follow-up indicator
    for (const indicators of Object.values(followUpIndicators)) {
      for (const indicator of indicators) {
        if (query.startsWith(indicator + ' ') || query.includes(' ' + indicator + ' ')) {
          context.isFollowUp = true;
          break;
        }
      }
      if (context.isFollowUp) break;
    }

    // Extract topics from recent messages
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-4);
      for (const msg of recentMessages) {
        if (msg.role === 'assistant' && msg.pois) {
          context.previousTopics.push(...msg.pois.map(p => p.name).slice(0, 3));
        }
      }
    }

    return context;
  }

  /**
   * Generate follow-up suggestions based on intent and entities
   */
  generateFollowUpSuggestions(intent, entities, language) {
    const suggestions = {
      nl: {
        category_search: ['Wil je meer informatie over een specifieke plek?', 'Zal ik de openingstijden opzoeken?', 'Wil je weten hoe je er komt?'],
        directions: ['Wil je ook de openingstijden weten?', 'Zal ik alternatieven tonen?'],
        recommendation: ['Wil je meer opties zien?', 'Zal ik ook restaurants in de buurt tonen?'],
        opening_hours: ['Wil je weten hoe je er komt?', 'Zal ik je meer vertellen over deze plek?'],
        greeting: ['Wat wil je vandaag ontdekken in Calpe?', 'Zoek je een restaurant, strand of activiteit?'],
        events: ['Wil je meer details over een evenement?', 'Zal ik restaurants in de buurt tonen?'],
        general_search: ['Wil je meer weten over een specifieke plek?', 'Kan ik je ergens anders mee helpen?']
      },
      en: {
        category_search: ['Want more info about a specific place?', 'Shall I look up opening hours?', 'Want directions there?'],
        directions: ['Want to know the opening hours too?', 'Shall I show alternatives?'],
        recommendation: ['Want to see more options?', 'Shall I show nearby restaurants?'],
        opening_hours: ['Want directions there?', 'Shall I tell you more about this place?'],
        greeting: ['What would you like to discover in Calpe today?', 'Looking for a restaurant, beach or activity?'],
        events: ['Want more details about an event?', 'Shall I show nearby restaurants?'],
        general_search: ['Want to know more about a specific place?', 'Can I help you with anything else?']
      }
    };

    const langSuggestions = suggestions[language] || suggestions.en;
    return langSuggestions[intent] || langSuggestions.general_search;
  }

  /**
   * Build enhanced prompt with intent context
   */
  buildEnhancedPrompt(analysis, originalPrompt, language) {
    let enhancedPrompt = originalPrompt;

    // Add intent-specific instructions
    const intentInstructions = {
      directions: 'Provide clear directions and address information.',
      recommendation: 'Focus on highly-rated options and explain why they are recommended.',
      opening_hours: 'Include specific opening hours if available.',
      price_inquiry: 'Mention price ranges or cost information if known.',
      events: 'Include dates, times, and locations for events.',
      weather: 'Note that real-time weather data may not be available, provide general climate info.'
    };

    if (analysis.primaryIntent && intentInstructions[analysis.primaryIntent]) {
      enhancedPrompt += ` ${intentInstructions[analysis.primaryIntent]}`;
    }

    // Add category context
    if (analysis.entities.categories.length > 0) {
      enhancedPrompt += ` Focus on: ${analysis.entities.categories.join(', ')}.`;
    }

    // Add time context
    if (analysis.entities.timeReferences.length > 0) {
      enhancedPrompt += ` Time context: ${analysis.entities.timeReferences.join(', ')}.`;
    }

    return enhancedPrompt;
  }
}

export const intentService = new IntentService();
export default intentService;
