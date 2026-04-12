/**
 * Media Library v2.0 — Express Router
 * 12 endpoints for media CRUD, bulk operations, stats, and duplicate detection.
 * Full media pipeline with AI tagging via BullMQ queue.
 * Mounted from adminPortal.js as: router.use('/media', mediaRouter)
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.js';
import mediaService from '../services/media/mediaService.js';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';

// Multer setup for media uploads
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const codeMap = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4, bute: 10 };
    const rawDest = req.query.destinationId || req.query.destination || req.body.destination_id || req.headers['x-destination-id'] || '1';
    const destId = codeMap[String(rawDest).toLowerCase()] || parseInt(rawDest) || 1;
    const dir = path.join(STORAGE_ROOT, 'media', String(destId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  }
});
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max (video)
  fileFilter: (req, file, cb) => {
    const allowed = /image\/|video\/|audio\/|application\/pdf|application\/gpx/;
    if (allowed.test(file.mimetype) || file.originalname.endsWith('.gpx')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

/**
 * Factory function — receives middleware from adminPortal.js
 * @param {Function} adminAuth - JWT auth middleware with role check
 * @param {Function} destinationScope - Destination scoping middleware
 * @param {Function} resolveDestinationId - Resolves string/numeric destination IDs
 * @returns {import('express').Router}
 */
