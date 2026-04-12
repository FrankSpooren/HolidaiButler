/**
 * Media Collections Routes — 9 admin endpoints + 1 public endpoint
 * Media Library v2.0 — Fase ML-1.4
 */
import { Router } from 'express';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mediaService from '../services/media/mediaService.js';

export default function createCollectionRouter(adminAuth, destinationScope, resolveDestinationId) {
  const router = Router();

  // 1. GET / — List collections for destination
  router.get('/', adminAuth('reviewer'), destinationScope, async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const collections = await mysqlSequelize.query(
        `SELECT mc.*, COUNT(mci.media_id) AS item_count,
         (SELECT m.filename FROM media m WHERE m.id = mc.cover_media_id) AS cover_filename
         FROM media_collections mc
         LEFT JOIN media_collection_items mci ON mci.collection_id = mc.id
         WHERE mc.destination_id = :destId
         GROUP BY mc.id ORDER BY mc.updated_at DESC`,
        { replacements: { destId }, type: QueryTypes.SELECT }
      );
      res.json({ success: true, data: collections });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'COLLECTION_LIST_ERROR', message: error.message } });
    }
  });

  // 2. POST / — Create collection
  router.post('/', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ success: false, error: { code: 'NAME_REQUIRED', message: 'Collection name is required' } });

      const [result] = await mysqlSequelize.query(
        `INSERT INTO media_collections (destination_id, name, description, created_by) VALUES (:destId, :name, :desc, :user)`,
        { replacements: { destId, name, desc: description || null, user: req.adminUser?.id || 'system' }, type: QueryTypes.INSERT }
      );

      await mediaService.logAudit(null, result, 'collection_create', req.adminUser?.id, { name }, req.ip);

      const [collection] = await mysqlSequelize.query('SELECT * FROM media_collections WHERE id = ?', { replacements: [result], type: QueryTypes.SELECT });
      res.status(201).json({ success: true, data: collection });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'COLLECTION_CREATE_ERROR', message: error.message } });
    }
  });

  // 3. GET /:id — Collection detail + items
  router.get('/:id', adminAuth('reviewer'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const [collection] = await mysqlSequelize.query(
        'SELECT * FROM media_collections WHERE id = :id AND destination_id = :destId',
        { replacements: { id: parseInt(req.params.id), destId }, type: QueryTypes.SELECT }
      );
      if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } });

      const items = await mysqlSequelize.query(
        `SELECT m.*, mci.sort_order, mci.added_at
         FROM media_collection_items mci
         JOIN media m ON m.id = mci.media_id
         WHERE mci.collection_id = :id
         ORDER BY mci.sort_order ASC, mci.added_at DESC`,
        { replacements: { id: parseInt(req.params.id) }, type: QueryTypes.SELECT }
      );

      // Add URLs
      const itemsWithUrl = items.map(item => ({
        ...item,
        url: `/media-files/${item.destination_id}/${item.filename}`,
        thumbnail: `/media-files/thumbnails/${item.id}_400.webp`
      }));

      res.json({ success: true, data: { ...collection, items: itemsWithUrl } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'COLLECTION_DETAIL_ERROR', message: error.message } });
    }
  });

  // 4. PATCH /:id — Update name/description/cover
  router.patch('/:id', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const { name, description, cover_media_id } = req.body;
      const sets = [];
      const replacements = { id: parseInt(req.params.id), destId };

      if (name !== undefined) { sets.push('name = :name'); replacements.name = name; }
      if (description !== undefined) { sets.push('description = :desc'); replacements.desc = description; }
      if (cover_media_id !== undefined) { sets.push('cover_media_id = :cover'); replacements.cover = cover_media_id; }

      if (sets.length === 0) return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No fields to update' } });

      await mysqlSequelize.query(
        `UPDATE media_collections SET ${sets.join(', ')} WHERE id = :id AND destination_id = :destId`,
        { replacements, type: QueryTypes.UPDATE }
      );

      const [updated] = await mysqlSequelize.query('SELECT * FROM media_collections WHERE id = ?', { replacements: [parseInt(req.params.id)], type: QueryTypes.SELECT });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'COLLECTION_UPDATE_ERROR', message: error.message } });
    }
  });

  // 5. DELETE /:id — Delete collection (items are unlinked, not deleted)
  router.delete('/:id', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const [existing] = await mysqlSequelize.query(
        'SELECT id FROM media_collections WHERE id = :id AND destination_id = :destId',
        { replacements: { id: parseInt(req.params.id), destId }, type: QueryTypes.SELECT }
      );
      if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } });

      await mysqlSequelize.query('DELETE FROM media_collection_items WHERE collection_id = ?', { replacements: [parseInt(req.params.id)], type: QueryTypes.DELETE });
      await mysqlSequelize.query('DELETE FROM media_collections WHERE id = ?', { replacements: [parseInt(req.params.id)], type: QueryTypes.DELETE });

      res.json({ success: true, data: { message: 'Collection deleted', id: parseInt(req.params.id) } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'COLLECTION_DELETE_ERROR', message: error.message } });
    }
  });

  // 6. POST /:id/items — Add media items to collection
  router.post('/:id/items', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const { media_ids } = req.body;
      if (!media_ids || !Array.isArray(media_ids)) return res.status(400).json({ success: false, error: { code: 'INVALID_IDS', message: 'media_ids array required' } });

      // Verify collection belongs to destination
      const [collection] = await mysqlSequelize.query(
        'SELECT id FROM media_collections WHERE id = :id AND destination_id = :destId',
        { replacements: { id: parseInt(req.params.id), destId }, type: QueryTypes.SELECT }
      );
      if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } });

      // Get current max sort_order
      const [maxOrder] = await mysqlSequelize.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM media_collection_items WHERE collection_id = ?',
        { replacements: [parseInt(req.params.id)], type: QueryTypes.SELECT }
      );

      let added = 0;
      for (let i = 0; i < media_ids.length; i++) {
        try {
          await mysqlSequelize.query(
            'INSERT IGNORE INTO media_collection_items (collection_id, media_id, sort_order) VALUES (?, ?, ?)',
            { replacements: [parseInt(req.params.id), media_ids[i], maxOrder.max_order + i + 1], type: QueryTypes.INSERT }
          );
          added++;
        } catch { /* duplicate, skip */ }
      }

      res.json({ success: true, data: { added, collection_id: parseInt(req.params.id) } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'ADD_ITEMS_ERROR', message: error.message } });
    }
  });

  // 7. DELETE /:id/items — Remove media items from collection
  router.delete('/:id/items', adminAuth('editor'), async (req, res) => {
    try {
      const { media_ids } = req.body;
      if (!media_ids || !Array.isArray(media_ids)) return res.status(400).json({ success: false, error: { code: 'INVALID_IDS', message: 'media_ids array required' } });

      const placeholders = media_ids.map(() => '?').join(',');
      await mysqlSequelize.query(
        `DELETE FROM media_collection_items WHERE collection_id = ? AND media_id IN (${placeholders})`,
        { replacements: [parseInt(req.params.id), ...media_ids], type: QueryTypes.DELETE }
      );

      res.json({ success: true, data: { removed: media_ids.length, collection_id: parseInt(req.params.id) } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'REMOVE_ITEMS_ERROR', message: error.message } });
    }
  });

  // 8. POST /:id/share — Generate share token + optional password
  router.post('/:id/share', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const [collection] = await mysqlSequelize.query(
        'SELECT * FROM media_collections WHERE id = :id AND destination_id = :destId',
        { replacements: { id: parseInt(req.params.id), destId }, type: QueryTypes.SELECT }
      );
      if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } });

      const shareToken = crypto.randomBytes(32).toString('hex');
      const { password } = req.body;
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;

      await mysqlSequelize.query(
        'UPDATE media_collections SET share_token = :token, share_password_hash = :hash, is_public = 1 WHERE id = :id',
        { replacements: { token: shareToken, hash: passwordHash, id: parseInt(req.params.id) }, type: QueryTypes.UPDATE }
      );

      await mediaService.logAudit(null, parseInt(req.params.id), 'collection_share', req.adminUser?.id, { has_password: !!password }, req.ip);

      const shareUrl = `https://admin.holidaibutler.com/shared/collection/${shareToken}`;
      res.json({ success: true, data: { share_url: shareUrl, share_token: shareToken, has_password: !!password } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'SHARE_ERROR', message: error.message } });
    }
  });

  // 9. POST /:id/download — Return download file list (ZIP via frontend or future BullMQ)
  router.post('/:id/download', adminAuth('reviewer'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.headers['x-destination-id']);
      const items = await mysqlSequelize.query(
        `SELECT m.id, m.filename, m.original_name, m.destination_id
         FROM media_collection_items mci
         JOIN media m ON m.id = mci.media_id
         WHERE mci.collection_id = :id`,
        { replacements: { id: parseInt(req.params.id) }, type: QueryTypes.SELECT }
      );

      const files = items.map(f => ({
        id: f.id,
        filename: f.original_name || f.filename,
        url: `/media-files/${f.destination_id}/${f.filename}`
      }));

      await mediaService.logAudit(null, parseInt(req.params.id), 'download', req.adminUser?.id, { file_count: files.length }, req.ip);

      res.json({ success: true, data: { files, count: files.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message: error.message } });
    }
  });

  return router;
}

