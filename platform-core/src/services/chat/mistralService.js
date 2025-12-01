/**
 * Mistral AI Service
 * Integration with Mistral AI for HoliBot chat functionality
 */

import logger from '../../utils/logger.js';

class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
    this.model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    this.configured = !!this.apiKey;

    if (!this.configured) {
      logger.warn('Mistral AI not configured - chat will use fallback responses');
    }
  }

  /**
   * Check if Mistral AI is configured
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Generate chat response using Mistral AI
   * @param {string} message - User message
   * @param {Array} conversationHistory - Previous messages
   * @param {Object} userPreferences - User preferences for personalization
   */
  async chat(message, conversationHistory = [], userPreferences = {}) {
    if (!this.configured) {
      return this.getFallbackResponse(message, userPreferences);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(userPreferences);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: message }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Mistral API error:', { status: response.status, error });
        return this.getFallbackResponse(message, userPreferences);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        logger.warn('Empty response from Mistral AI');
        return this.getFallbackResponse(message, userPreferences);
      }

      logger.info('Mistral AI response generated', {
        messageLength: message.length,
        responseLength: aiResponse.length
      });

      return {
        message: aiResponse,
        source: 'mistral',
        model: this.model
      };

    } catch (error) {
      logger.error('Mistral AI chat error:', error);
      return this.getFallbackResponse(message, userPreferences);
    }
  }

  /**
   * Build system prompt with context about Calpe
   */
  buildSystemPrompt(userPreferences = {}) {
    let prompt = `Je bent HoliBot, een vriendelijke en enthousiaste lokale gids voor Calpe, Spanje.
Je helpt toeristen en bezoekers met informatie over:
- Stranden en natuur (Penyal d'Ifac, Playa Arenal-Bol, etc.)
- Restaurants en eetgelegenheden
- Historische bezienswaardigheden
- Activiteiten en recreatie
- Winkelen en markten
- Nachtleven en uitgaan

Richtlijnen:
- Wees altijd vriendelijk en behulpzaam
- Geef concrete, bruikbare informatie
- Vermeld adressen en locaties wanneer relevant
- Pas je taal aan op de voorkeurstaal van de gebruiker
- Houd antwoorden beknopt maar informatief (max 150 woorden)
- Gebruik emoji's spaarzaam maar effectief`;

    if (userPreferences.language) {
      prompt += `\n- Antwoord in het ${userPreferences.language}`;
    }

    if (userPreferences.interests) {
      prompt += `\n- De gebruiker is geïnteresseerd in: ${userPreferences.interests.join(', ')}`;
    }

    if (userPreferences.travelCompanion) {
      prompt += `\n- De gebruiker reist met: ${userPreferences.travelCompanion}`;
    }

    return prompt;
  }

  /**
   * Generate fallback response when AI is unavailable
   */
  getFallbackResponse(message, userPreferences = {}) {
    const messageLower = message.toLowerCase();

    // Simple keyword-based responses
    if (messageLower.includes('strand') || messageLower.includes('beach')) {
      return {
        message: '🏖️ Calpe heeft prachtige stranden! De bekendste zijn Playa Arenal-Bol (het hoofdstrand met gouden zand) en Playa de la Fossa (rustig en gezinsvriendelijk). Het Penyal d\'Ifac natuurreservaat is ook een must-see voor natuurliefhebbers!',
        source: 'fallback',
        suggestions: ['Meer over Penyal d\'Ifac', 'Restaurants bij het strand', 'Wateractiviteiten']
      };
    }

    if (messageLower.includes('restaurant') || messageLower.includes('eten') || messageLower.includes('food')) {
      return {
        message: '🍽️ Calpe staat bekend om zijn heerlijke Mediterrane keuken! Je vindt hier uitstekende visrestaurants langs de haven, tapas bars in het oude centrum, en internationale restaurants langs de boulevard. Wil je specifieke aanbevelingen per type keuken?',
        source: 'fallback',
        suggestions: ['Vis restaurants', 'Tapas bars', 'Vegetarische opties']
      };
    }

    if (messageLower.includes('beziensw') || messageLower.includes('museum') || messageLower.includes('history')) {
      return {
        message: '🏛️ Ontdek de rijke geschiedenis van Calpe! Bezoek het Museo del Coleccionismo in het oude centrum, de oude stadsmuren, en de iconische Penyal d\'Ifac - een 332 meter hoge rots met wandelroutes. De Baños de la Reina (Romeinse ruïnes) zijn ook zeer de moeite waard!',
        source: 'fallback',
        suggestions: ['Wandelroutes', 'Romeinse ruïnes', 'Oude centrum']
      };
    }

    if (messageLower.includes('activiteit') || messageLower.includes('activ') || messageLower.includes('sport')) {
      return {
        message: '🎯 Er is van alles te doen in Calpe! Van watersport (duiken, kajakken, SUP) tot wandelen op de Penyal d\'Ifac, fietsen langs de kust, of golf spelen. Voor gezinnen zijn er ook pretparken en waterparken in de buurt!',
        source: 'fallback',
        suggestions: ['Watersport', 'Wandelroutes', 'Gezinsactiviteiten']
      };
    }

    // Default response
    return {
      message: '👋 Hallo! Ik ben HoliBot, je persoonlijke gids voor Calpe! Ik help je graag met informatie over stranden, restaurants, bezienswaardigheden en activiteiten. Waar ben je naar op zoek?',
      source: 'fallback',
      suggestions: ['Beste stranden', 'Restaurants', 'Bezienswaardigheden', 'Activiteiten']
    };
  }
}

export const mistralService = new MistralService();
export default mistralService;
