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
import fs from 'fs';
import path from 'path';
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



// -------------------------------------------------------------------
// v4.94-v4.95 Blok 6.2: AI Quality Dashboard endpoints
// -------------------------------------------------------------------

/**
 * GET /ai-quality/trend?days=30|90 — daily trend van pass-rate +
 * hallucination-rate over tijd. Per dag: passed, failed, soft_warning,
 * total. Voor grafiek-rendering in dashboard.
 */
router.get('/ai-quality/trend', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);

    const [trend] = await mysqlSequelize.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS total,
         SUM(CASE WHEN validation_passed = 1 THEN 1 ELSE 0 END) AS passed,
         SUM(CASE WHEN validation_passed = 0 THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN soft_warning_shown = 1 THEN 1 ELSE 0 END) AS soft_warning,
         AVG(duration_ms) AS avg_duration_ms,
         AVG(internal_sources_count) AS avg_sources
       FROM ai_generation_log
       WHERE destination_id = :destId
         AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      { replacements: { destId, days } }
    );

    const series = trend.map(r => {
      const total = Number(r.total || 0);
      const passed = Number(r.passed || 0);
      const failed = Number(r.failed || 0);
      const validated = passed + failed;
      return {
        date: r.date,
        total,
        passed,
        failed,
        soft_warning: Number(r.soft_warning || 0),
        pass_rate: validated > 0 ? Number((passed / validated).toFixed(3)) : null,
        hallucination_rate: validated > 0 ? Number((failed / validated).toFixed(3)) : null,
        avg_duration_ms: r.avg_duration_ms ? Math.round(Number(r.avg_duration_ms)) : null,
        avg_sources: r.avg_sources ? Number(Number(r.avg_sources).toFixed(2)) : 0,
      };
    });

    res.json({ success: true, data: { destination_id: destId, period_days: days, series } });
  } catch (err) {
    logger.error('[BrandSources] ai-quality/trend error:', err.message);
    res.status(500).json({ success: false, error: { code: 'TREND_ERROR', message: err.message } });
  }
});

/**
 * GET /ai-quality/top-entities?days=30 — meest voorkomende ungrounded entities
 * (uit validation_reasons.ungrounded_entities). Frequentie-ranked top-N.
 */
router.get('/ai-quality/top-entities', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);
    const limit = Math.min(Math.max(Number(req.query?.limit || 10), 1), 100);

    const [rows] = await mysqlSequelize.query(
      `SELECT validation_reasons FROM ai_generation_log
       WHERE destination_id = :destId
         AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
         AND validation_passed = 0
         AND validation_reasons IS NOT NULL`,
      { replacements: { destId, days } }
    );

    const tally = new Map();
    for (const r of rows) {
      let parsed = null;
      try { parsed = typeof r.validation_reasons === 'string' ? JSON.parse(r.validation_reasons) : r.validation_reasons; } catch {}
      const entities = parsed?.ungrounded_entities || [];
      if (!Array.isArray(entities)) continue;
      for (const e of entities) {
        const key = String(e).toLowerCase().trim();
        if (!key || key.length < 2) continue;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }
    const sorted = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([entity, count]) => ({ entity, count }));

    res.json({ success: true, data: { destination_id: destId, period_days: days, total_failed_rows: rows.length, top_entities: sorted } });
  } catch (err) {
    logger.error('[BrandSources] ai-quality/top-entities error:', err.message);
    res.status(500).json({ success: false, error: { code: 'TOP_ENTITIES_ERROR', message: err.message } });
  }
});

/**
 * GET /ai-quality/retry-stats?days=30 — retry-rate metrics uit validation_reasons.retries
 */
