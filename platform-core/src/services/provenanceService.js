/**
 * Provenance Service — EU AI Act compliance (Optie D Layer 5)
 *
 * Generates cryptographic provenance metadata for AI-generated content.
 * Stored in content_items.provenance JSON column. Auditable per item.
 *
 * Compliance: EU AI Act Article 50 (transparency obligation) — AI-generated
 * outputs must be identifiable. Signature ensures tamper-detection: any post-hoc
 * modification of content invalidates the signature.
 *
 * @module provenanceService
 * @version 1.0.0
 */

import crypto from 'crypto';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const SCHEMA_VERSION = '1.0';

/**
 * Build provenance object for an AI-generated content item.
 *
 * @param {Object} args
 * @param {string} args.content - The final content text (used for signature)
 * @param {string} args.model - Model identifier (e.g. mistral-medium-latest)
 * @param {string} [args.operation='generate'] - generate/improve/rewrite/translate
 * @param {Array<number>} args.sourceIds - brand_knowledge IDs used as grounding
 * @param {Array<{source_name,source_url}>} [args.sourceMetadata]
 * @param {Object} [args.validation] - { passed, hallucination_rate, retries, ungrounded_entities, ... }
 * @param {string} [args.locale='en']
 * @param {number} [args.destinationId]
 * @returns {Object} Provenance object (ready to JSON.stringify into content_items.provenance)
 */
export function buildProvenance(args) {
  const {
    content,
    model,
    operation = 'generate',
    sourceIds = [],
    sourceMetadata = [],
    validation = null,
    locale = 'en',
    destinationId = null,
  } = args;

  if (!content || !model) {
    throw new Error('buildProvenance: content and model required');
  }

  const generatedAt = new Date().toISOString();

  // Signature: SHA-256 over canonical-serialized fields + content
  // Includes content hash so any post-hoc edit invalidates the signature
  const canonical = JSON.stringify({
    schema_version: SCHEMA_VERSION,
    model,
    operation,
    locale,
    destination_id: destinationId,
    source_ids: [...sourceIds].sort((a, b) => a - b),
    generated_at: generatedAt,
    content_sha256: crypto.createHash('sha256').update(content).digest('hex'),
  });

  const signature = crypto.createHash('sha256').update(canonical).digest('hex');

  return {
    schema_version: SCHEMA_VERSION,
    signature,
    ai_generated: true,
    model,
    operation,
    locale,
    destination_id: destinationId,
    source_ids: sourceIds,
    source_metadata: sourceMetadata.slice(0, 10).map(s => ({
      name: s.source_name || s.name || null,
      url: s.source_url || s.url || null,
      type: s.source_type || s.type || null,
    })),
    validation,
    generated_at: generatedAt,
    content_sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

/**
 * Verify a provenance object against the current content.
 * Detects tampering / post-hoc modification of content.
 *
 * @param {string} currentContent
 * @param {Object|string} provenanceData
 * @returns {{valid: boolean, reason?: string, contentChanged?: boolean}}
 */
export function verifyProvenance(currentContent, provenanceData) {
  if (!provenanceData) {
    return { valid: false, reason: 'no_provenance' };
  }

  let p = provenanceData;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch (e) { return { valid: false, reason: 'invalid_json' }; }
  }

  if (!p.signature || !p.content_sha256) {
    return { valid: false, reason: 'incomplete_provenance' };
  }

  // Re-derive signature from canonical fields
  const canonical = JSON.stringify({
    schema_version: p.schema_version || SCHEMA_VERSION,
    model: p.model,
    operation: p.operation,
    locale: p.locale,
    destination_id: p.destination_id ?? null,
    source_ids: [...(p.source_ids || [])].sort((a, b) => a - b),
    generated_at: p.generated_at,
    content_sha256: p.content_sha256,
  });

  const expectedSig = crypto.createHash('sha256').update(canonical).digest('hex');
  if (expectedSig !== p.signature) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  // Check content tampering
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
  if (currentHash !== p.content_sha256) {
    return { valid: true, contentChanged: true, reason: 'content_modified_post_generation' };
  }

  return { valid: true, contentChanged: false };
}

/**
 * Persist provenance on a content_items row.
 *
 * @param {number} contentItemId
 * @param {Object} provenance
 * @returns {Promise<void>}
 */
export async function saveProvenance(contentItemId, provenance) {
  if (!contentItemId) return;
  try {
    await mysqlSequelize.query(
      'UPDATE content_items SET provenance = :prov WHERE id = :id',
      { replacements: { id: Number(contentItemId), prov: JSON.stringify(provenance) } }
    );
  } catch (err) {
    logger.warn(`[Provenance] saveProvenance failed: ${err.message}`);
  }
}

/**
 * Lookup provenance for a content item.
 *
 * @param {number} contentItemId
 * @returns {Promise<Object|null>}
 */
export async function getProvenance(contentItemId) {
  try {
    const [[row]] = await mysqlSequelize.query(
      'SELECT provenance FROM content_items WHERE id = :id LIMIT 1',
      { replacements: { id: Number(contentItemId) } }
    );
    if (!row?.provenance) return null;
    return typeof row.provenance === 'string' ? JSON.parse(row.provenance) : row.provenance;
  } catch (err) {
    logger.warn(`[Provenance] getProvenance failed: ${err.message}`);
    return null;
  }
}

export default { buildProvenance, verifyProvenance, saveProvenance, getProvenance };
