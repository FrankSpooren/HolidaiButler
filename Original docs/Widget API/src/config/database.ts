import { ChromaClient, CloudClient } from 'chromadb';
import { logger } from './logger';

interface DatabaseConfig {
  maxResults: number;
  enableCaching: boolean;
  cacheTimeout: number;
}

export class DatabaseService {
  private client!: ChromaClient | CloudClient;
  private collections!: {
    general: any;
    specific: any;
    contextual: any;
  };
  private isConnected: boolean = false;
  private config: DatabaseConfig;
  private resultCache = new Map<string, { results: any, timestamp: number }>();

  constructor() {
    this.config = {
      maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '100'),
      enableCaching: process.env.ENABLE_SCORING_CACHE === 'true',
      cacheTimeout: parseInt(process.env.SCORING_CACHE_TIMEOUT || '300000') // 5 minutes
    };
  }

  async connect() {
    try {
      const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';
      
      if (useCloud) {
        // Connect to ChromaDB Cloud
        const apiKey = process.env.CHROMADB_API_KEY;
        const tenant = process.env.CHROMADB_TENANT;
        const database = process.env.CHROMADB_DATABASE;
        
        if (!apiKey || !tenant || !database) {
          throw new Error('CHROMADB_API_KEY, CHROMADB_TENANT, and CHROMADB_DATABASE environment variables are required for cloud connection');
        }
        
        this.client = new CloudClient({
          apiKey,
          tenant,
          database
        });
        
        logger.info('Connecting to ChromaDB Cloud...');
      } else {
        // Connect to local ChromaDB
        const chromaUrl = process.env.CHROMADB_URL;
        if (!chromaUrl) {
          throw new Error('CHROMADB_URL environment variable is required for local connection');
        }
        
        this.client = new ChromaClient({ path: chromaUrl });
        logger.info('Connecting to local ChromaDB...');
      }
      
      // Test connection
      await this.client.listCollections();
      logger.info(`Connected to ChromaDB ${useCloud ? 'Cloud' : 'local'} successfully`);
      
      // Initialize collections
      await this.initializeCollections();
      this.isConnected = true;
      
    } catch (error) {
      logger.error('Failed to connect to ChromaDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private async initializeCollections() {
    try {
      // For now, we'll use the existing single collection approach
      // but prepare for multi-collection support
      const collectionName = process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois';
      const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';
      
      logger.info(`Initializing collections for ${useCloud ? 'cloud' : 'local'} ChromaDB...`);
      logger.info(`Looking for collection: ${collectionName}`);
      
      // First, try to list collections to see what's available
      // This helps us understand the format and what collections exist
      let collections: any[] = [];
      try {
        collections = await this.client.listCollections();
        logger.info(`Available collections: ${JSON.stringify(collections)}`);
        
        // Handle different response formats
        if (!Array.isArray(collections)) {
          logger.warn(`listCollections returned non-array: ${typeof collections}`);
          collections = [];
        }
      } catch (listError: any) {
        logger.warn(`Failed to list collections: ${listError.message}`);
        // Continue anyway - we'll try to get the collection directly
      }
      
      // Extract collection names from the list (handle different formats)
      const collectionNames = collections.map((col: any) => {
        if (typeof col === 'string') return col;
        return col.name || col.id || null;
      }).filter((name: string | null) => name !== null);
      
      logger.info(`Found collection names: ${collectionNames.length > 0 ? collectionNames.join(', ') : 'none'}`);
      
      // Check if our target collection exists
      const collectionExists = collectionNames.includes(collectionName);
      
      if (collectionExists) {
        logger.info(`Collection ${collectionName} found in list, retrieving...`);
      } else if (collectionNames.length > 0) {
        logger.warn(`Collection ${collectionName} not found. Available: ${collectionNames.join(', ')}`);
      } else {
        logger.info(`No collections found in list, attempting direct retrieval...`);
      }
      
      // Try to get the collection - this works for both local and cloud
      // For local ChromaDB, getCollection might work even if listCollections doesn't show it
      // For cloud ChromaDB, getCollection is more reliable
      try {
        logger.info(`Attempting to get collection: ${collectionName}`);
        
        // For local ChromaDB, we might need to handle embedding function requirement
        // For cloud ChromaDB, we can call it directly
        let collection;
        
        if (useCloud) {
          // Cloud client - straightforward call
          collection = await this.client.getCollection({ 
            name: collectionName
          } as any);
        } else {
          // Local client - might need embedding function, but try without first
          try {
            collection = await this.client.getCollection({ 
              name: collectionName
            } as any);
          } catch (localError: any) {
            // If it fails with embedding function error, try with null embedding function
            if (localError.message && localError.message.includes('embedding')) {
              logger.info(`Retrying with null embedding function...`);
              collection = await this.client.getCollection({ 
                name: collectionName,
                embeddingFunction: null
              } as any);
            } else {
              throw localError;
            }
          }
        }
        
        logger.info(`Successfully retrieved collection: ${collectionName}`);
        
        // For now, use the same collection for all search types
        // This will be enhanced later to support multiple embedding types
        this.collections = {
          general: collection,
          specific: collection,
          contextual: collection
        };
        
        // Verify the collection has data
        try {
          const count = await collection.count();
          logger.info(`Collection ${collectionName} contains ${count} documents`);
        } catch (countError) {
          logger.warn(`Could not get document count for ${collectionName}:`, countError);
        }
        
      } catch (getCollectionError: any) {
        logger.error(`Failed to get collection ${collectionName}: ${getCollectionError.message}`);
        
        // Check if this is a "not found" error for server-based ChromaDB
        const isNotFoundError = getCollectionError.message?.includes('could not be found') || 
                               getCollectionError.message?.includes('ChromaNotFoundError') ||
                               getCollectionError.name === 'ChromaNotFoundError';
        
        if (isNotFoundError && !useCloud) {
          // For local ChromaDB, provide specific guidance
          const chromaUrl = process.env.CHROMADB_URL || '';
          const isServerBased = chromaUrl.startsWith('http://') || chromaUrl.startsWith('https://');
          
          if (isServerBased) {
            logger.error(`\n❌ Collection '${collectionName}' not found on ChromaDB server at ${chromaUrl}`);
            logger.error(`The server is running but doesn't have the collection.`);
            logger.error(`\nPossible solutions:`);
            logger.error(`1. Load your data into the ChromaDB server`);
            logger.error(`2. Use file-based ChromaDB by setting CHROMADB_URL to a directory path (e.g., "C:\\path\\to\\chroma")`);
            logger.error(`3. Check if the collection has a different name on the server`);
          } else {
            logger.error(`\n❌ Collection '${collectionName}' not found in file-based ChromaDB at ${chromaUrl}`);
            logger.error(`\nPossible solutions:`);
            logger.error(`1. Verify the path is correct`);
            logger.error(`2. Check if the collection exists with a different name`);
            logger.error(`3. Ensure the ChromaDB data files are in the specified directory`);
          }
        }
        
        // If we have other collections, suggest using one of them
        if (collectionNames.length > 0) {
          logger.warn(`\nAvailable collections found: ${collectionNames.join(', ')}`);
          logger.warn(`Set CHROMADB_COLLECTION_NAME to one of these names to use an existing collection.`);
        } else {
          logger.warn(`\nNo collections found. You may need to load your data first.`);
        }
        
        // Create placeholder collections
        this.collections = {
          general: null,
          specific: null,
          contextual: null
        };
      }
      
    } catch (error) {
      logger.error('Failed to initialize collections:', error);
      throw error;
    }
  }

  async search(collectionName: string, queryEmbedding: number[], nResults: number = 100) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const collection = this.collections[collectionName as keyof typeof this.collections];
    if (!collection) {
      throw new Error(`Collection ${collectionName} not available`);
    }

    // Use configurable maxResults if not specified
    const actualNResults = nResults || this.config.maxResults;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(collectionName, queryEmbedding, actualNResults);
      
      // Check cache first
      if (this.config.enableCaching && this.resultCache.has(cacheKey)) {
        const cached = this.resultCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
          logger.info(`Cache hit for query with ${actualNResults} results`);
          return cached.results;
        } else {
          // Cache expired, remove it
          this.resultCache.delete(cacheKey);
        }
      }
      
      // Perform search with performance monitoring
      const startTime = Date.now();
      
      // DEBUG: Log what we're requesting
      logger.info(`🔍 Query params: nResults=${actualNResults}, embedding dim=${queryEmbedding.length}`);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: actualNResults,
        include: ['metadatas', 'documents', 'distances']
      });
      
      // DEBUG: Log metadata keys from first result
      if (results.metadatas && results.metadatas[0] && results.metadatas[0][0]) {
        const firstMetadata = results.metadatas[0][0];
        logger.info(`🔍 FIRST RESULT METADATA KEYS: ${Object.keys(firstMetadata).join(', ')}`);
        const openingHoursKeys = Object.keys(firstMetadata).filter(k => k.toLowerCase().includes('open') || k.toLowerCase().includes('hour'));
        if (openingHoursKeys.length > 0) {
          logger.info(`🎯 Opening hours keys found: ${openingHoursKeys.join(', ')}`);
        }
      }
      const searchTime = Date.now() - startTime;
      
      // Log performance metrics
      logger.info(`Database search completed in ${searchTime}ms for ${actualNResults} results`);
      
      // Cache results
      if (this.config.enableCaching) {
        this.resultCache.set(cacheKey, { results, timestamp: Date.now() });
        logger.info(`Results cached for future queries`);
      }

      return results;
    } catch (error) {
      logger.error(`Failed to search collection ${collectionName}:`, error);
      throw error;
    }
  }

  private generateCacheKey(collectionName: string, queryEmbedding: number[], nResults: number): string {
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
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      throw error;
    }
  }

  private async getCollectionCount(collectionName: string): Promise<number> {
    const collection = this.collections[collectionName as keyof typeof this.collections];
    if (!collection) return 0;
    
    try {
      return await collection.count();
    } catch (error) {
      logger.warn(`Failed to get count for ${collectionName}:`, error);
      return 0;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.collections !== null;
  }

  getCacheStats(): { size: number, hitRate: number } {
    return {
      size: this.resultCache.size,
      hitRate: 0 // This would need to be tracked separately for accurate hit rate
    };
  }

  clearCache(): void {
    this.resultCache.clear();
    logger.info('Database cache cleared');
  }
}
