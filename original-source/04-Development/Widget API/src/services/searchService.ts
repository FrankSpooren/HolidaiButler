import { DatabaseService } from '../config/database';
import { MistralService } from './mistralService';
import { QueryDetectionService } from './queryDetectionService';
import { SessionService } from './sessionService';
import { ScoringService } from './scoringService';
import { DietaryIntentService } from './dietaryIntentService';
import { GeneralIntentService } from './generalIntentService';
import { TextResponseService } from './textResponseService';
import { SearchResponse, POIResult, SessionContext } from '../models';
import { UserContext } from '../models/ScoringModels';
import { logger, SearchFlowLogger } from '../config/logger';
import { OpeningHoursParser } from '../utils/openingHoursParser';

export interface SearchOptions {
  maxResults?: number;
  includeMetadata?: boolean;
  searchType?: 'auto' | 'general' | 'specific' | 'contextual';
  userContext?: UserContext; // New: for personalized scoring
  clientContext?: any; // Client-side session context
}

export class SearchService {
  private dbService: DatabaseService;
  private mistralService: MistralService;
  private queryDetectionService: QueryDetectionService;
  private sessionService: SessionService;
  private scoringService: ScoringService;
  private dietaryIntentService: DietaryIntentService;
  private generalIntentService: GeneralIntentService;
  private textResponseService: TextResponseService;

  constructor() {
    this.dbService = new DatabaseService();
    this.mistralService = new MistralService();
    this.queryDetectionService = new QueryDetectionService();
    this.sessionService = new SessionService();
    this.scoringService = new ScoringService();
    this.dietaryIntentService = new DietaryIntentService();
    this.generalIntentService = new GeneralIntentService();
    this.textResponseService = new TextResponseService();
  }

