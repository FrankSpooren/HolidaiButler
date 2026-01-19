/**
 * Q&A Sync Service for HoliBot Sync Agent
 * Synchronizes Q&A data to ChromaDB for vector search
 */

import embeddingService from './embeddingService.js';
import chromaService from './chromaService.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const QA_COLLECTION = 'holidaibutler_qas';

class QASyncService {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  async syncUpdatedQAs(since = null) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    console.log('[QASyncService] Starting Q&A sync to ChromaDB...');

    try {
      // Get Q&As updated since last sync (only approved ones)
      let query = `
        SELECT qa.id, qa.question, qa.answer, qa.language, qa.poi_id,
               qa.priority, qa.updated_at, p.name as poi_name, p.category, p.destination
        FROM QAs qa
        LEFT JOIN POIs p ON qa.poi_id = p.id
        WHERE qa.status = 'approved'
      `;

      const replacements = [];
      if (since) {
        query += ' AND qa.updated_at > ?';
        replacements.push(since);
      }

      query += ' ORDER BY qa.priority DESC, qa.updated_at DESC LIMIT 200';

      const [qas] = await this.sequelize.query(query, { replacements });

      if (qas.length === 0) {
        console.log('[QASyncService] No Q&As to sync');
        return { synced: 0, collection: QA_COLLECTION };
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
        updated_at: q.updated_at ? q.updated_at.toISOString() : new Date().toISOString()
      }));

      // Generate embeddings
      console.log('[QASyncService] Generating embeddings...');
      const embeddings = await embeddingService.generateBatchEmbeddings(documents);

      // Upsert to ChromaDB
      console.log('[QASyncService] Upserting to ChromaDB...');
      await chromaService.upsertDocuments(QA_COLLECTION, ids, embeddings, documents, metadatas);

      await logAgent('holibot-sync', 'qa_sync_complete', {
        description: `Synced ${qas.length} Q&As to ChromaDB`,
        metadata: { count: qas.length, collection: QA_COLLECTION }
      });

      console.log(`[QASyncService] Successfully synced ${qas.length} Q&As`);

      return { synced: qas.length, collection: QA_COLLECTION };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'sync_qas' });
      throw error;
    }
  }

  async syncRejectedQAs() {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    try {
      // Get recently rejected Q&As
      const [rejectedQAs] = await this.sequelize.query(`
        SELECT id FROM QAs
        WHERE status = 'rejected'
        AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

      if (rejectedQAs.length === 0) {
        return { deleted: 0 };
      }

      const ids = rejectedQAs.map(q => `qa_${q.id}`);
      await chromaService.deleteDocuments(QA_COLLECTION, ids);

      await logAgent('holibot-sync', 'rejected_qas_removed', {
        description: `Removed ${ids.length} rejected Q&As from ChromaDB`,
        metadata: { count: ids.length }
      });

      return { deleted: ids.length };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'sync_rejected_qas' });
      throw error;
    }
  }
}

export default new QASyncService();
