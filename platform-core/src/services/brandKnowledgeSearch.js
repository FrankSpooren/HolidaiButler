/**
 * Brand Knowledge Search Service — Semantic retrieval (Optie D Layer 1+)
 *
 * Replaces keyword-based brand_knowledge sorting with ChromaDB semantic search.
 * Single collection `brand_knowledge` with destination_id metadata filter.
 *
 * Pipeline:
 *   brand_knowledge row → Mistral embedding (1024d) → ChromaDB upsert
 *   Query → Mistral embedding → ChromaDB search (destination filter) → top-K chunks
 *
 * Falls back to keyword-based retrieval if ChromaDB unavailable (resilient).
 *
 * @module brandKnowledgeSearch
 * @version 1.0.0
 */

import { mysqlSequelize } from '../config/database.js';
import { chromaService } from './holibot/chromaService.js';
import embeddingService from './holibot/embeddingService.js';
import logger from '../utils/logger.js';

const COLLECTION_NAME = 'brand_knowledge';
const DEFAULT_TOP_K = 5;
const MAX_CHARS_PER_CHUNK = 1500;
const CHUNK_OVERLAP = 100;

/**
 * Ensure ChromaDB collection exists (idempotent).
 */
async function ensureCollection() {
  try {
    await chromaService.getCollection(COLLECTION_NAME);
    return true;
  } catch (err) {
    // Collection might not exist yet — try to create
    try {
      if (!chromaService.client) await chromaService.connect();
      await chromaService.client.createCollection({
        name: COLLECTION_NAME,
        metadata: { description: 'Brand knowledge chunks for AI grounding (per destination)' },
        embeddingFunction: { generate: async (texts) => texts.map(() => []) },
      });
      logger.info(`[BrandKB] Created ChromaDB collection: ${COLLECTION_NAME}`);
      // Force re-load
      delete chromaService.collections[COLLECTION_NAME];
      await chromaService.getCollection(COLLECTION_NAME);
      return true;
    } catch (createErr) {
      logger.error(`[BrandKB] Failed to create collection: ${createErr.message}`);
      return false;
    }
  }
}

/**
 * Chunk a long text into overlapping segments for embedding.
 * Preserves sentence boundaries where possible.
 */
function chunkText(text, maxChars = MAX_CHARS_PER_CHUNK, overlap = CHUNK_OVERLAP) {
  if (!text || text.length <= maxChars) return [text || ''];

  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxChars, text.length);
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakAt = Math.max(lastPeriod, lastNewline);
      if (breakAt > i + maxChars / 2) end = breakAt + 1;
    }
    chunks.push(text.slice(i, end).trim());
    i = end - overlap;
    if (i <= 0) i = end;
  }
  return chunks.filter(c => c.length > 50);
}

/**
 * Embed + store a brand_knowledge row in ChromaDB.
 *
 * @param {Object} row - brand_knowledge row (must have id, destination_id, content_text, source_name, source_type)
 * @returns {Promise<{stored: number, chunksCreated: number}>}
 */
export async function embedAndStore(row) {
  if (!row || !row.id || !row.content_text) {
    throw new Error('embedAndStore: invalid row');
  }

  const collOk = await ensureCollection();
  if (!collOk) {
    throw new Error('ChromaDB collection unavailable');
  }

  if (!embeddingService.isConfigured) {
    embeddingService.initialize();
  }

  const chunks = chunkText(row.content_text);
  if (chunks.length === 0) {
    logger.warn(`[BrandKB] No usable chunks for brand_knowledge#${row.id}`);
    return { stored: 0, chunksCreated: 0 };
  }

  // Generate embeddings (parallel, max 5 at a time to avoid rate limit)
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    const batchEmbeddings = await Promise.all(
      batch.map(c => embeddingService.generateEmbedding(c))
    );
    embeddings.push(...batchEmbeddings);
  }

  // Build ChromaDB documents
  const docs = chunks.map((chunk, idx) => ({
    id: `bk_${row.id}_c${idx}`,
    embedding: embeddings[idx],
    metadata: {
      brand_knowledge_id: row.id,
      destination_id: Number(row.destination_id),
      source_name: row.source_name || '',
      source_type: row.source_type || 'reference',
      source_url: row.source_url || '',
      chunk_index: idx,
      total_chunks: chunks.length,
    },
    document: chunk,
  }));

  await chromaService.upsert(docs, COLLECTION_NAME);

  logger.info(`[BrandKB] Embedded+stored brand_knowledge#${row.id} → ${chunks.length} chunks`);
  return { stored: docs.length, chunksCreated: chunks.length };
}