  async search(query: string, sessionId: string, userId?: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const flowLogger = SearchFlowLogger.getInstance();
    const searchId = flowLogger.startSearchFlow(query, sessionId);
    
    logger.info('🔧 SEARCH METHOD CALLED - Starting search flow...');
    
    try {
      logger.info(`Starting search for query: "${query}" in session: ${sessionId}`);
      
      // Ensure database is initialized
      if (!this.dbService.isReady()) {
        logger.info('Database not ready, initializing...');
        flowLogger.logStep('DATABASE_INIT', { status: 'initializing' });
        await this.dbService.connect();
        flowLogger.logStep('DATABASE_INIT', { status: 'ready' });
      }
      
      // Check if client provided session context
      let previousResults: any[] = [];
      let lastQuery = '';
      
      if (options.clientContext) {
        logger.info(`🔍 CLIENT SESSION CONTEXT PROVIDED:`);
        logger.info(`   📊 Last results count: ${options.clientContext.lastResults?.length || 0}`);
        logger.info(`   📝 Last query: ${options.clientContext.lastQuery || 'None'}`);
        logger.info(`   📚 Conversation history: ${options.clientContext.conversationHistory?.length || 0} entries`);
        logger.info(`   🏪 Mentioned POIs: ${options.clientContext.mentionedPOIs?.length || 0} total`);
        
        // Use client-provided context
        previousResults = options.clientContext.lastResults || [];
        lastQuery = options.clientContext.lastQuery || '';
        
        // For follow-up detection, we can use the full conversation history
        // But prefer lastResults if available (more complete data)
        if (previousResults.length === 0 && options.clientContext.conversationHistory && options.clientContext.conversationHistory.length > 0) {
          // Use the most recent results for immediate follow-up detection
          const latestEntry = options.clientContext.conversationHistory[options.clientContext.conversationHistory.length - 1];
          previousResults = latestEntry.results || previousResults;
          lastQuery = latestEntry.query || lastQuery;
        }
        
        logger.info(`📊 CLIENT CONTEXT: previousResults count = ${previousResults.length}, lastQuery = "${lastQuery}"`);
        
        flowLogger.logStep('CLIENT_SESSION_USED', { 
          lastResultsCount: previousResults.length,
          conversationHistoryLength: options.clientContext.conversationHistory?.length || 0,
          mentionedPOIsCount: options.clientContext.mentionedPOIs?.length || 0
        });
      } else {
        // Fallback to server-side session management
        let session = await this.sessionService.getSession(sessionId);
        if (!session) {
          logger.info(`Session ${sessionId} not found, creating new session`);
          flowLogger.logStep('SESSION_CREATE', { originalSessionId: sessionId, userId: userId || 'anonymous' });
          const newSessionId = await this.sessionService.createSession(userId || 'anonymous');
          session = await this.sessionService.getSession(newSessionId);
          if (!session) {
            throw new Error('Failed to create session');
          }
          // Update the sessionId to use the new session
          sessionId = newSessionId;
          flowLogger.logStep('SESSION_CREATE', { newSessionId, status: 'created' });
        } else {
          flowLogger.logStep('SESSION_RETRIEVED', { 
            sessionId, 
            conversationHistoryLength: session.conversationHistory.length,
            lastQuery: session.currentContext.lastQuery,
            lastResultsCount: session.currentContext.lastResults.length
          });
        }

        // Debug: Log session context
        logger.info(`🔍 SERVER SESSION CONTEXT DEBUG:`);
        logger.info(`   📊 Previous results count: ${session.currentContext.lastResults.length}`);
        logger.info(`   📝 Last query: ${session.currentContext.lastQuery}`);
        logger.info(`   🎯 Last search type: ${session.currentContext.searchType}`);
        if (session.currentContext.lastResults.length > 0) {
          logger.info(`   📋 Previous results: ${session.currentContext.lastResults.slice(0, 3).map(r => r.title).join(', ')}`);
        }
        
        previousResults = session.currentContext.lastResults;
        lastQuery = session.currentContext.lastQuery;
      }

      // Detect query type
    const detection = await this.queryDetectionService.detectQueryType(query, previousResults);
    flowLogger.logQueryDetection(detection, previousResults);
      logger.info(`Detected search type: ${detection.searchType} with confidence: ${detection.confidence}`);
      
      // Detect dietary intent
      const dietaryIntent = this.dietaryIntentService.detectDietaryIntent(query);
      logger.info(`🥗 DIETARY INTENT DETECTED: ${dietaryIntent.type} (confidence: ${dietaryIntent.confidence.toFixed(2)})`);
      
      // Detect general intent (comprehensive intent recognition)
      const generalIntent = this.generalIntentService.detectIntent(query);
      logger.info(`🧠 GENERAL INTENT DETECTED: ${generalIntent.primaryIntent} (${generalIntent.boosts.length} boosts, confidence: ${generalIntent.confidence.toFixed(2)})`);
      
      // Create enhanced user context with both dietary and general intent
      const baseUserContext = options.userContext || this.getDefaultUserContext();
      const enhancedUserContext: UserContext = {
        ...baseUserContext,
        ...(dietaryIntent.type !== 'none' ? { dietaryIntent } : {}),
        ...(generalIntent.boosts.length > 0 ? { generalIntent } : {})
      };
      
      let processedResults: POIResult[] = [];
      
      // Handle follow-up questions using previous results
      // Check if this is a follow-up: has previous results AND (isSpecific OR has targetPOI OR positional reference)
      const queryLower = query.toLowerCase();
      const hasPositionalRef = queryLower.match(/\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|one|two|three)\b/);
      const hasReferenceWord = queryLower.match(/\b(that|this|it|the)\b/);
      const hasOpeningQuery = queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours');
      
      // More comprehensive follow-up detection
      // If we have previous results and the query looks like a follow-up, treat it as one
      // SIMPLIFIED: If we have previous results AND query mentions opening hours, it's almost certainly a follow-up
      const hasOpeningKeywords = queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours');
      
      // AGGRESSIVE: If we have previous results, check multiple indicators
      let isFollowUp = previousResults.length > 0 && (
        detection.isSpecific || 
        detection.targetPOI || 
        hasPositionalRef ||
        (hasReferenceWord && hasOpeningQuery) ||
        (hasReferenceWord && queryLower.includes('phone')) ||
        (hasReferenceWord && queryLower.includes('address')) ||
        // Also check if query contains opening hours keywords with reference words
        (queryLower.includes('open') && (hasReferenceWord || hasPositionalRef)) ||
        (queryLower.includes('closed') && (hasReferenceWord || hasPositionalRef)) ||
        (queryLower.includes('hours') && (hasReferenceWord || hasPositionalRef)) ||
        // SIMPLE FALLBACK: If query has opening keywords and we have previous results, it's a follow-up
        hasOpeningKeywords ||
        // ULTIMATE FALLBACK: If query has "first one" or similar and we have previous results, it's a follow-up
        (queryLower.includes('first') && queryLower.includes('one')) ||
        (queryLower.includes('the') && (queryLower.includes('first') || queryLower.includes('one')))
      );
      
      logger.info(`🔍 Follow-up detection: previousResults=${previousResults.length}, isSpecific=${detection.isSpecific}, targetPOI=${detection.targetPOI}, hasPositional=${!!hasPositionalRef}, hasOpeningQuery=${hasOpeningQuery}, hasOpeningKeywords=${hasOpeningKeywords}, isFollowUp=${isFollowUp}`);
      
      // ULTIMATE SAFETY: If we have previous results and query has opening keywords, force follow-up
      if (!isFollowUp && previousResults.length > 0 && hasOpeningKeywords) {
        logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and opening keywords - FORCING follow-up`);
        isFollowUp = true;
      }
      
      // EXTRA SAFETY: If we have previous results and query mentions "first" or "one", force follow-up
      if (!isFollowUp && previousResults.length > 0 && (queryLower.includes('first') || queryLower.includes('one'))) {
        logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and positional reference - FORCING follow-up`);
        isFollowUp = true;
      }
      
