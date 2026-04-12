/**
 * Media Library v2.0 — Business Logic Service
 * Handles CRUD, filtering, stats, duplicate detection, bulk operations, and audit logging.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';

const mediaService = {
  /**
   * List media with filters, pagination, sort, search
   */
  async listMedia(destinationId, { page = 1, limit = 50, media_type, category, tags, quality_tier, owner_name, usage_rights, license_type, consent_status, archived = false, search, sort = 'created_at', order = 'DESC', date_from, date_to } = {}) {
    const replacements = { destId: destinationId };
    let where = 'WHERE m.destination_id = :destId';

    if (!archived) { where += ' AND (m.archived = 0 OR m.archived IS NULL)'; }
    if (media_type) { where += ' AND m.media_type = :media_type'; replacements.media_type = media_type; }
    if (category && category !== 'all') { where += ' AND m.category = :category'; replacements.category = category; }
    if (quality_tier) { where += ' AND m.quality_tier = :quality_tier'; replacements.quality_tier = quality_tier; }
    if (owner_name) { where += ' AND m.owner_name LIKE :owner_name'; replacements.owner_name = `%${owner_name}%`; }
    if (usage_rights) { where += ' AND m.usage_rights = :usage_rights'; replacements.usage_rights = usage_rights; }
    if (license_type) { where += ' AND m.license_type = :license_type'; replacements.license_type = license_type; }
    if (consent_status) { where += ' AND m.consent_status = :consent_status'; replacements.consent_status = consent_status; }
    if (date_from) { where += ' AND m.created_at >= :date_from'; replacements.date_from = date_from; }
    if (date_to) { where += ' AND m.created_at <= :date_to'; replacements.date_to = date_to; }
    if (tags) {
      // tags is a comma-separated string or array
      const tagArr = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
      tagArr.forEach((tag, i) => {
        where += ` AND (JSON_CONTAINS(m.tags, :tag${i}) OR JSON_CONTAINS(m.tags_ai, :tag${i}))`;
        replacements[`tag${i}`] = JSON.stringify(tag);
      });
    }
    if (search) {
      where += ' AND MATCH(m.alt_text, m.description, m.owner_name, m.location_name) AGAINST(:search IN BOOLEAN MODE)';
      replacements.search = search + '*';
    }

    // Validate sort column
    const allowedSorts = ['created_at', 'original_date', 'filename', 'size_bytes', 'usage_count', 'download_count'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const lim = Math.min(parseInt(limit) || 50, 200);
    const offset = (parseInt(page) - 1) * lim;
    replacements.limit = lim;
    replacements.offset = offset;

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) AS total FROM media m ${where}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const items = await mysqlSequelize.query(
      `SELECT m.* FROM media m ${where} ORDER BY m.${sortCol} ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return {
      data: items.map(item => ({ ...item, url: `/media-files/${item.destination_id}/${item.filename}` })),
      meta: { page: parseInt(page), limit: lim, total: countResult.total, totalPages: Math.ceil(countResult.total / lim) }
    };
  },

  /**
   * Get media detail with versions and audit log
   */
  async getMediaDetail(id, destinationId) {
    const [media] = await mysqlSequelize.query(
      'SELECT * FROM media WHERE id = :id AND destination_id = :destId',
      { replacements: { id, destId: destinationId }, type: QueryTypes.SELECT }
    );
    if (!media) return null;

    media.url = `/media-files/${media.destination_id}/${media.filename}`;

    const versions = await mysqlSequelize.query(
      'SELECT * FROM media_versions WHERE media_id = :id ORDER BY version_number DESC',
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    const audit = await mysqlSequelize.query(
      'SELECT * FROM media_audit_log WHERE media_id = :id ORDER BY created_at DESC LIMIT 20',
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    // Usage in content items
    const usageInContent = await mysqlSequelize.query(
      `SELECT id, title_nl, title_en, approval_status, created_at FROM content_items
       WHERE destination_id = :destId AND JSON_CONTAINS(media_ids, CAST(:id AS JSON))
       ORDER BY created_at DESC LIMIT 10`,
      { replacements: { id: String(id), destId: destinationId }, type: QueryTypes.SELECT }
    ).catch(() => []); // table may not have media_ids column in all items

    return { ...media, versions, audit, usage_in_content: usageInContent };
  },

  /**
   * Update media metadata
   */
  async updateMedia(id, destinationId, updates, userId) {
    const allowedFields = [
      'alt_text', 'description', 'description_en', 'description_de', 'description_es', 'description_fr',
      'tags', 'owner_name', 'owner_email', 'usage_rights', 'license_type', 'license_expiry',
      'consent_status', 'consent_form_url', 'media_type', 'location_lat', 'location_lng',
      'location_name', 'quality_tier', 'ai_badge', 'category'
    ];

    const sets = [];
    const replacements = { id, destId: destinationId };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'tags' && typeof value !== 'string') {
          sets.push(`${key} = :${key}`);
          replacements[key] = JSON.stringify(value);
        } else {
          sets.push(`${key} = :${key}`);
          replacements[key] = value;
        }
      }
    }

    if (sets.length === 0) return null;

    await mysqlSequelize.query(
      `UPDATE media SET ${sets.join(', ')} WHERE id = :id AND destination_id = :destId`,
      { replacements, type: QueryTypes.UPDATE }
    );

    // Audit log
    await this.logAudit(id, null, 'edit', userId, { fields: Object.keys(updates).filter(k => allowedFields.includes(k)) });

    const [updated] = await mysqlSequelize.query('SELECT * FROM media WHERE id = :id', { replacements: { id }, type: QueryTypes.SELECT });
    if (updated) updated.url = `/media-files/${updated.destination_id}/${updated.filename}`;
    return updated;
  },

  /**
   * Soft delete (archive)
   */
  async softDeleteMedia(id, destinationId, userId) {
    const [existing] = await mysqlSequelize.query('SELECT id FROM media WHERE id = :id AND destination_id = :destId', { replacements: { id, destId: destinationId }, type: QueryTypes.SELECT });
    if (!existing) return false;
    await mysqlSequelize.query('UPDATE media SET archived = 1 WHERE id = :id', { replacements: { id }, type: QueryTypes.UPDATE });
    await this.logAudit(id, null, 'delete', userId, { type: 'soft' });
    return true;
  },

  /**
   * Hard delete (file + record)
   */
  async hardDeleteMedia(id, destinationId, userId) {
    const path = await import('path');
    const fs = await import('fs');
    const [existing] = await mysqlSequelize.query('SELECT * FROM media WHERE id = :id AND destination_id = :destId', { replacements: { id, destId: destinationId }, type: QueryTypes.SELECT });
    if (!existing) return false;

    // Delete physical file
    const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
    const filePath = path.default.join(STORAGE_ROOT, 'media', String(existing.destination_id), existing.filename);
    try { fs.default.unlinkSync(filePath); } catch { /* file may be gone */ }

    // Delete thumbnails
    ['150', '400', '800'].forEach(size => {
      const thumbPath = path.default.join(STORAGE_ROOT, 'media', 'thumbnails', `${id}_${size}.webp`);
      try { fs.default.unlinkSync(thumbPath); } catch { /* ignore */ }
    });

    // Delete versions files
    const versions = await mysqlSequelize.query('SELECT filename FROM media_versions WHERE media_id = :id', { replacements: { id }, type: QueryTypes.SELECT });
    versions.forEach(v => {
      const vPath = path.default.join(STORAGE_ROOT, 'media', String(existing.destination_id), v.filename);
      try { fs.default.unlinkSync(vPath); } catch { /* ignore */ }
    });

    await mysqlSequelize.query('DELETE FROM media_versions WHERE media_id = :id', { replacements: { id }, type: QueryTypes.DELETE });
    await mysqlSequelize.query('DELETE FROM media_collection_items WHERE media_id = :id', { replacements: { id }, type: QueryTypes.DELETE });
    await mysqlSequelize.query('DELETE FROM media WHERE id = :id', { replacements: { id }, type: QueryTypes.DELETE });
    await this.logAudit(id, null, 'delete', userId, { type: 'hard', filename: existing.filename });
    return true;
  },

  /**
   * Check for duplicates by perceptual hash
   */
  async checkDuplicate(perceptualHash, destinationId) {
    if (!perceptualHash) return [];
    const matches = await mysqlSequelize.query(
      `SELECT id, filename, perceptual_hash, created_at FROM media
       WHERE perceptual_hash = :hash AND destination_id = :destId AND archived = 0`,
      { replacements: { hash: perceptualHash, destId: destinationId }, type: QueryTypes.SELECT }
    );
    return matches;
  },

  /**
   * Get stats for destination
   */
  async getMediaStats(destinationId) {
    const [totals] = await mysqlSequelize.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN archived = 0 OR archived IS NULL THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) AS archived_count,
        SUM(size_bytes) AS total_bytes,
        SUM(CASE WHEN ai_processed = 1 THEN 1 ELSE 0 END) AS ai_processed_count
       FROM media WHERE destination_id = :destId`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    const byType = await mysqlSequelize.query(
      `SELECT media_type, COUNT(*) AS count FROM media WHERE destination_id = :destId AND (archived = 0 OR archived IS NULL) GROUP BY media_type`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    const byQuality = await mysqlSequelize.query(
      `SELECT quality_tier, COUNT(*) AS count FROM media WHERE destination_id = :destId AND (archived = 0 OR archived IS NULL) GROUP BY quality_tier`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    const recentUploads = await mysqlSequelize.query(
      `SELECT id, filename, media_type, created_at FROM media WHERE destination_id = :destId AND (archived = 0 OR archived IS NULL) ORDER BY created_at DESC LIMIT 5`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    return {
      ...totals,
      total_mb: totals.total_bytes ? Math.round(totals.total_bytes / 1024 / 1024) : 0,
      by_type: byType,
      by_quality: byQuality,
      recent_uploads: recentUploads
    };
  },

  /**
   * Tag autocomplete
   */
  async getTagAutocomplete(destinationId, query) {
    // Get all unique tags from both tags and tags_ai columns
    const items = await mysqlSequelize.query(
      `SELECT tags, tags_ai FROM media WHERE destination_id = :destId AND (archived = 0 OR archived IS NULL) AND (tags IS NOT NULL OR tags_ai IS NOT NULL)`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    const tagSet = new Set();
    items.forEach(item => {
      const parse = (val) => {
        if (!val) return;
        try { const arr = typeof val === 'string' ? JSON.parse(val) : val; if (Array.isArray(arr)) arr.forEach(t => tagSet.add(String(t).toLowerCase())); } catch { /* ignore */ }
      };
      parse(item.tags);
      parse(item.tags_ai);
    });

    const all = [...tagSet].sort();
    if (!query) return all.slice(0, 50);
    const q = query.toLowerCase();
    return all.filter(t => t.includes(q)).slice(0, 20);
  },

  /**
   * Bulk tag
   */
  async bulkTag(mediaIds, tags, destinationId, userId) {
    const tagsJson = JSON.stringify(tags);
    for (const id of mediaIds) {
      await mysqlSequelize.query(
        `UPDATE media SET tags = :tags WHERE id = :id AND destination_id = :destId`,
        { replacements: { tags: tagsJson, id, destId: destinationId }, type: QueryTypes.UPDATE }
      );
      await this.logAudit(id, null, 'tag', userId, { tags });
    }
    return { updated: mediaIds.length };
  },

  /**
   * Bulk soft delete
   */
  async bulkSoftDelete(mediaIds, destinationId, userId) {
    for (const id of mediaIds) {
      await mysqlSequelize.query('UPDATE media SET archived = 1 WHERE id = :id AND destination_id = :destId', { replacements: { id, destId: destinationId }, type: QueryTypes.UPDATE });
      await this.logAudit(id, null, 'delete', userId, { type: 'soft', bulk: true });
    }
    return { archived: mediaIds.length };
  },

  /**
   * Audit log helper
   */
  async logAudit(mediaId, collectionId, action, userId, details, ipAddress) {
    await mysqlSequelize.query(
      `INSERT INTO media_audit_log (media_id, collection_id, action, user_id, details, ip_address) VALUES (:mediaId, :collectionId, :action, :userId, :details, :ip)`,
      { replacements: { mediaId, collectionId, action, userId: userId || 'system', details: details ? JSON.stringify(details) : null, ip: ipAddress || null }, type: QueryTypes.INSERT }
    );
  }
};

export default mediaService;