export default function createMediaRouter(adminAuth, destinationScope, resolveDestinationId) {
  const router = express.Router();

  // 1. GET /media — List with filters + pagination + sort + search
  router.get('/', adminAuth('reviewer'), destinationScope, async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const result = await mediaService.listMedia(destinationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[Media] List error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_LIST_ERROR', message: error.message } });
    }
  });

  // 2. GET /media/stats — Dashboard stats per destination
  router.get('/stats', adminAuth('reviewer'), destinationScope, async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.headers['x-destination-id']);
      const stats = await mediaService.getMediaStats(destinationId);
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('[Media] Stats error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_STATS_ERROR', message: error.message } });
    }
  });

  // 3. GET /media/tags/autocomplete — Tag autocomplete
  router.get('/tags/autocomplete', adminAuth('reviewer'), destinationScope, async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.headers['x-destination-id']);
      const tags = await mediaService.getTagAutocomplete(destinationId, req.query.q);
      res.json({ success: true, data: tags });
    } catch (error) {
      logger.error('[Media] Tag autocomplete error:', error);
      res.status(500).json({ success: false, error: { code: 'TAG_AUTOCOMPLETE_ERROR', message: error.message } });
    }
  });

  // 4. GET /media/:id — Detail + versions + audit log
  router.get('/:id', adminAuth('reviewer'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.headers['x-destination-id']);
      const media = await mediaService.getMediaDetail(parseInt(req.params.id), destinationId);
      if (!media) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } });
      res.json({ success: true, data: media });
    } catch (error) {
      logger.error('[Media] Detail error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_DETAIL_ERROR', message: error.message } });
    }
  });

  // 5. POST /media/upload — Upload (extended with metadata)
  router.post('/upload', adminAuth('editor'), (req, res) => {
    mediaUpload.array('files', 50)(req, res, async (err) => {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 200MB)' : err.message;
        return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'No files uploaded' } });
      }

      try {
        const codeMap = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4, bute: 10 };
        const rawDI = req.query.destinationId || req.body.destination_id || req.headers['x-destination-id'] || '1';
        const destinationId = codeMap[String(rawDI).toLowerCase()] || parseInt(rawDI) || 1;
        const category = req.body.category || 'other';
        const results = [];

        for (const file of req.files) {
          // Try to get dimensions with sharp
          let width = null, height = null;
          try {
            const sharp = (await import('sharp')).default;
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;
          } catch { /* non-image or sharp unavailable */ }

          // Determine media_type from mimetype
          let mediaType = 'image';
          if (file.mimetype.startsWith('video/')) mediaType = 'video';
          else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
          else if (file.mimetype === 'application/pdf') mediaType = 'pdf';
          else if (file.originalname.endsWith('.gpx')) mediaType = 'gpx';

          // Determine quality tier
          let qualityTier = 'medium';
          if (width) {
            if (width < 800) qualityTier = 'low';
            else if (width < 2000) qualityTier = 'medium';
            else if (width < 4000) qualityTier = 'high';
            else qualityTier = 'ultra';
          }

          await mysqlSequelize.query(
            `INSERT INTO media (destination_id, filename, original_name, mime_type, size_bytes, width, height, category, media_type, quality_tier, uploaded_by)
             VALUES (:destId, :filename, :originalName, :mimeType, :sizeBytes, :width, :height, :category, :mediaType, :qualityTier, :uploadedBy)`,
            {
              replacements: {
                destId: destinationId, filename: file.filename, originalName: file.originalname,
                mimeType: file.mimetype, sizeBytes: file.size, width, height, category,
                mediaType, qualityTier, uploadedBy: req.adminUser?.id || null
              },
              type: QueryTypes.INSERT
            }
          );

          const [mediaItem] = await mysqlSequelize.query(
            'SELECT * FROM media WHERE filename = :filename ORDER BY id DESC LIMIT 1',
            { replacements: { filename: file.filename }, type: QueryTypes.SELECT }
          );

          // Audit log
          await mediaService.logAudit(mediaItem.id, null, 'upload', req.adminUser?.id, { originalName: file.originalname, size: file.size, mediaType }, req.ip);

          results.push({ ...mediaItem, url: `/media-files/${destinationId}/${file.filename}` });
          // Dispatch media processing pipeline
          try {
            const { mediaProcessingQueue } = await import("../services/orchestrator/queues.js"); await mediaProcessingQueue.add("process-media", { mediaId: mediaItem.id, type: "full_pipeline" }, { priority: 2 });
            console.log("[Media] Processing job dispatched for media " + mediaItem.id);
          } catch (qErr) { console.warn("[Media] Queue dispatch failed:", qErr.message); }
        }

        res.status(201).json({ success: true, data: { files: results } });
      } catch (error) {
        logger.error('[Media] Upload error:', error);
        res.status(500).json({ success: false, error: { code: 'MEDIA_UPLOAD_ERROR', message: error.message } });
      }
    });
  });

  // 6. PATCH /media/:id — Update metadata
  router.patch('/:id', adminAuth('editor'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const updated = await mediaService.updateMedia(parseInt(req.params.id), destinationId, req.body, req.adminUser?.id);
      if (!updated) return res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No valid fields to update' } });
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[Media] Update error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_UPDATE_ERROR', message: error.message } });
    }
  });

  // 7. DELETE /media/:id — Soft delete (archive)
  router.delete('/:id', adminAuth('editor'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const result = await mediaService.softDeleteMedia(parseInt(req.params.id), destinationId, req.adminUser?.id);
      if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } });
      res.json({ success: true, data: { message: 'Media archived', id: parseInt(req.params.id) } });
    } catch (error) {
      logger.error('[Media] Soft delete error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_DELETE_ERROR', message: error.message } });
    }
  });

  // 8. DELETE /media/:id/permanent — Hard delete
  router.delete('/:id/permanent', adminAuth('platform_admin'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const result = await mediaService.hardDeleteMedia(parseInt(req.params.id), destinationId, req.adminUser?.id);
      if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } });
      res.json({ success: true, data: { message: 'Media permanently deleted', id: parseInt(req.params.id) } });
    } catch (error) {
      logger.error('[Media] Hard delete error:', error);
      res.status(500).json({ success: false, error: { code: 'MEDIA_DELETE_ERROR', message: error.message } });
    }
  });

  // 9. POST /media/:id/duplicate-check — pHash comparison
  router.post('/:id/duplicate-check', adminAuth('editor'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const [media] = await mysqlSequelize.query('SELECT perceptual_hash FROM media WHERE id = :id', { replacements: { id: parseInt(req.params.id) }, type: QueryTypes.SELECT });
      if (!media || !media.perceptual_hash) return res.json({ success: true, data: { duplicates: [] } });
      const duplicates = await mediaService.checkDuplicate(media.perceptual_hash, destinationId);
      // Exclude self
      const filtered = duplicates.filter(d => d.id !== parseInt(req.params.id));
      res.json({ success: true, data: { duplicates: filtered } });
    } catch (error) {
      logger.error('[Media] Duplicate check error:', error);
      res.status(500).json({ success: false, error: { code: 'DUPLICATE_CHECK_ERROR', message: error.message } });
    }
  });

  // 10. POST /media/bulk/tag — Bulk tags
  router.post('/bulk/tag', adminAuth('editor'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { media_ids, tags } = req.body;
      if (!media_ids || !tags) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'media_ids and tags required' } });
      const result = await mediaService.bulkTag(media_ids, tags, destinationId, req.adminUser?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Media] Bulk tag error:', error);
      res.status(500).json({ success: false, error: { code: 'BULK_TAG_ERROR', message: error.message } });
    }
  });

  // 11. POST /media/bulk/delete — Bulk soft delete
  router.post('/bulk/delete', adminAuth('editor'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { media_ids } = req.body;
      if (!media_ids) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'media_ids required' } });
      const result = await mediaService.bulkSoftDelete(media_ids, destinationId, req.adminUser?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Media] Bulk delete error:', error);
      res.status(500).json({ success: false, error: { code: 'BULK_DELETE_ERROR', message: error.message } });
    }
  });

  // 12. POST /media/bulk/download — ZIP generation (placeholder - returns file list for now)
  router.post('/bulk/download', adminAuth('reviewer'), async (req, res) => {
    try {
      const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { media_ids } = req.body;
      if (!media_ids || !media_ids.length) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'media_ids required' } });

      const placeholders = media_ids.map((_, i) => `:id${i}`).join(',');
      const replacements = { destId: destinationId };
      media_ids.forEach((id, i) => { replacements[`id${i}`] = id; });

      const files = await mysqlSequelize.query(
        `SELECT id, filename, original_name, destination_id FROM media WHERE id IN (${placeholders}) AND destination_id = :destId`,
        { replacements, type: QueryTypes.SELECT }
      );

      // For now, return download URLs. ZIP generation via BullMQ can be added in ML-1.3
      const downloadUrls = files.map(f => ({
        id: f.id,
        filename: f.original_name || f.filename,
        url: `/media-files/${f.destination_id}/${f.filename}`
      }));

      res.json({ success: true, data: { files: downloadUrls, count: downloadUrls.length } });
    } catch (error) {
      logger.error('[Media] Bulk download error:', error);
      res.status(500).json({ success: false, error: { code: 'BULK_DOWNLOAD_ERROR', message: error.message } });
    }
  });