router.get('/ai-quality/retry-stats', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);

    const [rows] = await mysqlSequelize.query(
      `SELECT validation_reasons, validation_passed FROM ai_generation_log
       WHERE destination_id = :destId
         AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
         AND validation_reasons IS NOT NULL`,
      { replacements: { destId, days } }
    );

    let total = 0, withRetry = 0, retryPassed = 0, sumRetries = 0;
    const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const r of rows) {
      total += 1;
      let parsed = null;
      try { parsed = typeof r.validation_reasons === 'string' ? JSON.parse(r.validation_reasons) : r.validation_reasons; } catch {}
      const retries = Number(parsed?.retries || 0);
      sumRetries += retries;
      if (retries > 0) {
        withRetry += 1;
        if (r.validation_passed === 1) retryPassed += 1;
      }
      const bucket = Math.min(retries, 3);
      dist[bucket] = (dist[bucket] || 0) + 1;
    }

    res.json({ success: true, data: {
      destination_id: destId,
      period_days: days,
      total_logs: total,
      with_retry: withRetry,
      retry_rate: total > 0 ? Number((withRetry / total).toFixed(3)) : 0,
      retry_success_rate: withRetry > 0 ? Number((retryPassed / withRetry).toFixed(3)) : null,
      avg_retries: total > 0 ? Number((sumRetries / total).toFixed(2)) : 0,
      retry_distribution: dist,
    } });
  } catch (err) {
    logger.error('[BrandSources] ai-quality/retry-stats error:', err.message);
    res.status(500).json({ success: false, error: { code: 'RETRY_STATS_ERROR', message: err.message } });
  }
});

/**
 * GET /ai-quality/export.csv?days=30 — CSV export per destination
 * Bevat: id, content_item_id, operation, model, validation_passed, sources_count,
 *        duration_ms, retries, hallucination_rate, ungrounded_entities, created_at
 */
router.get('/ai-quality/export.csv', adminAuth('editor'), async (req, res) => {
  try {
    const destId = getDestId(req);
    if (!isAuthorizedForDest(req, destId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this destination' } });
    }
    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 365);

    const [rows] = await mysqlSequelize.query(
      `SELECT id, content_item_id, operation, model, validation_passed,
              internal_sources_count, has_internal_sources, soft_warning_shown,
              duration_ms, status, validation_reasons, created_at
       FROM ai_generation_log
       WHERE destination_id = :destId
         AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
       ORDER BY created_at DESC`,
      { replacements: { destId, days } }
    );

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? '"' + s + '"' : s;
    };
    const headers = [
      'id', 'created_at', 'content_item_id', 'operation', 'model',
      'validation_passed', 'sources_count', 'has_internal_sources',
      'soft_warning', 'duration_ms', 'status', 'retries',
      'hallucination_rate', 'ungrounded_entities',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      let parsed = null;
      try { parsed = typeof r.validation_reasons === 'string' ? JSON.parse(r.validation_reasons) : r.validation_reasons; } catch {}
      const ungrounded = Array.isArray(parsed?.ungrounded_entities) ? parsed.ungrounded_entities.join('|') : '';
      const cols = [
        r.id, r.created_at, r.content_item_id, r.operation, r.model,
        r.validation_passed === null ? '' : (r.validation_passed ? 1 : 0),
        r.internal_sources_count, r.has_internal_sources, r.soft_warning_shown,
        r.duration_ms, r.status, parsed?.retries || 0,
        parsed?.hallucination_rate || 0, ungrounded,
      ].map(escape);
      lines.push(cols.join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ai-quality-dest${destId}-${days}d-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    logger.error('[BrandSources] ai-quality/export.csv error:', err.message);
    res.status(500).json({ success: false, error: { code: 'CSV_EXPORT_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------------
// File-serving helpers (path traversal hardening + MIME whitelist)
// -------------------------------------------------------------------

const KNOWLEDGE_DIR = path.join(
  process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage',
  'knowledge'
);

const MIME_BY_EXT = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.txt':  'text/plain; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
};

function safeExtension(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(MIME_BY_EXT, ext) ? ext : null;
}

function serveKnowledgeFile(res, row, opts = {}) {
  const disposition = opts.disposition || 'attachment';
  // Path traversal hardening: only basename + whitelisted extension
  const basename = path.basename(row.file_path || '');
  const ext = safeExtension(basename);
  if (!ext) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'Unsupported file type' } });
  }
  const absPath = path.join(KNOWLEDGE_DIR, basename);
  // Defense in depth — verify resolved path stays inside KNOWLEDGE_DIR
  if (!absPath.startsWith(KNOWLEDGE_DIR + path.sep)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
  }
  if (!fs.existsSync(absPath)) {
    logger.warn(`[BrandSources] file missing on disk for source ${row.id}: ${absPath}`);
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
  }
  // Audit log (GDPR Art. 30) — every access to a brand document is recorded
  logger.info(`[BrandSources] file_access source=${row.id} dest=${row.destination_id} disposition=${disposition}`);
  // Sanitize download filename: alphanumeric + . - _ only
  const downloadName = (row.source_name || `source-${row.id}${ext}`).replace(/[^\w.\-]/g, '_');
  res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
  return fs.createReadStream(absPath).pipe(res);
}

// -------------------------------------------------------------------
// GET /:id/download — Forced download (destination_admin)
// -------------------------------------------------------------------

router.get('/:id/download', adminAuth('destination_admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
    }
    const [[row]] = await mysqlSequelize.query(
      'SELECT id, destination_id, source_type, source_name, file_path FROM brand_knowledge WHERE id = :id LIMIT 1',
      { replacements: { id } }
    );
    // Cross-tenant + not-found return same 404 (anti-enumeration)
    if (!row || !isAuthorizedForDest(req, row.destination_id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
    }
    if (row.source_type !== 'document' || !row.file_path) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'This source has no downloadable file' } });
    }
    return serveKnowledgeFile(res, row, { disposition: 'attachment' });
  } catch (err) {
    logger.error('[BrandSources] download error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message: 'Internal error' } });
  }
});

