"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticFollowUpDetector = void 0;
const mistralService_1 = require("./mistralService");
const logger_1 = require("../config/logger");
class SemanticFollowUpDetector {
    constructor() {
        this.mistralService = new mistralService_1.MistralService();
    }
    async analyzeQuery(query, previousResults) {
        if (!previousResults || previousResults.length === 0) {
            return {
                isFollowUp: false,
                confidence: 1.0,
                reasoning: 'No previous results available',
                intent: 'new_search'
            };
        }
        try {
            const contextSummary = this.createContextSummary(previousResults);
            const analysis = await this.analyzeWithMistral(query, contextSummary);
            logger_1.logger.info(`🧠 SEMANTIC FOLLOW-UP ANALYSIS:`, {
                query,
                isFollowUp: analysis.isFollowUp,
                confidence: analysis.confidence,
                intent: analysis.intent,
                reasoning: analysis.reasoning
            });
            return analysis;
        }
        catch (error) {
            logger_1.logger.error('Failed to analyze query semantically:', error);
            return this.fallbackAnalysis(query, previousResults);
        }
    }
    createContextSummary(previousResults) {
        const topResults = previousResults.slice(0, 3);
        const summary = topResults.map((result, index) => `${index + 1}. ${result.title} (${result.category})`).join('\n');
        return `Previous search results:\n${summary}`;
    }
    async analyzeWithMistral(query, contextSummary) {
        const queryLower = query.toLowerCase();
        const strongFollowUpIndicators = [
            'that', 'this', 'it', 'the first', 'the second', 'the third', 'the last',
            'when', 'where', 'how much', 'what time', 'address', 'phone', 'open',
            'closed', 'hours', 'price', 'cost', 'rating', 'tell me more', 'show me'
        ];
        const newSearchIndicators = [
            'find', 'search', 'show me', 'new', 'another', 'different'
        ];
        let intent = 'general';
        if (queryLower.includes('when') || queryLower.includes('time') || queryLower.includes('open') || queryLower.includes('closed')) {
            intent = 'time';
        }
        else if (queryLower.includes('address') || queryLower.includes('where') || queryLower.includes('location')) {
            intent = 'location';
        }
        else if (queryLower.includes('phone') || queryLower.includes('contact') || queryLower.includes('call')) {
            intent = 'contact';
        }
        else if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('how much')) {
            intent = 'details';
        }
        else if (queryLower.includes('find') || queryLower.includes('search') || queryLower.includes('show me')) {
            intent = 'new_search';
        }
        const hasFollowUpIndicators = strongFollowUpIndicators.some(indicator => queryLower.includes(indicator));
        const hasNewSearchIndicators = newSearchIndicators.some(indicator => queryLower.includes(indicator));
        const isFollowUp = hasFollowUpIndicators && !hasNewSearchIndicators;
        let targetPOI;
        if (queryLower.includes('first') || queryLower.includes('1st') || queryLower.includes('1')) {
            targetPOI = 'first';
        }
        else if (queryLower.includes('second') || queryLower.includes('2nd') || queryLower.includes('2')) {
            targetPOI = 'second';
        }
        else if (queryLower.includes('third') || queryLower.includes('3rd') || queryLower.includes('3')) {
            targetPOI = 'third';
        }
        else if (queryLower.includes('last')) {
            targetPOI = 'last';
        }
        return {
            isFollowUp,
            confidence: isFollowUp ? 0.8 : 0.6,
            reasoning: isFollowUp ? 'Detected follow-up indicators' : 'No follow-up indicators found',
            targetPOI,
            intent
        };
    }
    fallbackAnalysis(query, previousResults) {
        const queryLower = query.toLowerCase();
        const followUpIndicators = [
            'that', 'this', 'it', 'the first', 'the second', 'the last',
            'when', 'where', 'how much', 'what time', 'address', 'phone',
            'open', 'closed', 'hours', 'price', 'cost', 'rating'
        ];
        const hasIndicators = followUpIndicators.some(indicator => queryLower.includes(indicator));
        const isNewSearch = queryLower.includes('find') ||
            queryLower.includes('search') ||
            queryLower.includes('show me') ||
            queryLower.includes('new');
        return {
            isFollowUp: hasIndicators && !isNewSearch,
            confidence: 0.6,
            reasoning: 'Fallback heuristic analysis',
            intent: hasIndicators ? 'general' : 'new_search'
        };
    }
    async resolvePositionalReference(query, previousResults) {
        if (previousResults.length === 0)
            return null;
        try {
            const queryLower = query.toLowerCase();
            if (queryLower.includes('first') || queryLower.includes('1st') || queryLower.includes('1')) {
                return previousResults[0]?.title || null;
            }
            else if (queryLower.includes('second') || queryLower.includes('2nd') || queryLower.includes('2')) {
                return previousResults[1]?.title || null;
            }
            else if (queryLower.includes('third') || queryLower.includes('3rd') || queryLower.includes('3')) {
                return previousResults[2]?.title || null;
            }
            else if (queryLower.includes('last')) {
                return previousResults[previousResults.length - 1]?.title || null;
            }
            if (queryLower.includes('restaurant')) {
                const restaurant = previousResults.find(r => r.category?.toLowerCase().includes('restaurant') ||
                    r.title?.toLowerCase().includes('restaurant'));
                return restaurant?.title || null;
            }
            if (queryLower.includes('hotel')) {
                const hotel = previousResults.find(r => r.category?.toLowerCase().includes('hotel') ||
                    r.title?.toLowerCase().includes('hotel'));
                return hotel?.title || null;
            }
            if (queryLower.includes('that') || queryLower.includes('this') || queryLower.includes('it')) {
                return previousResults[0]?.title || null;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to resolve positional reference:', error);
            return null;
        }
    }
}
exports.SemanticFollowUpDetector = SemanticFollowUpDetector;
//# sourceMappingURL=semanticFollowUpDetector.js.map