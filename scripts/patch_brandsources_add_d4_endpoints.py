#!/usr/bin/env python3
"""
Add two endpoints to brandSources.js:
- POST /rebuild-embeddings — Layer 1+ activation (ChromaDB backfill in PM2 process)
- GET /ai-quality — Layer D-4 dashboard data

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/routes/brandSources.js')

# Insert new imports at top + endpoints before "export default router;"
ANCHOR_IMPORTS = "import { scrapeAndStore, scrapeUrl, fetchSitemapLastmod } from '../services/websiteScraperService.js';"
REPLACE_IMPORTS = """import { scrapeAndStore, scrapeUrl, fetchSitemapLastmod } from '../services/websiteScraperService.js';
import { backfillDestination as _kbBackfill, embedAndStore as _kbEmbed } from '../services/brandKnowledgeSearch.js';"""

ANCHOR_EXPORT = "export default router;"

NEW_ENDPOINTS = '''// -------------------------------------------------------------------
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

'''

REPLACE_EXPORT = NEW_ENDPOINTS + ANCHOR_EXPORT


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found")
        return 2
    content = PATH.read_text(encoding='utf-8')

    if "_kbBackfill" in content and "ai-quality" in content:
        print("Already patched.")
        return 0

    if ANCHOR_IMPORTS not in content:
        print(f"FAIL: anchor imports not found")
        return 3
    if ANCHOR_EXPORT not in content:
        print(f"FAIL: anchor export not found")
        return 4

    new_content = content.replace(ANCHOR_IMPORTS, REPLACE_IMPORTS, 1)
    new_content = new_content.replace(ANCHOR_EXPORT, REPLACE_EXPORT, 1)

    backup = PATH.with_suffix('.js.bak.d4')
    backup.write_text(content, encoding='utf-8')
    PATH.write_text(new_content, encoding='utf-8')
    print(f"Patched: {PATH}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
