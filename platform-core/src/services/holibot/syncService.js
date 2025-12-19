/**
 * Sync Service
 * Synchronizes MySQL database with ChromaDB Cloud
 * Handles POI, Agenda, and Q&A embeddings
 */

import { chromaService } from './chromaService.js';
import { embeddingService } from './embeddingService.js';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

class SyncService {
  constructor() {
    this.lastSyncTime = null;
    this.isSyncing = false;
  }

  /**
   * Execute raw SQL query
   */
  async query(sql, params = []) {
    return mysqlSequelize.query(sql, {
      replacements: params,
      type: QueryTypes.SELECT
    });
  }

  /**
   * Get POIs that need syncing (new or updated since last sync)
   */
  async getPOIsForSync(since = null) {
    let sql = `
      SELECT
        id, name, category, subcategory, description,
        address, latitude, longitude, rating, review_count,
        price_level, thumbnail_url, opening_hours, phone, website,
        updated_at
      FROM POI
      WHERE is_active = 1
    `;

    const params = [];

    if (since) {
      sql += ' AND updated_at > ?';
      params.push(since);
    }

    sql += ' ORDER BY updated_at DESC LIMIT 100';

    return this.query(sql, params);
  }

  /**
   * Get Agenda events that need syncing
   */
  async getAgendaForSync(since = null) {
    let sql = `
      SELECT
        a.id, a.title, a.description, a.category,
        a.location_name, a.location_address,
        a.calpe_distance, a.updated_at,
        GROUP_CONCAT(DISTINCT d.event_date) as event_dates
      FROM agenda a
      LEFT JOIN agenda_dates d ON a.id = d.agenda_id
      WHERE d.event_date >= CURDATE()
    `;

    const params = [];

    if (since) {
      sql += ' AND a.updated_at > ?';
      params.push(since);
    }

    sql += ' GROUP BY a.id ORDER BY a.updated_at DESC LIMIT 100';

    return this.query(sql, params);
  }

