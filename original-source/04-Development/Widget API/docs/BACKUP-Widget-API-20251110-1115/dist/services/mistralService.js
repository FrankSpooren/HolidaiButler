"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralService = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const logger_1 = require("../config/logger");
class MistralService {
    constructor() {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error('MISTRAL_API_KEY environment variable is required');
        }
        this.client = new mistralai_1.Mistral({ apiKey });
        logger_1.logger.info('Mistral service initialized');
    }
    async generateEmbedding(text) {
        const flowLogger = logger_1.SearchFlowLogger.getInstance();
        const startTime = Date.now();
        try {
            flowLogger.logMistralRequest(text);
            logger_1.logger.info(`🔮 Sending request to Mistral API: "${text}"`);
            const response = await this.client.embeddings.create({
                model: 'mistral-embed',
                inputs: [text]
            });
            const embedding = response.data[0]?.embedding;
            if (!embedding) {
                throw new Error('No embedding returned from Mistral API');
            }
            const timeMs = Date.now() - startTime;
            flowLogger.logMistralResponse(embedding, timeMs);
            logger_1.logger.info(`✅ Mistral API response received: ${embedding.length} dimensions in ${timeMs}ms`);
            logger_1.logger.debug(`📊 First 5 embedding values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
            return embedding;
        }
        catch (error) {
            const timeMs = Date.now() - startTime;
            logger_1.logger.error(`❌ Failed to generate embedding after ${timeMs}ms:`, error);
            throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateEmbeddings(texts) {
        try {
            const response = await this.client.embeddings.create({
                model: 'mistral-embed',
                inputs: texts
            });
            return response.data.map(item => {
                if (!item.embedding) {
                    throw new Error('No embedding returned from Mistral API');
                }
                return item.embedding;
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to generate embeddings:', error);
            throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateChatCompletion(messages) {
        const startTime = Date.now();
        try {
            logger_1.logger.info(`💬 Sending chat completion request to Mistral API`);
            const response = await this.client.chat.complete({
                model: 'mistral-small-latest',
                messages: messages,
                temperature: 0.1,
                maxTokens: 1000
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content returned from Mistral chat completion');
            }
            let contentString;
            if (typeof content === 'string') {
                contentString = content;
            }
            else {
                contentString = content.map(chunk => {
                    if (chunk.type === 'text') {
                        return chunk.text || '';
                    }
                    return '';
                }).join('');
            }
            if (!contentString) {
                throw new Error('No valid content returned from Mistral chat completion');
            }
            const timeMs = Date.now() - startTime;
            logger_1.logger.info(`✅ Mistral chat completion received in ${timeMs}ms`);
            return contentString;
        }
        catch (error) {
            const timeMs = Date.now() - startTime;
            logger_1.logger.error(`❌ Failed to generate chat completion after ${timeMs}ms:`, error);
            logger_1.logger.info('🔄 Falling back to intelligent intent detection');
            const userMessage = messages.find(m => m.role === 'user')?.content || '';
            return this.intelligentIntentDetection(userMessage);
        }
    }
    intelligentIntentDetection(query) {
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
        if (queryLower.includes('when') || queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours')) {
            primaryIntent = 'get_info';
            intentContext.openingHoursRelated = true;
            intentContext.timeRelated = true;
            secondaryIntents.push('opening_hours', 'time_sensitive');
        }
        else if (queryLower.includes('compare') || queryLower.includes('better') || queryLower.includes('vs') || queryLower.includes('which')) {
            primaryIntent = 'compare_poi';
            intentContext.comparisonRelated = true;
            secondaryIntents.push('comparison');
        }
        else if (queryLower.includes('near') || queryLower.includes('close') || queryLower.includes('closest')) {
            primaryIntent = 'find_nearby';
            intentContext.proximityRelated = true;
            secondaryIntents.push('proximity_nearme');
        }
        else if (queryLower.includes('phone') || queryLower.includes('number') || queryLower.includes('contact') || queryLower.includes('address')) {
            primaryIntent = 'get_info';
            intentContext.contactRelated = true;
            secondaryIntents.push('contact_info');
        }
        else {
            primaryIntent = 'search_poi';
        }
        if (queryLower.includes('beach') || queryLower.includes('playa')) {
            secondaryIntents.push('proximity_beach');
            intentContext.proximityRelated = true;
        }
        if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('cheap') || queryLower.includes('expensive')) {
            secondaryIntents.push('price_range');
            intentContext.priceRelated = true;
        }
        if (queryLower.includes('now') || queryLower.includes('today') || queryLower.includes('open now')) {
            secondaryIntents.push('time_sensitive');
            intentContext.timeRelated = true;
        }
        if (queryLower.includes('wheelchair') || queryLower.includes('accessible') || queryLower.includes('disabled')) {
            secondaryIntents.push('accessibility');
            intentContext.accessibilityRelated = true;
        }
        if (queryLower.includes('wifi') || queryLower.includes('parking') || queryLower.includes('pool') || queryLower.includes('garden')) {
            secondaryIntents.push('amenities');
            intentContext.amenityRelated = true;
        }
        if (queryLower.includes('menu') || queryLower.includes('food') || queryLower.includes('dining')) {
            secondaryIntents.push('dining');
            intentContext.foodRelated = true;
        }
        if (queryLower.includes('family') || queryLower.includes('children') || queryLower.includes('kids')) {
            secondaryIntents.push('family_friendly');
            intentContext.familyRelated = true;
        }
        if (queryLower.includes('pet') || queryLower.includes('dog') || queryLower.includes('cat')) {
            secondaryIntents.push('pet_policy');
            intentContext.petRelated = true;
        }
        if (queryLower.includes('review') || queryLower.includes('rating') || queryLower.includes('stars')) {
            secondaryIntents.push('reviews');
            intentContext.reviewRelated = true;
        }
        if (queryLower.includes('available') || queryLower.includes('book') || queryLower.includes('reserve')) {
            secondaryIntents.push('availability');
            intentContext.availabilityRelated = true;
        }
        if (queryLower.includes('quality') || queryLower.includes('good') || queryLower.includes('excellent')) {
            secondaryIntents.push('quality');
            intentContext.qualityRelated = true;
        }
        if (queryLower.includes('what') || queryLower.includes('how') || queryLower.includes('tell me about')) {
            secondaryIntents.push('detailed_info');
            intentContext.specificPOIQuestions = true;
        }
        let confidence = 0.5;
        if (primaryIntent !== 'search_poi')
            confidence += 0.2;
        if (secondaryIntents.length > 0)
            confidence += 0.1;
        if (Object.values(intentContext).some(v => v === true))
            confidence += 0.1;
        return JSON.stringify({
            primaryIntent,
            secondaryIntents,
            confidence: Math.min(confidence, 0.9),
            extractedEntities: query.split(' ').filter(w => w.length > 2),
            intentContext,
            suggestedActions: this.generateSuggestedActions(primaryIntent, secondaryIntents)
        });
    }
    generateSuggestedActions(primaryIntent, secondaryIntents) {
        const actions = [];
        if (primaryIntent === 'get_info') {
            actions.push('Get information about the specific POI');
        }
        else if (primaryIntent === 'search_poi') {
            actions.push('Search for places');
        }
        else if (primaryIntent === 'compare_poi') {
            actions.push('Compare multiple POIs');
        }
        else if (primaryIntent === 'find_nearby') {
            actions.push('Find nearby places');
        }
        if (secondaryIntents.includes('opening_hours')) {
            actions.push('Check opening hours for the referenced POI');
        }
        if (secondaryIntents.includes('contact_info')) {
            actions.push('Get contact details (phone, address)');
        }
        if (secondaryIntents.includes('proximity_beach')) {
            actions.push('Find beach locations');
        }
        if (secondaryIntents.includes('time_sensitive')) {
            actions.push('Check current status (open/closed now)');
        }
        if (secondaryIntents.includes('price_range')) {
            actions.push('Get pricing information');
        }
        if (secondaryIntents.includes('accessibility')) {
            actions.push('Check accessibility features');
        }
        if (secondaryIntents.includes('amenities')) {
            actions.push('Check available amenities');
        }
        if (secondaryIntents.includes('dining')) {
            actions.push('Get dining information');
        }
        if (secondaryIntents.includes('family_friendly')) {
            actions.push('Check family-friendliness');
        }
        if (secondaryIntents.includes('pet_policy')) {
            actions.push('Check pet policies');
        }
        if (secondaryIntents.includes('reviews')) {
            actions.push('Show reviews and ratings');
        }
        if (secondaryIntents.includes('availability')) {
            actions.push('Check availability and booking options');
        }
        if (secondaryIntents.includes('quality')) {
            actions.push('Get quality and service information');
        }
        if (secondaryIntents.includes('detailed_info')) {
            actions.push('Provide detailed POI information');
        }
        return actions.length > 0 ? actions : ['Search for places'];
    }
    simpleIntentDetection(query) {
        const queryLower = query.toLowerCase();
        if (queryLower.includes('when') || queryLower.includes('open') || queryLower.includes('closed')) {
            return JSON.stringify({
                primaryIntent: 'get_info',
                secondaryIntents: ['opening_hours', 'time_sensitive'],
                confidence: 0.8,
                extractedEntities: query.split(' ').filter(w => w.length > 2),
                intentContext: {
                    timeRelated: true,
                    locationRelated: false,
                    proximityRelated: false,
                    openingHoursRelated: true,
                    contactRelated: false,
                    comparisonRelated: false
                },
                suggestedActions: ['Get opening hours', 'Check current status', 'View contact details']
            });
        }
        if (queryLower.includes('beach') || queryLower.includes('playa')) {
            return JSON.stringify({
                primaryIntent: 'search_poi',
                secondaryIntents: ['proximity_beach'],
                confidence: 0.8,
                extractedEntities: query.split(' ').filter(w => w.length > 2),
                intentContext: {
                    timeRelated: false,
                    locationRelated: true,
                    proximityRelated: true,
                    openingHoursRelated: false,
                    contactRelated: false,
                    comparisonRelated: false
                },
                suggestedActions: ['Search for beach locations', 'Filter by proximity', 'View on map']
            });
        }
        if (queryLower.includes('closest') || queryLower.includes('near')) {
            return JSON.stringify({
                primaryIntent: 'search_poi',
                secondaryIntents: ['proximity_nearme', 'opening_hours', 'time_sensitive'],
                confidence: 0.8,
                extractedEntities: query.split(' ').filter(w => w.length > 2),
                intentContext: {
                    timeRelated: true,
                    locationRelated: true,
                    proximityRelated: true,
                    openingHoursRelated: true,
                    contactRelated: false,
                    comparisonRelated: false
                },
                suggestedActions: ['Find nearby locations', 'Check opening hours', 'Get directions']
            });
        }
        return JSON.stringify({
            primaryIntent: 'search_poi',
            secondaryIntents: [],
            confidence: 0.5,
            extractedEntities: query.split(' ').filter(w => w.length > 2),
            intentContext: {
                timeRelated: false,
                locationRelated: false,
                proximityRelated: false,
                openingHoursRelated: false,
                contactRelated: false,
                comparisonRelated: false
            },
            suggestedActions: ['Search for POIs', 'Get information', 'View details']
        });
    }
    async testConnection() {
        try {
            await this.generateEmbedding('test');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Mistral connection test failed:', error);
            return false;
        }
    }
}
exports.MistralService = MistralService;
//# sourceMappingURL=mistralService.js.map