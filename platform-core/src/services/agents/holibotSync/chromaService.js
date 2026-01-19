/**
 * ChromaDB Service for HoliBot Sync Agent
 * Manages vector database collections and operations
 * Uses CloudClient for ChromaDB Cloud connection
 */

import { CloudClient } from 'chromadb';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

class ChromaService {
  constructor() {
    this.client = null;
    this.collections = {};
    this.isConnected = false;
    this.config = {
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE
    };
  }

  async connect() {
    if (this.isConnected && this.client) return this.client;

    const { apiKey, tenant, database } = this.config;

    if (!apiKey || !tenant || !database) {
      const error = new Error('ChromaDB Cloud credentials not configured (CHROMADB_API_KEY, CHROMADB_TENANT, CHROMADB_DATABASE required)');
      await logError('holibot-sync', error, { action: 'chroma_connect' });
      throw error;
    }

    try {
      console.log('[ChromaService] Connecting to ChromaDB Cloud...');

      this.client = new CloudClient({
        apiKey,
        tenant,
        database
      });

      // Test connection by listing collections
      const collections = await this.client.listCollections();
      console.log(`[ChromaService] Connected to ChromaDB Cloud. Found ${collections.length} collection(s)`);

      this.isConnected = true;
      return this.client;
    } catch (error) {
      await logError('holibot-sync', error, { action: 'chroma_connect' });
      throw error;
    }
  }

  async getOrCreateCollection(name, metadata = {}) {
    if (this.collections[name]) return this.collections[name];

    await this.connect();

    try {
      // Try to get existing collection first
      try {
        const collection = await this.client.getCollection({ name });
        this.collections[name] = collection;
        const count = await collection.count();
        console.log(`[ChromaService] Collection "${name}" loaded with ${count} documents`);
        return collection;
      } catch (getError) {
        // Collection doesn't exist, create it
        console.log(`[ChromaService] Creating new collection: ${name}`);
        const collection = await this.client.createCollection({
          name: name,
          metadata: {
            ...metadata,
            'hnsw:space': 'cosine',
            'created_at': new Date().toISOString()
          }
        });
        this.collections[name] = collection;
        console.log(`[ChromaService] Collection created: ${name}`);
        return collection;
      }
    } catch (error) {
      await logError('holibot-sync', error, { action: 'get_collection', collection: name });
      throw error;
    }
  }

  async upsertDocuments(collectionName, ids, embeddings, documents, metadatas) {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      await collection.upsert({
        ids: ids,
        embeddings: embeddings,
        documents: documents,
        metadatas: metadatas
      });

      await logAgent('holibot-sync', 'documents_upserted', {
        description: `Upserted ${ids.length} documents to ${collectionName}`,
        metadata: { collection: collectionName, count: ids.length }
      });

      console.log(`[ChromaService] Upserted ${ids.length} documents to ${collectionName}`);
      return { success: true, count: ids.length };
    } catch (error) {
      await logError('holibot-sync', error, {
        action: 'upsert_documents',
        collection: collectionName,
        count: ids.length
      });
      throw error;
    }
  }

  async deleteDocuments(collectionName, ids) {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      await collection.delete({ ids: ids });

      await logAgent('holibot-sync', 'documents_deleted', {
        description: `Deleted ${ids.length} documents from ${collectionName}`,
        metadata: { collection: collectionName, count: ids.length }
      });

      console.log(`[ChromaService] Deleted ${ids.length} documents from ${collectionName}`);
      return { success: true, count: ids.length };
    } catch (error) {
      await logError('holibot-sync', error, {
        action: 'delete_documents',
        collection: collectionName
      });
      throw error;
    }
  }

  async getCollectionStats(collectionName) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      const count = await collection.count();
      return {
        collection: collectionName,
        documentCount: count,
        isConnected: this.isConnected
      };
    } catch (error) {
      return {
        collection: collectionName,
        documentCount: 0,
        error: error.message,
        isConnected: this.isConnected
      };
    }
  }

  async query(collectionName, queryEmbedding, nResults = 5, whereFilter = null) {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const queryOptions = {
        queryEmbeddings: [queryEmbedding],
        nResults: nResults,
        include: ['metadatas', 'documents', 'distances']
      };

      if (whereFilter) {
        queryOptions.where = whereFilter;
      }

      const results = await collection.query(queryOptions);
      return results;
    } catch (error) {
      await logError('holibot-sync', error, { action: 'query', collection: collectionName });
      throw error;
    }
  }

  isReady() {
    return this.isConnected && this.client !== null;
  }
}

export default new ChromaService();
