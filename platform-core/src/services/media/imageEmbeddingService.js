/**
 * Image Embedding Service — ChromaDB visual search
 * Generates text embeddings from AI tags/descriptions for semantic image search
 * Uses existing Mistral embed infrastructure (1024d vectors)
 *
 * @version 1.0.0 — Media Library v2.1 (W1)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import embeddingService from '../holibot/embeddingService.js';
import chromaService from '../holibot/chromaService.js';
import logger from '../../utils/logger.js';

const COLLECTION_NAME = 'media_images';

class ImageEmbeddingService {
  constructor() {
    this.collection = null;
  }

  async ensureCollection() {
    if (this.collection) return this.collection;
    try {
      await chromaService.connect();
      this.collection = await chromaService.client.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { description: 'Media library image embeddings for visual search' },
        embeddingFunction: { generate: async (texts) => texts.map(() => []) }
      });
      logger.info(`[ImageEmbedding] Collection '${COLLECTION_NAME}' ready`);
      return this.collection;
    } catch (err) {
      logger.error('[ImageEmbedding] Failed to get collection:', err.message);
      return null;
    }
  }

  /**
   * Build searchable text from media metadata
   */
  buildSearchText(media) {
    const parts = [];
    if (media.alt_text) parts.push(media.alt_text);
    if (media.description) parts.push(media.description);
    if (media.description_en) parts.push(media.description_en);
    if (media.location_name) parts.push(`location: ${media.location_name}`);
    if (media.owner_name) parts.push(`photographer: ${media.owner_name}`);

    // Parse AI tags
    let aiTags = [];
    try {
      const raw = media.tags_ai;
      aiTags = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch { /* ignore */ }
    if (aiTags.length > 0) parts.push(`tags: ${aiTags.join(', ')}`);

    // Manual tags
    let manualTags = [];
    try {
      const raw = media.tags;
      manualTags = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch { /* ignore */ }
    if (manualTags.length > 0) parts.push(`tags: ${manualTags.join(', ')}`);

    return parts.join('. ').substring(0, 2000); // Mistral embed max ~2K tokens
  }

  /**
   * Embed a single media item and upsert to ChromaDB
   */
  async embedMedia(mediaId) {
    const [media] = await mysqlSequelize.query(
      'SELECT * FROM media WHERE id = ? AND media_type = "image" AND (archived = 0 OR archived IS NULL)',
      { replacements: [mediaId], type: QueryTypes.SELECT }
    );
    if (!media) return null;

    const searchText = this.buildSearchText(media);
    if (!searchText || searchText.length < 10) {
      logger.debug(`[ImageEmbedding] Skipping media ${mediaId}: insufficient text`);
      return null;
    }

    const collection = await this.ensureCollection();
    if (!collection) return null;

    try {
      const embedding = await embeddingService.generateEmbedding(searchText);
      if (!embedding || embedding.length === 0) return null;

      await collection.upsert({
        ids: [`media_${mediaId}`],
        embeddings: [embedding],
        metadatas: [{
          media_id: mediaId,
          destination_id: media.destination_id,
          filename: media.filename,
          media_type: media.media_type,
          quality_tier: media.quality_tier || 'medium',
          has_ai_tags: media.tags_ai ? 'true' : 'false',
        }],
        documents: [searchText],
      });

      logger.info(`[ImageEmbedding] Embedded media ${mediaId} (${searchText.length} chars)`);
      return { mediaId, textLength: searchText.length, embeddingDim: embedding.length };
    } catch (err) {
      logger.error(`[ImageEmbedding] Failed to embed media ${mediaId}:`, err.message);
      return null;
    }
  }

  /**
   * Visual search — find similar images by text query
   */
  async searchByText(query, destinationId, limit = 10) {
    const collection = await this.ensureCollection();
    if (!collection) return [];

    try {
      const embedding = await embeddingService.generateEmbedding(query);
      if (!embedding || embedding.length === 0) return [];

      const whereFilter = destinationId ? { destination_id: destinationId } : undefined;

      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: limit,
        where: whereFilter,
        include: ['metadatas', 'distances', 'documents'],
      });

      if (!results?.ids?.[0]) return [];

      return results.ids[0].map((id, i) => ({
        id: id.replace('media_', ''),
        media_id: parseInt(id.replace('media_', '')),
        distance: results.distances?.[0]?.[i],
        score: 1 - (results.distances?.[0]?.[i] || 0),
        description: results.documents?.[0]?.[i]?.substring(0, 100),
        metadata: results.metadatas?.[0]?.[i],
      }));
    } catch (err) {
      logger.error('[ImageEmbedding] Search failed:', err.message);
      return [];
    }
  }

  /**
   * Batch embed all unembedded images for a destination
   */
  async embedDestination(destinationId, batchSize = 50) {
    const items = await mysqlSequelize.query(
      `SELECT id FROM media WHERE destination_id = ? AND media_type = 'image'
       AND (archived = 0 OR archived IS NULL) AND ai_processed = 1
       AND (tags_ai IS NOT NULL OR description IS NOT NULL)
       ORDER BY id ASC`,
      { replacements: [destinationId], type: QueryTypes.SELECT }
    );

    let embedded = 0;
    let skipped = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (const item of batch) {
        const result = await this.embedMedia(item.id);
        if (result) embedded++;
        else skipped++;
      }
      logger.info(`[ImageEmbedding] Progress: ${embedded + skipped}/${items.length} (${embedded} embedded, ${skipped} skipped)`);
    }

    return { total: items.length, embedded, skipped };
  }
}

export const imageEmbeddingService = new ImageEmbeddingService();
export default imageEmbeddingService;
