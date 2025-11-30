"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedSemanticDetector = void 0;
const mistralService_1 = require("./mistralService");
const logger_1 = require("../config/logger");
class AdvancedSemanticDetector {
    constructor() {
        this.mistralService = new mistralService_1.MistralService();
    }
    async analyzeConversation(context) {
        logger_1.logger.info('🧠 ADVANCED SEMANTIC ANALYSIS STARTING', {
            query: context.query,
            previousTurns: context.conversationHistory.length,
            previousResults: context.previousResults.length
        });
        try {
            const queryEmbedding = await this.generateQueryEmbedding(context.query);
            const contextEmbedding = await this.generateContextEmbedding(context);
            const semanticSimilarity = this.calculateSemanticSimilarity(queryEmbedding, contextEmbedding);
            const conversationFlow = await this.analyzeConversationFlow(context);
            const targetEntities = await this.resolveEntityReferences(context);
            const implicitReferences = await this.detectImplicitReferences(context);
            const intent = await this.determineIntent(context, targetEntities, implicitReferences);
            const suggestedActions = await this.generateSuggestedActions(context, intent, targetEntities);
            const isFollowUp = this.determineFollowUpStatus(semanticSimilarity, conversationFlow, targetEntities, context);
            const analysis = {
                isFollowUp,
                confidence: this.calculateOverallConfidence(semanticSimilarity, conversationFlow, targetEntities),
                intent,
                targetEntities,
                conversationFlow,
                implicitReferences,
                suggestedActions
            };
            logger_1.logger.info('🧠 SEMANTIC ANALYSIS COMPLETE', {
                isFollowUp: analysis.isFollowUp,
                confidence: analysis.confidence,
                intent: analysis.intent,
                targetEntitiesCount: analysis.targetEntities.length,
                implicitReferencesCount: analysis.implicitReferences.length
            });
            return analysis;
        }
        catch (error) {
            logger_1.logger.error('Failed to perform advanced semantic analysis:', error);
            return this.getFallbackAnalysis(context);
        }
    }
    async generateQueryEmbedding(query) {
        return await this.mistralService.generateEmbedding(query);
    }
    async generateContextEmbedding(context) {
        const contextString = this.buildContextString(context);
        return await this.mistralService.generateEmbedding(contextString);
    }
    buildContextString(context) {
        const parts = [];
        if (context.previousQueries.length > 0) {
            parts.push(`Previous queries: ${context.previousQueries.join('; ')}`);
        }
        if (context.previousResults.length > 0) {
            const resultTitles = context.previousResults.map(r => r.title).join(', ');
            parts.push(`Previous results: ${resultTitles}`);
        }
        if (context.conversationHistory.length > 0) {
            const historyString = context.conversationHistory
                .slice(-3)
                .map(turn => `Q: ${turn.query} | Results: ${turn.results.map(r => r.title).join(', ')}`)
                .join(' | ');
            parts.push(`Recent conversation: ${historyString}`);
        }
        if (context.userProfile) {
            const profileParts = [];
            if (context.userProfile.location)
                profileParts.push(`Location: ${context.userProfile.location}`);
            if (context.userProfile.preferences?.length)
                profileParts.push(`Preferences: ${context.userProfile.preferences.join(', ')}`);
            if (context.userProfile.language)
                profileParts.push(`Language: ${context.userProfile.language}`);
            if (profileParts.length > 0) {
                parts.push(`User context: ${profileParts.join('; ')}`);
            }
        }
        return parts.join('. ');
    }
    calculateSemanticSimilarity(queryEmbedding, contextEmbedding) {
        if (queryEmbedding.length !== contextEmbedding.length) {
            return 0;
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
            const queryVal = queryEmbedding[i] || 0;
            const contextVal = contextEmbedding[i] || 0;
            dotProduct += queryVal * contextVal;
            normA += queryVal * queryVal;
            normB += contextVal * contextVal;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    async analyzeConversationFlow(context) {
        const query = context.query.toLowerCase();
        const previousQuery = context.previousQueries[context.previousQueries.length - 1]?.toLowerCase() || '';
        if (this.isNewTopic(query, previousQuery)) {
            return {
                type: 'new_topic',
                confidence: 0.8,
                reasoning: 'Query appears to introduce a new topic'
            };
        }
        if (this.isContinuation(query, previousQuery)) {
            return {
                type: 'continuation',
                confidence: 0.9,
                reasoning: 'Query continues the previous topic'
            };
        }
        if (this.isClarification(query)) {
            return {
                type: 'clarification',
                confidence: 0.85,
                reasoning: 'Query seeks clarification'
            };
        }
        return {
            type: 'refinement',
            confidence: 0.7,
            reasoning: 'Query refines or narrows the search'
        };
    }
    isNewTopic(query, previousQuery) {
        const newTopicIndicators = ['new', 'different', 'another', 'find', 'search', 'show me'];
        return newTopicIndicators.some(indicator => query.includes(indicator));
    }
    isContinuation(query, previousQuery) {
        const continuationIndicators = ['also', 'and', 'plus', 'additionally', 'more'];
        return continuationIndicators.some(indicator => query.includes(indicator));
    }
    isClarification(query) {
        const clarificationIndicators = ['what', 'which', 'how', 'where', 'when', 'why'];
        return clarificationIndicators.some(indicator => query.includes(indicator));
    }
    async resolveEntityReferences(context) {
        const entities = [];
        const query = context.query.toLowerCase();
        if (query.includes('first') || query.includes('1st') || query.includes('1')) {
            if (context.previousResults[0]) {
                entities.push({
                    type: 'POI',
                    entity: context.previousResults[0].title,
                    confidence: 0.9,
                    source: 'explicit'
                });
            }
        }
        if (query.includes('second') || query.includes('2nd') || query.includes('2')) {
            if (context.previousResults[1]) {
                entities.push({
                    type: 'POI',
                    entity: context.previousResults[1].title,
                    confidence: 0.9,
                    source: 'explicit'
                });
            }
        }
        if (query.includes('last')) {
            const lastResult = context.previousResults[context.previousResults.length - 1];
            if (lastResult) {
                entities.push({
                    type: 'POI',
                    entity: lastResult.title,
                    confidence: 0.9,
                    source: 'explicit'
                });
            }
        }
        if (query.includes('restaurant')) {
            const restaurant = context.previousResults.find(r => r.category?.toLowerCase().includes('restaurant'));
            if (restaurant) {
                entities.push({
                    type: 'POI',
                    entity: restaurant.title,
                    confidence: 0.8,
                    source: 'implicit'
                });
            }
        }
        if (query.includes('that') || query.includes('this') || query.includes('it')) {
            const mostRecent = context.previousResults[0];
            if (mostRecent) {
                entities.push({
                    type: 'POI',
                    entity: mostRecent.title,
                    confidence: 0.7,
                    source: 'inferred'
                });
            }
        }
        return entities;
    }
    async detectImplicitReferences(context) {
        const references = [];
        const query = context.query.toLowerCase();
        if (query.includes('today') || query.includes('now')) {
            references.push({
                type: 'time',
                value: 'today',
                confidence: 0.9
            });
        }
        if (query.includes('tomorrow')) {
            references.push({
                type: 'time',
                value: 'tomorrow',
                confidence: 0.9
            });
        }
        if (query.includes('here') || query.includes('nearby')) {
            if (context.userProfile?.location) {
                references.push({
                    type: 'location',
                    value: context.userProfile.location,
                    confidence: 0.8
                });
            }
        }
        return references;
    }
    async determineIntent(context, targetEntities, implicitReferences) {
        const query = context.query.toLowerCase();
        if (query.includes('when') || query.includes('time') || query.includes('open') || query.includes('closed')) {
            return 'time';
        }
        if (query.includes('where') || query.includes('address') || query.includes('location')) {
            return 'location';
        }
        if (query.includes('phone') || query.includes('contact') || query.includes('call')) {
            return 'contact';
        }
        if (query.includes('what') || query.includes('tell me') || query.includes('about')) {
            return 'details';
        }
        if (query.includes('book') || query.includes('reserve') || query.includes('table')) {
            return 'booking';
        }
        if (query.includes('compare') || query.includes('better') || query.includes('vs')) {
            return 'comparison';
        }
        if (query.includes('find') || query.includes('search') || query.includes('show me')) {
            return 'new_search';
        }
        if (query.includes('?') || query.includes('what') || query.includes('how') || query.includes('which')) {
            return 'clarification';
        }
        return 'details';
    }
    async generateSuggestedActions(context, intent, targetEntities) {
        const actions = [];
        switch (intent) {
            case 'time':
                actions.push({
                    action: 'show_hours',
                    priority: 1,
                    reasoning: 'User is asking about opening times'
                });
                break;
            case 'location':
                actions.push({
                    action: 'show_location',
                    priority: 1,
                    reasoning: 'User is asking about location/address'
                });
                break;
            case 'contact':
                actions.push({
                    action: 'show_contact',
                    priority: 1,
                    reasoning: 'User is asking for contact information'
                });
                break;
            case 'details':
                actions.push({
                    action: 'show_details',
                    priority: 1,
                    reasoning: 'User wants more information'
                });
                break;
            case 'booking':
                actions.push({
                    action: 'show_booking',
                    priority: 1,
                    reasoning: 'User wants to make a booking'
                });
                break;
        }
        if (targetEntities.length > 0) {
            actions.push({
                action: 'highlight_entity',
                priority: 2,
                reasoning: 'Highlight the specific entity being referenced'
            });
        }
        return actions;
    }
    determineFollowUpStatus(semanticSimilarity, conversationFlow, targetEntities, context) {
        if (semanticSimilarity > 0.7) {
            return true;
        }
        if (conversationFlow.type === 'continuation' || conversationFlow.type === 'clarification') {
            return true;
        }
        if (targetEntities.length > 0) {
            return true;
        }
        if (context.previousResults.length > 0 && semanticSimilarity > 0.5) {
            return true;
        }
        return false;
    }
    calculateOverallConfidence(semanticSimilarity, conversationFlow, targetEntities) {
        let confidence = 0.5;
        confidence += semanticSimilarity * 0.3;
        confidence += conversationFlow.confidence * 0.2;
        if (targetEntities.length > 0) {
            confidence += 0.2;
        }
        return Math.min(confidence, 1.0);
    }
    getFallbackAnalysis(context) {
        return {
            isFollowUp: false,
            confidence: 0.5,
            intent: 'new_search',
            targetEntities: [],
            conversationFlow: {
                type: 'new_topic',
                confidence: 0.5,
                reasoning: 'Fallback analysis'
            },
            implicitReferences: [],
            suggestedActions: []
        };
    }
}
exports.AdvancedSemanticDetector = AdvancedSemanticDetector;
//# sourceMappingURL=advancedSemanticDetector.js.map