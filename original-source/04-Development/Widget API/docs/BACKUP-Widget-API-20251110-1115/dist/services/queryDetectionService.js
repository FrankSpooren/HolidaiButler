"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryDetectionService = void 0;
const logger_1 = require("../config/logger");
const semanticFollowUpDetector_1 = require("./semanticFollowUpDetector");
const intentRecognitionService_1 = require("./intentRecognitionService");
class QueryDetectionService {
    constructor() {
        this.positionalPatterns = [
            { regex: /(?:the\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)/i, index: 0 },
            { regex: /(?:the\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)/i, index: 1 },
            { regex: /(?:the\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)/i, index: 2 },
            { regex: /(?:the\s+)?(?:fourth|4th|4)\s+(?:one|place|restaurant|hotel)/i, index: 3 },
            { regex: /(?:the\s+)?(?:fifth|5th|5)\s+(?:one|place|restaurant|hotel)/i, index: 4 },
            { regex: /(?:the\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)/i, index: -1 },
            { regex: /(?:that\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)/i, index: 0 },
            { regex: /(?:that\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)/i, index: 1 },
            { regex: /(?:that\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)/i, index: 2 },
            { regex: /(?:that\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)/i, index: -1 },
            { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 0 },
            { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 1 },
            { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: 2 },
            { regex: /(?:when\s+is\s+)?(?:that\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)\s+(?:open|available)(?:\s+today)?/i, index: -1 }
        ];
        this.semanticPatterns = [
            { keywords: ['mediterranean', 'mediterraneo'], poi: 'Casa Pepe' },
            { keywords: ['beach', 'playa', 'coastal'], poi: 'El Pescador' },
            { keywords: ['boutique', 'small', 'intimate'], poi: 'Boutique Casa Lapicida' },
            { keywords: ['pool', 'swimming', 'aqua'], poi: 'Aquasports' },
            { keywords: ['camper', 'camping', 'rv'], poi: 'Mediterranean Camper Area' }
        ];
        this.followUpPatterns = [
            /which\s+(?:one|of\s+these|is\s+the\s+best|is\s+better)/i,
            /tell\s+me\s+more\s+about/i,
            /more\s+details\s+about/i,
            /what\s+about/i,
            /how\s+about/i,
            /can\s+you\s+tell\s+me\s+more/i,
            /give\s+me\s+more\s+info/i,
            /which\s+of\s+the/i,
            /among\s+these/i,
            /from\s+the\s+list/i,
            /from\s+these/i,
            /of\s+the\s+ones\s+you\s+mentioned/i,
            /from\s+what\s+you\s+showed/i,
            /when\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
            /what\s+time\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
            /is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+open/i,
            /(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open|hours|available)/i,
            /when\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open\s+today|available\s+today)/i,
            /what\s+time\s+is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+(?:open\s+today|available\s+today)/i,
            /is\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)\s+open\s+today/i,
            /what\s+is\s+the\s+(?:address|phone|contact|rating|price|menu)\s+of\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i,
            /(?:address|phone|contact|rating|price|menu)\s+of\s+(?:that|the|this)\s+(?:first|second|third|last|one|place|restaurant|hotel)/i
        ];
        this.semanticDetector = new semanticFollowUpDetector_1.SemanticFollowUpDetector();
        this.intentRecognitionService = new intentRecognitionService_1.IntentRecognitionService();
    }
    async detectQueryType(query, previousResults = []) {
        let intentRecognition;
        try {
            intentRecognition = await this.intentRecognitionService.recognizeIntent(query, {
                lastResults: previousResults
            });
            logger_1.logger.info(`🎯 Intent recognized: ${intentRecognition.primaryIntent} (${intentRecognition.confidence})`);
        }
        catch (error) {
            logger_1.logger.warn('Intent recognition failed, continuing without intent context:', error);
        }
        logger_1.logger.info(`Detecting query type for: "${query}"`);
        logger_1.logger.debug(`Previous results available: ${previousResults.length}`, {
            previousResults: previousResults.slice(0, 3).map(r => ({ title: r.title, category: r.category }))
        });
        try {
            const semanticAnalysis = await this.semanticDetector.analyzeQuery(query, previousResults);
            if (semanticAnalysis.isFollowUp) {
                logger_1.logger.info(`🧠 SEMANTIC FOLLOW-UP DETECTED: "${query}"`, {
                    confidence: semanticAnalysis.confidence,
                    intent: semanticAnalysis.intent,
                    reasoning: semanticAnalysis.reasoning
                });
                let targetPOI = semanticAnalysis.targetPOI;
                if (targetPOI && ['first', 'second', 'third', 'last'].includes(targetPOI)) {
                    const resolvedPOI = await this.semanticDetector.resolvePositionalReference(query, previousResults);
                    targetPOI = resolvedPOI || undefined;
                }
                if (!targetPOI) {
                    const resolvedPOI = await this.semanticDetector.resolvePositionalReference(query, previousResults);
                    targetPOI = resolvedPOI || undefined;
                }
                if (targetPOI) {
                    logger_1.logger.info(`🎯 RESOLVED TARGET POI: ${targetPOI}`);
                    return {
                        searchType: 'specific',
                        targetPOI: targetPOI,
                        isSpecific: true,
                        confidence: semanticAnalysis.confidence,
                        intentRecognition
                    };
                }
                else {
                    logger_1.logger.info(`📋 GENERIC FOLLOW-UP: Using all previous results`);
                    return {
                        searchType: 'contextual',
                        targetPOI: undefined,
                        isSpecific: true,
                        confidence: semanticAnalysis.confidence,
                        intentRecognition
                    };
                }
            }
        }
        catch (error) {
            logger_1.logger.warn('Semantic analysis failed, falling back to regex patterns:', error);
            return this.fallbackDetection(query, previousResults, intentRecognition);
        }
        const positionalMatch = this.detectPositionalReference(query, previousResults);
        if (positionalMatch) {
            logger_1.logger.info(`Detected positional reference: ${positionalMatch}`);
            logger_1.logger.debug(`Positional match details:`, {
                query,
                match: positionalMatch,
                previousResultsCount: previousResults.length
            });
            return {
                searchType: 'specific',
                targetPOI: positionalMatch,
                isSpecific: true,
                confidence: 0.9,
                intentRecognition
            };
        }
        const directMatch = this.detectDirectPOIMention(query, previousResults);
        if (directMatch) {
            logger_1.logger.info(`Detected direct POI mention: ${directMatch}`);
            logger_1.logger.debug(`Direct match details:`, {
                query,
                match: directMatch,
                previousResultsCount: previousResults.length
            });
            return {
                searchType: 'specific',
                targetPOI: directMatch,
                isSpecific: true,
                confidence: 0.8,
                intentRecognition
            };
        }
        const semanticMatch = this.detectSemanticPOIMention(query, previousResults);
        if (semanticMatch) {
            logger_1.logger.info(`Detected semantic reference: ${semanticMatch}`);
            logger_1.logger.debug(`Semantic match details:`, {
                query,
                match: semanticMatch,
                previousResultsCount: previousResults.length
            });
            return {
                searchType: 'contextual',
                targetPOI: semanticMatch,
                isSpecific: true,
                confidence: 0.7,
                intentRecognition
            };
        }
        logger_1.logger.info('No specific patterns detected, using general search');
        logger_1.logger.debug(`General search fallback:`, {
            query,
            previousResultsCount: previousResults.length,
            extractedEntities: this.extractEntities(query)
        });
        return {
            searchType: 'general',
            targetPOI: undefined,
            isSpecific: false,
            confidence: 0.5,
            intentRecognition
        };
    }
    detectPositionalReference(query, previousResults) {
        const queryLower = query.toLowerCase();
        for (const pattern of this.positionalPatterns) {
            if (pattern.regex.test(queryLower)) {
                const targetIndex = pattern.index === -1 ? previousResults.length - 1 : pattern.index;
                if (targetIndex >= 0 && targetIndex < previousResults.length) {
                    return previousResults[targetIndex].title || previousResults[targetIndex].name;
                }
            }
        }
        return null;
    }
    detectDirectPOIMention(query, previousResults) {
        const queryLower = query.toLowerCase();
        for (const result of previousResults) {
            const poiName = (result.title || result.name || '').toLowerCase();
            if (poiName && queryLower.includes(poiName)) {
                return result.title || result.name;
            }
        }
        return null;
    }
    detectSemanticPOIMention(query, previousResults) {
        const queryLower = query.toLowerCase();
        for (const pattern of this.semanticPatterns) {
            const hasKeyword = pattern.keywords.some(keyword => queryLower.includes(keyword));
            if (hasKeyword) {
                const foundPOI = previousResults.find(result => {
                    const poiName = (result.title || result.name || '').toLowerCase();
                    return poiName.includes(pattern.poi.toLowerCase());
                });
                if (foundPOI) {
                    return foundPOI.title || foundPOI.name;
                }
            }
        }
        return null;
    }
    createQueryInterpretation(detection, query) {
        const extractedEntities = this.extractEntities(query);
        logger_1.logger.info(`🔍 QUERY INTERPRETATION DEBUG:`, {
            hasIntentRecognition: !!detection.intentRecognition,
            intentRecognition: detection.intentRecognition ? {
                primaryIntent: detection.intentRecognition.primaryIntent,
                secondaryIntents: detection.intentRecognition.secondaryIntents,
                confidence: detection.intentRecognition.confidence
            } : null
        });
        return {
            detectedType: detection.searchType,
            extractedEntities,
            confidence: detection.confidence,
            ...(detection.targetPOI && { targetPOI: detection.targetPOI }),
            ...(detection.targetPOI && {
                positionalReference: {
                    type: 'numeric',
                    value: detection.targetPOI,
                    resolvedPOI: detection.targetPOI
                }
            }),
            ...(detection.intentRecognition && { intentRecognition: detection.intentRecognition })
        };
    }
    detectFollowUpQuestion(query, previousResults) {
        const queryLower = query.toLowerCase();
        const hasFollowUpPattern = this.followUpPatterns.some(pattern => pattern.test(query));
        const hasFollowUpIndicators = queryLower.includes('that') ||
            queryLower.includes('this') ||
            queryLower.includes('these') ||
            queryLower.includes('first') ||
            queryLower.includes('second') ||
            queryLower.includes('third') ||
            queryLower.includes('last') ||
            queryLower.includes('one') ||
            queryLower.includes('which') ||
            queryLower.includes('when') ||
            queryLower.includes('what time') ||
            queryLower.includes('open') ||
            queryLower.includes('hours') ||
            queryLower.includes('address') ||
            queryLower.includes('phone') ||
            queryLower.includes('rating') ||
            queryLower.includes('price') ||
            queryLower.includes('menu');
        const isNewSearch = queryLower.includes('new') ||
            queryLower.includes('different') ||
            queryLower.includes('other') ||
            queryLower.includes('another') ||
            queryLower.includes('more options') ||
            queryLower.includes('show me') ||
            queryLower.includes('find me') ||
            queryLower.includes('search for');
        const isStrongFollowUp = hasFollowUpPattern || (hasFollowUpIndicators && !isNewSearch);
        if (isStrongFollowUp && previousResults && previousResults.length > 0) {
            return true;
        }
        if (isStrongFollowUp && (!previousResults || previousResults.length === 0)) {
            logger_1.logger.warn(`Strong follow-up indicators detected but no previous results available for query: "${query}"`);
            return true;
        }
        return false;
    }
    fallbackDetection(query, previousResults, intentRecognition) {
        logger_1.logger.info('Using fallback regex-based detection');
        const isFollowUp = this.detectFollowUpQuestion(query, previousResults);
        if (isFollowUp) {
            logger_1.logger.info(`Detected follow-up question: "${query}"`);
            const positionalMatch = this.detectPositionalReference(query, previousResults);
            if (positionalMatch) {
                logger_1.logger.info(`Detected positional reference in follow-up: ${positionalMatch}`);
                return {
                    searchType: 'specific',
                    targetPOI: positionalMatch,
                    isSpecific: true,
                    confidence: 0.95,
                    intentRecognition
                };
            }
            const directMatch = this.detectDirectPOIMention(query, previousResults);
            if (directMatch) {
                logger_1.logger.info(`Detected direct POI mention in follow-up: ${directMatch}`);
                return {
                    searchType: 'specific',
                    targetPOI: directMatch,
                    isSpecific: true,
                    confidence: 0.9,
                    intentRecognition
                };
            }
            logger_1.logger.info(`Generic follow-up question detected`);
            return {
                searchType: 'contextual',
                targetPOI: undefined,
                isSpecific: true,
                confidence: 0.8,
                intentRecognition
            };
        }
        const positionalMatch = this.detectPositionalReference(query, previousResults);
        if (positionalMatch) {
            logger_1.logger.info(`Detected positional reference: ${positionalMatch}`);
            return {
                searchType: 'specific',
                targetPOI: positionalMatch,
                isSpecific: true,
                confidence: 0.9,
                intentRecognition
            };
        }
        const directMatch = this.detectDirectPOIMention(query, previousResults);
        if (directMatch) {
            logger_1.logger.info(`Detected direct POI mention: ${directMatch}`);
            return {
                searchType: 'specific',
                targetPOI: directMatch,
                isSpecific: true,
                confidence: 0.8,
                intentRecognition
            };
        }
        const semanticMatch = this.detectSemanticPOIMention(query, previousResults);
        if (semanticMatch) {
            logger_1.logger.info(`Detected semantic reference: ${semanticMatch}`);
            return {
                searchType: 'contextual',
                targetPOI: semanticMatch,
                isSpecific: true,
                confidence: 0.7,
                intentRecognition
            };
        }
        logger_1.logger.info('No specific patterns detected, using general search');
        return {
            searchType: 'general',
            targetPOI: undefined,
            isSpecific: false,
            confidence: 0.5,
            intentRecognition
        };
    }
    extractEntities(query) {
        const words = query.toLowerCase().split(' ');
        const stopWords = ['the', 'and', 'or', 'but', 'for', 'with', 'from', 'that', 'this', 'a', 'an', 'in', 'on', 'at', 'to', 'of'];
        return words
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 0);
    }
}
exports.QueryDetectionService = QueryDetectionService;
//# sourceMappingURL=queryDetectionService.js.map