/**
 * POI Sync Service for HoliBot Sync Agent
 * Synchronizes POI data to ChromaDB for vector search
 */

import embeddingService from './embeddingService.js';
import chromaService from './chromaService.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const POI_COLLECTION = 'holidaibutler_pois';

class POISyncService {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  async syncUpdatedPOIs(since = null) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    console.log('[POISyncService] Starting POI sync to ChromaDB...');

    try {
      // Get POIs updated since last sync
      let query = `
        SELECT id, name, category, subcategory, description, address,
               opening_hours, rating, price_level, city AS destination,
               latitude, longitude, tier_score, last_updated
        FROM POI
        WHERE is_active = 1
      `;

      const replacements = [];
      if (since) {
        query += ' AND last_updated > ?';
        replacements.push(since);
      }

      query += ' ORDER BY tier_score ASC, last_updated DESC LIMIT 100';

      const [pois] = await this.sequelize.query(query, { replacements });

      if (pois.length === 0) {
        console.log('[POISyncService] No POIs to sync');
        return { synced: 0, collection: POI_COLLECTION };
      }

      console.log(`[POISyncService] Syncing ${pois.length} POIs...`);

      // Prepare data for ChromaDB
      const ids = pois.map(p => `poi_${p.id}`);
      const documents = pois.map(p => embeddingService.formatPOIForEmbedding(p));
      const metadatas = pois.map(p => ({
        poi_id: p.id,
        name: p.name,
        category: p.category || 'other',
        subcategory: p.subcategory || '',
        destination: p.destination || 'calpe',
        tier: p.tier_score || 4,
        rating: p.rating || 0,
        latitude: p.latitude || 0,
        longitude: p.longitude || 0,
        last_updated: p.last_updated ? p.last_updated.toISOString() : new Date().toISOString()
      }));

      // Generate embeddings
      console.log('[POISyncService] Generating embeddings...');
      const embeddings = await embeddingService.generateBatchEmbeddings(documents);

      // Upsert to ChromaDB
      console.log('[POISyncService] Upserting to ChromaDB...');
      await chromaService.upsertDocuments(POI_COLLECTION, ids, embeddings, documents, metadatas);

      await logAgent('holibot-sync', 'poi_sync_complete', {
        description: `Synced ${pois.length} POIs to ChromaDB`,
        metadata: { count: pois.length, collection: POI_COLLECTION }
      });

      console.log(`[POISyncService] Successfully synced ${pois.length} POIs`);

      return { synced: pois.length, collection: POI_COLLECTION };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'sync_pois' });
      throw error;
    }
  }

  async syncDeactivatedPOIs() {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    try {
      // Get recently deactivated POIs
      const [deactivatedPOIs] = await this.sequelize.query(`
        SELECT id FROM POI
        WHERE is_active = 0
        AND last_updated > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

      if (deactivatedPOIs.length === 0) {
        return { deleted: 0 };
      }

      const ids = deactivatedPOIs.map(p => `poi_${p.id}`);
      await chromaService.deleteDocuments(POI_COLLECTION, ids);

      await logAgent('holibot-sync', 'deactivated_pois_removed', {
        description: `Removed ${ids.length} deactivated POIs from ChromaDB`,
        metadata: { count: ids.length }
      });

      return { deleted: ids.length };
    } catch (error) {
      await logError('holibot-sync', error, { action: 'sync_deactivated_pois' });
      throw error;
    }
  }
}

export default new POISyncService();
