/**
 * ChromaDB Cloud Service - Multi-Collection Support
 * Connects to ChromaDB Cloud for semantic search with POI/QnA embeddings
 * Supports multiple collections for multi-destination (Calpe, Texel, etc.)
 */

import { CloudClient } from 'chromadb';
import logger from '../../utils/logger.js';

class ChromaService {
  constructor() {
    this.client = null;
    this.collections = {};  // Map: collectionName → collection object
    this.isConnected = false;
    this.config = {
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE,
      defaultCollectionName: process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois'
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

      // Get the default collection (backward compatible)
      await this.getCollection(this.config.defaultCollectionName);

      this.isConnected = true;
      return true;

    } catch (error) {
      logger.error('Failed to connect to ChromaDB Cloud:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get a collection by name (lazy-load and cache)
   * @param {string} collectionName - Collection name (defaults to env config)
   * @returns {Object} ChromaDB collection
   */
  async getCollection(collectionName = null) {
    const name = collectionName || this.config.defaultCollectionName;

    // Return cached collection
    if (this.collections[name]) {
      return this.collections[name];
    }

    if (!this.client) {
      await this.connect();
    }

    try {
      logger.info(`Getting collection: ${name}`);

      const collection = await this.client.getCollection({ name });
      const count = await collection.count();
      logger.info(`Collection "${name}" loaded with ${count} documents`);

      this.collections[name] = collection;
      return collection;

    } catch (error) {
      logger.error(`Failed to get collection "${name}":`, error);
      throw error;
    }
  }

  /**
   * Search for similar documents using embedding
   * @param {number[]} embedding - Query embedding vector
   * @param {number} nResults - Number of results to return
   * @param {Object} whereFilter - Optional metadata filter
   * @param {string} collectionName - Collection to search (defaults to env config)
   */
  async search(embedding, nResults = 10, whereFilter = null, collectionName = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const collection = await this.getCollection(collectionName);

      const queryOptions = {
        queryEmbeddings: [embedding],
        nResults,
        include: ['metadatas', 'documents', 'distances']
      };

      if (whereFilter) {
        queryOptions.where = whereFilter;
      }

      const results = await collection.query(queryOptions);

      logger.info(`ChromaDB search returned ${results.ids[0]?.length || 0} results from "${collectionName || this.config.defaultCollectionName}"`);

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
   * @param {string} collectionName - Collection to upsert into (defaults to env config)
   */
  async upsert(documents, collectionName = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const collection = await this.getCollection(collectionName);

      const ids = documents.map(d => d.id);
      const embeddings = documents.map(d => d.embedding);
      const metadatas = documents.map(d => d.metadata || {});
      const docs = documents.map(d => d.document || '');

      await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents: docs
      });

      logger.info(`Upserted ${documents.length} documents to ChromaDB "${collectionName || this.config.defaultCollectionName}"`);

    } catch (error) {
      logger.error('ChromaDB upsert error:', error);
      throw error;
    }
  }

  /**
   * Delete documents from ChromaDB
   * @param {string[]} ids - Document IDs to delete
   * @param {string} collectionName - Collection to delete from (defaults to env config)
   */
  async delete(ids, collectionName = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const collection = await this.getCollection(collectionName);
      await collection.delete({ ids });
      logger.info(`Deleted ${ids.length} documents from ChromaDB "${collectionName || this.config.defaultCollectionName}"`);

    } catch (error) {
      logger.error('ChromaDB delete error:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   * @param {string} collectionName - Collection name (defaults to env config)
   */
  async getStats(collectionName = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const name = collectionName || this.config.defaultCollectionName;
      const collection = await this.getCollection(name);
      const count = await collection.count();
      return {
        collectionName: name,
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
    return this.isConnected && Object.keys(this.collections).length > 0;
  }
}

// Export singleton instance
export const chromaService = new ChromaService();
export default chromaService;