/**
 * Semantic search: find top-K relevant chunks for a query, scoped to destination.
 *
 * @param {number} destinationId
 * @param {string} query
 * @param {number} topK
 * @returns {Promise<Array<{source_name, source_url, source_type, content_text, similarity, brand_knowledge_id}>>}
 */
export async function searchRelevantChunks(destinationId, query, topK = DEFAULT_TOP_K) {
  if (!query || !destinationId) return [];

  try {
    const collOk = await ensureCollection();
    if (!collOk) {
      logger.warn('[BrandKB] ChromaDB unavailable, returning empty results');
      return [];
    }

    if (!embeddingService.isConfigured) {
      embeddingService.initialize();
    }

    const queryEmb = await embeddingService.generateEmbedding(query);

    const results = await chromaService.search(
      queryEmb,
      topK,
      { destination_id: Number(destinationId) },
      COLLECTION_NAME
    );

    return results.map(r => ({
      brand_knowledge_id: r.metadata.brand_knowledge_id,
      source_name: r.metadata.source_name,
      source_url: r.metadata.source_url || null,
      source_type: r.metadata.source_type,
      content_text: r.document,
      similarity: r.similarity,
    }));
  } catch (err) {
    logger.warn(`[BrandKB] search failed: ${err.message}`);
    return [];
  }
}

/**
 * Backfill embeddings for all active brand_knowledge rows of a destination.
 * Use after migration or when bootstrapping a new destination.
 *
 * @param {number} destinationId
 * @returns {Promise<{processed: number, errors: number, totalChunks: number}>}
 */
export async function backfillDestination(destinationId) {
  const [rows] = await mysqlSequelize.query(
    `SELECT id, destination_id, source_type, source_name, source_url, content_text
     FROM brand_knowledge
     WHERE destination_id = :destId AND is_active = 1 AND content_text IS NOT NULL`,
    { replacements: { destId: Number(destinationId) } }
  );

  let processed = 0;
  let errors = 0;
  let totalChunks = 0;

  for (const row of rows) {
    try {
      const result = await embedAndStore(row);
      processed++;
      totalChunks += result.chunksCreated;
    } catch (err) {
      logger.error(`[BrandKB] Backfill error for brand_knowledge#${row.id}: ${err.message}`);
      errors++;
    }
  }

  logger.info(`[BrandKB] Backfill destination=${destinationId}: ${processed}/${rows.length} rows, ${totalChunks} chunks, ${errors} errors`);
  return { processed, errors, totalChunks };
}

/**
 * Remove ChromaDB entries for a brand_knowledge row (on delete/deactivate).
 *
 * @param {number} brandKnowledgeId
 */
export async function removeFromIndex(brandKnowledgeId) {
  try {
    const collOk = await ensureCollection();
    if (!collOk) return;
    const collection = await chromaService.getCollection(COLLECTION_NAME);
    // Delete all chunks for this brand_knowledge_id
    await collection.delete({ where: { brand_knowledge_id: Number(brandKnowledgeId) } });
    logger.info(`[BrandKB] Removed brand_knowledge#${brandKnowledgeId} from ChromaDB`);
  } catch (err) {
    logger.warn(`[BrandKB] removeFromIndex error: ${err.message}`);
  }
}

export default {
  embedAndStore,
  searchRelevantChunks,
  backfillDestination,
  removeFromIndex,
};
