/**
 * Mistral Service - Chat Completion & Intent Recognition
 * Converted from TypeScript Widget API
 */

const { Mistral } = require('@mistralai/mistralai');
const logger = require('../../utils/logger');

class MistralService {
  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    this.client = new Mistral({ apiKey });
    this.model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    logger.info('Mistral service initialized');
  }

  /**
   * Analyze user intent using Mistral AI
   * @param {string} query - User query
   * @param {Object} context - Session context (optional)
   * @returns {Promise<Object>} - Intent analysis
   */
  async analyzeIntent(query, context = null) {
    try {
      logger.info(`Analyzing intent for query: "${query}"`);

      // Build system prompt
      const systemPrompt = this.buildIntentSystemPrompt();

      // Build user prompt with context if available
      let userPrompt = `User query: "${query}"`;

      if (context && context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-3);
        userPrompt += `\n\nRecent conversation context:\n${recentHistory.map((entry, i) =>
          `${i + 1}. User: "${entry.query}"`
        ).join('\n')}`;
      }

      userPrompt += '\n\nAnalyze the intent and respond in JSON format only.';

      // Call Mistral
      const response = await this.client.chat.complete({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from Mistral');
      }

      // Parse JSON response
      const intent = this.parseIntentResponse(content);
      logger.info(`Intent recognized: ${intent.primaryIntent} (confidence: ${intent.confidence})`);

      return intent;

    } catch (error) {
      logger.error('Mistral intent analysis failed:', error);
      // Fallback to pattern-based detection
      return this.fallbackIntentDetection(query);
    }
  }

  /**
   * Build system prompt for intent recognition
   */
  buildIntentSystemPrompt() {
    return `You are an intelligent travel assistant for Calpe, Spain. Analyze user queries and extract intent.

Intent Types:
- search_poi: User wants to find places (restaurants, attractions, etc.)
- get_info: User wants specific information about a place (hours, address, phone)
- compare_poi: User wants to compare multiple places
- find_nearby: User wants places near a location

Extract:
1. Primary intent type
2. Category (Food & Drinks, Active, Beaches & Nature, Culture & History, Shopping, Practical, Health & Wellbeing)
3. Search terms and filters
4. Dietary restrictions (if food-related)
5. Time sensitivity (open now, opening hours)
6. Proximity requirements

Respond ONLY with JSON in this format:
{
  "primaryIntent": "search_poi|get_info|compare_poi|find_nearby",
  "category": "Food & Drinks|Active|...",
  "searchTerms": ["term1", "term2"],
  "dietaryRestrictions": ["vegan", "gluten-free", ...],
  "requiresOpenNow": true|false,
  "proximityType": "nearme|beach|center",
  "confidence": 0.0-1.0
}`;
  }

  /**
   * Parse intent response from Mistral
   */
  parseIntentResponse(content) {
    try {
      // Strip markdown code blocks if present (```json ... ```)
      let cleanContent = content;
      if (typeof content === 'string') {
        cleanContent = content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
      }

      let intent = typeof cleanContent === 'string' ? JSON.parse(cleanContent) : cleanContent;

      // Ensure required fields
      return {
        primaryIntent: intent.primaryIntent || 'search_poi',
        category: intent.category || null,
        searchTerms: Array.isArray(intent.searchTerms) ? intent.searchTerms : [],
        dietaryRestrictions: Array.isArray(intent.dietaryRestrictions) ? intent.dietaryRestrictions : [],
        requiresOpenNow: !!intent.requiresOpenNow,
        proximityType: intent.proximityType || null,
        confidence: typeof intent.confidence === 'number' ? intent.confidence : 0.5
      };
    } catch (error) {
      logger.error('Failed to parse intent response:', error);
      return this.fallbackIntentDetection('');
    }
  }

  /**
   * Fallback pattern-based intent detection
   */
  fallbackIntentDetection(query) {
    const queryLower = query.toLowerCase();

    let primaryIntent = 'search_poi';
    const searchTerms = [];
    let category = null;
    const dietaryRestrictions = [];
    let requiresOpenNow = false;
    let proximityType = null;

    // Detect intent type
    if (queryLower.includes('open') || queryLower.includes('hours') || queryLower.includes('when')) {
      primaryIntent = 'get_info';
      requiresOpenNow = queryLower.includes('now');
    } else if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('better')) {
      primaryIntent = 'compare_poi';
    } else if (queryLower.includes('near') || queryLower.includes('closest') || queryLower.includes('nearby')) {
      primaryIntent = 'find_nearby';
      proximityType = 'nearme';
    }

    // Detect category
    if (queryLower.match(/\b(restaurant|food|eat|dining|cafe|bar)\b/)) {
      category = 'Food & Drinks';
    } else if (queryLower.match(/\b(beach|playa|sea|sand)\b/)) {
      category = 'Beaches & Nature';
    } else if (queryLower.match(/\b(museum|church|history|culture)\b/)) {
      category = 'Culture & History';
    } else if (queryLower.match(/\b(gym|sport|activity|hiking|cycling)\b/)) {
      category = 'Active';
    } else if (queryLower.match(/\b(shop|store|market|buy)\b/)) {
      category = 'Shopping';
    } else if (queryLower.match(/\b(spa|massage|wellness|health)\b/)) {
      category = 'Health & Wellbeing';
    }

    // Detect dietary restrictions
    if (queryLower.includes('vegan')) dietaryRestrictions.push('vegan');
    if (queryLower.includes('vegetarian')) dietaryRestrictions.push('vegetarian');
    if (queryLower.includes('gluten-free') || queryLower.includes('gluten free')) dietaryRestrictions.push('gluten-free');
    if (queryLower.includes('halal')) dietaryRestrictions.push('halal');
    if (queryLower.includes('kosher')) dietaryRestrictions.push('kosher');

    // Extract search terms
    const words = query.split(' ').filter(w => w.length > 2);
    searchTerms.push(...words);

    return {
      primaryIntent,
      category,
      searchTerms,
      dietaryRestrictions,
      requiresOpenNow,
      proximityType,
      confidence: 0.5
    };
  }

  /**
   * Generate natural language response
   * @param {Object} data - Response data (POIs, intent, etc.)
   * @returns {Promise<string>} - Natural language response
   */
  async generateResponse(data) {
    try {
      const { pois, query, intent } = data;

      if (!pois || pois.length === 0) {
        return "I couldn't find any places matching your search. Try adjusting your query or asking about different categories.";
      }

      const systemPrompt = `You are a friendly travel assistant for Calpe, Spain. Generate helpful, concise responses (2-3 sentences) about places. Be natural and enthusiastic.`;

      const userPrompt = `User asked: "${query}"

Found ${pois.length} places:
${pois.slice(0, 5).map((p, i) =>
  `${i + 1}. ${p.name} (${p.category}) - Rating: ${p.rating || 'N/A'}/5`
).join('\n')}

Generate a helpful response mentioning the top options.`;

      const response = await this.client.chat.complete({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 200
      });

      const content = response.choices[0]?.message?.content;
      return typeof content === 'string' ? content : content.join(' ');

    } catch (error) {
      logger.error('Response generation failed:', error);
      // Fallback response
      const { pois } = data;
      return `I found ${pois.length} place${pois.length > 1 ? 's' : ''} matching your search.${pois.length > 0 ? ` The top option is ${pois[0].name}.` : ''}`;
    }
  }

  /**
   * Test Mistral connection
   */
  async testConnection() {
    try {
      await this.analyzeIntent('test');
      return true;
    } catch (error) {
      logger.error('Mistral connection test failed:', error);
      return false;
    }
  }
}

module.exports = new MistralService();
