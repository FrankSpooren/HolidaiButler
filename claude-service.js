/**
 * HolidAIButler - Claude AI Service
 * Backend service for Claude API integration
 */

const Anthropic = require('@anthropic-ai/sdk');
const CacheService = require('./CacheService');
const POIService = require('./POIService');
const WeatherService = require('./WeatherService');
const logger = require('../utils/logger');

class ClaudeService {
  constructor() {
    this.client = null;
    this.rateLimitCounter = 0;
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitMax = 50; // 50 requests per minute
    this.lastReset = Date.now();
  }

  /**
   * Initialize Claude service
   */
  async initialize() {
    try {
      if (!process.env.CLAUDE_API_KEY) {
        throw new Error('CLAUDE_API_KEY environment variable is required');
      }

      this.client = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
      });

      // Test connection
      await this.healthCheck();
      logger.info('Claude service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Claude service:', error);
      throw error;
    }
  }

  /**
   * Process chat message with Claude AI
   */
  async processMessage(messageData) {
    const startTime = Date.now();
    
    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const { message, context, conversation, userPreferences, location } = messageData;

      // Check cache first
      const cacheKey = this.generateCacheKey(message, context);
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached response');
        return {
          ...cached,
          cached: true,
          processingTime: Date.now() - startTime,
        };
      }

      // Get enhanced context
      const enhancedContext = await this.buildEnhancedContext(location, userPreferences);
      
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(enhancedContext);
      
      // Prepare messages for Claude
      const messages = this.formatMessagesForClaude(conversation, message);

      // Call Claude API
      const response = await this.client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages,
      });

      // Process Claude response
      const processedResponse = await this.processClaudeResponse(response, location);
      
      // Cache successful response
      await CacheService.set(cacheKey, processedResponse, 3600); // 1 hour cache
      
      // Update rate limit
      this.updateRateLimit();

      // Log metrics
      const processingTime = Date.now() - startTime;
      logger.info(`Claude response generated in ${processingTime}ms`);

      return {
        ...processedResponse,
        cached: false,
        processingTime,
      };

    } catch (error) {
      logger.error('Claude service error:', error);
      
      // Try to return a fallback response
      return this.generateFallbackResponse(messageData, Date.now() - startTime);
    }
  }

  /**
   * Build enhanced context with real-time data
   */
  async buildEnhancedContext(location, userPreferences) {
    const context = {
      location: location || { name: 'Costa Blanca, Spain' },
      preferences: userPreferences || {},
      timestamp: new Date(),
    };

    try {
      // Get weather data if location is provided
      if (location?.latitude && location?.longitude) {
        context.weather = await WeatherService.getCurrentWeather(
          location.latitude, 
          location.longitude
        );
      }

      // Get nearby POIs
      if (location?.latitude && location?.longitude) {
        context.nearbyPOIs = await POIService.getNearbyPOIs(
          location.latitude,
          location.longitude,
          5000 // 5km radius
        );
      }

      // Get time-specific context
      context.timeContext = this.getTimeContext();
      
      return context;
    } catch (error) {
      logger.warn('Failed to build enhanced context:', error);
      return context;
    }
  }

  /**
   * Build system prompt for Claude
   */
  buildSystemPrompt(context) {
    const { location, preferences, weather, nearbyPOIs, timeContext } = context;

    return `You are HolidAI Butler 🧭, the most knowledgeable and enthusiastic holiday assistant for Costa Blanca, Spain.

PERSONALITY:
- Warm, friendly, and genuinely excited about helping create magical holidays
- Expert knowledge of Costa Blanca: Alicante, Benidorm, Denia, Javea, Calpe, Guadalest
- Always consider weather, budget, group size, and personal preferences
- Provide specific, actionable recommendations with exact names and locations

CURRENT CONTEXT:
- Location: ${location.name || 'Costa Blanca, Spain'}
- Weather: ${weather ? `${weather.temperature}°C, ${weather.condition}` : 'Beautiful Mediterranean climate'}
- Time: ${timeContext}
- User Interests: ${preferences.interests?.join(', ') || 'General holiday activities'}
- Budget: ${preferences.budget ? `€${preferences.budget} per person` : 'Budget flexible'}
- Group Size: ${preferences.groupSize || 2} people

${nearbyPOIs && nearbyPOIs.length > 0 ? `
NEARBY ATTRACTIONS:
${nearbyPOIs.slice(0, 5).map(poi => `- ${poi.name} (${poi.category}) - ${poi.rating}/5 stars`).join('\n')}
` : ''}

EXPERTISE:
- Restaurants: From local tapas bars to fine dining with sea views
- Activities: Theme parks, boat trips, cultural sites, adventure sports  
- Beaches: Hidden coves, family beaches, water sports locations
- Nightlife: Beach clubs, traditional bars, live music venues
- Cultural sites: Museums, castles, festivals, local traditions

RESPONSE FORMAT:
1. Start with enthusiasm and acknowledge their request
2. Provide specific recommendations with names and details
3. Include practical information (prices, hours, booking)
4. Add local insider tips
5. End with encouraging follow-up questions

ALWAYS INCLUDE:
- Specific place names and addresses
- Price ranges (€/€€/€€€/€€€€)
- Opening hours and booking requirements
- Weather-appropriate suggestions
- Transportation tips
- Local insider knowledge

Remember: You're creating HOLIDAY MAGIC, not just giving information!`;
  }

  /**
   * Format messages for Claude API
   */
  formatMessagesForClaude(conversation, currentMessage) {
    const messages = [];

    // Add conversation history (last 10 messages)
    if (conversation) {
      const recentMessages = conversation.split('\n').slice(-10);
      recentMessages.forEach(msg => {
        if (msg.startsWith('Human:')) {
          messages.push({
            role: 'user',
            content: msg.replace('Human:', '').trim(),
          });
        } else if (msg.startsWith('Assistant:')) {
          messages.push({
            role: 'assistant',
            content: msg.replace('Assistant:', '').trim(),
          });
        }
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Process Claude response and extract recommendations
   */
  async processClaudeResponse(response, location) {
    try {
      const content = response.content[0].text;
      
      // Extract recommendations from response
      const recommendations = await this.extractRecommendations(content, location);
      
      return {
        text: content,
        recommendations,
        confidence: this.calculateConfidence(content),
        model: 'claude-3-5-sonnet',
        tokenUsage: response.usage,
      };
    } catch (error) {
      logger.error('Error processing Claude response:', error);
      return {
        text: response.content[0].text,
        recommendations: [],
        confidence: 0.5,
        model: 'claude-3-5-sonnet',
      };
    }
  }

  /**
   * Extract POI recommendations from Claude response
   */
  async extractRecommendations(content, location) {
    try {
      const recommendations = [];
      
      // Simple pattern matching for place names
      const placePatterns = [
        /(?:visit|try|go to|check out)\s+([A-Z][a-zA-Z\s]+)(?:\s|$|[,.!])/g,
        /\*\*([A-Z][a-zA-Z\s]+)\*\*/g,
        /([A-Z][a-zA-Z\s]+)\s+(?:restaurant|hotel|museum|beach|castle)/gi,
      ];

      for (const pattern of placePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const placeName = match[1].trim();
          
          // Try to find this place in our database
          const poi = await POIService.findByName(placeName);
          
          if (poi) {
            recommendations.push({
              id: poi._id,
              name: poi.name,
              category: poi.category,
              rating: poi.rating,
              priceCategory: poi.priceCategory,
              description: poi.description,
              distance: location ? 
                this.calculateDistance(location, poi.coordinates) : 'Nearby',
              coordinates: poi.coordinates,
              address: poi.address,
            });
          }
        }
      }

      // Remove duplicates and limit to 3
      const uniqueRecommendations = recommendations
        .filter((rec, index, self) => 
          index === self.findIndex(r => r.id === rec.id)
        )
        .slice(0, 3);

      return uniqueRecommendations;
    } catch (error) {
      logger.error('Error extracting recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(from, to) {
    if (!from.latitude || !from.longitude || !to.lat || !to.lng) {
      return 'Nearby';
    }

    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.latitude) * Math.PI / 180;
    const dLon = (to.lng - from.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    } else {
      return `${distance.toFixed(1)}km away`;
    }
  }

  /**
   * Calculate response confidence based on content quality
   */
  calculateConfidence(content) {
    let confidence = 0.5;
    
    // Boost confidence for specific recommendations
    if (content.includes('€') || content.includes('euro')) confidence += 0.1;
    if (content.includes('hours') || content.includes('open')) confidence += 0.1;
    if (content.includes('address') || content.includes('location')) confidence += 0.1;
    if (content.includes('rating') || content.includes('stars')) confidence += 0.1;
    if (content.length > 200) confidence += 0.1;
    if (content.includes('Costa Blanca')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get time-specific context
   */
  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(message, context) {
    const normalizedMessage = message.toLowerCase().trim();
    const contextHash = JSON.stringify(context);
    return `claude_${Buffer.from(normalizedMessage + contextHash).toString('base64').slice(0, 50)}`;
  }

  /**
   * Generate fallback response when Claude is unavailable
   */
  generateFallbackResponse(messageData, processingTime) {
    return {
      text: `I'm experiencing some technical difficulties right now, but I can still help! Based on your location in Costa Blanca, here are some reliable recommendations:

🏖️ **Beaches**: Playa de San Juan (Alicante) - beautiful sandy beach with restaurants
🍽️ **Dining**: La Taberna del Gourmet (Alicante) - authentic Spanish cuisine  
🎯 **Activities**: Santa Barbara Castle (Alicante) - historic castle with amazing views

I'll be back to full capacity shortly! In the meantime, you can also check the official Costa Blanca tourism website for more information.`,
      recommendations: [],
      confidence: 0.6,
      model: 'fallback',
      cached: false,
      processingTime,
      fallback: true,
    };
  }

  /**
   * Rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    
    if (now - this.lastReset > this.rateLimitWindow) {
      this.rateLimitCounter = 0;
      this.lastReset = now;
    }
    
    return this.rateLimitCounter < this.rateLimitMax;
  }

  updateRateLimit() {
    this.rateLimitCounter++;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return false;
      }

      // Simple test request
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      return response && response.content && response.content.length > 0;
    } catch (error) {
      logger.error('Claude health check failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      rateLimitCounter: this.rateLimitCounter,
      rateLimitMax: this.rateLimitMax,
      rateLimitWindow: this.rateLimitWindow,
      lastReset: this.lastReset,
      isHealthy: !!this.client,
    };
  }
}

module.exports = new ClaudeService();