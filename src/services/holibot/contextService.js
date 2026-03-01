/**
 * Context Service v1.0 — Fase II Blok A.2
 *
 * Provides temporal, location, and session context for the chatbot.
 * Injected into the RAG system prompt before Mistral LLM calls.
 *
 * Features:
 * - Time-of-day awareness (morning/afternoon/evening/night)
 * - Day of week + date
 * - Season detection
 * - Weekend detection
 * - Location context per destination
 * - Session history tracking (POIs discussed, categories shown)
 * - GDPR-compliant (no personal data stored)
 */
import logger from "../../utils/logger.js";

class ContextService {
  constructor() {
    // Session context cache: sessionId -> { mentionedPois, mentionedCategories, turnCount, topic }
    this.sessionContexts = new Map();
    this.SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

    // Start cleanup interval
    this._cleanupTimer = setInterval(() => this._cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Build complete context object for a chat request.
   * @param {string} sessionId
   * @param {number} destinationId
   * @param {object} destinationConfig - Full destination config object
   * @param {string} language
   * @returns {object} Context object with temporal, location, and session data
   */
  buildContext(sessionId, destinationId, destinationConfig, language = 'nl') {
    const timezone = destinationConfig?.destination?.timezone || 'Europe/Amsterdam';
    const now = new Date();

    // Get local time for the destination
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localTime.getHours();
    const dayOfWeek = localTime.getDay(); // 0=Sunday
    const month = localTime.getMonth() + 1;

    const temporal = {
      period: this._getTimePeriod(hour),
      hour,
      dayOfWeek: this._getDayName(dayOfWeek, language),
      dayNumber: dayOfWeek,
      date: this._formatDate(localTime, language),
      season: this._getSeason(month),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      month
    };

    const location = this._getLocationContext(destinationId, destinationConfig, language);
    const session = this._getSessionContext(sessionId);

    return { temporal, location, session };
  }

  /**
   * Build a context string to inject into the system prompt.
   * @param {object} context - Output from buildContext()
   * @param {string} language
   * @returns {string} Context block for the system prompt
   */
  buildPromptContext(context, language = 'nl') {
    const { temporal, location, session } = context;
    const lines = [];

    // Temporal context
    if (language === 'nl') {
      lines.push('HUIDIGE CONTEXT:');
      lines.push(`- Het is nu ${temporal.dayOfWeek} ${temporal.date}, ${this._getPeriodLabel(temporal.period, 'nl')} (${temporal.hour}:00 lokale tijd)`);
      lines.push(`- Seizoen: ${this._getSeasonLabel(temporal.season, 'nl')}`);
      if (temporal.isWeekend) lines.push('- Het is weekend — meer mensen zijn vrij, restaurants en activiteiten zijn drukker');
    } else if (language === 'de') {
      lines.push('AKTUELLER KONTEXT:');
      lines.push(`- Es ist jetzt ${temporal.dayOfWeek} ${temporal.date}, ${this._getPeriodLabel(temporal.period, 'de')} (${temporal.hour}:00 Ortszeit)`);
      lines.push(`- Jahreszeit: ${this._getSeasonLabel(temporal.season, 'de')}`);
      if (temporal.isWeekend) lines.push('- Es ist Wochenende — mehr Besucher, Restaurants und Aktivitaten sind belebter');
    } else if (language === 'es') {
      lines.push('CONTEXTO ACTUAL:');
      lines.push(`- Es ${temporal.dayOfWeek} ${temporal.date}, ${this._getPeriodLabel(temporal.period, 'es')} (${temporal.hour}:00 hora local)`);
      lines.push(`- Estacion: ${this._getSeasonLabel(temporal.season, 'es')}`);
      if (temporal.isWeekend) lines.push('- Es fin de semana — mas visitantes, restaurantes y actividades estan mas concurridos');
    } else {
      // English (default)
      lines.push('CURRENT CONTEXT:');
      lines.push(`- It is now ${temporal.dayOfWeek} ${temporal.date}, ${this._getPeriodLabel(temporal.period, 'en')} (${temporal.hour}:00 local time)`);
      lines.push(`- Season: ${this._getSeasonLabel(temporal.season, 'en')}`);
      if (temporal.isWeekend) lines.push('- It is the weekend — more visitors around, restaurants and activities are busier');
    }

    // Location context
    if (location.tips) {
      lines.push('');
      lines.push(location.tips);
    }

    // Time-appropriate recommendation hints
    lines.push('');
    lines.push(this._getRecommendationHints(temporal, language));

    // Session awareness (avoid repetition)
    if (session.mentionedPois.length > 0) {
      const poiList = session.mentionedPois.slice(-5).join(', ');
      if (language === 'nl') {
        lines.push(`\nAL BESPROKEN POIs in deze sessie (vermijd herhaling): ${poiList}`);
      } else if (language === 'de') {
        lines.push(`\nBEREITS BESPROCHENE POIs in dieser Sitzung (Wiederholung vermeiden): ${poiList}`);
      } else if (language === 'es') {
        lines.push(`\nPOIs YA DISCUTIDOS en esta sesion (evitar repeticion): ${poiList}`);
      } else {
        lines.push(`\nALREADY DISCUSSED POIs in this session (avoid repetition): ${poiList}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Track POIs mentioned in an assistant response for session awareness.
   * @param {string} sessionId
   * @param {Array} poiNames - Names of POIs mentioned
   * @param {Array} categories - Categories of those POIs
   */
  trackMentionedPois(sessionId, poiNames = [], categories = []) {
    if (!sessionId) return;
    const ctx = this._getOrCreateSessionContext(sessionId);
    for (const name of poiNames) {
      if (name && !ctx.mentionedPois.includes(name)) {
        ctx.mentionedPois.push(name);
      }
    }
    for (const cat of categories) {
      if (cat && !ctx.mentionedCategories.includes(cat)) {
        ctx.mentionedCategories.push(cat);
      }
    }
    ctx.turnCount++;
    ctx.lastAccess = Date.now();
  }

  /**
   * Track the current conversation topic.
   * @param {string} sessionId
   * @param {string} topic
   */
  trackTopic(sessionId, topic) {
    if (!sessionId || !topic) return;
    const ctx = this._getOrCreateSessionContext(sessionId);
    ctx.topic = topic;
    ctx.lastAccess = Date.now();
  }

  // --- Private: Time helpers ---

  _getTimePeriod(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  _getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  _getDayName(dayNumber, language) {
    const days = {
      nl: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      es: ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    };
    return (days[language] || days.en)[dayNumber];
  }

  _formatDate(date, language) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthNames = {
      nl: ['', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
      en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      de: ['', 'Januar', 'Februar', 'Marz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      es: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    };
    const names = monthNames[language] || monthNames.en;
    return `${day} ${names[month]} ${year}`;
  }

  _getPeriodLabel(period, language) {
    const labels = {
      nl: { morning: 'ochtend', afternoon: 'middag', evening: 'avond', night: 'nacht' },
      en: { morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'night' },
      de: { morning: 'Morgen', afternoon: 'Nachmittag', evening: 'Abend', night: 'Nacht' },
      es: { morning: 'manana', afternoon: 'tarde', evening: 'noche', night: 'noche' }
    };
    return (labels[language] || labels.en)[period];
  }

  _getSeasonLabel(season, language) {
    const labels = {
      nl: { spring: 'lente', summer: 'zomer', autumn: 'herfst', winter: 'winter' },
      en: { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' },
      de: { spring: 'Fruhling', summer: 'Sommer', autumn: 'Herbst', winter: 'Winter' },
      es: { spring: 'primavera', summer: 'verano', autumn: 'otono', winter: 'invierno' }
    };
    return (labels[language] || labels.en)[season];
  }

  // --- Private: Location context ---

  _getLocationContext(destinationId, destinationConfig, language) {
    const destName = destinationConfig?.destination?.name || 'Unknown';
    const destCode = destinationConfig?.destination?.code || 'calpe';

    const contexts = {
      texel: {
        nl: 'LOCATIE: Texel — een Waddeneiland, bereikbaar per veerboot (TESO). Het weer kan snel veranderen. Veel buitenactiviteiten zijn wind- en weersafhankelijk.',
        en: 'LOCATION: Texel — a Wadden island, accessible by ferry (TESO). Weather can change quickly. Many outdoor activities are weather-dependent.',
        de: 'STANDORT: Texel — eine Watteninsel, erreichbar per Fahre (TESO). Das Wetter kann sich schnell andern. Viele Aktivitaten im Freien sind wetterabhangig.'
      },
      calpe: {
        nl: 'LOCATIE: Calpe — een kuststad aan de Costa Blanca, Spanje. Mediterraan klimaat met veel zon. Bekend om de Penon de Ifach en stranden.',
        en: 'LOCATION: Calpe — a coastal town on the Costa Blanca, Spain. Mediterranean climate with plenty of sunshine. Known for the Penon de Ifach and beaches.',
        de: 'STANDORT: Calpe — eine Kustenstadt an der Costa Blanca, Spanien. Mediterranes Klima mit viel Sonne. Bekannt fur den Penon de Ifach und Strande.',
        es: 'UBICACION: Calpe — ciudad costera en la Costa Blanca, Espana. Clima mediterraneo con mucho sol. Conocida por el Penon de Ifach y sus playas.'
      }
    };

    const ctx = contexts[destCode] || contexts.calpe;
    return {
      name: destName,
      code: destCode,
      tips: ctx[language] || ctx.en || ''
    };
  }

  // --- Private: Recommendation hints ---

  _getRecommendationHints(temporal, language) {
    const { period, season } = temporal;

    const hints = {
      nl: {
        morning: {
          summer: 'AANBEVELING: Ochtend in de zomer — ideaal voor strandbezoek vroeg (rustig voor 10u), fietsen, of ontbijt op een terras.',
          winter: 'AANBEVELING: Ochtend in de winter — goed moment voor musea, galeries, of een stevig ontbijt bij een cafe.',
          spring: 'AANBEVELING: Ochtend in de lente — perfect weer voor wandelen, fietsen, of natuurgebieden verkennen.',
          autumn: 'AANBEVELING: Ochtend in de herfst — mooi licht voor fotografie, wandelen, of een bezoek aan lokale producenten.'
        },
        afternoon: {
          summer: 'AANBEVELING: Middag in de zomer — strandtijd, watersport, of een ijsje bij een strandpaviljoen.',
          winter: 'AANBEVELING: Middag in de winter — bezoek binnenattracties, winkelen, of warm worden bij een restaurant.',
          spring: 'AANBEVELING: Middag in de lente — terrasjes, wandelen, of fietsen langs de kust.',
          autumn: 'AANBEVELING: Middag in de herfst — culturele bezienswaardigheden, lokale markten, of natuur.'
        },
        evening: {
          summer: 'AANBEVELING: Avond in de zomer — dineren op een terras, zonsondergang kijken, of avondwandeling.',
          winter: 'AANBEVELING: Avond in de winter — gezellig uit eten, lokale specialiteiten proeven.',
          spring: 'AANBEVELING: Avond in de lente — restaurant bezoeken, wandeling bij zonsondergang.',
          autumn: 'AANBEVELING: Avond in de herfst — seizoensgerechten proeven, gezellig dineren.'
        },
        night: {
          summer: 'AANBEVELING: Nacht — restaurants en bars kunnen nog open zijn in het hoogseizoen.',
          winter: 'AANBEVELING: Nacht — de meeste zaken zijn gesloten. Morgenochtend kun je weer op pad!',
          spring: 'AANBEVELING: Nacht — het wordt rustiger. Een goed moment om plannen te maken voor morgen.',
          autumn: 'AANBEVELING: Nacht — het is al laat. Morgen is er weer genoeg te beleven!'
        }
      },
      en: {
        morning: {
          summer: 'RECOMMENDATION: Summer morning — ideal for an early beach visit (quiet before 10 AM), cycling, or breakfast on a terrace.',
          winter: 'RECOMMENDATION: Winter morning — great time for museums, galleries, or a hearty breakfast at a cafe.',
          spring: 'RECOMMENDATION: Spring morning — perfect weather for hiking, cycling, or exploring nature reserves.',
          autumn: 'RECOMMENDATION: Autumn morning — beautiful light for photography, walking, or visiting local producers.'
        },
        afternoon: {
          summer: 'RECOMMENDATION: Summer afternoon — beach time, water sports, or ice cream at a beach pavilion.',
          winter: 'RECOMMENDATION: Winter afternoon — visit indoor attractions, shopping, or warm up at a restaurant.',
          spring: 'RECOMMENDATION: Spring afternoon — terraces, walking, or cycling along the coast.',
          autumn: 'RECOMMENDATION: Autumn afternoon — cultural sights, local markets, or nature walks.'
        },
        evening: {
          summer: 'RECOMMENDATION: Summer evening — dine on a terrace, watch the sunset, or take an evening walk.',
          winter: 'RECOMMENDATION: Winter evening — cosy dinner, try local specialities.',
          spring: 'RECOMMENDATION: Spring evening — visit a restaurant, sunset walk.',
          autumn: 'RECOMMENDATION: Autumn evening — try seasonal dishes, enjoy a cosy dinner.'
        },
        night: {
          summer: 'RECOMMENDATION: Night — restaurants and bars may still be open during high season.',
          winter: 'RECOMMENDATION: Night — most places are closed. Tomorrow morning awaits!',
          spring: 'RECOMMENDATION: Night — it is getting quiet. A good moment to plan tomorrow.',
          autumn: 'RECOMMENDATION: Night — it is late. Plenty to explore again tomorrow!'
        }
      }
    };

    const langHints = hints[language] || hints.en;
    const periodHints = langHints[period] || langHints.morning;
    return periodHints[season] || periodHints.summer;
  }

  // --- Private: Session context ---

  _getOrCreateSessionContext(sessionId) {
    if (!this.sessionContexts.has(sessionId)) {
      this.sessionContexts.set(sessionId, {
        mentionedPois: [],
        mentionedCategories: [],
        turnCount: 0,
        topic: null,
        lastAccess: Date.now()
      });
    }
    const ctx = this.sessionContexts.get(sessionId);
    ctx.lastAccess = Date.now();
    return ctx;
  }

  _getSessionContext(sessionId) {
    if (!sessionId || !this.sessionContexts.has(sessionId)) {
      return { mentionedPois: [], mentionedCategories: [], turnCount: 0, topic: null };
    }
    return this.sessionContexts.get(sessionId);
  }

  _cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [id, ctx] of this.sessionContexts) {
      if (now - ctx.lastAccess > this.SESSION_TTL) {
        this.sessionContexts.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`ContextService: cleaned up ${removed} expired sessions`);
    }
  }

  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

export const contextService = new ContextService();
export default contextService;
