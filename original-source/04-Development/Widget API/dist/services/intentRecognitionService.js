"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentRecognitionService = void 0;
const mistralService_1 = require("./mistralService");
const logger_1 = require("../config/logger");
class IntentRecognitionService {
    constructor() {
        this.mistralService = new mistralService_1.MistralService();
    }
    async recognizeIntent(query, conversationContext) {
        try {
            logger_1.logger.info(`🧠 INTENT RECOGNITION: Analyzing query: "${query}"`);
            const intentPrompt = this.createIntentPrompt(query, conversationContext);
            const intentAnalysis = await this.analyzeWithMistral(intentPrompt);
            const result = this.parseIntentResult(intentAnalysis, query);
            logger_1.logger.info(`🎯 INTENT DETECTED: ${result.primaryIntent} (confidence: ${result.confidence})`);
            logger_1.logger.debug(`📊 Intent context:`, result.intentContext);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Intent recognition failed, using fallback:', error);
            return this.fallbackIntentRecognition(query);
        }
    }
    createIntentPrompt(query, conversationContext) {
        let contextInfo = '';
        if (conversationContext?.lastResults?.length > 0) {
            const poiNames = conversationContext.lastResults
                .slice(0, 5)
                .map((poi, index) => `${index + 1}. ${poi.title} (${poi.category || 'POI'})`)
                .join('\n');
            contextInfo = `\n\nPREVIOUS SEARCH RESULTS (in order):
${poiNames}

IMPORTANT: When the user refers to "first one", "second one", "last one", etc., they are referring to the POIs listed above in order.`;
        }
        else if (conversationContext?.lastResults?.length === 0) {
            contextInfo = '\n\nNote: No previous search results available.';
        }
        return `Analyze the following user query for intent recognition in a POI (Points of Interest) search system.

User Query: "${query}"${contextInfo}

Please identify the primary intent and any secondary intents from these categories:

**PRIMARY INTENTS:**
- search_poi: Looking for specific places (restaurants, hotels, etc.)
- get_info: Getting information about a specific POI
- compare_poi: Comparing multiple POIs
- find_nearby: Finding POIs near a location
- filter_by_criteria: Filtering by specific criteria (price, rating, etc.)

**SECONDARY INTENTS:**
- opening_hours: Questions about when something is open
- proximity_beach: Looking for places near the beach
- proximity_nearme: Looking for places near the user
- contact_info: Getting phone numbers, addresses
- time_sensitive: Needs immediate/urgent information
- price_range: Questions about pricing
- amenities: Looking for specific features (pool, wifi, etc.)
- accessibility: Questions about accessibility features
- family_friendly: Questions about suitability for families/children
- pet_policy: Questions about pet policies
- reviews: Questions about ratings and reviews
- availability: Questions about booking and availability
- quality: Questions about service quality and standards
- detailed_info: Specific questions about POI details

**EXAMPLES:**
- "when is the first one open today" → Primary: get_info, Secondary: opening_hours, time_sensitive
- "an icecream place at the beach" → Primary: search_poi, Secondary: proximity_beach
- "what is the closest pizzaria that is now open" → Primary: search_poi, Secondary: proximity_nearme, opening_hours, time_sensitive

Respond in JSON format:
{
  "primaryIntent": "string",
  "secondaryIntents": ["string"],
  "confidence": 0.0-1.0,
  "extractedEntities": ["string"],
  "intentContext": {
    "timeRelated": boolean,
    "locationRelated": boolean,
    "proximityRelated": boolean,
    "openingHoursRelated": boolean,
    "contactRelated": boolean,
    "comparisonRelated": boolean,
    "accessibilityRelated": boolean,
    "priceRelated": boolean,
    "amenityRelated": boolean,
    "foodRelated": boolean,
    "familyRelated": boolean,
    "petRelated": boolean,
    "reviewRelated": boolean,
    "availabilityRelated": boolean,
    "qualityRelated": boolean,
    "specificPOIQuestions": boolean
  },
  "suggestedActions": ["string"]
}`;
    }
    async analyzeWithMistral(prompt) {
        let response = '';
        try {
            response = await this.mistralService.generateChatCompletion([
                {
                    role: 'system',
                    content: 'You are an expert intent recognition system for POI search. Analyze user queries and return structured JSON responses.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);
            logger_1.logger.info('🔍 MISTRAL RAW RESPONSE:', response);
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            cleanResponse = cleanResponse.replace(/^`+|`+$/g, '').trim();
            const parsed = JSON.parse(cleanResponse);
            logger_1.logger.info('🔍 MISTRAL PARSED RESPONSE:', parsed);
            return parsed;
        }
        catch (error) {
            logger_1.logger.error('Mistral intent analysis failed:', error);
            if (response) {
                logger_1.logger.error('🔍 MISTRAL RESPONSE THAT FAILED:', response);
            }
            return {
                primaryIntent: 'search_poi',
                secondaryIntents: [],
                confidence: 0.5,
                extractedEntities: [],
                intentContext: {
                    timeRelated: false,
                    locationRelated: false,
                    proximityRelated: false,
                    openingHoursRelated: false,
                    contactRelated: false,
                    comparisonRelated: false
                },
                suggestedActions: ['search_poi']
            };
        }
    }
    parseIntentResult(analysis, query) {
        return {
            primaryIntent: analysis.primaryIntent || 'search_poi',
            secondaryIntents: analysis.secondaryIntents || [],
            confidence: analysis.confidence || 0.5,
            extractedEntities: analysis.extractedEntities || this.extractBasicEntities(query),
            intentContext: analysis.intentContext || this.analyzeBasicContext(query),
            suggestedActions: analysis.suggestedActions || this.generateBasicActions(analysis.primaryIntent)
        };
    }
    fallbackIntentRecognition(query) {
        logger_1.logger.info('Using fallback intent recognition');
        const queryLower = query.toLowerCase();
        let primaryIntent = 'search_poi';
        const secondaryIntents = [];
        const intentContext = {
            timeRelated: false,
            locationRelated: false,
            proximityRelated: false,
            openingHoursRelated: false,
            contactRelated: false,
            comparisonRelated: false,
            accessibilityRelated: false,
            priceRelated: false,
            amenityRelated: false,
            foodRelated: false,
            familyRelated: false,
            petRelated: false,
            reviewRelated: false,
            availabilityRelated: false,
            qualityRelated: false,
            specificPOIQuestions: false
        };
        if (queryLower.includes('when') || queryLower.includes('open') || queryLower.includes('closed')) {
            primaryIntent = 'get_info';
            intentContext.openingHoursRelated = true;
            intentContext.timeRelated = true;
        }
        else if (queryLower.includes('compare') || queryLower.includes('better') || queryLower.includes('vs')) {
            primaryIntent = 'compare_poi';
            intentContext.comparisonRelated = true;
        }
        else if (queryLower.includes('near') || queryLower.includes('close') || queryLower.includes('closest')) {
            primaryIntent = 'find_nearby';
            intentContext.proximityRelated = true;
        }
        if (queryLower.includes('beach') || queryLower.includes('playa')) {
            secondaryIntents.push('proximity_beach');
            intentContext.proximityRelated = true;
        }
        if (queryLower.includes('now') || queryLower.includes('today') || queryLower.includes('open')) {
            secondaryIntents.push('opening_hours');
            intentContext.timeRelated = true;
        }
        if (queryLower.includes('phone') || queryLower.includes('contact') || queryLower.includes('address')) {
            secondaryIntents.push('contact_info');
            intentContext.contactRelated = true;
        }
        return {
            primaryIntent,
            secondaryIntents,
            confidence: 0.6,
            extractedEntities: this.extractBasicEntities(query),
            intentContext,
            suggestedActions: this.generateBasicActions(primaryIntent)
        };
    }
    extractBasicEntities(query) {
        const words = query.toLowerCase().split(' ');
        const stopWords = ['the', 'and', 'or', 'but', 'for', 'with', 'from', 'that', 'this', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'are', 'was', 'were'];
        return words
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 0);
    }
    analyzeBasicContext(query) {
        const queryLower = query.toLowerCase();
        return {
            timeRelated: queryLower.includes('when') || queryLower.includes('time') || queryLower.includes('open') || queryLower.includes('closed'),
            locationRelated: queryLower.includes('where') || queryLower.includes('address') || queryLower.includes('location'),
            proximityRelated: queryLower.includes('near') || queryLower.includes('close') || queryLower.includes('beach'),
            openingHoursRelated: queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours'),
            contactRelated: queryLower.includes('phone') || queryLower.includes('contact') || queryLower.includes('call'),
            comparisonRelated: queryLower.includes('compare') || queryLower.includes('better') || queryLower.includes('vs'),
            accessibilityRelated: queryLower.includes('wheelchair') || queryLower.includes('accessible') || queryLower.includes('disabled'),
            priceRelated: queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('cheap') || queryLower.includes('expensive'),
            amenityRelated: queryLower.includes('wifi') || queryLower.includes('parking') || queryLower.includes('pool') || queryLower.includes('garden'),
            foodRelated: queryLower.includes('menu') || queryLower.includes('food') || queryLower.includes('dining') || queryLower.includes('restaurant'),
            familyRelated: queryLower.includes('family') || queryLower.includes('children') || queryLower.includes('kids') || queryLower.includes('child-friendly'),
            petRelated: queryLower.includes('pet') || queryLower.includes('dog') || queryLower.includes('cat') || queryLower.includes('animal'),
            reviewRelated: queryLower.includes('review') || queryLower.includes('rating') || queryLower.includes('stars') || queryLower.includes('feedback'),
            availabilityRelated: queryLower.includes('available') || queryLower.includes('book') || queryLower.includes('reserve') || queryLower.includes('booking'),
            qualityRelated: queryLower.includes('quality') || queryLower.includes('good') || queryLower.includes('excellent') || queryLower.includes('service'),
            specificPOIQuestions: queryLower.includes('what') || queryLower.includes('how') || queryLower.includes('tell me about') || queryLower.includes('details')
        };
    }
    generateBasicActions(primaryIntent) {
        const actionMap = {
            'search_poi': ['Search for POIs', 'Filter results', 'Show on map'],
            'get_info': ['Get detailed information', 'Check opening hours', 'View contact details'],
            'compare_poi': ['Compare POIs side by side', 'Show differences', 'Rank by criteria'],
            'find_nearby': ['Show nearby POIs', 'Filter by distance', 'Get directions'],
            'filter_by_criteria': ['Apply filters', 'Sort results', 'Refine search']
        };
        return actionMap[primaryIntent] || ['Search', 'Get information', 'View details'];
    }
}
exports.IntentRecognitionService = IntentRecognitionService;
//# sourceMappingURL=intentRecognitionService.js.map