  /**
   * Build embedding text for a POI
   */
  buildPOIEmbeddingText(poi) {
    const parts = [
      poi.name,
      poi.category,
      poi.subcategory,
      poi.description,
      poi.address
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * Build embedding text for an Agenda event
   */
  buildAgendaEmbeddingText(event) {
    const parts = [
      event.title,
      event.category,
      event.description,
      event.location_name,
      event.location_address
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * Sync POIs to ChromaDB
   */
  async syncPOIs(since = null) {
    logger.info('Starting POI sync to ChromaDB...');

    try {
      const pois = await this.getPOIsForSync(since);
      logger.info(`Found ${pois.length} POIs to sync`);

      if (pois.length === 0) {
        return { synced: 0, errors: 0 };
      }

      const documents = [];
      const errors = [];

      // Generate embeddings in batches
      const batchSize = 10;
      for (let i = 0; i < pois.length; i += batchSize) {
        const batch = pois.slice(i, i + batchSize);
        const texts = batch.map(poi => this.buildPOIEmbeddingText(poi));

        try {
          const embeddings = await embeddingService.generateEmbeddings(texts);

          for (let j = 0; j < batch.length; j++) {
            const poi = batch[j];
            documents.push({
              id: `poi_${poi.id}`,
              embedding: embeddings[j],
              metadata: {
                type: 'poi',
                id: poi.id,
                name: poi.name,
                category: poi.category,
                subcategory: poi.subcategory,
                address: poi.address,
                latitude: poi.latitude?.toString(),
                longitude: poi.longitude?.toString(),
                rating: poi.rating?.toString(),
                review_count: poi.review_count?.toString(),
                price_level: poi.price_level,
                thumbnail_url: poi.thumbnail_url,
                opening_hours: poi.opening_hours,
                phone: poi.phone,
                website: poi.website
              },
              document: poi.description || ''
            });
          }

        } catch (error) {
          logger.error(`Failed to generate embeddings for batch starting at ${i}:`, error);
          errors.push({ batch: i, error: error.message });
        }
      }

      // Upsert to ChromaDB
      if (documents.length > 0) {
        await chromaService.upsert(documents);
      }

      logger.info(`POI sync complete: ${documents.length} synced, ${errors.length} errors`);

      return {
        synced: documents.length,
        errors: errors.length,
        errorDetails: errors
      };

    } catch (error) {
      logger.error('POI sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync Agenda events to ChromaDB
   */
  async syncAgenda(since = null) {
    logger.info('Starting Agenda sync to ChromaDB...');

    try {
      const events = await this.getAgendaForSync(since);
      logger.info(`Found ${events.length} Agenda events to sync`);

      if (events.length === 0) {
        return { synced: 0, errors: 0 };
      }

      const documents = [];
      const errors = [];

      // Generate embeddings in batches
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const texts = batch.map(event => this.buildAgendaEmbeddingText(event));

        try {
          const embeddings = await embeddingService.generateEmbeddings(texts);

          for (let j = 0; j < batch.length; j++) {
            const event = batch[j];
            documents.push({
              id: `agenda_${event.id}`,
              embedding: embeddings[j],
              metadata: {
                type: 'agenda',
                id: event.id,
                title: event.title,
                category: event.category,
                location_name: event.location_name,
                location_address: event.location_address,
                calpe_distance: event.calpe_distance?.toString(),
                event_dates: event.event_dates
              },
              document: event.description || ''
            });
          }

        } catch (error) {
          logger.error(`Failed to generate embeddings for Agenda batch starting at ${i}:`, error);
          errors.push({ batch: i, error: error.message });
        }
      }

      // Upsert to ChromaDB
      if (documents.length > 0) {
        await chromaService.upsert(documents);
      }

      logger.info(`Agenda sync complete: ${documents.length} synced, ${errors.length} errors`);

      return {
        synced: documents.length,
        errors: errors.length,
        errorDetails: errors
      };

    } catch (error) {
      logger.error('Agenda sync failed:', error);
      throw error;
    }
  }

  /**
   * Full sync of all data
   */
  async fullSync() {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.info('Starting full sync to ChromaDB...');

      // Initialize services
      embeddingService.initialize();
      await chromaService.connect();

      // Sync POIs
      const poiResult = await this.syncPOIs();

      // Sync Agenda
      const agendaResult = await this.syncAgenda();

      const timeMs = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const result = {
        success: true,
        timestamp: this.lastSyncTime,
        duration: timeMs,
        pois: poiResult,
        agenda: agendaResult,
        totalSynced: poiResult.synced + agendaResult.synced,
        totalErrors: poiResult.errors + agendaResult.errors
      };

      logger.info(`Full sync completed in ${timeMs}ms:`, result);

      return result;

    } catch (error) {
      logger.error('Full sync failed:', error);
      throw error;

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Incremental sync (only changes since last sync)
   */
  async incrementalSync() {
    if (!this.lastSyncTime) {
      return this.fullSync();
    }

    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.info(`Starting incremental sync since ${this.lastSyncTime}...`);

      // Sync only items updated since last sync
      const poiResult = await this.syncPOIs(this.lastSyncTime);
      const agendaResult = await this.syncAgenda(this.lastSyncTime);

      const timeMs = Date.now() - startTime;
      this.lastSyncTime = new Date();

      return {
        success: true,
        type: 'incremental',
        timestamp: this.lastSyncTime,
        duration: timeMs,
        pois: poiResult,
        agenda: agendaResult
      };

    } catch (error) {
      logger.error('Incremental sync failed:', error);
      throw error;

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single POI by ID
   */
  async syncSinglePOI(poiId) {
    try {
      const pois = await this.query(
        'SELECT * FROM POI WHERE id = ? AND is_active = 1',
        [poiId]
      );

      if (pois.length === 0) {
        throw new Error(`POI ${poiId} not found`);
      }

      const poi = pois[0];
      const text = this.buildPOIEmbeddingText(poi);
      const embedding = await embeddingService.generateEmbedding(text);

      await chromaService.upsert([{
        id: `poi_${poi.id}`,
        embedding,
        metadata: {
          type: 'poi',
          id: poi.id,
          name: poi.name,
          category: poi.category,
          subcategory: poi.subcategory,
          address: poi.address,
          latitude: poi.latitude?.toString(),
          longitude: poi.longitude?.toString(),
          rating: poi.rating?.toString(),
          review_count: poi.review_count?.toString()
        },
        document: poi.description || ''
      }]);

      logger.info(`Synced single POI: ${poi.name} (ID: ${poiId})`);

      return { success: true, poi };

    } catch (error) {
      logger.error(`Failed to sync POI ${poiId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
