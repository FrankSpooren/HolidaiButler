import winston from 'winston';
export declare const logger: winston.Logger;
export declare class SearchFlowLogger {
    private static instance;
    private searchId;
    static getInstance(): SearchFlowLogger;
    startSearchFlow(query: string, sessionId: string): string;
    logStep(step: string, data: any): void;
    logDatabaseQuery(collectionName: string, embeddingLength: number, maxResults: number): void;
    logSearchResults(rawResults: any, processedCount: number): void;
    logQueryDetection(detection: any, previousResults: any[]): void;
    logEmbeddingGeneration(query: string, embeddingLength: number, timeMs: number): void;
    logMistralRequest(query: string): void;
    logMistralResponse(embedding: number[], timeMs: number): void;
    logSortingAndRanking(results: any[], sortingCriteria: any): void;
    logResultFiltering(filteredResults: any[], originalCount: number, filterCriteria: any): void;
    logSessionUpdate(sessionId: string, contextUpdate: any): void;
    logFinalResponse(response: any, totalTimeMs: number): void;
    logError(error: any, step: string): void;
    logScoringBreakdown(results: any[], scoringWeights: any): void;
    logPerformanceMetrics(searchTime: number, embeddingTime: number, scoringTime: number, totalResults: number): void;
    logFilteringDecisions(originalCount: number, filteredCount: number, filterCriteria: any): void;
    logCacheHit(cacheKey: string, hitTime: number): void;
    logCacheMiss(cacheKey: string, missReason: string): void;
    logScoringMetrics(metrics: any): void;
}
//# sourceMappingURL=logger.d.ts.map