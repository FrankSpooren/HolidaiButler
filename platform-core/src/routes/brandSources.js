/**
 * Brand Sources Routes — Admin endpoints for curated website scraping + KB source management
 *
 * Mounted at: /api/v1/admin-portal/brand-sources
 *
 * Endpoints:
 *   POST   /scrape-website         — Scrape a URL and upsert into brand_knowledge
 *   GET    /                       — List all sources for the user's destination(s)
 *   PUT    /:id/toggle             — Toggle is_active flag
 *   DELETE /:id                    — Soft-disable a source (sets is_active=0)
 *   GET    /sitemap-check          — Check sitemap lastmod for a URL (helper)
 *
 * Auth: requires destination_admin or platform_admin role.
 * Audit: all mutations are logged via ai_generation_log + standard route logging.
 *
 * @module routes/brandSources
 * @version 1.0.0
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { scrapeAndStore, scrapeUrl, fetchSitemapLastmod } from '../services/websiteScraperService.js';
import { backfillDestination as _kbBackfill, embedAndStore as _kbEmbed } from '../services/brandKnowledgeSearch.js';
import logger from '../utils/logger.js';

const router = express.Router();

// -------------------------------------------------------------------
// Helper: resolve destination_id from query / body / authenticated user
// -------------------------------------------------------------------

function getDestId(req) {
  const fromQuery = req.query?.destinationId || req.query?.destination_id;
  const fromBody = req.body?.destinationId || req.body?.destination_id;
  const fromHeader = req.headers['x-destination-id'];
  const fromUser = req.user?.allowed_destinations?.[0];
  const raw = fromQuery || fromBody || fromHeader || fromUser;
  if (!raw) throw new Error('destination_id required');
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid destination_id');
  return id;
}

function isAuthorizedForDest(req, destId) {
  const role = req.user?.role;
  if (role === 'platform_admin') return true;
  const allowed = req.user?.allowed_destinations || [];
  return Array.isArray(allowed) && allowed.map(Number).includes(Number(destId));
}

// -------------------------------------------------------------------
// POST /scrape-website — scrape URL and upsert as website_scrape source
// -------------------------------------------------------------------

router.post('/scrape-website', adminAuth('destination_admin'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'url required' } });
    }

    const startedAt = Date.now();
    const result = await scrapeAndStore(destId, url, { respectRobots: true });

    res.json({
      success: true,
      data: {
        ...result,
        destination_id: destId,
        url,
        duration_ms: Date.now() - startedAt,
      },
    });
  } catch (err) {
    logger.error('[BrandSources] scrape-website error:', err.message);
    res.status(500).json({ success: false, error: { code: 'SCRAPE_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// GET / — list sources for destination
// -------------------------------------------------------------------

router.get('/', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }

    const [rows] = await mysqlSequelize.query(
      `SELECT id, destination_id, source_type, source_name, source_url,
              word_count, content_hash, is_active, last_scanned_at, created_at,
              LENGTH(content_text) AS content_length
       FROM brand_knowledge
       WHERE destination_id = :destId
       ORDER BY is_active DESC, last_scanned_at DESC, created_at DESC`,
      { replacements: { destId } }
    );

    const summary = {
      total: rows.length,
      active: rows.filter(r => r.is_active).length,
      inactive: rows.filter(r => !r.is_active).length,
      byType: rows.reduce((acc, r) => {
        acc[r.source_type] = (acc[r.source_type] || 0) + 1;
        return acc;
      }, {}),
      totalWords: rows.reduce((s, r) => s + (r.word_count || 0), 0),
    };

    res.json({ success: true, data: { sources: rows, summary } });
  } catch (err) {
    logger.error('[BrandSources] list error:', err.message);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// PUT /:id/toggle — toggle is_active
// -------------------------------------------------------------------

router.put('/:id/toggle', adminAuth('destination_admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } });
    }

    const [[row]] = await mysqlSequelize.query(
      'SELECT id, destination_id, is_active FROM brand_knowledge WHERE id = :id LIMIT 1',
      { replacements: { id } }
    );
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } });

    if (!isAuthorizedForDest(req, row.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this source' } });
    }

    const requested = req.body?.is_active;
    const newValue = (typeof requested === 'boolean')
      ? (requested ? 1 : 0)
      : (row.is_active ? 0 : 1);

    await mysqlSequelize.query(
      'UPDATE brand_knowledge SET is_active = :v WHERE id = :id',
      { replacements: { id, v: newValue } }
    );

    res.json({ success: true, data: { id, is_active: Boolean(newValue) } });
  } catch (err) {
    logger.error('[BrandSources] toggle error:', err.message);
    res.status(500).json({ success: false, error: { code: 'TOGGLE_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// DELETE /:id — soft-disable (is_active=0). Hard delete via admin SQL only.
// -------------------------------------------------------------------

router.delete('/:id', adminAuth('destination_admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } });
    }

    const [[row]] = await mysqlSequelize.query(
      'SELECT id, destination_id FROM brand_knowledge WHERE id = :id LIMIT 1',
      { replacements: { id } }
    );
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } });

    if (!isAuthorizedForDest(req, row.destination_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }

    // Hard delete (matching existing pattern in adminPortal.js DELETE /brand-profile/knowledge/:id)
    // is_active is reserved for temporary toggle. Real removal = DELETE.
    await mysqlSequelize.query(
      'DELETE FROM brand_knowledge WHERE id = :id',
      { replacements: { id } }
    );

    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    logger.error('[BrandSources] delete error:', err.message);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// GET /sitemap-check — helper to inspect site lastmod entries
// -------------------------------------------------------------------

router.get('/sitemap-check', adminAuth('editor'), async (req, res) => {
  try {
    const url = req.query?.url;
    if (!url) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'url query required' } });
    }
    const map = await fetchSitemapLastmod(url);
    const entries = Array.from(map.entries()).map(([u, d]) => ({
      url: u,
      lastmod: d ? d.toISOString() : null,
    }));
    res.json({ success: true, data: { entries, count: entries.length } });
  } catch (err) {
    logger.error('[BrandSources] sitemap-check error:', err.message);
    res.status(500).json({ success: false, error: { code: 'SITEMAP_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// GET /preview — dry-run scrape without storing (for admin testing)
// -------------------------------------------------------------------

router.get('/preview', adminAuth('destination_admin'), async (req, res) => {
  try {
    const url = req.query?.url;
    if (!url) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'url query required' } });
    }
    const r = await scrapeUrl(url, { respectRobots: true });
    res.json({
      success: true,
      data: {
        title: r.title,
        contentLength: r.contentLength,
        hash: r.hash,
        sourceUrl: r.sourceUrl,
        preview: r.markdown.substring(0, 1500),
      },
    });
  } catch (err) {
    logger.error('[BrandSources] preview error:', err.message);
    res.status(500).json({ success: false, error: { code: 'PREVIEW_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// POST /rebuild-embeddings — Layer 1+ activation (ChromaDB backfill)
// Runs inside PM2 process which has dotenv + heap. Use after migration or
// when brand_knowledge content is significantly changed.
// -------------------------------------------------------------------

router.post('/rebuild-embeddings', adminAuth('destination_admin'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const result = await _kbBackfill(destId);
    res.json({ success: true, data: { destination_id: destId, ...result } });
  } catch (err) {
    logger.error('[BrandSources] rebuild-embeddings error:', err.message);
    res.status(500).json({ success: false, error: { code: 'REBUILD_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// GET /ai-quality — D-4 dashboard data per destination
// -------------------------------------------------------------------

router.get('/ai-quality', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);

    const [[summary]] = await mysqlSequelize.query(
      `SELECT
         COUNT(*) AS total_generations,
         SUM(CASE WHEN validation_passed = 1 THEN 1 ELSE 0 END) AS passed_count,
         SUM(CASE WHEN validation_passed = 0 THEN 1 ELSE 0 END) AS failed_count,
         SUM(CASE WHEN soft_warning_shown = 1 THEN 1 ELSE 0 END) AS soft_warning_count,
         SUM(CASE WHEN has_internal_sources = 0 THEN 1 ELSE 0 END) AS no_kb_count,
         AVG(duration_ms) AS avg_duration_ms,
         AVG(internal_sources_count) AS avg_sources_used
       FROM ai_generation_log
       WHERE destination_id = :destId AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)`,
      { replacements: { destId, days } }
    );

    const [byOperation] = await mysqlSequelize.query(
      `SELECT operation, COUNT(*) AS count,
              SUM(CASE WHEN validation_passed = 1 THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN validation_passed = 0 THEN 1 ELSE 0 END) AS failed
       FROM ai_generation_log
       WHERE destination_id = :destId AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY operation`,
      { replacements: { destId, days } }
    );

    const [recentFailures] = await mysqlSequelize.query(
      `SELECT id, content_item_id, content_type, platform, operation, validation_reasons, created_at
       FROM ai_generation_log
       WHERE destination_id = :destId AND validation_passed = 0
       ORDER BY created_at DESC LIMIT 10`,
      { replacements: { destId } }
    );

    res.json({
      success: true,
      data: {
        destination_id: destId,
        period_days: days,
        summary: {
          total: Number(summary.total_generations || 0),
          passed: Number(summary.passed_count || 0),
          failed: Number(summary.failed_count || 0),
          soft_warning: Number(summary.soft_warning_count || 0),
          no_kb: Number(summary.no_kb_count || 0),
          avg_duration_ms: summary.avg_duration_ms ? Math.round(Number(summary.avg_duration_ms)) : null,
          avg_sources_used: summary.avg_sources_used ? Number(Number(summary.avg_sources_used).toFixed(2)) : 0,
          pass_rate: summary.total_generations > 0 && (Number(summary.passed_count) + Number(summary.failed_count)) > 0
            ? Number((Number(summary.passed_count) / (Number(summary.passed_count) + Number(summary.failed_count))).toFixed(3))
            : null,
        },
        by_operation: byOperation,
        recent_failures: recentFailures.map(f => {
          let parsed = null;
          try { parsed = f.validation_reasons ? (typeof f.validation_reasons === 'string' ? JSON.parse(f.validation_reasons) : f.validation_reasons) : null; } catch {}
          return { ...f, validation_reasons: parsed };
        }),
      },
    });
  } catch (err) {
    logger.error('[BrandSources] ai-quality error:', err.message);
    res.status(500).json({ success: false, error: { code: 'AI_QUALITY_ERROR', message: err.message } });
  }
});

export default router;