      // FINAL SAFETY: If we have previous results and searchType is "specific", it's definitely a follow-up
      if (!isFollowUp && previousResults.length > 0 && detection.searchType === 'specific') {
        logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and searchType is specific - FORCING follow-up`);
        isFollowUp = true;
      }
      
      // ABSOLUTE FINAL CHECK: If searchType is "specific", it's ALWAYS a follow-up if we have any context
      // This is the most reliable indicator - if searchType is "specific", we know it's a follow-up
      if (!isFollowUp && detection.searchType === 'specific') {
        logger.error(`❌ CRITICAL: searchType is specific but isFollowUp is false! previousResults.length=${previousResults.length}`);
        
        // Try to get previousResults from clientContext if empty
        if (previousResults.length === 0 && options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
          logger.warn(`   previousResults is empty, re-extracting from clientContext...`);
          previousResults = options.clientContext.lastResults;
          logger.info(`   Re-extracted ${previousResults.length} previous results`);
        }
        
        // If we have previousResults now, force follow-up
        if (previousResults.length > 0) {
          logger.warn(`   FORCING follow-up based on searchType='specific' alone`);
          isFollowUp = true;
        } else {
          logger.error(`   ❌ Still no previousResults after re-extraction! clientContext.lastResults.length=${options.clientContext?.lastResults?.length || 0}`);
          // Even without previousResults, if searchType is "specific", try to get from session
          if (options.clientContext) {
            logger.warn(`   Attempting to use clientContext directly...`);
            // This shouldn't happen, but as last resort, we'll handle it in the else block
          }
        }
      }
      
      // SIMPLIFIED: If searchType is "specific", always treat as follow-up if we have ANY context
      // This ensures we never miss a follow-up when detection says it's "specific"
      if (detection.searchType === 'specific' && !isFollowUp) {
        // Double-check: if we have clientContext with lastResults, use it
        if (options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
          logger.warn(`   🔄 SIMPLIFIED CHECK: searchType='specific' + clientContext.lastResults exists, FORCING follow-up`);
          previousResults = options.clientContext.lastResults;
          isFollowUp = true;
        }
      }
      
      if (isFollowUp) {
        logger.info(`✅ FOLLOW-UP DETECTED: Handling follow-up question using previous results (${previousResults.length} available)`);
        logger.info(`   Follow-up indicators: isSpecific=${detection.isSpecific}, targetPOI=${detection.targetPOI}, hasPositional=${!!hasPositionalRef}, hasOpeningKeywords=${hasOpeningKeywords}`);
        flowLogger.logStep('FOLLOW_UP_PROCESSING', { 
          query, 
          previousResultsCount: previousResults.length,
          targetPOI: detection.targetPOI,
          isSpecific: detection.isSpecific
        });
        
        // Use previous results for follow-up questions
        processedResults = this.handleFollowUpQuestion(query, previousResults, detection, enhancedUserContext);
        logger.info(`   After handleFollowUpQuestion: ${processedResults.length} results`);
        
        // Safety check: if no results but we have previous results, use first one
        if (processedResults.length === 0 && previousResults.length > 0) {
          logger.warn(`⚠️ Follow-up returned no results, using first previous result as fallback`);
          // Directly create a POIResult from the first previous result
          const firstResult = previousResults[0];
          if (firstResult) {
            logger.info(`   Creating fallback POI from: ${firstResult.title || firstResult.name || 'unknown'}`);
            // Handle both POIResult and POIReference formats
            const metadata = firstResult.metadata || {};
            const fallbackPOI: POIResult = {
              id: firstResult.id || 'fallback',
              title: firstResult.title || firstResult.name || 'Unknown',
              subtitle: firstResult.subtitle || firstResult.category || '',
              category: firstResult.category || 'Unknown',
              relevanceScore: firstResult.relevanceScore || 0.5,
              searchType: 'follow-up',
              displayAsCard: true,
              displayReason: 'requested',
              metadata: {
                amenities: this.parseAmenities(firstResult.amenities || metadata.amenities || []),
                location: firstResult.location || firstResult.address || metadata.location || '',
                rating: firstResult.rating || metadata.rating || 0,
                description: firstResult.description || metadata.description || '',
                qaContent: firstResult.qaContent || metadata.qaContent || [],
                ...(firstResult.coordinates || metadata.coordinates ? { coordinates: firstResult.coordinates || metadata.coordinates } : {}),
                openingHours: firstResult.openingHours || metadata.openingHours,
                phone: firstResult.phone || metadata.phone,
                website: firstResult.website || metadata.website,
                rawMetadata: metadata.rawMetadata || firstResult.rawMetadata || firstResult
              }
            };
            processedResults = [fallbackPOI];
            logger.info(`   ✅ Fallback POI created: ${fallbackPOI.title}`);
          } else {
            logger.error(`   ❌ First result is null or undefined!`);
          }
        }
        
        flowLogger.logStep('FOLLOW_UP_PROCESSING', { 
          processedResultsCount: processedResults.length,
          status: 'completed'
        });
        
        // FINAL SAFETY: If we still have no results after all fallbacks, something is wrong
        if (processedResults.length === 0 && previousResults.length > 0) {
          logger.error(`❌ CRITICAL: Follow-up processing returned no results despite having ${previousResults.length} previous results!`);
          logger.error(`   Query: "${query}"`);
          logger.error(`   Previous results: ${JSON.stringify(previousResults.slice(0, 1).map(r => ({ id: r.id, title: r.title || r.name })))}`);
          // Force create a result from the first previous result
          const firstResult = previousResults[0];
          if (firstResult) {
            const emergencyPOI: POIResult = {
              id: firstResult.id || 'emergency',
              title: firstResult.title || firstResult.name || 'Unknown',
              subtitle: firstResult.subtitle || firstResult.category || '',
              category: firstResult.category || 'Unknown',
              relevanceScore: 0.5,
              searchType: 'follow-up',
              displayAsCard: true,
              displayReason: 'requested',
              metadata: {
                amenities: [],
                location: firstResult.metadata?.location || firstResult.location || '',
                rating: firstResult.metadata?.rating || firstResult.rating || 0,
                openingHours: firstResult.metadata?.openingHours || firstResult.openingHours,
                phone: firstResult.metadata?.phone || firstResult.phone,
                website: firstResult.metadata?.website || firstResult.website,
                rawMetadata: firstResult.metadata?.rawMetadata || firstResult.rawMetadata || firstResult
              }
            };
            processedResults = [emergencyPOI];
            logger.warn(`   ✅ Emergency POI created: ${emergencyPOI.title}`);
          }
        }
      } else {
        // Perform new database search for non-follow-up questions
        // BUT: If searchType is "specific" and we have previousResults, this is definitely a follow-up that wasn't detected
        logger.info(`🔍 ELSE BLOCK: searchType=${detection.searchType}, previousResults.length=${previousResults.length}, isFollowUp was false`);
        
        // Re-check clientContext if previousResults is empty but we have clientContext
        if (previousResults.length === 0 && options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
          logger.warn(`⚠️ previousResults is empty but clientContext has lastResults, re-extracting...`);
          previousResults = options.clientContext.lastResults;
          logger.info(`   Re-extracted ${previousResults.length} previous results from clientContext`);
        }
        
        if (detection.searchType === 'specific' && previousResults.length > 0) {
          logger.error(`❌ CRITICAL BUG: searchType is 'specific' but isFollowUp is false! This should never happen.`);
          logger.error(`   Query: "${query}"`);
          logger.error(`   previousResults.length: ${previousResults.length}`);
          logger.error(`   First result: ${previousResults[0]?.title || previousResults[0]?.name || 'unknown'}`);
          logger.error(`   FORCING follow-up processing as emergency measure`);
          
          // Force follow-up processing
          processedResults = this.handleFollowUpQuestion(query, previousResults, detection, enhancedUserContext);
          logger.info(`   After handleFollowUpQuestion: ${processedResults.length} results`);
          
          if (processedResults.length === 0 && previousResults.length > 0) {
            logger.warn(`   ⚠️ handleFollowUpQuestion returned empty, creating emergency POI`);
            const firstResult = previousResults[0];
            if (firstResult) {
              logger.info(`   Creating emergency POI from: ${firstResult.title || firstResult.name || 'unknown'}`);
              const metadata = firstResult.metadata || {};
              const emergencyPOI: POIResult = {
                id: firstResult.id || 'emergency',
                title: firstResult.title || firstResult.name || 'Unknown',
                subtitle: firstResult.subtitle || firstResult.category || '',
                category: firstResult.category || 'Unknown',
                relevanceScore: 0.5,
                searchType: 'follow-up',
                displayAsCard: true,
                displayReason: 'requested',
                metadata: {
                  amenities: this.parseAmenities(firstResult.amenities || metadata.amenities || []),
                  location: firstResult.metadata?.location || firstResult.location || metadata.location || '',
                  rating: firstResult.metadata?.rating || firstResult.rating || metadata.rating || 0,
                  openingHours: firstResult.metadata?.openingHours || firstResult.openingHours || metadata.openingHours,
                  phone: firstResult.metadata?.phone || firstResult.phone || metadata.phone,
                  website: firstResult.metadata?.website || firstResult.website || metadata.website,
                  rawMetadata: firstResult.metadata?.rawMetadata || firstResult.rawMetadata || firstResult
                }
              };
              processedResults = [emergencyPOI];
              logger.warn(`   ✅ Emergency POI created in else block: ${emergencyPOI.title}`);
            } else {
              logger.error(`   ❌ First result is null or undefined!`);
            }
          }
        } else {
          logger.info(`   Not triggering emergency fallback: searchType=${detection.searchType}, previousResults.length=${previousResults.length}`);
        }
        
        // Only perform database search if we don't have results yet
        if (processedResults.length === 0) {
          logger.info(`Performing new database search for query: "${query}"`);
          // Generate query embedding
          const embeddingStartTime = Date.now();
          const queryEmbedding = await this.mistralService.generateEmbedding(query);
          const embeddingTime = Date.now() - embeddingStartTime;
          flowLogger.logEmbeddingGeneration(query, queryEmbedding.length, embeddingTime);
          logger.info(`Generated embedding with ${queryEmbedding.length} dimensions in ${embeddingTime}ms`);
          
          // Search appropriate collection
          const collectionName = this.getCollectionName(detection.searchType);
          const maxResults = options.maxResults || 100; // Changed from 10 to 100
          flowLogger.logDatabaseQuery(collectionName, queryEmbedding.length, maxResults);
          const searchResults = await this.dbService.search(collectionName, queryEmbedding, maxResults);
          logger.info(`Found ${searchResults.documents?.[0]?.length || 0} results from ${collectionName} collection`);
          
          // Process and rank results with user context
          processedResults = this.processSearchResults(searchResults, detection, enhancedUserContext);
        }
      }
      
      // Filter results based on opening hours if time-sensitive query
      if (detection.intentRecognition?.intentContext.timeRelated && 
          detection.intentRecognition?.intentContext.openingHoursRelated) {
        const filteredResults = this.filterByOpeningStatus(processedResults, detection.intentRecognition);
        logger.info(`⏰ TIME-SENSITIVE FILTERING: ${processedResults.length} → ${filteredResults.length} results`);
        processedResults = filteredResults;
      }
      
      flowLogger.logSearchResults({ documents: [processedResults.map(r => r.title)] }, processedResults.length);
      logger.info(`Processed ${processedResults.length} results`);
      
      // Log detailed sorting and ranking information
      const sortingCriteria = {
        method: 'cosine_similarity',
        primaryFactor: 'embedding_distance',
        secondaryFactors: ['amenity_matching', 'category_relevance', 'rating_quality'],
        collection: detection.isSpecific ? 'follow-up' : this.getCollectionName(detection.searchType),
        searchType: detection.searchType
      };
      
      flowLogger.logSortingAndRanking(processedResults, sortingCriteria);
      logger.info(`🔍 SORTING & RANKING ANALYSIS:`);
      logger.info(`   📊 Method: Cosine similarity with embedding distance`);
      logger.info(`   🎯 Primary Factor: Embedding distance (1 - distance)`);
      logger.info(`   📈 Secondary Factors: Amenity matching, category relevance, rating quality`);
      logger.info(`   🏆 Top 3 Results:`);
      processedResults.slice(0, 3).forEach((result, index) => {
        logger.info(`      ${index + 1}. ${result.title} (Score: ${result.relevanceScore.toFixed(3)}, Category: ${result.category})`);
      });
      
      // Update session context (only for server-side sessions)
      const contextUpdate = {
        query,
        resultCount: processedResults.length,
        searchType: detection.searchType,
        topResults: processedResults.slice(0, 3).map(r => ({ title: r.title, category: r.category, score: r.relevanceScore }))
      };
      
      if (!options.clientContext) {
        // Only update server-side session if no client context provided
        // We need to get the session again since we might have created a new one
        const currentSession = await this.sessionService.getSession(sessionId);
        if (currentSession) {
          await this.updateSessionContext(currentSession, query, processedResults, detection);
          flowLogger.logSessionUpdate(sessionId, contextUpdate);
        }
      } else {
        logger.info(`📱 CLIENT SESSION: Skipping server-side session update (client manages context)`);
        flowLogger.logStep('CLIENT_SESSION_UPDATE_SKIPPED', contextUpdate);
      }
      
      // Calculate search time and log performance metrics
      const searchTime = Date.now() - startTime;
      
      // Log performance metrics (embedding time is 0 for follow-up questions)
      const embeddingTime = detection.isSpecific ? 0 : 0; // Will be calculated properly in the future
      flowLogger.logPerformanceMetrics(searchTime, embeddingTime, 0, processedResults.length);
      
      // Create query interpretation
      const queryInterpretation = this.queryDetectionService.createQueryInterpretation(detection, query);
      
      // Prepare response context
      let responseContext;
      if (options.clientContext) {
        // For client sessions, return updated context for client to store
        const displayedPOIIds = processedResults
          .filter(r => r.displayAsCard)
          .map(r => r.id);
        
        responseContext = {
          sessionId,
          userId: userId || 'anonymous',
          displayedPOIs: [
            ...(options.clientContext.displayedPOIs || []),
            ...displayedPOIIds
          ].filter((id, index, self) => self.indexOf(id) === index), // Remove duplicates
          lastDisplayedPOIs: displayedPOIIds,
          conversationTurn: (options.clientContext.conversationTurn || 0) + 1,
          clientContext: {
            lastQuery: query,
            lastResults: processedResults.slice(0, 5).map(r => ({
              id: r.id,
              title: r.title,
              category: r.category,
              relevanceScore: r.relevanceScore,
              metadata: r.metadata
            })),
            conversationHistory: [
              ...(options.clientContext.conversationHistory || []),
              {
                query,
                results: processedResults.slice(0, 5).map(r => ({
                  id: r.id,
                  title: r.title,
                  category: r.category,
                  relevanceScore: r.relevanceScore
                })),
                timestamp: new Date().toISOString()
              }
            ],
            mentionedPOIs: [
              ...(options.clientContext.mentionedPOIs || []),
              ...processedResults.slice(0, 5).map(r => ({
                id: r.id,
                title: r.title,
                category: r.category,
                relevanceScore: r.relevanceScore
              }))
            ].filter((poi, index, self) => 
              index === self.findIndex(p => p.id === poi.id)
            ), // Remove duplicates
            displayedPOIs: [
              ...(options.clientContext.displayedPOIs || []),
              ...displayedPOIIds
            ].filter((id, index, self) => self.indexOf(id) === index),
            lastDisplayedPOIs: displayedPOIIds,
            conversationTurn: (options.clientContext.conversationTurn || 0) + 1,
            sessionStartTime: options.clientContext.sessionStartTime || new Date().toISOString(),
            totalQueries: (options.clientContext.totalQueries || 0) + 1
          }
        };
      } else {
        // For server sessions, return server context
        const currentSession = await this.sessionService.getSession(sessionId);
        responseContext = {
          sessionId,
          userId: currentSession?.userId || userId || 'anonymous',
          conversationHistory: currentSession?.conversationHistory || [],
          currentContext: currentSession?.currentContext || {
            lastQuery: '',
            lastResults: [],
            searchType: 'general'
          },
          displayedPOIs: currentSession?.displayedPOIs || [],
          lastDisplayedPOIs: currentSession?.lastDisplayedPOIs || [],
          conversationTurn: currentSession?.conversationTurn ?? 0,
          ...(currentSession?.createdAt && { createdAt: currentSession.createdAt }),
          ...(currentSession?.lastAccessed && { lastAccessed: currentSession.lastAccessed })
        };
      }

      logger.info('🔧 About to start text response generation...');
      logger.info(`🔧 processedResults length: ${processedResults.length}`);
      logger.info(`🔧 detection.intentRecognition: ${JSON.stringify(detection.intentRecognition)}`);

      // Generate text response for the user
      let textResponse = '';
      logger.info('🔧 Starting text response generation...');
      try {
        // Enhance intent recognition for follow-up questions
        let intentResult = detection.intentRecognition;
        
        // If no intent recognition, create a basic one based on query
        if (!intentResult) {
          const queryLower = query.toLowerCase();
          intentResult = {
            primaryIntent: processedResults.length === 1 ? 'get_info' : 'search_poi',
            secondaryIntents: [],
            confidence: 0.7,
            extractedEntities: [],
            intentContext: {
              timeRelated: queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours'),
              locationRelated: queryLower.includes('where') || queryLower.includes('address') || queryLower.includes('location'),
              proximityRelated: false,
              openingHoursRelated: queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours'),
              contactRelated: queryLower.includes('phone') || queryLower.includes('contact') || queryLower.includes('call'),
              comparisonRelated: false
            },
            suggestedActions: []
          };
        }
        
        textResponse = await this.textResponseService.generateTextResponse({
          userQuery: query,
          intentResult: intentResult,
          pois: processedResults,
          userLocation: options.userContext?.currentLocation || undefined,
          currentTime: new Date()
        });
        logger.info(`📝 Generated text response: ${textResponse.substring(0, 100)}...`);
      } catch (error) {
        logger.error('❌ Failed to generate text response:', error);
        textResponse = `I found ${processedResults.length} places matching your search.`;
      }

      const response = {
        success: true,
        data: {
          results: processedResults,
          searchType: detection.searchType,
          queryInterpretation,
          context: responseContext,
          textResponse // Add the text response to the API response
        },
        metadata: {
          totalResults: processedResults.length,
          searchTime,
          embeddingType: detection.searchType
        }
      };
      
      flowLogger.logFinalResponse(response, searchTime);
      logger.info(`Search completed in ${searchTime}ms`);
      
      // Add spacing after complete search run
      logger.info('');
      logger.info('');
      logger.info('');
      
      return response;
      
    } catch (error) {
      flowLogger.logError(error, 'SEARCH_EXECUTION');
      logger.error('Search failed:', error);
      
      // Add spacing after error case
      logger.error('');
      logger.error('');
      logger.error('');
      
      return {
        success: false,
        data: {
          results: [],
          searchType: 'general',
          queryInterpretation: {
            detectedType: 'general',
            extractedEntities: [],
            confidence: 0
          },
          context: {
            sessionId,
            userId: 'unknown',
            conversationHistory: [],
            currentContext: {
              lastQuery: '',
              lastResults: [],
              searchType: 'general'
            }
          }
        },
        metadata: {
          totalResults: 0,
          searchTime: Date.now() - startTime,
          embeddingType: 'general'
        }
      };
    }
  }

  private getCollectionName(searchType: string): string {
    const collectionMap = {
      'general': 'general',
      'specific': 'specific',
      'contextual': 'contextual'
    };
    return collectionMap[searchType as keyof typeof collectionMap] || 'general';
  }

  private processSearchResults(searchResults: any, detection: any, userContext?: UserContext): POIResult[] {
    if (!searchResults.documents || !searchResults.documents[0]) {
      logger.warn('⚠️ No documents found in search results');
      return [];
    }

    logger.info(`📊 PROCESSING SEARCH RESULTS:`);
    logger.info(`   📄 Raw documents: ${searchResults.documents[0].length}`);
    logger.info(`   📊 Distances: [${searchResults.distances?.[0]?.slice(0, 5).map((d: number) => d.toFixed(3)).join(', ')}...]`);
    logger.info(`   🆔 IDs: [${searchResults.ids?.[0]?.slice(0, 3).join(', ')}...]`);

    const processedResults = searchResults.documents[0].map((doc: string, index: number) => {
      const metadata = searchResults.metadatas?.[0]?.[index] || {};
      const distance = searchResults.distances?.[0]?.[index] || 0;
      const relevanceScore = Math.max(0, 1 - distance);
      
      // Debug: Log opening hours for first 3 results
      if (index < 3) {
        logger.info(`🔍 Result ${index + 1} (${metadata.title || metadata.name}):`);
        logger.info(`   ALL METADATA KEYS: ${Object.keys(metadata).join(', ')}`);
        const openingHoursValue = metadata.opening_hours;
        if (openingHoursValue) {
          logger.info(`   ✅ Has opening_hours data: ${openingHoursValue.substring(0, 150)}...`);
        } else {
          logger.warn(`   ⚠️ No opening_hours field in metadata`);
          logger.info(`   Sample of metadata values: ${JSON.stringify(Object.keys(metadata).slice(0, 10))}`);
        }
      }
      
      const result: POIResult = {
        id: metadata.id || metadata.google_placeid || `poi_${index}`,
        title: metadata.title || metadata.name || 'Unknown POI',
        subtitle: metadata.subtitle || metadata.category || '',
        category: metadata.category || 'Unknown',
        relevanceScore,
        searchType: detection.searchType,
        displayAsCard: false, // Will be set by display service in later iteration
        metadata: {
          amenities: this.parseAmenities(metadata.amenities),
          location: metadata.address || metadata.location || '',
          rating: parseFloat(metadata.rating) || 0,
          description: metadata.description || doc,
          qaContent: this.parseQAContent(metadata.qaContent),
          phone: metadata.phone || metadata.phone_unformatted || metadata.phoneUnformatted,
          website: metadata.website,
          ...(metadata.lat && metadata.lng ? { coordinates: { lat: metadata.lat, lng: metadata.lng } } : {}),
          // Focus ONLY on opening_hours field
          openingHours: metadata.opening_hours,
          // IMPORTANT: Pass through raw metadata so parser can access opening_hours
          rawMetadata: metadata
        }
      };

      // Log individual result processing
      if (index < 3) {
        logger.info(`   🏪 Result ${index + 1}: ${result.title}`);
        logger.info(`      📊 Distance: ${distance.toFixed(3)} → Score: ${relevanceScore.toFixed(3)}`);
        logger.info(`      🏷️  Category: ${result.category}`);
        logger.info(`      ⭐ Rating: ${result.metadata.rating}`);
        logger.info(`      🍽️  Amenities: ${result.metadata.amenities.slice(0, 3).join(', ')}${result.metadata.amenities.length > 3 ? '...' : ''}`);
      }

      return result;
    });

    // Apply multi-dimensional scoring
    const scoringStartTime = Date.now();
    const scoredResults = processedResults.map((poi: POIResult) => {
      const smartScore = this.scoringService.calculateSmartScore(
        poi, 
        userContext || this.getDefaultUserContext()
      );
      return {
        ...poi,
        smartScore: smartScore.totalScore,
        scoringBreakdown: smartScore.breakdown
      };
    });

    const scoringTime = Date.now() - scoringStartTime;
    
    // Log scoring breakdown
    const flowLogger = SearchFlowLogger.getInstance();
    flowLogger.logScoringBreakdown(scoredResults, this.scoringService.getDefaultWeights());
    
    // Log scoring metrics
    flowLogger.logScoringMetrics({
      totalResults: scoredResults.length,
      scoringTime,
      avgTimePerResult: scoringTime / scoredResults.length
    });
    
    // Sort by smart score instead of just relevance score
    scoredResults.sort((a: POIResult, b: POIResult) => (b.smartScore || 0) - (a.smartScore || 0));
    
    logger.info(`✅ FINAL SMART-SCORED RESULTS:`);
    scoredResults.slice(0, 5).forEach((result: POIResult, index: number) => {
      logger.info(`   ${index + 1}. ${result.title} (Smart: ${result.smartScore?.toFixed(3)}, Semantic: ${result.relevanceScore.toFixed(3)}) - ${result.category}`);
    });

    return scoredResults;
  }

  private parseAmenities(amenities: any): string[] {
    if (!amenities) return [];
    
    if (typeof amenities === 'string') {
      return amenities.split(';').map(a => a.trim()).filter(a => a.length > 0);
    }
    
    if (Array.isArray(amenities)) {
      return amenities.filter(a => typeof a === 'string');
    }
    
    return [];
  }

  private parseQAContent(qaContent: any): any[] {
    if (!qaContent) return [];
    
    if (Array.isArray(qaContent)) {
      return qaContent;
    }
    
    if (typeof qaContent === 'string') {
      try {
        return JSON.parse(qaContent);
      } catch {
        return [];
      }
    }
    
    return [];
  }

  private async updateSessionContext(
    session: SessionContext, 
    query: string, 
    results: POIResult[], 
    detection: any
  ): Promise<void> {
    const conversationEntry = {
      query,
      timestamp: new Date().toISOString(),
      searchType: detection.searchType,
      resultCount: results.length,
      results: results.slice(0, 5).map(r => ({ 
        id: r.id, 
        title: r.title,
        category: r.category 
      }))
    };

    session.conversationHistory.push(conversationEntry);
    session.currentContext = {
      lastQuery: query,
      lastResults: results.slice(0, 5), // Store full result objects, not just titles
      searchType: detection.searchType
    };

    await this.sessionService.updateSession(session.sessionId, session);
    logger.info(`Updated session context for ${session.sessionId}`);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing search service...');
      await this.dbService.connect();
      logger.info('Search service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  async getServiceStatus(): Promise<any> {
    return {
      database: this.dbService.isReady(),
      mistral: await this.mistralService.testConnection(),
      session: this.sessionService.isRedisEnabled() ? 'redis' : 'memory',
      timestamp: new Date().toISOString()
    };
  }

  private handleFollowUpQuestion(
    query: string, 
    previousResults: any[], 
    detection: any, 
    userContext?: UserContext
  ): POIResult[] {
    logger.info(`🔍 HANDLING FOLLOW-UP QUESTION: "${query}"`);
    logger.info(`📊 Previous results available: ${previousResults.length}`);
    if (previousResults.length > 0) {
      logger.info(`   First POI: ${previousResults[0]?.title || previousResults[0]?.name || 'unknown'}`);
    }
    
    let targetResults: any[] = [];
    
    // ALWAYS check for positional references first (most reliable)
    const queryLower = query.toLowerCase();
    let targetIndex: number | null = null;
    
    // Check for "first one", "the first", "first", etc.
    // Pattern: "first" or "1st" anywhere, or "one" when combined with "first"
    if (queryLower.includes('first') || queryLower.includes('1st') || 
        (queryLower.includes('one') && (queryLower.includes('first') || queryLower.match(/\bthe\s+first\b/)))) {
      targetIndex = 0;
      logger.info(`   🎯 Detected positional reference: "first" → index 0`);
    } else if (queryLower.includes('second') || queryLower.includes('2nd') || 
               (queryLower.includes('two') && queryLower.includes('second'))) {
      targetIndex = 1;
      logger.info(`   🎯 Detected positional reference: "second" → index 1`);
    } else if (queryLower.includes('third') || queryLower.includes('3rd') || 
               (queryLower.includes('three') && queryLower.includes('third'))) {
      targetIndex = 2;
      logger.info(`   🎯 Detected positional reference: "third" → index 2`);
    } else if (queryLower.includes('fourth') || queryLower.includes('4th')) {
      targetIndex = 3;
      logger.info(`   🎯 Detected positional reference: "fourth" → index 3`);
    } else if (queryLower.includes('fifth') || queryLower.includes('5th')) {
      targetIndex = 4;
      logger.info(`   🎯 Detected positional reference: "fifth" → index 4`);
    } else if (queryLower.includes('last')) {
      targetIndex = previousResults.length > 0 ? previousResults.length - 1 : null;
      logger.info(`   🎯 Detected positional reference: "last" → index ${targetIndex}`);
    }
    
    // Special case: "the first one" or just "one" when it's clearly a follow-up
    if (targetIndex === null && queryLower.includes('one') && previousResults.length > 0) {
      // If query has "one" and we have previous results, assume "first one"
      targetIndex = 0;
      logger.info(`   🎯 Detected "one" as positional reference → index 0 (first)`);
    }
    
    // If we have a positional index, use it directly (most reliable method)
    if (targetIndex !== null && targetIndex >= 0 && targetIndex < previousResults.length) {
      const selectedPOI = previousResults[targetIndex];
      if (selectedPOI) {
        logger.info(`🎯 Using positional reference: index ${targetIndex} (${selectedPOI.title || selectedPOI.name})`);
        targetResults = [selectedPOI];
      } else {
        logger.warn(`⚠️ Positional reference index ${targetIndex} is out of bounds or POI is null`);
        // Fallback to first result
        if (previousResults.length > 0) {
          targetResults = [previousResults[0]];
        }
      }
    } else if (detection.targetPOI) {
      // Try to find by name (flexible matching) only if no positional reference found
      const targetPOI = previousResults.find(result => {
        const resultTitle = (result.title || result.name || '').toLowerCase().trim();
        const targetTitle = detection.targetPOI.toLowerCase().trim();
        
        // Exact match
        if (resultTitle === targetTitle) return true;
        
        // Contains match (for partial matches)
        if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle)) return true;
        
        // Check if titles are similar (handle punctuation differences)
        const normalizedResult = resultTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        const normalizedTarget = targetTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        if (normalizedResult === normalizedTarget) return true;
        
        return false;
      });
      
      if (targetPOI) {
        logger.info(`🎯 Found target POI by name: ${targetPOI.title || targetPOI.name}`);
        targetResults = [targetPOI];
      } else {
        logger.warn(`⚠️ Target POI "${detection.targetPOI}" not found in previous results`);
        // Fall back to first result if we have any
        if (previousResults.length > 0) {
          logger.info(`📋 Falling back to first result from previous search`);
          targetResults = [previousResults[0]];
        } else {
          targetResults = [];
        }
      }
    } else {
      // Use all previous results for generic follow-up
      logger.info(`📋 Using all previous results for generic follow-up`);
      targetResults = previousResults;
    }
    
    // Safety check: if we have previous results but no target results, use first one
    if (targetResults.length === 0 && previousResults.length > 0) {
      logger.warn(`⚠️ No target results found, falling back to first previous result`);
      targetResults = [previousResults[0]];
    }
    
    // Convert to POIResult format and apply scoring
    const processedResults = targetResults.map((result, index) => {
      // Handle both POIResult and POIReference formats
      const metadata = result.metadata || {};
      const amenities = result.amenities || metadata.amenities || [];
      
      const poiResult: POIResult = {
        id: result.id || `followup_${index}`,
        title: result.title || result.name || 'Unknown',
        subtitle: result.subtitle || result.category || '',
        category: result.category || 'Unknown',
        relevanceScore: result.relevanceScore || 0.5,
        searchType: 'follow-up',
        displayAsCard: true, // Follow-up questions should show the POI as a card
        displayReason: 'requested',
        metadata: {
          amenities: this.parseAmenities(amenities),
          location: result.location || result.address || metadata.location || '',
          rating: result.rating || metadata.rating || 0,
          description: result.description || metadata.description || '',
          qaContent: result.qaContent || metadata.qaContent || [],
          ...(result.coordinates || metadata.coordinates ? { coordinates: result.coordinates || metadata.coordinates } : {}),
          openingHours: result.openingHours || metadata.openingHours,
          phone: result.phone || metadata.phone,
          website: result.website || metadata.website,
          lastReviewDate: result.lastReviewDate || metadata.lastReviewDate,
          visitCount: result.visitCount || metadata.visitCount,
          // Preserve raw metadata for opening hours parser
          rawMetadata: metadata.rawMetadata || result.rawMetadata || result
        }
      };
      
      // Apply smart scoring
      const smartScore = this.scoringService.calculateSmartScore(
        poiResult,
        userContext || this.getDefaultUserContext()
      );
      
      return {
        ...poiResult,
        smartScore: smartScore.totalScore,
        scoringBreakdown: smartScore.breakdown
      };
    });
    
    // Sort by smart score
    processedResults.sort((a: POIResult, b: POIResult) => (b.smartScore || 0) - (a.smartScore || 0));
    
    logger.info(`✅ FOLLOW-UP PROCESSING COMPLETE: ${processedResults.length} results`);
    processedResults.slice(0, 3).forEach((result: POIResult, index: number) => {
      logger.info(`   ${index + 1}. ${result.title} (Smart: ${result.smartScore?.toFixed(3)}) - ${result.category}`);
    });
    
    return processedResults;
  }

  private getDefaultUserContext(): UserContext {
    return {
      currentTime: new Date(),
      preferences: {
        maxDistance: 50,
        minRating: 3.0
      }
    };
  }

  /**
   * Filter results based on opening status for time-sensitive queries
   */
  private filterByOpeningStatus(pois: POIResult[], intentRecognition: any): POIResult[] {
    const currentTime = new Date();
    const open: POIResult[] = [];
    const openingSoon: POIResult[] = [];
    const closingSoon: POIResult[] = [];
    const closed: POIResult[] = [];
    
    for (const poi of pois) {
      const isOpen = OpeningHoursParser.isCurrentlyOpen(poi.metadata, currentTime);
      const isOpeningSoon = OpeningHoursParser.isOpeningSoon(poi.metadata, currentTime);
      const isClosingSoon = OpeningHoursParser.isClosingSoon(poi.metadata, currentTime);
      
      if (isOpen) {
        if (isClosingSoon) {
          closingSoon.push(poi);
        } else {
          open.push(poi);
        }
      } else if (isOpeningSoon) {
        openingSoon.push(poi);
      } else {
        closed.push(poi);
      }
    }
    
    // Priority order: Open > Closing Soon > Opening Soon > Closed
    // But only show open and soon-to-open/soon-to-close places
    const maxResults = 20;
    const results = [...open, ...closingSoon, ...openingSoon];
    
    logger.info(`🔍 Opening status filter: Open=${open.length}, Closing Soon=${closingSoon.length}, Opening Soon=${openingSoon.length}, Closed=${closed.length}`);
    
    return results.slice(0, maxResults);
  }
}