// ============================================================
// PEXELS INTEGRATION (ML-1.5) — 2 endpoints
// ============================================================

// 13. GET /media/pexels/search — Proxy to Pexels API
router.get('/pexels/search', adminAuth('editor'), async (req, res) => {
  try {
    const { searchPexels } = await import('../services/agents/contentRedacteur/pexelsClient.js');
    const query = req.query.q || req.query.query || '';
    const perPage = parseInt(req.query.per_page) || 15;
    if (!query) return res.status(400).json({ success: false, error: { code: 'QUERY_REQUIRED', message: 'Search query required (q=...)' } });
    const results = await searchPexels(query, Math.min(perPage, 40));
    res.json({ success: true, data: { results, query, count: results.length } });
  } catch (error) {
    logger.error('[Media] Pexels search error:', error);
    res.status(500).json({ success: false, error: { code: 'PEXELS_SEARCH_ERROR', message: error.message } });
  }
});

// 14. POST /media/pexels/import/:pexels_id — Download + import to media library
router.post('/pexels/import/:pexels_id', adminAuth('editor'), async (req, res) => {
  try {
    const pexelsId = req.params.pexels_id;
    const destinationId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    if (!PEXELS_API_KEY) return res.status(500).json({ success: false, error: { code: 'NO_API_KEY', message: 'PEXELS_API_KEY not configured' } });

    // Fetch photo details from Pexels
    const photoRes = await fetch('https://api.pexels.com/v1/photos/' + pexelsId, {
      headers: { 'Authorization': PEXELS_API_KEY }
    });
    if (!photoRes.ok) return res.status(404).json({ success: false, error: { code: 'PEXELS_NOT_FOUND', message: 'Photo not found on Pexels' } });
    const photo = await photoRes.json();

    // Download the original image
    const imageUrl = photo.src?.original || photo.src?.large2x || photo.src?.large;
    if (!imageUrl) return res.status(400).json({ success: false, error: { code: 'NO_IMAGE_URL', message: 'No image URL available' } });

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: 'Failed to download image from Pexels' } });
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    // Save to storage
    const fs = await import('fs');
    const path = await import('path');
    const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
    const dir = path.default.join(STORAGE_ROOT, 'media', String(destinationId));
    fs.default.mkdirSync(dir, { recursive: true });
    const ext = path.default.extname(new URL(imageUrl).pathname) || '.jpg';
    const filename = 'pexels-' + pexelsId + '-' + Date.now() + ext;
    const filePath = path.default.join(dir, filename);
    fs.default.writeFileSync(filePath, buffer);

    // Get dimensions
    let width = photo.width, height = photo.height;
    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(filePath).metadata();
      width = meta.width || width;
      height = meta.height || height;
    } catch { /* use Pexels dimensions */ }

    // Quality tier
    let qualityTier = 'medium';
    if (width < 800) qualityTier = 'low';
    else if (width < 2000) qualityTier = 'medium';
    else if (width < 4000) qualityTier = 'high';
    else qualityTier = 'ultra';

    // Insert into media table
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = await import('sequelize');
    const [insertId] = await mysqlSequelize.query(
      'INSERT INTO media (destination_id, filename, original_name, mime_type, size_bytes, width, height, category, media_type, quality_tier, license_type, usage_rights, consent_status, owner_name, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      { replacements: [
        destinationId, filename, 'pexels-' + pexelsId + ext, 'image/jpeg', buffer.length,
        width, height, 'other', 'image', qualityTier,
        'stock_pexels', 'all', 'not_required',
        photo.photographer || null,
        'Pexels: ' + (photo.photographer || 'Unknown') + ' — ' + (photo.url || ''),
        req.adminUser?.id || null
      ], type: QueryTypes.INSERT }
    );

    // Dispatch processing pipeline
    try {
      const { mediaProcessingQueue } = await import('../services/orchestrator/queues.js');
      await mediaProcessingQueue.add('process-media', { mediaId: insertId, type: 'full_pipeline' }, { priority: 2 });
    } catch (qErr) { console.warn('[Media] Queue dispatch failed:', qErr.message); }

    // Audit log
    const mediaService = (await import('../services/media/mediaService.js')).default;
    await mediaService.logAudit(insertId, null, 'upload', req.adminUser?.id, { source: 'pexels', pexels_id: pexelsId, photographer: photo.photographer }, req.ip);

    // Fetch created record
    const [mediaItem] = await mysqlSequelize.query('SELECT * FROM media WHERE id = ?', { replacements: [insertId], type: QueryTypes.SELECT });
    res.status(201).json({ success: true, data: { ...mediaItem, url: '/media-files/' + destinationId + '/' + filename } });
  } catch (error) {
    logger.error('[Media] Pexels import error:', error);
    res.status(500).json({ success: false, error: { code: 'PEXELS_IMPORT_ERROR', message: error.message } });
  }
});


  // 15. POST /media/:id/edit — Create new edited version (original unchanged)
  router.post("/:id/edit", adminAuth("editor"), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { operations, save_as_version, version_description } = req.body;
      if (!operations || !operations.length) {
        return res.status(400).json({ success: false, error: { code: "NO_OPS", message: "No operations specified" } });
      }

      const sharp = (await import("sharp")).default;

      const [original] = await mysqlSequelize.query(
        "SELECT * FROM media WHERE id = ? AND destination_id = ?",
        { replacements: [mediaId, destId], type: QueryTypes.SELECT }
      );
      if (!original) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found" } });

      const STORAGE_ROOT = process.env.STORAGE_ROOT || "/var/www/api.holidaibutler.com/storage";
      const srcPath = path.join(STORAGE_ROOT, "media", String(destId), original.filename);
      if (!fs.existsSync(srcPath)) return res.status(404).json({ success: false, error: { code: "FILE_NOT_FOUND", message: "Source file not found" } });

      // Apply Sharp operations
      let pipeline = sharp(srcPath);
      for (const op of operations) {
        switch (op.type) {
          case "crop":
            pipeline = pipeline.extract({ left: op.x || 0, top: op.y || 0, width: op.width, height: op.height });
            break;
          case "resize":
            pipeline = pipeline.resize({ width: op.width || undefined, height: op.height || undefined, fit: "inside" });
            break;
          case "adjust":
            if (op.brightness || op.saturation) pipeline = pipeline.modulate({ brightness: op.brightness || 1, saturation: op.saturation || 1 });
            if (op.contrast && op.contrast !== 1) pipeline = pipeline.linear(op.contrast, 0);
            break;
          case "rotate": pipeline = pipeline.rotate(op.angle || 0); break;
          case "flip": pipeline = pipeline.flip(); break;
          case "flop": pipeline = pipeline.flop(); break;
          case "sharpen": pipeline = pipeline.sharpen({ sigma: op.sigma || 1.5 }); break;
          case "normalize": pipeline = pipeline.normalize(); break;
        }
      }

      // Generate new filename — always based on timestamp, never on original name
      const ext = path.extname(original.filename);
      const newFilename = Date.now() + "-edited" + ext;
      const outPath = path.join(STORAGE_ROOT, "media", String(destId), newFilename);
      const info = await pipeline.toFile(outPath);
      const fileStats = fs.statSync(outPath);

      // Quality tier
      let qualityTier = "medium";
      if (info.width < 800) qualityTier = "low";
      else if (info.width < 2000) qualityTier = "medium";
      else if (info.width < 4000) qualityTier = "high";
      else qualityTier = "ultra";

      const isAiEdit = operations.some(o => o.type === "sharpen" || o.type === "normalize");
      const editDesc = version_description || operations.map(o => o.type).join(", ");
      const origName = original.original_name ? original.original_name.replace(ext, "") + " (" + editDesc + ")" + ext : newFilename;

      // INSERT new media record — original stays untouched
      const [newId] = await mysqlSequelize.query(
        `INSERT INTO media (destination_id, filename, original_name, mime_type, size_bytes, width, height,
         category, media_type, quality_tier, alt_text, description, description_en, description_de, description_es, description_fr,
         tags, tags_ai, owner_name, owner_email, usage_rights, license_type, consent_status,
         ai_badge, version_number, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        { replacements: [
          destId, newFilename, origName, original.mime_type, fileStats.size, info.width, info.height,
          original.category, original.media_type, qualityTier,
          original.alt_text, original.description, original.description_en, original.description_de, original.description_es, original.description_fr,
          original.tags, original.tags_ai, original.owner_name, original.owner_email,
          original.usage_rights, original.license_type, original.consent_status,
          isAiEdit ? 1 : 0, req.adminUser?.id || null
        ], type: QueryTypes.INSERT }
      );

      // Link to original via media_versions (track lineage)
      await mysqlSequelize.query(
        "INSERT INTO media_versions (media_id, version_number, filename, size_bytes, width, height, changed_by, change_description) VALUES (?,?,?,?,?,?,?,?)",
        { replacements: [newId, 1, original.filename, original.size_bytes, original.width, original.height, req.adminUser?.id || "system", "Origineel: " + (original.original_name || original.filename)], type: QueryTypes.INSERT }
      );

      // Audit log
      await mediaService.logAudit(newId, null, "edit", req.adminUser?.id, {
        source_media_id: mediaId,
        operations: operations.map(o => o.type),
        description: editDesc
      }, req.ip);

      // Generate thumbnails for new item
      try {
        const { mediaProcessingQueue } = await import("../services/orchestrator/queues.js");
        await mediaProcessingQueue.add("process-media", { mediaId: newId, type: "thumbnail" }, { priority: 1 });
      } catch { /* non-critical */ }

      const [newMedia] = await mysqlSequelize.query("SELECT * FROM media WHERE id = ?", { replacements: [newId], type: QueryTypes.SELECT });
      res.status(201).json({ success: true, data: { ...newMedia, url: "/media-files/" + destId + "/" + newFilename, source_media_id: mediaId } });
    } catch (error) {
      logger.error("[Media] Edit error:", error);
      res.status(500).json({ success: false, error: { code: "MEDIA_EDIT_ERROR", message: error.message } });
    }
  });

  // ============================================================
  // AI IMAGE TOOLS (ML-3.2) — 3 endpoints
  // ============================================================

  // 16. POST /media/:id/ai/enhance — One-click AI enhance
  router.post("/:id/ai/enhance", adminAuth("editor"), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers["x-destination-id"]);
      const { mysqlSequelize } = await import("../config/database.js");
      const { QueryTypes } = await import("sequelize");
      const sharp = (await import("sharp")).default;
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;

      const [media] = await mysqlSequelize.query("SELECT * FROM media WHERE id = ? AND destination_id = ?", { replacements: [mediaId, destId], type: QueryTypes.SELECT });
      if (!media) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found" } });

      const STORAGE_ROOT = process.env.STORAGE_ROOT || "/var/www/api.holidaibutler.com/storage";
      const srcPath = path.join(STORAGE_ROOT, "media", String(destId), media.filename);
      if (!fs.existsSync(srcPath)) return res.status(404).json({ success: false, error: { code: "FILE_NOT_FOUND", message: "File not found" } });

      const ext = path.extname(media.filename);
      const newFilename = media.filename.replace(ext, "-enhanced" + ext);
      const outPath = path.join(STORAGE_ROOT, "media", String(destId), newFilename);

      await sharp(srcPath).sharpen({ sigma: 1.5 }).median(3).normalize().toFile(outPath);
      const info = await sharp(outPath).metadata();

      // Save old as version
      await mysqlSequelize.query("INSERT INTO media_versions (media_id, version_number, filename, size_bytes, width, height, changed_by, change_description) VALUES (?,?,?,?,?,?,?,?)",
        { replacements: [mediaId, media.version_number, media.filename, media.size_bytes, media.width, media.height, req.adminUser?.id || "system", "Pre-enhance backup"], type: QueryTypes.INSERT });

      const stats = fs.statSync(outPath);
      await mysqlSequelize.query("UPDATE media SET filename = ?, size_bytes = ?, width = ?, height = ?, version_number = version_number + 1, ai_badge = 1 WHERE id = ?",
        { replacements: [newFilename, stats.size, info.width, info.height, mediaId], type: QueryTypes.UPDATE });

      const mediaService = (await import("../services/media/mediaService.js")).default;
      await mediaService.logAudit(mediaId, null, "edit", req.adminUser?.id, { type: "ai_enhance" }, req.ip);

      try { const { mediaProcessingQueue } = await import("../services/orchestrator/queues.js"); await mediaProcessingQueue.add("process-media", { mediaId, type: "thumbnail" }, { priority: 1 }); } catch {}

      const [updated] = await mysqlSequelize.query("SELECT * FROM media WHERE id = ?", { replacements: [mediaId], type: QueryTypes.SELECT });
      res.json({ success: true, data: { ...updated, url: "/media-files/" + destId + "/" + newFilename } });
    } catch (error) {
      logger.error("[Media] AI enhance error:", error);
      res.status(500).json({ success: false, error: { code: "AI_ENHANCE_ERROR", message: error.message } });
    }
  });

  // 17. POST /media/:id/ai/alt-text — Generate alt-text in 5 languages via Pixtral
  router.post("/:id/ai/alt-text", adminAuth("editor"), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers["x-destination-id"]);
      const { mysqlSequelize } = await import("../config/database.js");
      const { QueryTypes } = await import("sequelize");
      const fs = (await import("fs")).default;
      const path = (await import("path")).default;

      const [media] = await mysqlSequelize.query("SELECT * FROM media WHERE id = ? AND destination_id = ?", { replacements: [mediaId, destId], type: QueryTypes.SELECT });
      if (!media) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found" } });

      const STORAGE_ROOT = process.env.STORAGE_ROOT || "/var/www/api.holidaibutler.com/storage";
      const filePath = path.join(STORAGE_ROOT, "media", String(destId), media.filename);
      const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
      if (!MISTRAL_API_KEY) return res.status(500).json({ success: false, error: { code: "NO_API_KEY", message: "MISTRAL_API_KEY not set" } });

      const imageBuffer = fs.readFileSync(filePath);
      const base64 = imageBuffer.toString("base64");
      const mimeType = media.mime_type || "image/jpeg";

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + MISTRAL_API_KEY },
        body: JSON.stringify({
          model: process.env.MISTRAL_VISION_MODEL || "mistral-medium-latest",
          messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: "data:" + mimeType + ";base64," + base64 } },
            { type: "text", text: "Describe this image for accessibility (alt-text). Return a JSON object with 5 keys: nl, en, de, es, fr. Each value should be 1-2 sentences in that language. Return ONLY valid JSON, no other text." }
          ]}],
          max_tokens: 500, temperature: 0.2
        })
      });

      if (!response.ok) throw new Error("Mistral API error: " + response.status);
      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const updateParts = [];
      const updateVals = [];
      if (translations.nl) { updateParts.push("alt_text = ?", "description = ?"); updateVals.push(translations.nl, translations.nl); }
      if (translations.en) { updateParts.push("description_en = ?"); updateVals.push(translations.en); }
      if (translations.de) { updateParts.push("description_de = ?"); updateVals.push(translations.de); }
      if (translations.es) { updateParts.push("description_es = ?"); updateVals.push(translations.es); }
      if (translations.fr) { updateParts.push("description_fr = ?"); updateVals.push(translations.fr); }

      if (updateParts.length > 0) {
        updateVals.push(mediaId);
        await mysqlSequelize.query("UPDATE media SET " + updateParts.join(", ") + " WHERE id = ?", { replacements: updateVals });
      }

      const mediaService = (await import("../services/media/mediaService.js")).default;
      await mediaService.logAudit(mediaId, null, "edit", req.adminUser?.id, { type: "ai_alt_text", languages: Object.keys(translations) }, req.ip);

      res.json({ success: true, data: { translations, media_id: mediaId } });
    } catch (error) {
      logger.error("[Media] AI alt-text error:", error);
      res.status(500).json({ success: false, error: { code: "AI_ALT_TEXT_ERROR", message: error.message } });
    }
  });

  // 18. POST /media/:id/ai/retag — Re-tag with Pixtral 12B
  router.post("/:id/ai/retag", adminAuth("editor"), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers["x-destination-id"]);
      const { mysqlSequelize } = await import("../config/database.js");
      const { QueryTypes } = await import("sequelize");

      const [media] = await mysqlSequelize.query("SELECT * FROM media WHERE id = ? AND destination_id = ?", { replacements: [mediaId, destId], type: QueryTypes.SELECT });
      if (!media) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found" } });

      const { mediaProcessingQueue } = await import("../services/orchestrator/queues.js");
      await mediaProcessingQueue.add("process-media", { mediaId, type: "ai_tag" }, { priority: 2 });

      const mediaService = (await import("../services/media/mediaService.js")).default;
      await mediaService.logAudit(mediaId, null, "tag", req.adminUser?.id, { type: "ai_retag" }, req.ip);

      res.json({ success: true, data: { message: "AI re-tagging dispatched", media_id: mediaId } });
    } catch (error) {
      logger.error("[Media] AI retag error:", error);
      res.status(500).json({ success: false, error: { code: "AI_RETAG_ERROR", message: error.message } });
    }
  });


  // ============================================================
  // CLEANUP TOOLS (ML-3.5) — 3 endpoints
  // ============================================================

  // 19. GET /media/cleanup/duplicates — Group media with same perceptual hash
  router.get('/cleanup/duplicates', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = await import('sequelize');

      const groups = await mysqlSequelize.query(
        `SELECT perceptual_hash, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY created_at ASC) as media_ids
         FROM media WHERE destination_id = :destId AND (archived = 0 OR archived IS NULL) AND perceptual_hash IS NOT NULL
         GROUP BY perceptual_hash HAVING cnt > 1
         ORDER BY cnt DESC LIMIT 50`,
        { replacements: { destId }, type: QueryTypes.SELECT }
      );

      // Enrich with media details
      const enriched = [];
      for (const group of groups) {
        const ids = group.media_ids.split(',').map(Number);
        const items = await mysqlSequelize.query(
          `SELECT id, filename, original_name, size_bytes, width, height, created_at, destination_id
           FROM media WHERE id IN (${ids.join(',')})`,
          { type: QueryTypes.SELECT }
        );
        enriched.push({
          perceptual_hash: group.perceptual_hash,
          count: group.cnt,
          items: items.map(it => ({ ...it, url: `/media-files/${it.destination_id}/${it.filename}` }))
        });
      }

      res.json({ success: true, data: { groups: enriched, total_groups: enriched.length } });
    } catch (error) {
      logger.error('[Media] Cleanup duplicates error:', error);
      res.status(500).json({ success: false, error: { code: 'CLEANUP_ERROR', message: error.message } });
    }
  });

  // 20. GET /media/cleanup/unused — Media not used in content items
  router.get('/cleanup/unused', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const months = parseInt(req.query.months) || 6;
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = await import('sequelize');

      const items = await mysqlSequelize.query(
        `SELECT m.id, m.filename, m.original_name, m.size_bytes, m.width, m.height, m.created_at, m.usage_count, m.last_used_at, m.destination_id
         FROM media m
         WHERE m.destination_id = :destId AND (m.archived = 0 OR m.archived IS NULL)
         AND m.usage_count = 0
         AND m.created_at < DATE_SUB(NOW(), INTERVAL :months MONTH)
         ORDER BY m.created_at ASC LIMIT 100`,
        { replacements: { destId, months }, type: QueryTypes.SELECT }
      );

      const totalSize = items.reduce((sum, it) => sum + (it.size_bytes || 0), 0);

      res.json({
        success: true,
        data: {
          items: items.map(it => ({ ...it, url: `/media-files/${it.destination_id}/${it.filename}` })),
          total_items: items.length,
          total_mb: Math.round(totalSize / 1024 / 1024),
          months_threshold: months
        }
      });
    } catch (error) {
      logger.error('[Media] Cleanup unused error:', error);
      res.status(500).json({ success: false, error: { code: 'CLEANUP_ERROR', message: error.message } });
    }
  });

  // 21. POST /media/cleanup/archive — Bulk archive selected items
  router.post('/cleanup/archive', adminAuth('editor'), async (req, res) => {
    try {
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { media_ids } = req.body;
      if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_IDS', message: 'media_ids array required' } });
      }
      const mediaService = (await import('../services/media/mediaService.js')).default;
      const result = await mediaService.bulkSoftDelete(media_ids, destId, req.adminUser?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Media] Cleanup archive error:', error);
      res.status(500).json({ success: false, error: { code: 'CLEANUP_ERROR', message: error.message } });
    }
  });

  // ============================================================
  // GDPR & COMPLIANCE (ML-4.1) — 2 endpoints
  // ============================================================

  // 22. POST /media/:id/consent/request — Send consent request (log + update status)
  router.post("/:id/consent/request", adminAuth("editor"), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const destId = resolveDestinationId(req.query.destinationId || req.query.destination || req.headers['x-destination-id']);
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: { code: "EMAIL_REQUIRED", message: "Email is required" } });

      const [media] = await mysqlSequelize.query(
        "SELECT * FROM media WHERE id = ? AND destination_id = ?",
        { replacements: [mediaId, destId], type: QueryTypes.SELECT }
      );
      if (!media) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found" } });

      // Update consent status + owner email
      await mysqlSequelize.query(
        "UPDATE media SET consent_status = 'pending', owner_email = ? WHERE id = ?",
        { replacements: [email, mediaId] }
      );

      await mediaService.logAudit(mediaId, null, "rights_change", req.adminUser?.id, {
        type: "consent_request", email, previous_status: media.consent_status
      }, req.ip);

      res.json({ success: true, data: { message: "Consent request logged", media_id: mediaId, status: "pending" } });
    } catch (error) {
      logger.error("[Media] Consent request error:", error);
      res.status(500).json({ success: false, error: { code: "CONSENT_ERROR", message: error.message } });
    }
  });

  // 23. GET /media/export/gdpr/:user_id — GDPR data export for uploader
  router.get("/export/gdpr/:user_id", adminAuth("platform_admin"), async (req, res) => {
    try {
      const userId = req.params.user_id;

      const items = await mysqlSequelize.query(
        `SELECT id, filename, original_name, mime_type, size_bytes, width, height, category, media_type,
         alt_text, description, tags, tags_ai, owner_name, owner_email, usage_rights, license_type,
         consent_status, location_lat, location_lng, location_name, created_at
         FROM media WHERE uploaded_by = ? ORDER BY created_at DESC`,
        { replacements: [userId], type: QueryTypes.SELECT }
      );

      const auditLog = await mysqlSequelize.query(
        "SELECT * FROM media_audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        { replacements: [userId], type: QueryTypes.SELECT }
      );

      await mediaService.logAudit(null, null, "view", req.adminUser?.id, {
        type: "gdpr_export", target_user: userId, item_count: items.length
      }, req.ip);

      res.json({
        success: true,
        data: {
          user_id: userId,
          export_date: new Date().toISOString(),
          media_items: items,
          media_count: items.length,
          audit_log: auditLog,
          audit_count: auditLog.length
        }
      });
    } catch (error) {
      logger.error("[Media] GDPR export error:", error);
      res.status(500).json({ success: false, error: { code: "GDPR_EXPORT_ERROR", message: error.message } });
    }
  });
  return router;
}
