/**
 * ChromaDB Service for HoliBot Sync Agent
 * Manages vector database collections and operations
 * Supports both local and cloud ChromaDB instances
 */

import { ChromaClient } from 'chromadb';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

class ChromaService {
  constructor() {
    this.client = null;
    this.collections = {};
    this.isCloud = process.env.USE_CHROMADB_CLOUD === 'true';
  }

  async connect() {
    if (this.client) return this.client;

    try {
      if (this.isCloud) {
        // ChromaDB Cloud configuration
        console.log('[ChromaService] Connecting to ChromaDB Cloud...');
        this.client = new ChromaClient({
          path: 'https://api.trychroma.com',
          auth: {
            provider: 'token',
            credentials: process.env.CHROMADB_API_KEY
          },
          tenant: process.env.CHROMADB_TENANT,
          database: process.env.CHROMADB_DATABASE || 'default_database'
        });
      } else {
        // Local ChromaDB configuration
        console.log('[ChromaService] Connecting to local ChromaDB...');
        this.client = new ChromaClient({
          path: process.env.CHROMA_URL || 'http://localhost:8000'
        });
      }

      // Verify connection
      await this.client.heartbeat();
      console.log(`[ChromaService] Connected to ChromaDB (${this.isCloud ? 'Cloud' : 'Local'})`);

      return this.client;
    } catch (error) {
      await logError('holibot-sync', error, {
        action: 'chroma_connect',
        isCloud: this.isCloud
      });
      throw error;
    }
  }

  async getOrCreateCollection(name, metadata = {}) {
    if (this.collections[name]) return this.collections[name];

    await this.connect();

    try {
      const collection = await this.client.getOrCreateCollection({
        name: name,
        metadata: {
          ...metadata,
          'hnsw:space': 'cosine',
          'last_updated': new Date().toISOString()
        }
      });

      this.collections[name] = collection;
      console.log(`[ChromaService] Collection ready: ${name}`);

      return collection;
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
        mode: this.isCloud ? 'cloud' : 'local'
      };
    } catch (error) {
      return {
        collection: collectionName,
        documentCount: 0,
        error: error.message,
        mode: this.isCloud ? 'cloud' : 'local'
      };
    }
  }

  async query(collectionName, queryEmbedding, nResults = 5) {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: nResults
      });

      return results;
    } catch (error) {
      await logError('holibot-sync', error, { action: 'query', collection: collectionName });
      throw error;
    }
  }

  isCloudMode() {
    return this.isCloud;
  }
}

export default new ChromaService();
