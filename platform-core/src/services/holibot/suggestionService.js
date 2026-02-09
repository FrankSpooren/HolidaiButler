/**
 * Smart Suggestion Service for HoliBot
 * Provides proactive, context-aware recommendations
 *
 * Features:
 * - Time-based suggestions (morning/afternoon/evening/night)
 * - Trending POIs based on recent user activity
 * - Seasonal recommendations
 * - Weather-aware suggestions (placeholder for weather API)
 * - "You might also like" based on preferences
 * - Quick action suggestions based on context
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// Time-based category recommendations
const TIME_BASED_SUGGESTIONS = {
  morning: { // 6:00 - 11:59
    categories: ['Food & Drinks', 'Beaches & Nature', 'Active'],
    activities: {
      nl: ['Ontbijt bij een lokaal café', 'Ochtendwandeling langs het strand', 'Vroege duik in zee'],
      en: ['Breakfast at a local café', 'Morning walk along the beach', 'Early swim in the sea'],
      de: ['Frühstück in einem lokalen Café', 'Morgenspaziergang am Strand', 'Früh schwimmen im Meer'],
      es: ['Desayuno en un café local', 'Paseo matutino por la playa', 'Baño temprano en el mar'],
      sv: ['Frukost på ett lokalt kafé', 'Morgonpromenad längs stranden', 'Tidigt dopp i havet'],
      pl: ['Śniadanie w lokalnej kawiarni', 'Poranny spacer wzdłuż plaży', 'Wczesna kąpiel w morzu']
    }
  },
  afternoon: { // 12:00 - 17:59
    categories: ['Beaches & Nature', 'Culture & History', 'Shopping'],
    activities: {
      nl: ['Lunch met zeezicht', 'Bezoek het Peñón de Ifach', 'Winkelen in het centrum'],
      en: ['Lunch with sea view', 'Visit the Peñón de Ifach', 'Shopping in the center'],
      de: ['Mittagessen mit Meerblick', 'Besuch des Peñón de Ifach', 'Einkaufen im Zentrum'],
      es: ['Almuerzo con vista al mar', 'Visitar el Peñón de Ifach', 'Compras en el centro'],
      sv: ['Lunch med havsutsikt', 'Besök Peñón de Ifach', 'Shopping i centrum'],
      pl: ['Lunch z widokiem na morze', 'Odwiedź Peñón de Ifach', 'Zakupy w centrum']
    }
  },
  evening: { // 18:00 - 21:59
    categories: ['Food & Drinks', 'Nightlife', 'Culture & History'],
    activities: {
      nl: ['Diner bij zonsondergang', 'Tapas tour', 'Avondwandeling door de oude stad'],
      en: ['Dinner at sunset', 'Tapas tour', 'Evening walk through the old town'],
      de: ['Abendessen bei Sonnenuntergang', 'Tapas-Tour', 'Abendspaziergang durch die Altstadt'],
      es: ['Cena al atardecer', 'Ruta de tapas', 'Paseo nocturno por el casco antiguo'],
      sv: ['Middag vid solnedgång', 'Tapasrunda', 'Kvällspromenad genom gamla stan'],
      pl: ['Kolacja o zachodzie słońca', 'Trasa tapas', 'Wieczorny spacer po starym mieście']
    }
  },
  night: { // 22:00 - 5:59
    categories: ['Nightlife', 'Food & Drinks'],
    activities: {
      nl: ['Cocktails aan het strand', 'Live muziek', 'Nachtelijke strandwandeling'],
      en: ['Cocktails on the beach', 'Live music', 'Night beach walk'],
      de: ['Cocktails am Strand', 'Live-Musik', 'Nächtlicher Strandspaziergang'],
      es: ['Cócteles en la playa', 'Música en vivo', 'Paseo nocturno por la playa'],
      sv: ['Cocktails på stranden', 'Livemusik', 'Nattlig strandpromenad'],
      pl: ['Koktajle na plaży', 'Muzyka na żywo', 'Nocny spacer po plaży']
    }
  }
};

// Seasonal recommendations
const SEASONAL_SUGGESTIONS = {
  summer: { // June - August
    categories: ['Beaches & Nature', 'Active', 'Nightlife'],
    highlight: {
      nl: 'Perfect strandweer! Ontdek de mooiste stranden van Calpe.',
      en: 'Perfect beach weather! Discover the most beautiful beaches of Calpe.',
      de: 'Perfektes Strandwetter! Entdecken Sie die schönsten Strände von Calpe.',
      es: '¡Tiempo perfecto para la playa! Descubre las playas más bonitas de Calpe.',
      sv: 'Perfekt strandväder! Upptäck Calpes vackraste stränder.',
      pl: 'Idealna pogoda na plażę! Odkryj najpiękniejsze plaże Calpe.'
    }
  },
  spring: { // March - May
    categories: ['Active', 'Culture & History', 'Beaches & Nature'],
    highlight: {
      nl: 'Ideaal weer voor wandelen en fietsen!',
      en: 'Ideal weather for hiking and cycling!',
      de: 'Ideales Wetter zum Wandern und Radfahren!',
      es: '¡Clima ideal para senderismo y ciclismo!',
      sv: 'Perfekt väder för vandring och cykling!',
      pl: 'Idealna pogoda na wędrówki i rower!'
    }
  },
  autumn: { // September - November
    categories: ['Culture & History', 'Food & Drinks', 'Active'],
    highlight: {
      nl: 'Geniet van de lokale gastronomie en cultuur!',
      en: 'Enjoy local gastronomy and culture!',
      de: 'Genießen Sie lokale Gastronomie und Kultur!',
      es: '¡Disfruta de la gastronomía y cultura local!',
      sv: 'Njut av lokal gastronomi och kultur!',
      pl: 'Ciesz się lokalną gastronomią i kulturą!'
    }
  },
  winter: { // December - February
    categories: ['Culture & History', 'Food & Drinks', 'Shopping'],
    highlight: {
      nl: 'Ontdek de rustige charme van Calpe in de winter.',
      en: 'Discover the quiet charm of Calpe in winter.',
      de: 'Entdecken Sie den ruhigen Charme von Calpe im Winter.',
      es: 'Descubre el encanto tranquilo de Calpe en invierno.',
      sv: 'Upptäck Calpes lugna charm på vintern.',
      pl: 'Odkryj spokojny urok Calpe zimą.'
    }
  }
};

class SuggestionService {
  constructor() {
    this.isInitialized = false;
    this.trendingCache = {};
    this.trendingCacheTime = {};
    this.CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Initialize the suggestion service
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Check if required tables exist
      const [tables] = await mysqlSequelize.query(
        "SHOW TABLES LIKE 'holibot_poi_clicks'",
        { type: QueryTypes.SELECT }
      );

      if (tables) {
        this.isInitialized = true;
        logger.info('Suggestion service initialized');
      }

      return this.isInitialized;
    } catch (error) {
      logger.warn('Suggestion service init failed:', error.message);
      return false;
    }
  }

  /**
   * Get current time period
   * @returns {string} morning, afternoon, evening, or night
   */
  getTimePeriod() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get current season
   * @returns {string} spring, summer, autumn, or winter
   */
  getSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Get time-based suggestions
   * @param {string} language - Language code
   * @returns {Object} Time-based suggestions
   */
  getTimeSuggestions(language = 'nl', destName = 'Calpe') {
    const period = this.getTimePeriod();
    const suggestions = TIME_BASED_SUGGESTIONS[period];

    return {
      period,
      categories: suggestions.categories,
      activities: suggestions.activities[language] || suggestions.activities.en,
      greeting: this.getTimeGreeting(period, language, destName)
    };
  }

  /**
   * Get time-appropriate greeting
   */
  getTimeGreeting(period, language, destName = 'Calpe') {
    // Preposition rules: "op Texel" (NL), "on Texel" (EN), "auf Texel" (DE)
    const nlPrep = destName === 'Texel' ? 'op' : 'in';
    const enPrep = destName === 'Texel' ? 'on' : 'in';
    const dePrep = destName === 'Texel' ? 'auf' : 'in';

    const greetings = {
      morning: {
        nl: 'Goedemorgen! Wat wil je vandaag ontdekken?',
        en: 'Good morning! What would you like to discover today?',
        de: 'Guten Morgen! Was möchten Sie heute entdecken?',
        es: '¡Buenos días! ¿Qué te gustaría descubrir hoy?',
        sv: 'God morgon! Vad vill du upptäcka idag?',
        pl: 'Dzień dobry! Co chciałbyś dziś odkryć?'
      },
      afternoon: {
        nl: 'Goedemiddag! Hoe kan ik je helpen?',
        en: 'Good afternoon! How can I help you?',
        de: 'Guten Tag! Wie kann ich Ihnen helfen?',
        es: '¡Buenas tardes! ¿Cómo puedo ayudarte?',
        sv: 'God eftermiddag! Hur kan jag hjälpa dig?',
        pl: 'Dzień dobry! Jak mogę Ci pomóc?'
      },
      evening: {
        nl: `Goedenavond! Klaar voor een mooie avond ${nlPrep} ${destName}?`,
        en: `Good evening! Ready for a lovely evening ${enPrep} ${destName}?`,
        de: `Guten Abend! Bereit für einen schönen Abend ${dePrep} ${destName}?`,
        es: `¡Buenas noches! ¿Listo para una bonita noche en ${destName}?`,
        sv: `God kväll! Redo för en fin kväll ${destName === 'Texel' ? 'på' : 'i'} ${destName}?`,
        pl: `Dobry wieczór! Gotowy na piękny wieczór w ${destName}?`
      },
      night: {
        nl: `Nog wakker? ${destName === 'Texel' ? `Geniet van de avondrust op ${destName}!` : `Ontdek het nachtleven van ${destName}!`}`,
        en: `Still awake? ${destName === 'Texel' ? `Enjoy the evening tranquility on ${destName}!` : `Discover the nightlife of ${destName}!`}`,
        de: `Noch wach? ${destName === 'Texel' ? `Genießen Sie die Abendruhe auf ${destName}!` : `Entdecken Sie das Nachtleben von ${destName}!`}`,
        es: `¿Todavía despierto? ¡Descubre la vida nocturna de ${destName}!`,
        sv: `Fortfarande vaken? ${destName === 'Texel' ? `Njut av kvällslugnet på ${destName}!` : `Upptäck nattlivet i ${destName}!`}`,
        pl: `Jeszcze nie śpisz? Odkryj nocne życie ${destName}!`
      }
    };

    return greetings[period][language] || greetings[period].en;
  }

  /**
   * Get seasonal suggestions
   * @param {string} language - Language code
   * @returns {Object} Seasonal suggestions
   */
  getSeasonalSuggestions(language = 'nl', destName = 'Calpe') {
    const season = this.getSeason();
    const suggestions = SEASONAL_SUGGESTIONS[season];

    return {
      season,
      categories: suggestions.categories,
      highlight: this.getSeasonHighlight(season, language, destName)
    };
  }

  /**
   * Get destination-specific seasonal highlight text
   */
  getSeasonHighlight(season, language, destName = 'Calpe') {
    const nlPrep = destName === 'Texel' ? 'op' : 'van';
    const enPrep = destName === 'Texel' ? 'on' : 'of';
    const dePrep = destName === 'Texel' ? 'auf' : 'von';

    const highlights = {
      summer: {
        nl: `Perfect strandweer! Ontdek de mooiste stranden ${nlPrep} ${destName}.`,
        en: `Perfect beach weather! Discover the most beautiful beaches ${enPrep} ${destName}.`,
        de: `Perfektes Strandwetter! Entdecken Sie die schönsten Strände ${dePrep} ${destName}.`,
        es: `¡Tiempo perfecto para la playa! Descubre las playas más bonitas de ${destName}.`,
        sv: `Perfekt strandväder! Upptäck ${destName}s vackraste stränder.`,
        pl: `Idealna pogoda na plażę! Odkryj najpiękniejsze plaże ${destName}.`
      },
      spring: {
        nl: 'Ideaal weer voor wandelen en fietsen!',
        en: 'Ideal weather for hiking and cycling!',
        de: 'Ideales Wetter zum Wandern und Radfahren!',
        es: '¡Clima ideal para senderismo y ciclismo!',
        sv: 'Perfekt väder för vandring och cykling!',
        pl: 'Idealna pogoda na wędrówki i rower!'
      },
      autumn: {
        nl: 'Geniet van de lokale gastronomie en cultuur!',
        en: 'Enjoy local gastronomy and culture!',
        de: 'Genießen Sie lokale Gastronomie und Kultur!',
        es: '¡Disfruta de la gastronomía y cultura local!',
        sv: 'Njut av lokal gastronomi och kultur!',
        pl: 'Ciesz się lokalną gastronomią i kulturą!'
      },
      winter: {
        nl: destName === 'Texel'
          ? `Ontdek de ruige schoonheid op ${destName} in de winter.`
          : `Ontdek de rustige charme van ${destName} in de winter.`,
        en: destName === 'Texel'
          ? `Discover the rugged beauty on ${destName} in winter.`
          : `Discover the quiet charm of ${destName} in winter.`,
        de: destName === 'Texel'
          ? `Entdecken Sie die raue Schönheit auf ${destName} im Winter.`
          : `Entdecken Sie den ruhigen Charme von ${destName} im Winter.`,
        es: `Descubre el encanto tranquilo de ${destName} en invierno.`,
        sv: `Upptäck ${destName}s lugna charm på vintern.`,
        pl: `Odkryj spokojny urok ${destName} zimą.`
      }
    };

    return highlights[season][language] || highlights[season].en;
  }

  /**
   * Get trending POIs based on recent clicks
   * @param {number} limit - Max POIs to return
   * @param {number} days - Look back period
   * @returns {Array} Trending POIs
   */
  async getTrendingPois(limit = 10, days = 7, destinationId = null) {
    if (!this.isInitialized) await this.initialize();

    // Cache per destination
    const cacheKey = destinationId || 'all';
    if (this.trendingCache[cacheKey] && this.trendingCacheTime[cacheKey] &&
        Date.now() - this.trendingCacheTime[cacheKey] < this.CACHE_DURATION) {
      return this.trendingCache[cacheKey].slice(0, limit);
    }

    try {
      let query, replacements;

      if (destinationId) {
        // Filter by destination via JOIN with POI table (holibot_poi_clicks has no destination_id)
        query = `
          SELECT
            pc.poi_id,
            pc.poi_name,
            COUNT(*) as click_count,
            COUNT(DISTINCT pc.session_id) as unique_sessions,
            MAX(pc.clicked_at) as last_clicked
          FROM holibot_poi_clicks pc
          INNER JOIN POI p ON pc.poi_id = p.id
          WHERE pc.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND pc.poi_name IS NOT NULL
            AND p.destination_id = ?
          GROUP BY pc.poi_id, pc.poi_name
          ORDER BY click_count DESC, unique_sessions DESC
          LIMIT 20
        `;
        replacements = [days, destinationId];
      } else {
        query = `
          SELECT
            pc.poi_id,
            pc.poi_name,
            COUNT(*) as click_count,
            COUNT(DISTINCT pc.session_id) as unique_sessions,
            MAX(pc.clicked_at) as last_clicked
          FROM holibot_poi_clicks pc
          WHERE pc.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND pc.poi_name IS NOT NULL
          GROUP BY pc.poi_id, pc.poi_name
          ORDER BY click_count DESC, unique_sessions DESC
          LIMIT 20
        `;
        replacements = [days];
      }

      const trending = await mysqlSequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      this.trendingCache[cacheKey] = trending;
      this.trendingCacheTime[cacheKey] = Date.now();

      return trending.slice(0, limit);
    } catch (error) {
      logger.warn('Failed to get trending POIs:', error.message);
      return [];
    }
  }

  /**
   * Get category-specific trending POIs
   * @param {string} category - Category name
   * @param {number} limit - Max POIs
   * @returns {Array} Trending POIs in category
   */
  async getTrendingByCategory(category, limit = 5) {
    if (!this.isInitialized) await this.initialize();

    try {
      // This would need POI category info - for now return general trending
      return this.getTrendingPois(limit);
    } catch (error) {
      logger.warn('Failed to get category trending:', error.message);
      return [];
    }
  }

  /**
   * Get proactive suggestions based on all context
   * @param {Object} context - { language, sessionId, userId, preferences }
   * @returns {Object} Comprehensive suggestions
   */
  async getProactiveSuggestions(context = {}) {
    const { language = 'nl', sessionId, userId, preferences, destinationId, destinationConfig } = context;
    const destName = destinationConfig?.destination?.name || 'Calpe';

    const timeSuggestions = this.getTimeSuggestions(language, destName);
    const seasonalSuggestions = this.getSeasonalSuggestions(language, destName);
    const trendingPois = await this.getTrendingPois(5, 7, destinationId);

    // Build quick actions based on time and context
    const quickActions = this.getQuickActions(timeSuggestions.period, language);

    // Build personalized suggestions if preferences available
    let personalizedCategories = [];
    if (preferences && !preferences.isDefault) {
      personalizedCategories = this.getPersonalizedCategories(preferences);
    }

    return {
      greeting: timeSuggestions.greeting,
      timeContext: {
        period: timeSuggestions.period,
        activities: timeSuggestions.activities,
        suggestedCategories: timeSuggestions.categories
      },
      seasonContext: {
        season: seasonalSuggestions.season,
        highlight: seasonalSuggestions.highlight,
        suggestedCategories: seasonalSuggestions.categories
      },
      trending: {
        pois: trendingPois,
        label: this.getTrendingLabel(language)
      },
      quickActions,
      personalizedCategories,
      tips: this.getContextualTips(timeSuggestions.period, seasonalSuggestions.season, language, destName)
    };
  }

  /**
   * Get quick action suggestions
   */
  getQuickActions(period, language) {
    const actions = {
      morning: {
        nl: [
          { action: 'find_breakfast', label: 'Ontbijt zoeken', icon: '☕' },
          { action: 'beach_info', label: 'Strandinfo', icon: '🏖️' },
          { action: 'weather', label: 'Weer vandaag', icon: '☀️' }
        ],
        en: [
          { action: 'find_breakfast', label: 'Find breakfast', icon: '☕' },
          { action: 'beach_info', label: 'Beach info', icon: '🏖️' },
          { action: 'weather', label: 'Today\'s weather', icon: '☀️' }
        ]
      },
      afternoon: {
        nl: [
          { action: 'find_lunch', label: 'Lunch zoeken', icon: '🍽️' },
          { action: 'activities', label: 'Activiteiten', icon: '🎯' },
          { action: 'sightseeing', label: 'Bezienswaardigheden', icon: '📸' }
        ],
        en: [
          { action: 'find_lunch', label: 'Find lunch', icon: '🍽️' },
          { action: 'activities', label: 'Activities', icon: '🎯' },
          { action: 'sightseeing', label: 'Sightseeing', icon: '📸' }
        ]
      },
      evening: {
        nl: [
          { action: 'find_dinner', label: 'Diner zoeken', icon: '🍷' },
          { action: 'sunset_spots', label: 'Zonsondergang', icon: '🌅' },
          { action: 'nightlife', label: 'Uitgaan', icon: '🎉' }
        ],
        en: [
          { action: 'find_dinner', label: 'Find dinner', icon: '🍷' },
          { action: 'sunset_spots', label: 'Sunset spots', icon: '🌅' },
          { action: 'nightlife', label: 'Nightlife', icon: '🎉' }
        ]
      },
      night: {
        nl: [
          { action: 'late_night_food', label: 'Laat eten', icon: '🌙' },
          { action: 'bars', label: 'Bars', icon: '🍸' },
          { action: 'tomorrow_plan', label: 'Plan morgen', icon: '📅' }
        ],
        en: [
          { action: 'late_night_food', label: 'Late night food', icon: '🌙' },
          { action: 'bars', label: 'Bars', icon: '🍸' },
          { action: 'tomorrow_plan', label: 'Plan tomorrow', icon: '📅' }
        ]
      }
    };

    return actions[period][language] || actions[period].en || actions.afternoon.en;
  }

  /**
   * Get personalized category order based on preferences
   */
  getPersonalizedCategories(preferences) {
    const categories = [
      { name: 'Beaches & Nature', score: preferences.categories?.beaches || 3 },
      { name: 'Food & Drinks', score: preferences.categories?.food || 3 },
      { name: 'Culture & History', score: preferences.categories?.culture || 3 },
      { name: 'Active', score: preferences.categories?.active || 3 },
      { name: 'Shopping', score: preferences.categories?.shopping || 3 },
      { name: 'Nightlife', score: preferences.categories?.nightlife || 3 }
    ];

    return categories.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  /**
   * Get trending label per language
   */
  getTrendingLabel(language) {
    const labels = {
      nl: 'Populair deze week',
      en: 'Popular this week',
      de: 'Beliebt diese Woche',
      es: 'Popular esta semana',
      sv: 'Populärt denna vecka',
      pl: 'Popularne w tym tygodniu'
    };
    return labels[language] || labels.en;
  }

  /**
   * Get contextual tips
   */
  getContextualTips(period, season, language, destName = 'Calpe') {
    const isTexel = destName === 'Texel';

    const tips = {
      nl: {
        morning: 'Tip: De stranden zijn het rustigst voor 10 uur!',
        afternoon: isTexel
          ? 'Tip: Maak een fietstocht over het eiland!'
          : 'Tip: Vermijd de middagzon en geniet van een siësta.',
        evening: 'Tip: Reserveer populaire restaurants vooraf.',
        night: 'Tip: Het centrum is veilig om te wandelen.',
        summer: isTexel
          ? 'Tip: Ook op Texel is het ruim 20 graden, smeer je goed in door de zilte lucht en zon!'
          : 'Tip: Breng voldoende water en zonnebrandcrème mee!',
        spring: isTexel
          ? 'Tip: Neem winddichte kleding mee, het kan flink waaien op Texel!'
          : null,
        autumn: isTexel
          ? 'Tip: Neem winddichte kleding mee, het kan flink waaien op Texel!'
          : null,
        winter: isTexel
          ? 'Tip: Flinke wind, woeste golven en prachtige luchten zorgen voor een indrukwekkend schouwspel!'
          : 'Tip: Geniet van de rust en lagere prijzen.'
      },
      en: {
        morning: 'Tip: Beaches are quietest before 10 AM!',
        afternoon: isTexel
          ? 'Tip: Take a cycling tour across the island!'
          : 'Tip: Avoid the midday sun and enjoy a siesta.',
        evening: 'Tip: Book popular restaurants in advance.',
        night: 'Tip: The center is safe to walk around.',
        summer: isTexel
          ? 'Tip: Temperatures on Texel reach 20+ degrees, apply sunscreen due to the salty air and sun!'
          : 'Tip: Bring plenty of water and sunscreen!',
        spring: isTexel
          ? 'Tip: Bring windproof clothing, it can be quite windy on Texel!'
          : null,
        autumn: isTexel
          ? 'Tip: Bring windproof clothing, it can be quite windy on Texel!'
          : null,
        winter: isTexel
          ? 'Tip: Strong winds, wild waves and beautiful skies make for an impressive spectacle!'
          : 'Tip: Enjoy the peace and lower prices.'
      },
      de: {
        morning: 'Tipp: Strände sind vor 10 Uhr am ruhigsten!',
        afternoon: isTexel
          ? 'Tipp: Machen Sie eine Radtour über die Insel!'
          : 'Tipp: Vermeiden Sie die Mittagssonne und genießen Sie eine Siesta.',
        evening: 'Tipp: Reservieren Sie beliebte Restaurants im Voraus.',
        night: 'Tipp: Das Zentrum ist sicher zum Spazierengehen.',
        summer: isTexel
          ? 'Tipp: Auch auf Texel wird es über 20 Grad, cremen Sie sich wegen der salzigen Luft und Sonne gut ein!'
          : 'Tipp: Bringen Sie ausreichend Wasser und Sonnencreme mit!',
        spring: isTexel
          ? 'Tipp: Nehmen Sie winddichte Kleidung mit, auf Texel kann es kräftig wehen!'
          : null,
        autumn: isTexel
          ? 'Tipp: Nehmen Sie winddichte Kleidung mit, auf Texel kann es kräftig wehen!'
          : null,
        winter: isTexel
          ? 'Tipp: Kräftiger Wind, wilde Wellen und wunderschöne Himmel bieten ein beeindruckendes Schauspiel!'
          : 'Tipp: Genießen Sie die Ruhe und niedrigere Preise.'
      }
    };

    const langTips = tips[language] || tips.en;
    return [langTips[period], langTips[season]].filter(Boolean);
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized;
  }
}

export const suggestionService = new SuggestionService();
export default suggestionService;
