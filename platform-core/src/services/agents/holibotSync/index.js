/**
 * HoliBot Sync Agent
 * ChromaDB vector database synchronization for HoliBot chatbot
 *
 * Features:
 * - POI embeddings sync to ChromaDB
 * - Q&A embeddings sync to ChromaDB
 * - MistralAI embedding generation
 * - Scheduled sync jobs (daily POI, daily Q&A, weekly reindex, daily cleanup)
 * - Integration with Data Sync Agent (triggers after POI/Q&A updates)
 *
 * Collections:
 * - holidaibutler_pois: POI vector embeddings
 * - holidaibutler_qas: Q&A vector embeddings
 */

import poiSyncService from './poiSyncService.js';
import qaSyncService from './qaSyncService.js';
import chromaService from './chromaService.js';
import embeddingService from './embeddingService.js';
import syncScheduler from './syncScheduler.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';

class HolibotSyncAgent {
  constructor() {
    this.initialized = false;
  }

  async initialize(sequelize) {
    if (this.initialized) {
      console.log('[HolibotSyncAgent] Already initialized, skipping...');
      return;
    }

    console.log('[HolibotSyncAgent] Initializing...');

    poiSyncService.setSequelize(sequelize);
    qaSyncService.setSequelize(sequelize);

    // Verify ChromaDB connection
    try {
      await chromaService.connect();
      console.log('[HolibotSyncAgent] ChromaDB connection verified');
    } catch (error) {
      console.error('[HolibotSyncAgent] ChromaDB connection failed:', error.message);
      await sendAlert({
        urgency: 3,
        title: 'HoliBot Sync: ChromaDB Connection Failed',
        message: `Could not connect to ChromaDB: ${error.message}`
      });
      // Don't throw - allow agent to continue, jobs will fail gracefully
    }

    // Initialize scheduled jobs
    await syncScheduler.initializeScheduledJobs();

    this.initialized = true;

    console.log('[HolibotSyncAgent] Enterprise agent ready');
    console.log('[HolibotSyncAgent] - POI Sync Service: active');
    console.log('[HolibotSyncAgent] - Q&A Sync Service: active');
    console.log('[HolibotSyncAgent] - Embedding Service: active');
    console.log('[HolibotSyncAgent] - Sync Scheduler: active');
  }

  async syncPOIs(since = null) {
    return poiSyncService.syncUpdatedPOIs(since);
  }

  async syncQAs(since = null) {
    return qaSyncService.syncUpdatedQAs(since);
  }

  async fullSync() {
    console.log('[HolibotSyncAgent] Starting full sync...');

    try {
      const poiResult = await poiSyncService.syncUpdatedPOIs();
      const qaResult = await qaSyncService.syncUpdatedQAs();

      await logAgent('holibot-sync', 'full_sync_complete', {
        description: `Full sync: ${poiResult.synced} POIs, ${qaResult.synced} Q&As`,
        metadata: { pois: poiResult.synced, qas: qaResult.synced }
      });

      return {
        pois: poiResult,
        qas: qaResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'full_sync' });
      throw error;
    }
  }

  async cleanup() {
    console.log('[HolibotSyncAgent] Running cleanup...');

    try {
      const poiResult = await poiSyncService.syncDeactivatedPOIs();
      const qaResult = await qaSyncService.syncRejectedQAs();

      await logAgent('holibot-sync', 'cleanup_complete', {
        description: `Cleanup: removed ${poiResult.deleted} POIs, ${qaResult.deleted} Q&As`,
        metadata: { deletedPOIs: poiResult.deleted, deletedQAs: qaResult.deleted }
      });

      return {
        deletedPOIs: poiResult.deleted,
        deletedQAs: qaResult.deleted,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'cleanup' });
      throw error;
    }
  }

  /**
   * Create a ChromaDB state snapshot for recovery reference
   * Logs collection document counts to MongoDB for comparison after re-vectorisation
   */
  async createChromaDBSnapshot() {
    console.log('[Het Geheugen] Creating ChromaDB state snapshot...');

    try {
      const mongoose = (await import('mongoose')).default;

      // Define schema if not exists
      let ChromaDBSnapshot;
      try {
        ChromaDBSnapshot = mongoose.model('ChromaDBStateSnapshot');
      } catch {
        const schema = new mongoose.Schema({
          timestamp: { type: Date, default: Date.now },
          collections: { type: mongoose.Schema.Types.Mixed }
        }, { collection: 'chromadb_state_snapshots' });
        ChromaDBSnapshot = mongoose.model('ChromaDBStateSnapshot', schema);
      }

      // Get collection counts
      const collections = {};
      const collectionNames = ['calpe_pois', 'texel_pois'];

      for (const name of collectionNames) {
        try {
          const collection = await chromaService.getCollection(name);
          const count = await collection.count();
          collections[name] = count;
          console.log(`[Het Geheugen] ${name}: ${count} vectors`);
        } catch (error) {
          collections[name] = { error: error.message };
          console.error(`[Het Geheugen] Failed to count ${name}:`, error.message);
        }
      }

      // Save snapshot
      await ChromaDBSnapshot.create({ timestamp: new Date(), collections });

      // Retention: remove snapshots older than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deleted = await ChromaDBSnapshot.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });

      await logAgent('holibot-sync', 'chromadb_snapshot_created', {
        description: `ChromaDB snapshot: ${Object.entries(collections).map(([k, v]) => `${k}=${typeof v === 'number' ? v : 'error'}`).join(', ')}`,
        metadata: { collections, deleted_old: deleted.deletedCount || 0 }
      });

      console.log(`[Het Geheugen] Snapshot saved. Old snapshots deleted: ${deleted.deletedCount || 0}`);
      return { collections, timestamp: new Date().toISOString() };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'chromadb_snapshot' });
      console.error('[Het Geheugen] ChromaDB snapshot failed:', error.message);
      return { collections: {}, error: error.message, timestamp: new Date().toISOString() };
    }
  }

  async getStatus() {
    const poiStats = await chromaService.getCollectionStats('holidaibutler_pois');
    const qaStats = await chromaService.getCollectionStats('holidaibutler_qas');
    const jobs = syncScheduler.getJobs();

    return {
      agent: 'holibot-sync',
      status: this.initialized ? 'active' : 'not_initialized',
      collections: {
        pois: poiStats,
        qas: qaStats
      },
      scheduledJobs: Object.keys(jobs).length,
      jobs: Object.keys(jobs),
      timestamp: new Date().toISOString()
    };
  }

  async triggerSync(type = 'full') {
    return syncScheduler.triggerManualSync(type);
  }

  // For testing embeddings
  async generateTestEmbedding(text) {
    return embeddingService.generateEmbedding(text);
  }
}

export default new HolibotSyncAgent();
