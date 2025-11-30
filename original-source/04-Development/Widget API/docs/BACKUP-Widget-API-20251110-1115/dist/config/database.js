"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const chromadb_1 = require("chromadb");
const logger_1 = require("./logger");
class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.resultCache = new Map();
        this.config = {
            maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '100'),
            enableCaching: process.env.ENABLE_SCORING_CACHE === 'true',
            cacheTimeout: parseInt(process.env.SCORING_CACHE_TIMEOUT || '300000')
        };
    }
    async connect() {
        try {
            const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';
            if (useCloud) {
                const apiKey = process.env.CHROMADB_API_KEY;
                const tenant = process.env.CHROMADB_TENANT;
                const database = process.env.CHROMADB_DATABASE;
                if (!apiKey || !tenant || !database) {
                    throw new Error('CHROMADB_API_KEY, CHROMADB_TENANT, and CHROMADB_DATABASE environment variables are required for cloud connection');
                }
                this.client = new chromadb_1.CloudClient({
                    apiKey,
                    tenant,
                    database
                });
                logger_1.logger.info('Connecting to ChromaDB Cloud...');
            }
            else {
                const chromaUrl = process.env.CHROMADB_URL;
                if (!chromaUrl) {
                    throw new Error('CHROMADB_URL environment variable is required for local connection');
                }
                this.client = new chromadb_1.ChromaClient({ path: chromaUrl });
                logger_1.logger.info('Connecting to local ChromaDB...');
            }
            await this.client.listCollections();
            logger_1.logger.info(`Connected to ChromaDB ${useCloud ? 'Cloud' : 'local'} successfully`);
            await this.initializeCollections();
            this.isConnected = true;
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to ChromaDB:', error);
            this.isConnected = false;
            throw error;
        }
    }
    async initializeCollections() {
        try {
            const collectionName = process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois';
            const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';
            logger_1.logger.info(`Initializing collections for ${useCloud ? 'cloud' : 'local'} ChromaDB...`);
            logger_1.logger.info(`Looking for collection: ${collectionName}`);
            let collections = [];
            try {
                collections = await this.client.listCollections();
                logger_1.logger.info(`Available collections: ${JSON.stringify(collections)}`);
                if (!Array.isArray(collections)) {
                    logger_1.logger.warn(`listCollections returned non-array: ${typeof collections}`);
                    collections = [];
                }
            }
            catch (listError) {
                logger_1.logger.warn(`Failed to list collections: ${listError.message}`);
            }
            const collectionNames = collections.map((col) => {
                if (typeof col === 'string')
                    return col;
                return col.name || col.id || null;
            }).filter((name) => name !== null);
            logger_1.logger.info(`Found collection names: ${collectionNames.length > 0 ? collectionNames.join(', ') : 'none'}`);
            const collectionExists = collectionNames.includes(collectionName);
            if (collectionExists) {
                logger_1.logger.info(`Collection ${collectionName} found in list, retrieving...`);
            }
            else if (collectionNames.length > 0) {
                logger_1.logger.warn(`Collection ${collectionName} not found. Available: ${collectionNames.join(', ')}`);
            }
            else {
                logger_1.logger.info(`No collections found in list, attempting direct retrieval...`);
            }
            try {
                logger_1.logger.info(`Attempting to get collection: ${collectionName}`);
                let collection;
                if (useCloud) {
                    collection = await this.client.getCollection({
                        name: collectionName
                    });
                }
                else {
                    try {
                        collection = await this.client.getCollection({
                            name: collectionName
                        });
                    }
                    catch (localError) {
                        if (localError.message && localError.message.includes('embedding')) {
                            logger_1.logger.info(`Retrying with null embedding function...`);
                            collection = await this.client.getCollection({
                                name: collectionName,
                                embeddingFunction: null
                            });
                        }
                        else {
                            throw localError;
                        }
                    }
                }
                logger_1.logger.info(`Successfully retrieved collection: ${collectionName}`);
                this.collections = {
                    general: collection,
                    specific: collection,
                    contextual: collection
                };
                try {
                    const count = await collection.count();
                    logger_1.logger.info(`Collection ${collectionName} contains ${count} documents`);
                }
                catch (countError) {
                    logger_1.logger.warn(`Could not get document count for ${collectionName}:`, countError);
                }
            }
            catch (getCollectionError) {
                logger_1.logger.error(`Failed to get collection ${collectionName}: ${getCollectionError.message}`);
                const isNotFoundError = getCollectionError.message?.includes('could not be found') ||
                    getCollectionError.message?.includes('ChromaNotFoundError') ||
                    getCollectionError.name === 'ChromaNotFoundError';
                if (isNotFoundError && !useCloud) {
                    const chromaUrl = process.env.CHROMADB_URL || '';
                    const isServerBased = chromaUrl.startsWith('http://') || chromaUrl.startsWith('https://');
                    if (isServerBased) {
                        logger_1.logger.error(`\n❌ Collection '${collectionName}' not found on ChromaDB server at ${chromaUrl}`);
                        logger_1.logger.error(`The server is running but doesn't have the collection.`);
                        logger_1.logger.error(`\nPossible solutions:`);
                        logger_1.logger.error(`1. Load your data into the ChromaDB server`);
                        logger_1.logger.error(`2. Use file-based ChromaDB by setting CHROMADB_URL to a directory path (e.g., "C:\\path\\to\\chroma")`);
                        logger_1.logger.error(`3. Check if the collection has a different name on the server`);
                    }
                    else {
                        logger_1.logger.error(`\n❌ Collection '${collectionName}' not found in file-based ChromaDB at ${chromaUrl}`);
                        logger_1.logger.error(`\nPossible solutions:`);
                        logger_1.logger.error(`1. Verify the path is correct`);
                        logger_1.logger.error(`2. Check if the collection exists with a different name`);
                        logger_1.logger.error(`3. Ensure the ChromaDB data files are in the specified directory`);
                    }
                }
                if (collectionNames.length > 0) {
                    logger_1.logger.warn(`\nAvailable collections found: ${collectionNames.join(', ')}`);
                    logger_1.logger.warn(`Set CHROMADB_COLLECTION_NAME to one of these names to use an existing collection.`);
                }
                else {
                    logger_1.logger.warn(`\nNo collections found. You may need to load your data first.`);
                }
                this.collections = {
                    general: null,
                    specific: null,
                    contextual: null
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize collections:', error);
            throw error;
        }
    }
    async search(collectionName, queryEmbedding, nResults = 100) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        const collection = this.collections[collectionName];
        if (!collection) {
            throw new Error(`Collection ${collectionName} not available`);
        }
        const actualNResults = nResults || this.config.maxResults;
        try {
            const cacheKey = this.generateCacheKey(collectionName, queryEmbedding, actualNResults);
            if (this.config.enableCaching && this.resultCache.has(cacheKey)) {
                const cached = this.resultCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                    logger_1.logger.info(`Cache hit for query with ${actualNResults} results`);
                    return cached.results;
                }
                else {
                    this.resultCache.delete(cacheKey);
                }
            }
            const startTime = Date.now();
            logger_1.logger.info(`🔍 Query params: nResults=${actualNResults}, embedding dim=${queryEmbedding.length}`);
            const results = await collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: actualNResults,
                include: ['metadatas', 'documents', 'distances']
            });
            if (results.metadatas && results.metadatas[0] && results.metadatas[0][0]) {
                const firstMetadata = results.metadatas[0][0];
                logger_1.logger.info(`🔍 FIRST RESULT METADATA KEYS: ${Object.keys(firstMetadata).join(', ')}`);
                const openingHoursKeys = Object.keys(firstMetadata).filter(k => k.toLowerCase().includes('open') || k.toLowerCase().includes('hour'));
                if (openingHoursKeys.length > 0) {
                    logger_1.logger.info(`🎯 Opening hours keys found: ${openingHoursKeys.join(', ')}`);
                }
            }
            const searchTime = Date.now() - startTime;
            logger_1.logger.info(`Database search completed in ${searchTime}ms for ${actualNResults} results`);
            if (this.config.enableCaching) {
                this.resultCache.set(cacheKey, { results, timestamp: Date.now() });
                logger_1.logger.info(`Results cached for future queries`);
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Failed to search collection ${collectionName}:`, error);
            throw error;
        }
    }
    generateCacheKey(collectionName, queryEmbedding, nResults) {
        const embeddingHash = queryEmbedding.slice(0, 10).join(',');
        return `${collectionName}_${embeddingHash}_${nResults}`;
    }
    async getCollectionStats() {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        try {
            const stats = {
                general: await this.getCollectionCount('general'),
                specific: await this.getCollectionCount('specific'),
                contextual: await this.getCollectionCount('contextual'),
                isConnected: this.isConnected
            };
            return stats;
        }
        catch (error) {
            logger_1.logger.error('Failed to get collection stats:', error);
            throw error;
        }
    }
    async getCollectionCount(collectionName) {
        const collection = this.collections[collectionName];
        if (!collection)
            return 0;
        try {
            return await collection.count();
        }
        catch (error) {
            logger_1.logger.warn(`Failed to get count for ${collectionName}:`, error);
            return 0;
        }
    }
    isReady() {
        return this.isConnected && this.collections !== null;
    }
    getCacheStats() {
        return {
            size: this.resultCache.size,
            hitRate: 0
        };
    }
    clearCache() {
        this.resultCache.clear();
        logger_1.logger.info('Database cache cleared');
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.js.map