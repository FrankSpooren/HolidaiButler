/**
 * Mistral AI Service (ES Module)
 * Integration with Mistral AI API for HoliBot chat functionality
 */

import logger from '../utils/logger.js';

class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    this.apiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';

    if (!this.apiKey) {
      logger.warn('Mistral API key not configured - chat will use fallback responses');
    } else {
      logger.info('Mistral service initialized', { model: this.model });
    }
  }

  /**
   * Generate chat completion with Mistral AI
   * @param {string} message - User message
   * @param {Array} conversationHistory - Previous messages
   * @param {Object} userPreferences - User preferences (personality, location, etc.)
   * @returns {Promise<Object>} - Chat response
   */
  async chat(message, conversationHistory = [], userPreferences = {}) {
    if (!this.apiKey) {
      return this._getFallbackResponse(message);
    }

    try {
      // Build system prompt with Calpe context
      const systemPrompt = this._buildSystemPrompt(userPreferences);

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      // Call Mistral API
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.95
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Mistral API error:', { status: response.status, error });
        return this._getFallbackResponse(message);
      }

      const data = await response.json();

      logger.info('Mistral AI response generated', {
        model: this.model,
        tokens: data.usage?.total_tokens
      });

      return {
        message: data.choices[0].message.content,
        conversationId: this._generateConversationId(),
        model: this.model,
        status: 'success'
      };

    } catch (error) {
      logger.error('Mistral chat error:', error);
      return this._getFallbackResponse(message);
    }
  }

  /**
   * Build system prompt with Calpe tourism context
   * @private
   */
  _buildSystemPrompt(userPreferences) {
    const basePrompt = `Je bent HoliBot, een vriendelijke en behulpzame AI reisassistent voor Calpe, Spanje.

Je expertise:
- Calpe toerisme (stranden, restaurants, activiteiten, bezienswaardigheden)
- 1.593 POI's (Points of Interest) in de database
- Categorieën: Active, Beaches & Nature, Culture & History, Recreation, Food & Drinks, Health & Wellbeing, Shopping, Practical
- Lokale tips, wegbeschrijvingen, openingstijden
- Gepersonaliseerde aanbevelingen

Je stijl:
- Vriendelijk en gastvrij (als een lokale gids)
- Beknopt maar informatief (max 3-4 zinnen per antwoord)
- Gebruik emoji's 🏖️🍽️🎯 waar passend
- Geef concrete POI-aanbevelingen met namen
- Eindig met een follow-up vraag

Beperkingen:
- Alleen informatie over Calpe en directe omgeving
- Geen boekingen of reserveringen
- Verwijs naar officiële websites voor actuele info`;

    // Add personality context if available
    if (userPreferences.personality) {
      const personalityContext = {
        cognitive: 'De gebruiker is geïnteresseerd in cultuur, geschiedenis en intellectuele activiteiten.',
        physical: 'De gebruiker houdt van actieve buitenactiviteiten en sport.',
        social: 'De gebruiker geniet van sociale activiteiten, eten en entertainment.'
      };

      return `${basePrompt}\n\nGebruikersprofiel:\n${personalityContext[userPreferences.personality] || ''}`;
    }

    return basePrompt;
  }

  /**
   * Generate fallback response when API is unavailable
   * @private
   */
  _getFallbackResponse(message) {
    logger.info('Using fallback response for chat');

    // Detect intent from message
    const messageLower = message.toLowerCase();

    if (messageLower.includes('strand') || messageLower.includes('beach')) {
      return {
        message: `🏖️ Calpe heeft prachtige stranden! De bekendste zijn:
• Playa Arenal-Bol (hoofdstrand)
• Playa La Fossa (rustig en familie-vriendelijk)
• Cala El Racó (klein en pittoresk)

Welk type strand zoek je? Druk of rustig?`,
        status: 'fallback'
      };
    }

    if (messageLower.includes('restaurant') || messageLower.includes('eten') || messageLower.includes('food')) {
      return {
        message: `🍽️ Calpe staat bekend om zijn uitstekende vis en zeevruchten!

Zoek je:
• Traditioneel Spaanse keuken
• Mediterrane fijne restaurants
• Casual tapas bars

Wat is je voorkeur?`,
        status: 'fallback'
      };
    }

    if (messageLower.includes('activiteit') || messageLower.includes('wat te doen') || messageLower.includes('activity')) {
      return {
        message: `🎯 In Calpe is er genoeg te doen!

Populaire activiteiten:
• Beklim de Penyal d'Ifac (iconische rots)
• Watersport (kayak, SUP, snorkelen)
• Wandelen langs de kustpromenades
• Bezoek de oude stad & markten

Waar heb je zin in?`,
        status: 'fallback'
      };
    }

    // Generic fallback
    return {
      message: `Hallo! Ik ben HoliBot, je AI gids voor Calpe. 🌍

Ik kan je helpen met:
• 🏖️ Stranden & Natuur
• 🍽️ Restaurants & Eten
• 🎯 Activiteiten & Bezienswaardigheden
• 🗺️ Wegbeschrijvingen & Tips

Waar kan ik je mee helpen vandaag?`,
      status: 'fallback'
    };
  }

  /**
   * Generate unique conversation ID
   * @private
   */
  _generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if Mistral API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

// Singleton instance
const mistralService = new MistralService();

export default mistralService;
