/**
 * Sync Service
 * Synchronizes MySQL database with ChromaDB Cloud
 * Handles POI (multi-language), Agenda, Q&A, and Review embeddings
 *
 * Version 2.1 - Enhanced with:
 * - Multi-language POI sync (nl, en, de, es, sv, pl)
 * - Enriched descriptions support
 * - QnA table sync (32,000+ Q&A pairs from main database)
 * - Review sentiment integration
 * - Optimized batch processing for large datasets
 */

import { chromaService } from './chromaService.js';
import { embeddingService } from './embeddingService.js';
import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'es', 'sv', 'pl'];

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
   * Get POIs with ALL fields including enriched descriptions
   */
  async getPOIsForSyncEnriched(since = null, limit = 500) {
    let sql = `
      SELECT
        id, name, category, subcategory, description,
        address, latitude, longitude, rating, review_count,
        price_level, thumbnail_url, opening_hours, phone, website,
        enriched_tile_description,
        enriched_tile_description_nl,
        enriched_tile_description_de,
        enriched_tile_description_es,
        enriched_tile_description_sv,
        enriched_tile_description_pl,
        enriched_detail_description,
        enriched_detail_description_nl,
        enriched_detail_description_de,
        enriched_detail_description_es,
        enriched_detail_description_sv,
        enriched_detail_description_pl,
        enriched_highlights,
        enriched_target_audience
      FROM POI
      WHERE is_active = 1
    `;

    sql += ` ORDER BY id DESC LIMIT ${limit}`;

    return this.query(sql);
  }

  /**
   * Get POIs that need syncing (legacy - basic fields only)
   */
  async getPOIsForSync(since = null) {
    const sql = `
      SELECT
        id, name, category, subcategory, description,
        address, latitude, longitude, rating, review_count,
        price_level, thumbnail_url, opening_hours, phone, website
      FROM POI
      WHERE is_active = 1
      ORDER BY id DESC LIMIT 100
    `;

    return this.query(sql);
  }

  /**
   * Get Agenda events that need syncing
   */
  async getAgendaForSync(since = null) {
    const sql = `
      SELECT
        a.id, a.title, a.description, a.category,
        a.title_en, a.title_es, a.title_de, a.title_sv, a.title_pl,
        a.location_name, a.location_address,
        a.calpe_distance,
        GROUP_CONCAT(DISTINCT d.event_date) as event_dates
      FROM agenda a
      LEFT JOIN agenda_dates d ON a.id = d.agenda_id
      WHERE d.event_date >= CURDATE()
      GROUP BY a.id
      ORDER BY a.id DESC LIMIT 100
    `;

    return this.query(sql);
  }

  /**
   * Get Q&A pairs for syncing from QnA table (32.000+ records)
   * Falls back to poi_qa if QnA doesn't exist
   */
  async getQAForSync(limit = 50000) {
    // First try the main QnA table (32.000+ records)
    try {
      const sql = `
        SELECT
          id, poi_id, question, answer, language, category,
          COALESCE(keywords, '') as keywords
        FROM QnA
        LIMIT ${limit}
      `;
      const results = await this.query(sql);
      if (results.length > 0) {
        logger.info(`Found ${results.length} Q&A pairs in QnA table`);
        return results;
      }
    } catch (error) {
      logger.debug('QnA table not available, trying poi_qa:', error.message);
    }

    // Fallback to poi_qa table
    try {
      const sql = `
        SELECT
          id, poi_id, question, answer, language, category, keywords
        FROM poi_qa
        WHERE is_active = 1
        LIMIT ${limit}
      `;
      const results = await this.query(sql);
      logger.info(`Found ${results.length} Q&A pairs in poi_qa table`);
      return results;
    } catch (error) {
      logger.warn('No Q&A tables available:', error.message);
      return [];
    }
  }

  /**
   * Get review summary for a POI
   */
  async getReviewSummaryForPOI(poiId) {
    try {
      const sql = `
        SELECT
          COUNT(*) as review_count,
          AVG(rating) as avg_rating,
          SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
          SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
          GROUP_CONCAT(
            CASE WHEN rating >= 4 THEN SUBSTRING(review_text, 1, 100) END
            SEPARATOR ' | '
          ) as top_reviews
        FROM reviews
        WHERE poi_id = ? AND status = 'approved'
        GROUP BY poi_id
      `;
      const results = await this.query(sql, [poiId]);
      return results[0] || null;
    } catch (error) {
      // Reviews table might not exist or have different structure
      logger.debug(`Could not fetch reviews for POI ${poiId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Build embedding text for a POI with language-specific enriched content
   * @param {Object} poi - POI object with all fields
   * @param {string} language - Language code (en, nl, de, es, sv, pl)
   * @param {Object} reviewSummary - Optional review summary
   */
  buildPOIEmbeddingTextEnriched(poi, language = 'en', reviewSummary = null) {
    // Get language-specific tile description
    const tileDescField = language === 'en'
      ? 'enriched_tile_description'
      : `enriched_tile_description_${language}`;
    const tileDesc = poi[tileDescField] || poi.enriched_tile_description || poi.description;

    // Get language-specific detail description
    const detailDescField = language === 'en'
      ? 'enriched_detail_description'
      : `enriched_detail_description_${language}`;
    const detailDesc = poi[detailDescField] || poi.enriched_detail_description;

    // Parse highlights if available
    let highlights = null;
    if (poi.enriched_highlights) {
      try {
        const highlightsArray = typeof poi.enriched_highlights === 'string'
          ? JSON.parse(poi.enriched_highlights)
          : poi.enriched_highlights;
        if (Array.isArray(highlightsArray)) {
          highlights = highlightsArray.join(', ');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Build parts array
    const parts = [
      poi.name,
      poi.category,
      poi.subcategory,
      tileDesc,
      detailDesc,
      highlights,
      poi.enriched_target_audience,
      poi.address
    ];

    // Add review context if available
    if (reviewSummary && reviewSummary.top_reviews) {
      parts.push(`Reviews: ${reviewSummary.top_reviews}`);
    }

    return parts.filter(Boolean).join(' | ');
  }

  /**
   * Build embedding text for a POI (legacy - basic)
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
  buildAgendaEmbeddingText(event, language = 'en') {
    // Get language-specific title
    let title = event.title;
    if (language !== 'nl' && event[`title_${language}`]) {
      title = event[`title_${language}`];
    }

    const parts = [
      title,
      event.category,
      event.description,
      event.location_name,
      event.location_address
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * Build embedding text for Q&A
   */
  buildQAEmbeddingText(qa) {
    return `Vraag: ${qa.question}\nAntwoord: ${qa.answer}`;
  }

  /**
   * Sync POIs to ChromaDB with multi-language support
   * Creates one document per POI per language
   */
  async syncPOIsMultiLanguage(languages = SUPPORTED_LANGUAGES, includeReviews = true) {
    logger.info(`Starting multi-language POI sync to ChromaDB for languages: ${languages.join(', ')}...`);

    try {
      const pois = await this.getPOIsForSyncEnriched(null, 2000);
      logger.info(`Found ${pois.length} POIs to sync across ${languages.length} languages`);

      if (pois.length === 0) {
        return { synced: 0, errors: 0, languages: languages.length };
      }

      const documents = [];
      const errors = [];
      let processedCount = 0;

      // Process each POI
      for (const poi of pois) {
        // Optionally get review summary
        let reviewSummary = null;
        if (includeReviews) {
          reviewSummary = await this.getReviewSummaryForPOI(poi.id);
        }

        // Create document for each language
        for (const lang of languages) {
          try {
            const text = this.buildPOIEmbeddingTextEnriched(poi, lang, reviewSummary);
            const embedding = await embeddingService.generateEmbedding(text);

            documents.push({
              id: `poi_${poi.id}_${lang}`,
              embedding,
              metadata: {
                type: 'poi',
                id: poi.id,
                name: poi.name,
                category: poi.category,
                subcategory: poi.subcategory || '',
                language: lang,
                address: poi.address || '',
                latitude: poi.latitude?.toString() || '',
                longitude: poi.longitude?.toString() || '',
                rating: poi.rating?.toString() || '',
                review_count: poi.review_count?.toString() || '',
                price_level: poi.price_level || '',
                thumbnail_url: poi.thumbnail_url || '',
                opening_hours: poi.opening_hours || '',
                phone: poi.phone || '',
                website: poi.website || '',
                has_enriched: (poi.enriched_tile_description ? 'true' : 'false'),
                sentiment_score: reviewSummary?.positive_count
                  ? (reviewSummary.positive_count / (reviewSummary.review_count || 1)).toFixed(2)
                  : ''
              },
              document: text
            });

            processedCount++;

            // Batch upsert every 50 documents to avoid memory issues
            if (documents.length >= 50) {
              await chromaService.upsert(documents);
              logger.info(`Upserted batch of ${documents.length} documents (${processedCount} total processed)`);
              documents.length = 0; // Clear array
            }

          } catch (error) {
            logger.error(`Failed to process POI ${poi.id} for language ${lang}:`, error.message);
            errors.push({ poi_id: poi.id, language: lang, error: error.message });
          }
        }
      }

      // Upsert remaining documents
      if (documents.length > 0) {
        await chromaService.upsert(documents);
        logger.info(`Upserted final batch of ${documents.length} documents`);
      }

      const totalSynced = processedCount;
      logger.info(`Multi-language POI sync complete: ${totalSynced} documents synced, ${errors.length} errors`);

      return {
        synced: totalSynced,
        errors: errors.length,
        errorDetails: errors,
        languages: languages.length,
        poisProcessed: pois.length
      };

    } catch (error) {
      logger.error('Multi-language POI sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync POIs to ChromaDB (legacy - single language)
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
   * Sync Q&A pairs to ChromaDB (supports 32,000+ records)
   * Optimized with larger batch sizes and progress logging
   */
  async syncQA() {
    logger.info('Starting Q&A sync to ChromaDB...');

    try {
      const qaItems = await this.getQAForSync();
      logger.info(`Found ${qaItems.length} Q&A items to sync`);

      if (qaItems.length === 0) {
        return { synced: 0, errors: 0, message: 'No Q&A items found in QnA or poi_qa tables' };
      }

      const documents = [];
      const errors = [];
      let processedCount = 0;
      const totalItems = qaItems.length;
      const BATCH_SIZE = 100; // Larger batches for 32,000+ records

      for (const qa of qaItems) {
        try {
          const text = this.buildQAEmbeddingText(qa);
          const embedding = await embeddingService.generateEmbedding(text);

          // Parse keywords if available
          let keywords = '';
          if (qa.keywords) {
            try {
              const keywordsArray = typeof qa.keywords === 'string'
                ? JSON.parse(qa.keywords)
                : qa.keywords;
              if (Array.isArray(keywordsArray)) {
                keywords = keywordsArray.join(', ');
              }
            } catch (e) {
              keywords = qa.keywords?.toString() || '';
            }
          }

          documents.push({
            id: `qa_${qa.id}`,
            embedding,
            metadata: {
              type: 'qa',
              id: qa.id?.toString() || '',
              poi_id: qa.poi_id?.toString() || '',
              question: (qa.question || '').substring(0, 500), // Truncate for metadata
              language: qa.language || 'en',
              category: qa.category || 'general',
              keywords: keywords.substring(0, 200)
            },
            document: qa.answer || qa.question || ''
          });

          processedCount++;

          // Batch upsert every BATCH_SIZE documents
          if (documents.length >= BATCH_SIZE) {
            await chromaService.upsert(documents);
            const progress = ((processedCount / totalItems) * 100).toFixed(1);
            logger.info(`Q&A sync progress: ${processedCount}/${totalItems} (${progress}%)`);
            documents.length = 0;
          }

        } catch (error) {
          logger.error(`Failed to process Q&A ${qa.id}:`, error.message);
          errors.push({ qa_id: qa.id, error: error.message });
        }
      }

      // Upsert remaining documents
      if (documents.length > 0) {
        await chromaService.upsert(documents);
      }

      logger.info(`Q&A sync complete: ${processedCount - errors.length} synced, ${errors.length} errors`);

      return {
        synced: processedCount - errors.length,
        errors: errors.length,
        totalProcessed: processedCount,
        errorDetails: errors.slice(0, 10) // Only return first 10 errors
      };

    } catch (error) {
      logger.error('Q&A sync failed:', error);
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
   * Full sync of all data (legacy - basic POIs)
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
   * Enhanced full sync with multi-language POIs and Q&A
   * @param {Object} options - Sync options
   * @param {string[]} options.languages - Languages to sync (default: all)
   * @param {boolean} options.includeQA - Include Q&A sync (default: true)
   * @param {boolean} options.includeReviews - Include review sentiment (default: true)
   * @param {boolean} options.includeAgenda - Include agenda sync (default: true)
   */
  async fullSyncEnhanced(options = {}) {
    const {
      languages = SUPPORTED_LANGUAGES,
      includeQA = true,
      includeReviews = true,
      includeAgenda = true
    } = options;

    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.info('Starting enhanced full sync to ChromaDB...', { languages, includeQA, includeReviews, includeAgenda });

      // Initialize services
      embeddingService.initialize();
      await chromaService.connect();

      const results = {
        pois: null,
        qa: null,
        agenda: null
      };

      // Sync POIs with multi-language support
      results.pois = await this.syncPOIsMultiLanguage(languages, includeReviews);

      // Sync Q&A if enabled
      if (includeQA) {
        results.qa = await this.syncQA();
      }

      // Sync Agenda if enabled
      if (includeAgenda) {
        results.agenda = await this.syncAgenda();
      }

      const timeMs = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const totalSynced =
        (results.pois?.synced || 0) +
        (results.qa?.synced || 0) +
        (results.agenda?.synced || 0);

      const totalErrors =
        (results.pois?.errors || 0) +
        (results.qa?.errors || 0) +
        (results.agenda?.errors || 0);

      const result = {
        success: true,
        type: 'enhanced',
        timestamp: this.lastSyncTime,
        duration: timeMs,
        languages,
        pois: results.pois,
        qa: results.qa,
        agenda: results.agenda,
        totalSynced,
        totalErrors
      };

      logger.info(`Enhanced full sync completed in ${timeMs}ms:`, {
        totalSynced,
        totalErrors,
        poisProcessed: results.pois?.poisProcessed,
        qaProcessed: results.qa?.synced
      });

      return result;

    } catch (error) {
      logger.error('Enhanced full sync failed:', error);
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
   * Sync a single POI by ID (multi-language)
   */
  async syncSinglePOI(poiId, languages = SUPPORTED_LANGUAGES) {
    try {
      const pois = await this.query(
        `SELECT * FROM POI WHERE id = ? AND is_active = 1`,
        [poiId]
      );

      if (pois.length === 0) {
        throw new Error(`POI ${poiId} not found`);
      }

      const poi = pois[0];
      const reviewSummary = await this.getReviewSummaryForPOI(poiId);
      const documents = [];

      for (const lang of languages) {
        const text = this.buildPOIEmbeddingTextEnriched(poi, lang, reviewSummary);
        const embedding = await embeddingService.generateEmbedding(text);

        documents.push({
          id: `poi_${poi.id}_${lang}`,
          embedding,
          metadata: {
            type: 'poi',
            id: poi.id,
            name: poi.name,
            category: poi.category,
            subcategory: poi.subcategory || '',
            language: lang,
            address: poi.address || '',
            latitude: poi.latitude?.toString() || '',
            longitude: poi.longitude?.toString() || '',
            rating: poi.rating?.toString() || '',
            review_count: poi.review_count?.toString() || ''
          },
          document: text
        });
      }

      await chromaService.upsert(documents);

      logger.info(`Synced single POI: ${poi.name} (ID: ${poiId}) in ${languages.length} languages`);

      return { success: true, poi, languages: languages.length };

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
      lastSyncTime: this.lastSyncTime,
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }

  /**
   * Get statistics about what's in ChromaDB
   */
  async getStats() {
    try {
      const chromaStats = await chromaService.getStats();
      return {
        chromaDb: chromaStats,
        lastSyncTime: this.lastSyncTime,
        supportedLanguages: SUPPORTED_LANGUAGES
      };
    } catch (error) {
      logger.error('Failed to get sync stats:', error);
      return {
        error: error.message,
        lastSyncTime: this.lastSyncTime
      };
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
