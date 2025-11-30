"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchFlowLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || 'info';
const logsDir = path_1.default.join(process.cwd(), 'logs');
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'chatbot-api' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
        new winston_1.default.transports.File({ filename: 'logs/search-flow.log', level: 'info' }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
exports.logger.info('');
exports.logger.info('');
exports.logger.info('');
class SearchFlowLogger {
    constructor() {
        this.searchId = '';
    }
    static getInstance() {
        if (!SearchFlowLogger.instance) {
            SearchFlowLogger.instance = new SearchFlowLogger();
        }
        return SearchFlowLogger.instance;
    }
    startSearchFlow(query, sessionId) {
        this.searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        exports.logger.info('');
        exports.logger.info('');
        exports.logger.info('');
        exports.logger.info(`[${this.searchId}] SEARCH_FLOW_START`, {
            query,
            sessionId,
            timestamp: new Date().toISOString(),
            step: 'REQUEST_RECEIVED'
        });
        return this.searchId;
    }
    logStep(step, data) {
        exports.logger.info(`[${this.searchId}] SEARCH_FLOW_STEP`, {
            step,
            data,
            timestamp: new Date().toISOString()
        });
    }
    logDatabaseQuery(collectionName, embeddingLength, maxResults) {
        exports.logger.info(`[${this.searchId}] DATABASE_QUERY`, {
            collectionName,
            embeddingLength,
            maxResults,
            timestamp: new Date().toISOString()
        });
    }
    logSearchResults(rawResults, processedCount) {
        exports.logger.info(`[${this.searchId}] SEARCH_RESULTS`, {
            rawDocumentCount: rawResults.documents?.[0]?.length || 0,
            processedCount,
            distances: rawResults.distances?.[0]?.slice(0, 5) || [],
            ids: rawResults.ids?.[0]?.slice(0, 5) || [],
            timestamp: new Date().toISOString()
        });
    }
    logQueryDetection(detection, previousResults) {
        exports.logger.info(`[${this.searchId}] QUERY_DETECTION`, {
            detectedType: detection.searchType,
            confidence: detection.confidence,
            targetPOI: detection.targetPOI,
            previousResultsCount: previousResults.length,
            previousResults: previousResults.slice(0, 3).map(r => ({ title: r.title, category: r.category })),
            timestamp: new Date().toISOString()
        });
    }
    logEmbeddingGeneration(query, embeddingLength, timeMs) {
        exports.logger.info(`[${this.searchId}] EMBEDDING_GENERATION`, {
            query,
            embeddingLength,
            timeMs,
            timestamp: new Date().toISOString()
        });
    }
    logMistralRequest(query) {
        exports.logger.info(`[${this.searchId}] MISTRAL_REQUEST`, {
            query,
            timestamp: new Date().toISOString(),
            step: 'SENDING_TO_MISTRAL'
        });
    }
    logMistralResponse(embedding, timeMs) {
        exports.logger.info(`[${this.searchId}] MISTRAL_RESPONSE`, {
            embeddingLength: embedding.length,
            firstFewValues: embedding.slice(0, 5),
            timeMs,
            timestamp: new Date().toISOString(),
            step: 'MISTRAL_RESPONSE_RECEIVED'
        });
    }
    logSortingAndRanking(results, sortingCriteria) {
        exports.logger.info(`[${this.searchId}] SORTING_AND_RANKING`, {
            totalResults: results.length,
            sortingCriteria,
            topResults: results.slice(0, 3).map(r => ({
                title: r.title,
                score: r.relevanceScore,
                category: r.category
            })),
            timestamp: new Date().toISOString(),
            step: 'SORTING_COMPLETE'
        });
    }
    logResultFiltering(filteredResults, originalCount, filterCriteria) {
        exports.logger.info(`[${this.searchId}] RESULT_FILTERING`, {
            originalCount,
            filteredCount: filteredResults.length,
            filterCriteria,
            timestamp: new Date().toISOString(),
            step: 'FILTERING_COMPLETE'
        });
    }
    logSessionUpdate(sessionId, contextUpdate) {
        exports.logger.info(`[${this.searchId}] SESSION_UPDATE`, {
            sessionId,
            contextUpdate,
            timestamp: new Date().toISOString()
        });
    }
    logFinalResponse(response, totalTimeMs) {
        exports.logger.info(`[${this.searchId}] SEARCH_FLOW_COMPLETE`, {
            success: response.success,
            resultCount: response.data?.results?.length || 0,
            searchType: response.data?.searchType,
            totalTimeMs,
            timestamp: new Date().toISOString()
        });
        exports.logger.info('');
        exports.logger.info('');
        exports.logger.info('');
    }
    logError(error, step) {
        exports.logger.error(`[${this.searchId}] SEARCH_FLOW_ERROR`, {
            step,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        exports.logger.error('');
        exports.logger.error('');
        exports.logger.error('');
    }
    logScoringBreakdown(results, scoringWeights) {
        exports.logger.info(`[${this.searchId}] SCORING_BREAKDOWN`, {
            totalResults: results.length,
            scoringWeights,
            topResults: results.slice(0, 3).map(r => ({
                title: r.title,
                smartScore: r.smartScore,
                breakdown: r.scoringBreakdown
            })),
            timestamp: new Date().toISOString()
        });
    }
    logPerformanceMetrics(searchTime, embeddingTime, scoringTime, totalResults) {
        exports.logger.info(`[${this.searchId}] PERFORMANCE_METRICS`, {
            searchTime,
            embeddingTime,
            scoringTime,
            totalResults,
            avgTimePerResult: searchTime / totalResults,
            timestamp: new Date().toISOString()
        });
    }
    logFilteringDecisions(originalCount, filteredCount, filterCriteria) {
        exports.logger.info(`[${this.searchId}] FILTERING_DECISIONS`, {
            originalCount,
            filteredCount,
            filterCriteria,
            filterEfficiency: ((originalCount - filteredCount) / originalCount * 100).toFixed(2) + '%',
            timestamp: new Date().toISOString()
        });
    }
    logCacheHit(cacheKey, hitTime) {
        exports.logger.info(`[${this.searchId}] CACHE_HIT`, {
            cacheKey: cacheKey.substring(0, 20) + '...',
            hitTime,
            timestamp: new Date().toISOString()
        });
    }
    logCacheMiss(cacheKey, missReason) {
        exports.logger.info(`[${this.searchId}] CACHE_MISS`, {
            cacheKey: cacheKey.substring(0, 20) + '...',
            missReason,
            timestamp: new Date().toISOString()
        });
    }
    logScoringMetrics(metrics) {
        exports.logger.info(`[${this.searchId}] SCORING_METRICS`, {
            ...metrics,
            timestamp: new Date().toISOString()
        });
    }
}
exports.SearchFlowLogger = SearchFlowLogger;
//# sourceMappingURL=logger.js.map