// -------------------------------------------------------------------
// GET /:id/preview — Inline preview (editor) — PDF via browser viewer,
// non-documents return JSON excerpt for <pre> rendering
// -------------------------------------------------------------------

router.get('/:id/preview', adminAuth('editor'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
    }
    const [[row]] = await mysqlSequelize.query(
      `SELECT id, destination_id, source_type, source_name, source_url, content_text, file_path, word_count
       FROM brand_knowledge WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );
    if (!row || !isAuthorizedForDest(req, row.destination_id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Knowledge source not found' } });
    }
    // Non-document types (url, text, website_scrape, mistral_websearch): return text excerpt as JSON
    if (row.source_type !== 'document' || !row.file_path) {
      logger.info(`[BrandSources] preview_excerpt source=${row.id} dest=${row.destination_id} type=${row.source_type}`);
      return res.json({
        success: true,
        data: {
          id: row.id,
          source_type: row.source_type,
          source_name: row.source_name,
          source_url: row.source_url || null,
          word_count: row.word_count,
          content_excerpt: (row.content_text || '').substring(0, 5000),
          inline_pdf: false,
        },
      });
    }
    // Document types: try inline PDF; for DOCX/TXT/CSV fall back to JSON excerpt
    const basename = path.basename(row.file_path || '');
    const ext = safeExtension(basename);
    if (ext === '.pdf') {
      return serveKnowledgeFile(res, row, { disposition: 'inline' });
    }
    // DOCX/TXT/CSV — parsed content_text is the truth source; return as JSON
    logger.info(`[BrandSources] preview_excerpt source=${row.id} dest=${row.destination_id} type=document_${ext}`);
    return res.json({
      success: true,
      data: {
        id: row.id,
        source_type: row.source_type,
        source_name: row.source_name,
        source_url: null,
        word_count: row.word_count,
        content_excerpt: (row.content_text || '').substring(0, 5000),
        inline_pdf: false,
        download_required: true,  // hint to UI: full content only via download
      },
    });
  } catch (err) {
    logger.error('[BrandSources] preview error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'PREVIEW_ERROR', message: 'Internal error' } });
  }
});

export default router;