/**
 * Public collection endpoint — no auth required
 * GET /public/media-collections/:share_token
 */
export function createPublicCollectionRouter() {
  const router = Router();

  router.get('/:share_token', async (req, res) => {
    try {
      const [collection] = await mysqlSequelize.query(
        'SELECT * FROM media_collections WHERE share_token = :token AND is_public = 1',
        { replacements: { token: req.params.share_token }, type: QueryTypes.SELECT }
      );
      if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found or not shared' } });

      // Password check
      if (collection.share_password_hash) {
        const pw = req.query.password || req.headers['x-collection-password'];
        if (!pw) return res.status(401).json({ success: false, error: { code: 'PASSWORD_REQUIRED', message: 'This collection is password protected' } });
        const valid = await bcrypt.compare(pw, collection.share_password_hash);
        if (!valid) return res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } });
      }

      const items = await mysqlSequelize.query(
        `SELECT m.id, m.filename, m.original_name, m.alt_text, m.width, m.height, m.destination_id, mci.sort_order
         FROM media_collection_items mci
         JOIN media m ON m.id = mci.media_id
         WHERE mci.collection_id = :id
         ORDER BY mci.sort_order ASC`,
        { replacements: { id: collection.id }, type: QueryTypes.SELECT }
      );

      const apiBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';
      const itemsWithUrl = items.map(item => ({
        id: item.id,
        filename: item.original_name || item.filename,
        alt_text: item.alt_text,
        width: item.width,
        height: item.height,
        url: `${apiBase}/media-files/${item.destination_id}/${item.filename}`,
        thumbnail: `${apiBase}/media-files/thumbnails/${item.id}_400.webp`
      }));

      res.json({
        success: true,
        data: {
          name: collection.name,
          description: collection.description,
          item_count: itemsWithUrl.length,
          items: itemsWithUrl
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'PUBLIC_COLLECTION_ERROR', message: error.message } });
    }
  });

  return router;
}
