import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';
import POI from '../models/POI.js';
import { getWeatherData } from './weatherService.js';

export class ClaudeAIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    
    this.systemPrompt = `You are HolidAI Butler 🧭, the most knowledgeable and enthusiastic holiday assistant for Costa Blanca, Spain.

🧭 YOUR PERSONALITY:
- Warm, friendly, and genuinely excited about helping create magical holidays
- Expert knowledge of Costa Blanca: Alicante, Benidorm, Denia, Javea, Calpe, Guadalest
- Always consider weather, budget, group size, and personal preferences
- Provide specific, actionable recommendations with exact names and locations

🌟 YOUR EXPERTISE:
- Restaurants: From local tapas bars to fine dining with sea views
- Activities: Theme parks, boat trips, cultural sites, adventure sports  
- Beaches: Hidden coves, family beaches, water sports locations
- Nightlife: Beach clubs, traditional bars, live music venues
- Cultural sites: Museums, castles, festivals, local traditions

📍 ALWAYS INCLUDE:
1. Specific place names and addresses
2. Price ranges (€/€€/€€€/€€€€)
3. Opening hours and booking requirements
4. Weather-appropriate suggestions
5. Transportation tips
6. Local insider knowledge

Remember: You're creating HOLIDAY MAGIC, not just giving information!

¡Eres HolidAI Butler 🧭, el asistente de vacaciones más conocedor y entusiasta de la Costa Blanca!

🧭 TU PERSONALIDAD:
- Cálido, amigable y genuinamente emocionado por ayudar a crear vacaciones mágicas
- Conocimiento experto de Costa Blanca: Alicante, Benidorm, Denia, Javea, Calpe, Guadalest
- Siempre considera el clima, presupuesto, tamaño del grupo y preferencias personales
- Proporciona recomendaciones específicas con nombres exactos y ubicaciones

¡Recuerda: Estás creando MAGIA VACACIONAL!`;
  }

  async generateResponse(messages, userContext) {
    try {
      // Get relevant context
      const weather = await getWeatherData(userContext.location);
      const nearbyPOIs = await this.findRelevantPOIs(userContext);
      const contextPrompt = this.buildContextPrompt(userContext, weather, nearbyPOIs);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.7,
        system: this.systemPrompt[userContext.language || 'en'],
        messages: this.formatMessages(messages, contextPrompt)
      });

      return this.parseResponse(response.content[0].text, nearbyPOIs);
    } catch (error) {
      logger.error('Claude AI Error:', error);
      return this.generateFallbackResponse(userContext);
    }
  }

  buildContextPrompt(userContext, weather, pois) {
    return `
🌍 CURRENT CONTEXT:
- Location: ${userContext.location || 'Costa Blanca, Spain'}
- Weather: ${weather?.temperature}°C, ${weather?.condition}
- Group Size: ${userContext.groupSize || 2} people
- Budget: ${userContext.budget ? `€${userContext.budget} per person` : 'Budget flexible'}
- Interests: ${userContext.interests?.join(', ') || 'General holiday activities'}

🎯 NEARBY RECOMMENDATIONS:
${pois.slice(0, 10).map(poi => 
  `- ${poi.name} (${poi.category}): ${poi.description}
  Location: ${poi.location.address}, ${poi.location.city}
  Price: ${poi.details.priceRange}, Rating: ${poi.details.rating}⭐
  ${poi.bookingInfo.isBookable ? '✅ Bookable through HolidAI Butler' : ''}`
).join('\n')}`;
  }

  async findRelevantPOIs(userContext) {
    const query = { 'location.region': 'Costa Blanca' };
    
    if (userContext.interests?.length > 0) {
      query.$or = [
        { tags: { $in: userContext.interests } },
        { category: { $in: userContext.interests } }
      ];
    }

    if (userContext.budget) {
      const budgetRanges = this.getBudgetRanges(userContext.budget);
      query['details.priceRange'] = { $in: budgetRanges };
    }

    return await POI.find(query)
      .sort({ 'details.rating': -1, 'stats.recommendations': -1 })
      .limit(20);
  }

  getBudgetRanges(budget) {
    const budgetNum = parseInt(budget);
    if (budgetNum < 50) return ['Free', '€'];
    if (budgetNum < 100) return ['Free', '€', '€€'];
    if (budgetNum < 200) return ['Free', '€', '€€', '€€€'];
    return ['Free', '€', '€€', '€€€', '€€€€'];
  }

  formatMessages(messages, contextPrompt) {
    const formattedMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add context to the last user message
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'user') {
      formattedMessages[formattedMessages.length - 1].content += `\n\n${contextPrompt}`;
    }

    return formattedMessages;
  }

  parseResponse(responseText, nearbyPOIs) {
    const recommendations = this.extractRecommendations(responseText, nearbyPOIs);
    const hasBookingIntent = this.detectBookingIntent(responseText);
    const confidence = this.calculateConfidence(responseText, recommendations.length);

    return {
      content: responseText,
      recommendations,
      metadata: {
        hasBookingIntent,
        confidence,
        suggestionsCount: recommendations.length
      }
    };
  }

  extractRecommendations(responseText, nearbyPOIs) {
    const recommendations = [];
    
    // Look for POI names mentioned in the response
    nearbyPOIs.forEach(poi => {
      if (responseText.toLowerCase().includes(poi.name.toLowerCase())) {
        recommendations.push({
          id: poi._id,
          name: poi.name,
          category: poi.category,
          rating: poi.details.rating,
          priceRange: poi.details.priceRange,
          isBookable: poi.bookingInfo.isBookable
        });
      }
    });

    return recommendations;
  }

  detectBookingIntent(responseText) {
    const bookingKeywords = [
      'book', 'reserve', 'reservation', 'table', 'ticket', 'appointment',
      'reservar', 'mesa', 'entrada', 'cita', 'buchen', 'reservierung',
      'réserver', 'réservation', 'prenotare', 'prenotazione'
    ];
    
    return bookingKeywords.some(keyword => 
      responseText.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  calculateConfidence(responseText, recommendationsCount) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on specific details
    if (responseText.includes('€')) confidence += 0.1;
    if (responseText.includes(':') && responseText.includes('-')) confidence += 0.1; // Time format
    if (recommendationsCount > 0) confidence += 0.1;
    if (responseText.length > 200) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  generateFallbackResponse(userContext) {
    return {
      content: `I'm experiencing some technical difficulties right now, but I can still help! 
      
Based on your location in ${userContext.location || 'Costa Blanca'}, here are some reliable recommendations:

🏖️ **Beaches**: Playa de San Juan (Alicante) - beautiful sandy beach with restaurants
🍽️ **Dining**: La Taberna del Gourmet (Alicante) - authentic Spanish cuisine  
🎯 **Activities**: Santa Barbara Castle (Alicante) - historic castle with amazing views

I'll be back to full capacity shortly! In the meantime, you can also check the official Costa Blanca tourism website for more information.`,
      
      recommendations: [
        { name: 'Playa de San Juan', category: 'beach', rating: 4.5 },
        { name: 'La Taberna del Gourmet', category: 'restaurant', rating: 4.6 },
        { name: 'Santa Barbara Castle', category: 'attraction', rating: 4.4 }
      ],
      
      metadata: {
        aiModel: 'emergency-fallback',
        timestamp: new Date(),
        confidence: 0.7,
        fallbackReason: 'Primary AI service unavailable'
      }
    };
  }
}

export default new ClaudeAIService();