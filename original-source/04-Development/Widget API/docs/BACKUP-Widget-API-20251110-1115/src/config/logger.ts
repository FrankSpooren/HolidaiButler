import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chatbot-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/search-flow.log', level: 'info' }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add empty lines at the start of log files for better readability
logger.info('');
logger.info('');
logger.info('');

// Enhanced logging functions for search flow tracking
export class SearchFlowLogger {
  private static instance: SearchFlowLogger;
  private searchId: string = '';

  static getInstance(): SearchFlowLogger {
    if (!SearchFlowLogger.instance) {
      SearchFlowLogger.instance = new SearchFlowLogger();
    }
    return SearchFlowLogger.instance;
  }

  startSearchFlow(query: string, sessionId: string): string {
    this.searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add empty lines before each search flow
    logger.info('');
    logger.info('');
    logger.info('');
    
    logger.info(`[${this.searchId}] SEARCH_FLOW_START`, {
      query,
      sessionId,
      timestamp: new Date().toISOString(),
      step: 'REQUEST_RECEIVED'
    });
    return this.searchId;
  }

  logStep(step: string, data: any): void {
    logger.info(`[${this.searchId}] SEARCH_FLOW_STEP`, {
      step,
      data,
      timestamp: new Date().toISOString()
    });
  }

  logDatabaseQuery(collectionName: string, embeddingLength: number, maxResults: number): void {
    logger.info(`[${this.searchId}] DATABASE_QUERY`, {
      collectionName,
      embeddingLength,
      maxResults,
      timestamp: new Date().toISOString()
    });
  }

  logSearchResults(rawResults: any, processedCount: number): void {
    logger.info(`[${this.searchId}] SEARCH_RESULTS`, {
      rawDocumentCount: rawResults.documents?.[0]?.length || 0,
      processedCount,
      distances: rawResults.distances?.[0]?.slice(0, 5) || [],
      ids: rawResults.ids?.[0]?.slice(0, 5) || [],
      timestamp: new Date().toISOString()
    });
  }

  logQueryDetection(detection: any, previousResults: any[]): void {
    logger.info(`[${this.searchId}] QUERY_DETECTION`, {
      detectedType: detection.searchType,
      confidence: detection.confidence,
      targetPOI: detection.targetPOI,
      previousResultsCount: previousResults.length,
      previousResults: previousResults.slice(0, 3).map(r => ({ title: r.title, category: r.category })),
      timestamp: new Date().toISOString()
    });
  }

  logEmbeddingGeneration(query: string, embeddingLength: number, timeMs: number): void {
    logger.info(`[${this.searchId}] EMBEDDING_GENERATION`, {
      query,
      embeddingLength,
      timeMs,
      timestamp: new Date().toISOString()
    });
  }

  logMistralRequest(query: string): void {
    logger.info(`[${this.searchId}] MISTRAL_REQUEST`, {
      query,
      timestamp: new Date().toISOString(),
      step: 'SENDING_TO_MISTRAL'
    });
  }

  logMistralResponse(embedding: number[], timeMs: number): void {
    logger.info(`[${this.searchId}] MISTRAL_RESPONSE`, {
      embeddingLength: embedding.length,
      firstFewValues: embedding.slice(0, 5),
      timeMs,
      timestamp: new Date().toISOString(),
      step: 'MISTRAL_RESPONSE_RECEIVED'
    });
  }

  logSortingAndRanking(results: any[], sortingCriteria: any): void {
    logger.info(`[${this.searchId}] SORTING_AND_RANKING`, {
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

  logResultFiltering(filteredResults: any[], originalCount: number, filterCriteria: any): void {
    logger.info(`[${this.searchId}] RESULT_FILTERING`, {
      originalCount,
      filteredCount: filteredResults.length,
      filterCriteria,
      timestamp: new Date().toISOString(),
      step: 'FILTERING_COMPLETE'
    });
  }

  logSessionUpdate(sessionId: string, contextUpdate: any): void {
    logger.info(`[${this.searchId}] SESSION_UPDATE`, {
      sessionId,
      contextUpdate,
      timestamp: new Date().toISOString()
    });
  }

  logFinalResponse(response: any, totalTimeMs: number): void {
    logger.info(`[${this.searchId}] SEARCH_FLOW_COMPLETE`, {
      success: response.success,
      resultCount: response.data?.results?.length || 0,
      searchType: response.data?.searchType,
      totalTimeMs,
      timestamp: new Date().toISOString()
    });
    
    // Add spacing after complete search flow
    logger.info('');
    logger.info('');
    logger.info('');
  }

  logError(error: any, step: string): void {
    logger.error(`[${this.searchId}] SEARCH_FLOW_ERROR`, {
      step,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Add spacing after error
    logger.error('');
    logger.error('');
    logger.error('');
  }

  // Phase 1: Enhanced logging methods for multi-dimensional scoring
  logScoringBreakdown(results: any[], scoringWeights: any): void {
    logger.info(`[${this.searchId}] SCORING_BREAKDOWN`, {
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

  logPerformanceMetrics(searchTime: number, embeddingTime: number, scoringTime: number, totalResults: number): void {
    logger.info(`[${this.searchId}] PERFORMANCE_METRICS`, {
      searchTime,
      embeddingTime,
      scoringTime,
      totalResults,
      avgTimePerResult: searchTime / totalResults,
      timestamp: new Date().toISOString()
    });
  }

  logFilteringDecisions(originalCount: number, filteredCount: number, filterCriteria: any): void {
    logger.info(`[${this.searchId}] FILTERING_DECISIONS`, {
      originalCount,
      filteredCount,
      filterCriteria,
      filterEfficiency: ((originalCount - filteredCount) / originalCount * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    });
  }

  logCacheHit(cacheKey: string, hitTime: number): void {
    logger.info(`[${this.searchId}] CACHE_HIT`, {
      cacheKey: cacheKey.substring(0, 20) + '...',
      hitTime,
      timestamp: new Date().toISOString()
    });
  }

  logCacheMiss(cacheKey: string, missReason: string): void {
    logger.info(`[${this.searchId}] CACHE_MISS`, {
      cacheKey: cacheKey.substring(0, 20) + '...',
      missReason,
      timestamp: new Date().toISOString()
    });
  }

  logScoringMetrics(metrics: any): void {
    logger.info(`[${this.searchId}] SCORING_METRICS`, {
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }
}
