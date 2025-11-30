"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const database_1 = require("../config/database");
const mistralService_1 = require("./mistralService");
const queryDetectionService_1 = require("./queryDetectionService");
const sessionService_1 = require("./sessionService");
const scoringService_1 = require("./scoringService");
const dietaryIntentService_1 = require("./dietaryIntentService");
const generalIntentService_1 = require("./generalIntentService");
const textResponseService_1 = require("./textResponseService");
const logger_1 = require("../config/logger");
const openingHoursParser_1 = require("../utils/openingHoursParser");
class SearchService {
    constructor() {
        this.dbService = new database_1.DatabaseService();
        this.mistralService = new mistralService_1.MistralService();
        this.queryDetectionService = new queryDetectionService_1.QueryDetectionService();
        this.sessionService = new sessionService_1.SessionService();
        this.scoringService = new scoringService_1.ScoringService();
        this.dietaryIntentService = new dietaryIntentService_1.DietaryIntentService();
        this.generalIntentService = new generalIntentService_1.GeneralIntentService();
        this.textResponseService = new textResponseService_1.TextResponseService();
    }
    async search(query, sessionId, userId, options = {}) {
        const startTime = Date.now();
        const flowLogger = logger_1.SearchFlowLogger.getInstance();
        const searchId = flowLogger.startSearchFlow(query, sessionId);
        logger_1.logger.info('🔧 SEARCH METHOD CALLED - Starting search flow...');
        try {
            logger_1.logger.info(`Starting search for query: "${query}" in session: ${sessionId}`);
            if (!this.dbService.isReady()) {
                logger_1.logger.info('Database not ready, initializing...');
                flowLogger.logStep('DATABASE_INIT', { status: 'initializing' });
                await this.dbService.connect();
                flowLogger.logStep('DATABASE_INIT', { status: 'ready' });
            }
            let previousResults = [];
            let lastQuery = '';
            if (options.clientContext) {
                logger_1.logger.info(`🔍 CLIENT SESSION CONTEXT PROVIDED:`);
                logger_1.logger.info(`   📊 Last results count: ${options.clientContext.lastResults?.length || 0}`);
                logger_1.logger.info(`   📝 Last query: ${options.clientContext.lastQuery || 'None'}`);
                logger_1.logger.info(`   📚 Conversation history: ${options.clientContext.conversationHistory?.length || 0} entries`);
                logger_1.logger.info(`   🏪 Mentioned POIs: ${options.clientContext.mentionedPOIs?.length || 0} total`);
                previousResults = options.clientContext.lastResults || [];
                lastQuery = options.clientContext.lastQuery || '';
                if (previousResults.length === 0 && options.clientContext.conversationHistory && options.clientContext.conversationHistory.length > 0) {
                    const latestEntry = options.clientContext.conversationHistory[options.clientContext.conversationHistory.length - 1];
                    previousResults = latestEntry.results || previousResults;
                    lastQuery = latestEntry.query || lastQuery;
                }
                logger_1.logger.info(`📊 CLIENT CONTEXT: previousResults count = ${previousResults.length}, lastQuery = "${lastQuery}"`);
                flowLogger.logStep('CLIENT_SESSION_USED', {
                    lastResultsCount: previousResults.length,
                    conversationHistoryLength: options.clientContext.conversationHistory?.length || 0,
                    mentionedPOIsCount: options.clientContext.mentionedPOIs?.length || 0
                });
            }
            else {
                let session = await this.sessionService.getSession(sessionId);
                if (!session) {
                    logger_1.logger.info(`Session ${sessionId} not found, creating new session`);
                    flowLogger.logStep('SESSION_CREATE', { originalSessionId: sessionId, userId: userId || 'anonymous' });
                    const newSessionId = await this.sessionService.createSession(userId || 'anonymous');
                    session = await this.sessionService.getSession(newSessionId);
                    if (!session) {
                        throw new Error('Failed to create session');
                    }
                    sessionId = newSessionId;
                    flowLogger.logStep('SESSION_CREATE', { newSessionId, status: 'created' });
                }
                else {
                    flowLogger.logStep('SESSION_RETRIEVED', {
                        sessionId,
                        conversationHistoryLength: session.conversationHistory.length,
                        lastQuery: session.currentContext.lastQuery,
                        lastResultsCount: session.currentContext.lastResults.length
                    });
                }
                logger_1.logger.info(`🔍 SERVER SESSION CONTEXT DEBUG:`);
                logger_1.logger.info(`   📊 Previous results count: ${session.currentContext.lastResults.length}`);
                logger_1.logger.info(`   📝 Last query: ${session.currentContext.lastQuery}`);
                logger_1.logger.info(`   🎯 Last search type: ${session.currentContext.searchType}`);
                if (session.currentContext.lastResults.length > 0) {
                    logger_1.logger.info(`   📋 Previous results: ${session.currentContext.lastResults.slice(0, 3).map(r => r.title).join(', ')}`);
                }
                previousResults = session.currentContext.lastResults;
                lastQuery = session.currentContext.lastQuery;
            }
            const detection = await this.queryDetectionService.detectQueryType(query, previousResults);
            flowLogger.logQueryDetection(detection, previousResults);
            logger_1.logger.info(`Detected search type: ${detection.searchType} with confidence: ${detection.confidence}`);
            const dietaryIntent = this.dietaryIntentService.detectDietaryIntent(query);
            logger_1.logger.info(`🥗 DIETARY INTENT DETECTED: ${dietaryIntent.type} (confidence: ${dietaryIntent.confidence.toFixed(2)})`);
            const generalIntent = this.generalIntentService.detectIntent(query);
            logger_1.logger.info(`🧠 GENERAL INTENT DETECTED: ${generalIntent.primaryIntent} (${generalIntent.boosts.length} boosts, confidence: ${generalIntent.confidence.toFixed(2)})`);
            const baseUserContext = options.userContext || this.getDefaultUserContext();
            const enhancedUserContext = {
                ...baseUserContext,
                ...(dietaryIntent.type !== 'none' ? { dietaryIntent } : {}),
                ...(generalIntent.boosts.length > 0 ? { generalIntent } : {})
            };
            let processedResults = [];
            const queryLower = query.toLowerCase();
            const hasPositionalRef = queryLower.match(/\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|one|two|three)\b/);
            const hasReferenceWord = queryLower.match(/\b(that|this|it|the)\b/);
            const hasOpeningQuery = queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours');
            const hasOpeningKeywords = queryLower.includes('open') || queryLower.includes('closed') || queryLower.includes('hours');
            let isFollowUp = previousResults.length > 0 && (detection.isSpecific ||
                detection.targetPOI ||
                hasPositionalRef ||
                (hasReferenceWord && hasOpeningQuery) ||
                (hasReferenceWord && queryLower.includes('phone')) ||
                (hasReferenceWord && queryLower.includes('address')) ||
                (queryLower.includes('open') && (hasReferenceWord || hasPositionalRef)) ||
                (queryLower.includes('closed') && (hasReferenceWord || hasPositionalRef)) ||
                (queryLower.includes('hours') && (hasReferenceWord || hasPositionalRef)) ||
                hasOpeningKeywords ||
                (queryLower.includes('first') && queryLower.includes('one')) ||
                (queryLower.includes('the') && (queryLower.includes('first') || queryLower.includes('one'))));
            logger_1.logger.info(`🔍 Follow-up detection: previousResults=${previousResults.length}, isSpecific=${detection.isSpecific}, targetPOI=${detection.targetPOI}, hasPositional=${!!hasPositionalRef}, hasOpeningQuery=${hasOpeningQuery}, hasOpeningKeywords=${hasOpeningKeywords}, isFollowUp=${isFollowUp}`);
            if (!isFollowUp && previousResults.length > 0 && hasOpeningKeywords) {
                logger_1.logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and opening keywords - FORCING follow-up`);
                isFollowUp = true;
            }
            if (!isFollowUp && previousResults.length > 0 && (queryLower.includes('first') || queryLower.includes('one'))) {
                logger_1.logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and positional reference - FORCING follow-up`);
                isFollowUp = true;
            }
            if (!isFollowUp && previousResults.length > 0 && detection.searchType === 'specific') {
                logger_1.logger.warn(`⚠️ Follow-up not detected but has previousResults (${previousResults.length}) and searchType is specific - FORCING follow-up`);
                isFollowUp = true;
            }
            if (!isFollowUp && detection.searchType === 'specific') {
                logger_1.logger.error(`❌ CRITICAL: searchType is specific but isFollowUp is false! previousResults.length=${previousResults.length}`);
                if (previousResults.length === 0 && options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
                    logger_1.logger.warn(`   previousResults is empty, re-extracting from clientContext...`);
                    previousResults = options.clientContext.lastResults;
                    logger_1.logger.info(`   Re-extracted ${previousResults.length} previous results`);
                }
                if (previousResults.length > 0) {
                    logger_1.logger.warn(`   FORCING follow-up based on searchType='specific' alone`);
                    isFollowUp = true;
                }
                else {
                    logger_1.logger.error(`   ❌ Still no previousResults after re-extraction! clientContext.lastResults.length=${options.clientContext?.lastResults?.length || 0}`);
                    if (options.clientContext) {
                        logger_1.logger.warn(`   Attempting to use clientContext directly...`);
                    }
                }
            }
            if (detection.searchType === 'specific' && !isFollowUp) {
                if (options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
                    logger_1.logger.warn(`   🔄 SIMPLIFIED CHECK: searchType='specific' + clientContext.lastResults exists, FORCING follow-up`);
                    previousResults = options.clientContext.lastResults;
                    isFollowUp = true;
                }
            }
            if (isFollowUp) {
                logger_1.logger.info(`✅ FOLLOW-UP DETECTED: Handling follow-up question using previous results (${previousResults.length} available)`);
                logger_1.logger.info(`   Follow-up indicators: isSpecific=${detection.isSpecific}, targetPOI=${detection.targetPOI}, hasPositional=${!!hasPositionalRef}, hasOpeningKeywords=${hasOpeningKeywords}`);
                flowLogger.logStep('FOLLOW_UP_PROCESSING', {
                    query,
                    previousResultsCount: previousResults.length,
                    targetPOI: detection.targetPOI,
                    isSpecific: detection.isSpecific
                });
                processedResults = this.handleFollowUpQuestion(query, previousResults, detection, enhancedUserContext);
                logger_1.logger.info(`   After handleFollowUpQuestion: ${processedResults.length} results`);
                if (processedResults.length === 0 && previousResults.length > 0) {
                    logger_1.logger.warn(`⚠️ Follow-up returned no results, using first previous result as fallback`);
                    const firstResult = previousResults[0];
                    if (firstResult) {
                        logger_1.logger.info(`   Creating fallback POI from: ${firstResult.title || firstResult.name || 'unknown'}`);
                        const metadata = firstResult.metadata || {};
                        const fallbackPOI = {
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
                        logger_1.logger.info(`   ✅ Fallback POI created: ${fallbackPOI.title}`);
                    }
                    else {
                        logger_1.logger.error(`   ❌ First result is null or undefined!`);
                    }
                }
                flowLogger.logStep('FOLLOW_UP_PROCESSING', {
                    processedResultsCount: processedResults.length,
                    status: 'completed'
                });
                if (processedResults.length === 0 && previousResults.length > 0) {
                    logger_1.logger.error(`❌ CRITICAL: Follow-up processing returned no results despite having ${previousResults.length} previous results!`);
                    logger_1.logger.error(`   Query: "${query}"`);
                    logger_1.logger.error(`   Previous results: ${JSON.stringify(previousResults.slice(0, 1).map(r => ({ id: r.id, title: r.title || r.name })))}`);
                    const firstResult = previousResults[0];
                    if (firstResult) {
                        const emergencyPOI = {
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
                        logger_1.logger.warn(`   ✅ Emergency POI created: ${emergencyPOI.title}`);
                    }
                }
            }
            else {
                logger_1.logger.info(`🔍 ELSE BLOCK: searchType=${detection.searchType}, previousResults.length=${previousResults.length}, isFollowUp was false`);
                if (previousResults.length === 0 && options.clientContext?.lastResults && options.clientContext.lastResults.length > 0) {
                    logger_1.logger.warn(`⚠️ previousResults is empty but clientContext has lastResults, re-extracting...`);
                    previousResults = options.clientContext.lastResults;
                    logger_1.logger.info(`   Re-extracted ${previousResults.length} previous results from clientContext`);
                }
                if (detection.searchType === 'specific' && previousResults.length > 0) {
                    logger_1.logger.error(`❌ CRITICAL BUG: searchType is 'specific' but isFollowUp is false! This should never happen.`);
                    logger_1.logger.error(`   Query: "${query}"`);
                    logger_1.logger.error(`   previousResults.length: ${previousResults.length}`);
                    logger_1.logger.error(`   First result: ${previousResults[0]?.title || previousResults[0]?.name || 'unknown'}`);
                    logger_1.logger.error(`   FORCING follow-up processing as emergency measure`);
                    processedResults = this.handleFollowUpQuestion(query, previousResults, detection, enhancedUserContext);
                    logger_1.logger.info(`   After handleFollowUpQuestion: ${processedResults.length} results`);
                    if (processedResults.length === 0 && previousResults.length > 0) {
                        logger_1.logger.warn(`   ⚠️ handleFollowUpQuestion returned empty, creating emergency POI`);
                        const firstResult = previousResults[0];
                        if (firstResult) {
                            logger_1.logger.info(`   Creating emergency POI from: ${firstResult.title || firstResult.name || 'unknown'}`);
                            const metadata = firstResult.metadata || {};
                            const emergencyPOI = {
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
                            logger_1.logger.warn(`   ✅ Emergency POI created in else block: ${emergencyPOI.title}`);
                        }
                        else {
                            logger_1.logger.error(`   ❌ First result is null or undefined!`);
                        }
                    }
                }
                else {
                    logger_1.logger.info(`   Not triggering emergency fallback: searchType=${detection.searchType}, previousResults.length=${previousResults.length}`);
                }
                if (processedResults.length === 0) {
                    logger_1.logger.info(`Performing new database search for query: "${query}"`);
                    const embeddingStartTime = Date.now();
                    const queryEmbedding = await this.mistralService.generateEmbedding(query);
                    const embeddingTime = Date.now() - embeddingStartTime;
                    flowLogger.logEmbeddingGeneration(query, queryEmbedding.length, embeddingTime);
                    logger_1.logger.info(`Generated embedding with ${queryEmbedding.length} dimensions in ${embeddingTime}ms`);
                    const collectionName = this.getCollectionName(detection.searchType);
                    const maxResults = options.maxResults || 100;
                    flowLogger.logDatabaseQuery(collectionName, queryEmbedding.length, maxResults);
                    const searchResults = await this.dbService.search(collectionName, queryEmbedding, maxResults);
                    logger_1.logger.info(`Found ${searchResults.documents?.[0]?.length || 0} results from ${collectionName} collection`);
                    processedResults = this.processSearchResults(searchResults, detection, enhancedUserContext);
                }
            }
            if (detection.intentRecognition?.intentContext.timeRelated &&
                detection.intentRecognition?.intentContext.openingHoursRelated) {
                const filteredResults = this.filterByOpeningStatus(processedResults, detection.intentRecognition);
                logger_1.logger.info(`⏰ TIME-SENSITIVE FILTERING: ${processedResults.length} → ${filteredResults.length} results`);
                processedResults = filteredResults;
            }
            flowLogger.logSearchResults({ documents: [processedResults.map(r => r.title)] }, processedResults.length);
            logger_1.logger.info(`Processed ${processedResults.length} results`);
            const sortingCriteria = {
                method: 'cosine_similarity',
                primaryFactor: 'embedding_distance',
                secondaryFactors: ['amenity_matching', 'category_relevance', 'rating_quality'],
                collection: detection.isSpecific ? 'follow-up' : this.getCollectionName(detection.searchType),
                searchType: detection.searchType
            };
            flowLogger.logSortingAndRanking(processedResults, sortingCriteria);
            logger_1.logger.info(`🔍 SORTING & RANKING ANALYSIS:`);
            logger_1.logger.info(`   📊 Method: Cosine similarity with embedding distance`);
            logger_1.logger.info(`   🎯 Primary Factor: Embedding distance (1 - distance)`);
            logger_1.logger.info(`   📈 Secondary Factors: Amenity matching, category relevance, rating quality`);
            logger_1.logger.info(`   🏆 Top 3 Results:`);
            processedResults.slice(0, 3).forEach((result, index) => {
                logger_1.logger.info(`      ${index + 1}. ${result.title} (Score: ${result.relevanceScore.toFixed(3)}, Category: ${result.category})`);
            });
            const contextUpdate = {
                query,
                resultCount: processedResults.length,
                searchType: detection.searchType,
                topResults: processedResults.slice(0, 3).map(r => ({ title: r.title, category: r.category, score: r.relevanceScore }))
            };
            if (!options.clientContext) {
                const currentSession = await this.sessionService.getSession(sessionId);
                if (currentSession) {
                    await this.updateSessionContext(currentSession, query, processedResults, detection);
                    flowLogger.logSessionUpdate(sessionId, contextUpdate);
                }
            }
            else {
                logger_1.logger.info(`📱 CLIENT SESSION: Skipping server-side session update (client manages context)`);
                flowLogger.logStep('CLIENT_SESSION_UPDATE_SKIPPED', contextUpdate);
            }
            const searchTime = Date.now() - startTime;
            const embeddingTime = detection.isSpecific ? 0 : 0;
            flowLogger.logPerformanceMetrics(searchTime, embeddingTime, 0, processedResults.length);
            const queryInterpretation = this.queryDetectionService.createQueryInterpretation(detection, query);
            let responseContext;
            if (options.clientContext) {
                const displayedPOIIds = processedResults
                    .filter(r => r.displayAsCard)
                    .map(r => r.id);
                responseContext = {
                    sessionId,
                    userId: userId || 'anonymous',
                    displayedPOIs: [
                        ...(options.clientContext.displayedPOIs || []),
                        ...displayedPOIIds
                    ].filter((id, index, self) => self.indexOf(id) === index),
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
                        ].filter((poi, index, self) => index === self.findIndex(p => p.id === poi.id)),
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
            }
            else {
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
            logger_1.logger.info('🔧 About to start text response generation...');
            logger_1.logger.info(`🔧 processedResults length: ${processedResults.length}`);
            logger_1.logger.info(`🔧 detection.intentRecognition: ${JSON.stringify(detection.intentRecognition)}`);
            let textResponse = '';
            logger_1.logger.info('🔧 Starting text response generation...');
            try {
                let intentResult = detection.intentRecognition;
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
                logger_1.logger.info(`📝 Generated text response: ${textResponse.substring(0, 100)}...`);
            }
            catch (error) {
                logger_1.logger.error('❌ Failed to generate text response:', error);
                textResponse = `I found ${processedResults.length} places matching your search.`;
            }
            const response = {
                success: true,
                data: {
                    results: processedResults,
                    searchType: detection.searchType,
                    queryInterpretation,
                    context: responseContext,
                    textResponse
                },
                metadata: {
                    totalResults: processedResults.length,
                    searchTime,
                    embeddingType: detection.searchType
                }
            };
            flowLogger.logFinalResponse(response, searchTime);
            logger_1.logger.info(`Search completed in ${searchTime}ms`);
            logger_1.logger.info('');
            logger_1.logger.info('');
            logger_1.logger.info('');
            return response;
        }
        catch (error) {
            flowLogger.logError(error, 'SEARCH_EXECUTION');
            logger_1.logger.error('Search failed:', error);
            logger_1.logger.error('');
            logger_1.logger.error('');
            logger_1.logger.error('');
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
    getCollectionName(searchType) {
        const collectionMap = {
            'general': 'general',
            'specific': 'specific',
            'contextual': 'contextual'
        };
        return collectionMap[searchType] || 'general';
    }
    processSearchResults(searchResults, detection, userContext) {
        if (!searchResults.documents || !searchResults.documents[0]) {
            logger_1.logger.warn('⚠️ No documents found in search results');
            return [];
        }
        logger_1.logger.info(`📊 PROCESSING SEARCH RESULTS:`);
        logger_1.logger.info(`   📄 Raw documents: ${searchResults.documents[0].length}`);
        logger_1.logger.info(`   📊 Distances: [${searchResults.distances?.[0]?.slice(0, 5).map((d) => d.toFixed(3)).join(', ')}...]`);
        logger_1.logger.info(`   🆔 IDs: [${searchResults.ids?.[0]?.slice(0, 3).join(', ')}...]`);
        const processedResults = searchResults.documents[0].map((doc, index) => {
            const metadata = searchResults.metadatas?.[0]?.[index] || {};
            const distance = searchResults.distances?.[0]?.[index] || 0;
            const relevanceScore = Math.max(0, 1 - distance);
            if (index < 3) {
                logger_1.logger.info(`🔍 Result ${index + 1} (${metadata.title || metadata.name}):`);
                logger_1.logger.info(`   ALL METADATA KEYS: ${Object.keys(metadata).join(', ')}`);
                const openingHoursValue = metadata.opening_hours;
                if (openingHoursValue) {
                    logger_1.logger.info(`   ✅ Has opening_hours data: ${openingHoursValue.substring(0, 150)}...`);
                }
                else {
                    logger_1.logger.warn(`   ⚠️ No opening_hours field in metadata`);
                    logger_1.logger.info(`   Sample of metadata values: ${JSON.stringify(Object.keys(metadata).slice(0, 10))}`);
                }
            }
            const result = {
                id: metadata.id || metadata.google_placeid || `poi_${index}`,
                title: metadata.title || metadata.name || 'Unknown POI',
                subtitle: metadata.subtitle || metadata.category || '',
                category: metadata.category || 'Unknown',
                relevanceScore,
                searchType: detection.searchType,
                displayAsCard: false,
                metadata: {
                    amenities: this.parseAmenities(metadata.amenities),
                    location: metadata.address || metadata.location || '',
                    rating: parseFloat(metadata.rating) || 0,
                    description: metadata.description || doc,
                    qaContent: this.parseQAContent(metadata.qaContent),
                    phone: metadata.phone || metadata.phone_unformatted || metadata.phoneUnformatted,
                    website: metadata.website,
                    ...(metadata.lat && metadata.lng ? { coordinates: { lat: metadata.lat, lng: metadata.lng } } : {}),
                    openingHours: metadata.opening_hours,
                    rawMetadata: metadata
                }
            };
            if (index < 3) {
                logger_1.logger.info(`   🏪 Result ${index + 1}: ${result.title}`);
                logger_1.logger.info(`      📊 Distance: ${distance.toFixed(3)} → Score: ${relevanceScore.toFixed(3)}`);
                logger_1.logger.info(`      🏷️  Category: ${result.category}`);
                logger_1.logger.info(`      ⭐ Rating: ${result.metadata.rating}`);
                logger_1.logger.info(`      🍽️  Amenities: ${result.metadata.amenities.slice(0, 3).join(', ')}${result.metadata.amenities.length > 3 ? '...' : ''}`);
            }
            return result;
        });
        const scoringStartTime = Date.now();
        const scoredResults = processedResults.map((poi) => {
            const smartScore = this.scoringService.calculateSmartScore(poi, userContext || this.getDefaultUserContext());
            return {
                ...poi,
                smartScore: smartScore.totalScore,
                scoringBreakdown: smartScore.breakdown
            };
        });
        const scoringTime = Date.now() - scoringStartTime;
        const flowLogger = logger_1.SearchFlowLogger.getInstance();
        flowLogger.logScoringBreakdown(scoredResults, this.scoringService.getDefaultWeights());
        flowLogger.logScoringMetrics({
            totalResults: scoredResults.length,
            scoringTime,
            avgTimePerResult: scoringTime / scoredResults.length
        });
        scoredResults.sort((a, b) => (b.smartScore || 0) - (a.smartScore || 0));
        logger_1.logger.info(`✅ FINAL SMART-SCORED RESULTS:`);
        scoredResults.slice(0, 5).forEach((result, index) => {
            logger_1.logger.info(`   ${index + 1}. ${result.title} (Smart: ${result.smartScore?.toFixed(3)}, Semantic: ${result.relevanceScore.toFixed(3)}) - ${result.category}`);
        });
        return scoredResults;
    }
    parseAmenities(amenities) {
        if (!amenities)
            return [];
        if (typeof amenities === 'string') {
            return amenities.split(';').map(a => a.trim()).filter(a => a.length > 0);
        }
        if (Array.isArray(amenities)) {
            return amenities.filter(a => typeof a === 'string');
        }
        return [];
    }
    parseQAContent(qaContent) {
        if (!qaContent)
            return [];
        if (Array.isArray(qaContent)) {
            return qaContent;
        }
        if (typeof qaContent === 'string') {
            try {
                return JSON.parse(qaContent);
            }
            catch {
                return [];
            }
        }
        return [];
    }
    async updateSessionContext(session, query, results, detection) {
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
            lastResults: results.slice(0, 5),
            searchType: detection.searchType
        };
        await this.sessionService.updateSession(session.sessionId, session);
        logger_1.logger.info(`Updated session context for ${session.sessionId}`);
    }
    async initialize() {
        try {
            logger_1.logger.info('Initializing search service...');
            await this.dbService.connect();
            logger_1.logger.info('Search service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize search service:', error);
            throw error;
        }
    }
    async getServiceStatus() {
        return {
            database: this.dbService.isReady(),
            mistral: await this.mistralService.testConnection(),
            session: this.sessionService.isRedisEnabled() ? 'redis' : 'memory',
            timestamp: new Date().toISOString()
        };
    }
    handleFollowUpQuestion(query, previousResults, detection, userContext) {
        logger_1.logger.info(`🔍 HANDLING FOLLOW-UP QUESTION: "${query}"`);
        logger_1.logger.info(`📊 Previous results available: ${previousResults.length}`);
        if (previousResults.length > 0) {
            logger_1.logger.info(`   First POI: ${previousResults[0]?.title || previousResults[0]?.name || 'unknown'}`);
        }
        let targetResults = [];
        const queryLower = query.toLowerCase();
        let targetIndex = null;
        if (queryLower.includes('first') || queryLower.includes('1st') ||
            (queryLower.includes('one') && (queryLower.includes('first') || queryLower.match(/\bthe\s+first\b/)))) {
            targetIndex = 0;
            logger_1.logger.info(`   🎯 Detected positional reference: "first" → index 0`);
        }
        else if (queryLower.includes('second') || queryLower.includes('2nd') ||
            (queryLower.includes('two') && queryLower.includes('second'))) {
            targetIndex = 1;
            logger_1.logger.info(`   🎯 Detected positional reference: "second" → index 1`);
        }
        else if (queryLower.includes('third') || queryLower.includes('3rd') ||
            (queryLower.includes('three') && queryLower.includes('third'))) {
            targetIndex = 2;
            logger_1.logger.info(`   🎯 Detected positional reference: "third" → index 2`);
        }
        else if (queryLower.includes('fourth') || queryLower.includes('4th')) {
            targetIndex = 3;
            logger_1.logger.info(`   🎯 Detected positional reference: "fourth" → index 3`);
        }
        else if (queryLower.includes('fifth') || queryLower.includes('5th')) {
            targetIndex = 4;
            logger_1.logger.info(`   🎯 Detected positional reference: "fifth" → index 4`);
        }
        else if (queryLower.includes('last')) {
            targetIndex = previousResults.length > 0 ? previousResults.length - 1 : null;
            logger_1.logger.info(`   🎯 Detected positional reference: "last" → index ${targetIndex}`);
        }
        if (targetIndex === null && queryLower.includes('one') && previousResults.length > 0) {
            targetIndex = 0;
            logger_1.logger.info(`   🎯 Detected "one" as positional reference → index 0 (first)`);
        }
        if (targetIndex !== null && targetIndex >= 0 && targetIndex < previousResults.length) {
            const selectedPOI = previousResults[targetIndex];
            if (selectedPOI) {
                logger_1.logger.info(`🎯 Using positional reference: index ${targetIndex} (${selectedPOI.title || selectedPOI.name})`);
                targetResults = [selectedPOI];
            }
            else {
                logger_1.logger.warn(`⚠️ Positional reference index ${targetIndex} is out of bounds or POI is null`);
                if (previousResults.length > 0) {
                    targetResults = [previousResults[0]];
                }
            }
        }
        else if (detection.targetPOI) {
            const targetPOI = previousResults.find(result => {
                const resultTitle = (result.title || result.name || '').toLowerCase().trim();
                const targetTitle = detection.targetPOI.toLowerCase().trim();
                if (resultTitle === targetTitle)
                    return true;
                if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle))
                    return true;
                const normalizedResult = resultTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
                const normalizedTarget = targetTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
                if (normalizedResult === normalizedTarget)
                    return true;
                return false;
            });
            if (targetPOI) {
                logger_1.logger.info(`🎯 Found target POI by name: ${targetPOI.title || targetPOI.name}`);
                targetResults = [targetPOI];
            }
            else {
                logger_1.logger.warn(`⚠️ Target POI "${detection.targetPOI}" not found in previous results`);
                if (previousResults.length > 0) {
                    logger_1.logger.info(`📋 Falling back to first result from previous search`);
                    targetResults = [previousResults[0]];
                }
                else {
                    targetResults = [];
                }
            }
        }
        else {
            logger_1.logger.info(`📋 Using all previous results for generic follow-up`);
            targetResults = previousResults;
        }
        if (targetResults.length === 0 && previousResults.length > 0) {
            logger_1.logger.warn(`⚠️ No target results found, falling back to first previous result`);
            targetResults = [previousResults[0]];
        }
        const processedResults = targetResults.map((result, index) => {
            const metadata = result.metadata || {};
            const amenities = result.amenities || metadata.amenities || [];
            const poiResult = {
                id: result.id || `followup_${index}`,
                title: result.title || result.name || 'Unknown',
                subtitle: result.subtitle || result.category || '',
                category: result.category || 'Unknown',
                relevanceScore: result.relevanceScore || 0.5,
                searchType: 'follow-up',
                displayAsCard: true,
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
                    rawMetadata: metadata.rawMetadata || result.rawMetadata || result
                }
            };
            const smartScore = this.scoringService.calculateSmartScore(poiResult, userContext || this.getDefaultUserContext());
            return {
                ...poiResult,
                smartScore: smartScore.totalScore,
                scoringBreakdown: smartScore.breakdown
            };
        });
        processedResults.sort((a, b) => (b.smartScore || 0) - (a.smartScore || 0));
        logger_1.logger.info(`✅ FOLLOW-UP PROCESSING COMPLETE: ${processedResults.length} results`);
        processedResults.slice(0, 3).forEach((result, index) => {
            logger_1.logger.info(`   ${index + 1}. ${result.title} (Smart: ${result.smartScore?.toFixed(3)}) - ${result.category}`);
        });
        return processedResults;
    }
    getDefaultUserContext() {
        return {
            currentTime: new Date(),
            preferences: {
                maxDistance: 50,
                minRating: 3.0
            }
        };
    }
    filterByOpeningStatus(pois, intentRecognition) {
        const currentTime = new Date();
        const open = [];
        const openingSoon = [];
        const closingSoon = [];
        const closed = [];
        for (const poi of pois) {
            const isOpen = openingHoursParser_1.OpeningHoursParser.isCurrentlyOpen(poi.metadata, currentTime);
            const isOpeningSoon = openingHoursParser_1.OpeningHoursParser.isOpeningSoon(poi.metadata, currentTime);
            const isClosingSoon = openingHoursParser_1.OpeningHoursParser.isClosingSoon(poi.metadata, currentTime);
            if (isOpen) {
                if (isClosingSoon) {
                    closingSoon.push(poi);
                }
                else {
                    open.push(poi);
                }
            }
            else if (isOpeningSoon) {
                openingSoon.push(poi);
            }
            else {
                closed.push(poi);
            }
        }
        const maxResults = 20;
        const results = [...open, ...closingSoon, ...openingSoon];
        logger_1.logger.info(`🔍 Opening status filter: Open=${open.length}, Closing Soon=${closingSoon.length}, Opening Soon=${openingSoon.length}, Closed=${closed.length}`);
        return results.slice(0, maxResults);
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=searchService.js.map