/**
 * Q&A Sync Service for HoliBot Sync Agent
 * Synchronizes Q&A data to ChromaDB for vector search
 */

import embeddingService from './embeddingService.js';
import chromaService from './chromaService.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

// Default collection per destination
const DESTINATION_COLLECTIONS = {
  1: 'calpe_pois',
  2: 'texel_pois'
};
const DEFAULT_COLLECTION = 'holidaibutler_qas';

class QASyncService {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  async syncUpdatedQAs(since = null, destinationId = null) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    const collectionName = destinationId ? (DESTINATION_COLLECTIONS[destinationId] || DEFAULT_COLLECTION) : DEFAULT_COLLECTION;

    console.log(`[QASyncService] Starting Q&A sync to ChromaDB collection "${collectionName}"...`);

    try {
      // QnA table for all destinations (destination_id differentiates)
      let query, replacements = [];

      query = `
        SELECT q.id, q.question, q.answer, q.language, q.google_placeid as poi_id,
               q.source, q.created_at as last_updated,
               p.name as poi_name, p.category, p.city AS destination
        FROM QnA q
        LEFT JOIN POI p ON q.google_placeid = p.google_place_id
        WHERE q.question IS NOT NULL AND q.answer IS NOT NULL
      `;

      if (destinationId) {
        query += ' AND q.destination_id = ?';
        replacements.push(destinationId);
      }
      if (since) {
        query += ' AND q.created_at > ?';
        replacements.push(since);
      }
      query += ' ORDER BY q.id DESC LIMIT 200';

      const [qas] = await this.sequelize.query(query, { replacements });

      if (qas.length === 0) {
        console.log('[QASyncService] No Q&As to sync');
        return { synced: 0, collection: collectionName };
      }

      console.log(`[QASyncService] Syncing ${qas.length} Q&As...`);

      // Prepare data for ChromaDB
      const ids = qas.map(q => `qa_${q.id}`);
      const documents = qas.map(q => embeddingService.formatQAForEmbedding(q));
      const metadatas = qas.map(q => ({
        qa_id: q.id,
        poi_id: q.poi_id || 0,
        poi_name: q.poi_name || 'General',
        category: q.category || 'general',
        destination: q.destination || 'calpe',
        language: q.language || 'en',
        priority: q.priority || 3,
        updated_at: q.last_updated ? q.last_updated.toISOString() : new Date().toISOString()
      }));

      // Generate embeddings
      console.log('[QASyncService] Generating embeddings...');
      const embeddings = await embeddingService.generateBatchEmbeddings(documents);

      // Upsert to ChromaDB
      console.log('[QASyncService] Upserting to ChromaDB...');
      await chromaService.upsertDocuments(collectionName, ids, embeddings, documents, metadatas);

      await logAgent('holibot-sync', 'qa_sync_complete', {
        description: `Synced ${qas.length} Q&As to ChromaDB`,
        metadata: { count: qas.length, collection: collectionName }
      });

      console.log(`[QASyncService] Successfully synced ${qas.length} Q&As`);

      return { synced: qas.length, collection: collectionName };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'sync_qas' });
      throw error;
    }
  }

  async syncRejectedQAs() {
    // QnA table has no status column — rejection not applicable
    return { deleted: 0 };
  }
}

export default new QASyncService();
