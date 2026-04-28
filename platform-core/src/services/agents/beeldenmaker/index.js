import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import costTracker from '../../orchestrator/costController/costTracker.js';

const PIXTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const DAILY_BUDGET_EUR = 1.00;
const COST_PER_IMAGE = 0.001;

class BeeldenmakerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Beeldenmaker', version: '2.0.0', category: 'content', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const startTime = Date.now();

    // 1. Coverage audit
    const [stats] = await mysqlSequelize.query(`
      SELECT COUNT(DISTINCT p.id) as poi_count, COUNT(i.id) as image_count,
        SUM(CASE WHEN i.local_path IS NOT NULL THEN 1 ELSE 0 END) as local_images,
        SUM(CASE WHEN i.keywords_visual IS NOT NULL AND i.keywords_visual != '' THEN 1 ELSE 0 END) as with_keywords
      FROM POI p LEFT JOIN imageurls i ON i.poi_id = p.id
      WHERE p.destination_id = :destId AND p.is_active = 1
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    const [noimages] = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM POI p
      WHERE p.destination_id = :destId AND p.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM imageurls i WHERE i.poi_id = p.id)
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 2. Pixtral keyword enrichment batch (budget-controlled)
    let processed = 0, errors = 0, costEur = 0;
    const apiKey = process.env.MISTRAL_API_KEY;
    const visionModel = process.env.MISTRAL_VISION_MODEL || 'pixtral-12b-2409';

    if (apiKey) {
      const unprocessed = await mysqlSequelize.query(`
        SELECT i.id, i.image_url, i.local_path FROM imageurls i
        JOIN POI p ON p.id = i.poi_id
        WHERE p.destination_id = :destId AND p.is_active = 1
          AND (i.keywords_visual IS NULL OR i.keywords_visual = '')
          AND i.image_url IS NOT NULL
        ORDER BY i.id ASC LIMIT 50
      `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

      for (const img of unprocessed) {
        if (costEur >= DAILY_BUDGET_EUR) break;
        const imageUrl = img.local_path ? `${process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com'}${img.local_path}` : img.image_url;

        try {
          const res = await fetch(PIXTRAL_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: visionModel,
              messages: [{ role: 'user', content: [
                { type: 'text', text: 'List 5-10 visual keywords and a 1-sentence description. JSON only: {"keywords":["..."], "description":"..."}' },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]}],
              max_tokens: 200, temperature: 0, response_format: { type: 'json_object' }
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!res.ok) { errors++; continue; }
          const data = await res.json();
          const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');

          if (content.keywords?.length > 0) {
            await mysqlSequelize.query(`
              UPDATE imageurls SET keywords_visual = :kw, pixtral_processed_at = NOW() WHERE id = :id
            `, { replacements: { kw: content.keywords.join(', '), id: img.id } });
            processed++;
            costEur += COST_PER_IMAGE;
            await costTracker.logCost('mistral', 'pixtral-image', COST_PER_IMAGE, { agent: 'beeldenmaker' });
          }
          await new Promise(r => setTimeout(r, 200)); // rate limit
        } catch (err) {
          errors++;
          console.warn(`[beeldenmaker] Image ${img.id} failed:`, err.message);
        }
      }
    }

    const keywordCoverage = stats.image_count > 0 ? Math.round((stats.with_keywords + processed) / stats.image_count * 1000) / 10 : 0;
    const result = {
      destination_id: destinationId, poi_count: stats.poi_count, total_images: stats.image_count,
      local_images: stats.local_images, with_keywords: (stats.with_keywords || 0) + processed,
      keyword_coverage: keywordCoverage, pois_without_images: noimages.count,
      pixtral: { processed, errors, cost_eur: Math.round(costEur * 1000) / 1000 }
    };

    const issues = [];
    if (noimages.count > 20) issues.push({ severity: 'medium', category: 'other', title: `${noimages.count} POIs zonder afbeeldingen` });
    if (keywordCoverage < 50 && stats.image_count > 100) issues.push({ severity: 'low', category: 'other', title: `Keyword coverage ${keywordCoverage}% (<50%)` });
    if (errors > processed * 0.1 && errors > 3) issues.push({ severity: 'medium', category: 'other', title: `Pixtral error rate ${Math.round(errors/(processed+errors)*100)}%` });

    await logAgent('beeldenmaker', 'image_enrichment', { agentId: 'beeldenmaker',
      description: `Images: ${stats.image_count} total, ${processed} enriched, ${errors} errors, coverage ${keywordCoverage}%, cost €${costEur.toFixed(3)}`,
      status: 'completed', metadata: { ...result, durationMs: Date.now() - startTime } });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'beeldenmaker', agentLabel: 'De Beeldenmaker',
        severity: issue.severity, category: issue.category, title: issue.title, details: result,
        fingerprint: `beeldenmaker-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }
}
export default new BeeldenmakerAgent();
