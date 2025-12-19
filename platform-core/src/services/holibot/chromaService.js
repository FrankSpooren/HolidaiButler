/**
 * ChromaDB Cloud Service
 * Connects to ChromaDB Cloud for semantic search with POI embeddings
 */

import { CloudClient } from 'chromadb';
import logger from '../../utils/logger.js';

class ChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isConnected = false;
    this.config = {
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE,
      collectionName: process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois'
    };
  }

  /**
   * Initialize connection to ChromaDB Cloud
   */
  async connect() {
    if (this.isConnected) {
      return true;
    }

    try {
      const { apiKey, tenant, database } = this.config;

      if (!apiKey || !tenant || !database) {
        throw new Error('ChromaDB Cloud credentials not configured');
      }

      logger.info('Connecting to ChromaDB Cloud...');

      this.client = new CloudClient({
        apiKey,
        tenant,
        database
      });

      // Test connection by listing collections
      const collections = await this.client.listCollections();
      logger.info(`ChromaDB Cloud connected. Found ${collections.length} collection(s)`);

      // Get the main collection
      await this.initializeCollection();

      this.isConnected = true;
      return true;

    } catch (error) {
      logger.error('Failed to connect to ChromaDB Cloud:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Initialize the POI collection
   */
  async initializeCollection() {
    try {
      const { collectionName } = this.config;

      logger.info(`Getting collection: ${collectionName}`);

      this.collection = await this.client.getCollection({
        name: collectionName
      });

      const count = await this.collection.count();
      logger.info(`Collection "${collectionName}" loaded with ${count} documents`);

      return this.collection;

    } catch (error) {
      logger.error('Failed to initialize collection:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents using embedding
   * @param {number[]} embedding - Query embedding vector
   * @param {number} nResults - Number of results to return
   * @param {Object} whereFilter - Optional metadata filter
   */
  async search(embedding, nResults = 10, whereFilter = null) {
    if (!this.isConnected || !this.collection) {
      await this.connect();
    }

    try {
      const queryOptions = {
        queryEmbeddings: [embedding],
        nResults,
        include: ['metadatas', 'documents', 'distances']
      };

      if (whereFilter) {
        queryOptions.where = whereFilter;
      }

      const results = await this.collection.query(queryOptions);

      logger.info(`ChromaDB search returned ${results.ids[0]?.length || 0} results`);

      return this.formatResults(results);

    } catch (error) {
      logger.error('ChromaDB search error:', error);
      throw error;
    }
  }

  /**
   * Format ChromaDB results to a more usable structure
   */
  formatResults(results) {
    if (!results.ids || !results.ids[0]) {
      return [];
    }

    const formatted = [];
    const ids = results.ids[0];
    const metadatas = results.metadatas?.[0] || [];
    const documents = results.documents?.[0] || [];
    const distances = results.distances?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      formatted.push({
        id: ids[i],
        metadata: metadatas[i] || {},
        document: documents[i] || '',
        distance: distances[i] || 0,
        similarity: 1 - (distances[i] || 0) // Convert distance to similarity
      });
    }

    return formatted;
  }

  /**
   * Add or update documents in ChromaDB
   * @param {Array} documents - Array of {id, embedding, metadata, document}
   */
  async upsert(documents) {
    if (!this.isConnected || !this.collection) {
      await this.connect();
    }

    try {
      const ids = documents.map(d => d.id);
      const embeddings = documents.map(d => d.embedding);
      const metadatas = documents.map(d => d.metadata || {});
      const docs = documents.map(d => d.document || '');

      await this.collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents: docs
      });

      logger.info(`Upserted ${documents.length} documents to ChromaDB`);

    } catch (error) {
      logger.error('ChromaDB upsert error:', error);
      throw error;
    }
  }

  /**
   * Delete documents from ChromaDB
   * @param {string[]} ids - Document IDs to delete
   */
  async delete(ids) {
    if (!this.isConnected || !this.collection) {
      await this.connect();
    }

    try {
      await this.collection.delete({ ids });
      logger.info(`Deleted ${ids.length} documents from ChromaDB`);

    } catch (error) {
      logger.error('ChromaDB delete error:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    if (!this.isConnected || !this.collection) {
      await this.connect();
    }

    try {
      const count = await this.collection.count();
      return {
        collectionName: this.config.collectionName,
        documentCount: count,
        isConnected: this.isConnected
      };

    } catch (error) {
      logger.error('Failed to get ChromaDB stats:', error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConnected && this.collection !== null;
  }
}

// Export singleton instance
export const chromaService = new ChromaService();
export default chromaService;
