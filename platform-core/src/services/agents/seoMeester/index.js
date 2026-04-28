/**
 * De SEO Meester Agent (#24) — SEO Analysis & Optimization
 * Weekly audit of content items: readability, keyword density, heading structure, internal links.
 * Integrates SISTRIX for visibility index and keyword rankings.
 *
 * Schedule: Monday 04:00 — content-seo-audit
 * @version 1.0.0
 */

import BaseAgent from '../base/BaseAgent.js';
import { analyzeContent } from './seoAnalyzer.js';
import { runSistrixAudit } from './sistrixClient.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class SeoMeesterAgent extends BaseAgent {
  constructor() {
    super({
      name: 'SEO Meester',
      version: '1.0.0',
      category: 'content',
      destinationAware: false, // SEO analysis is language-agnostic, runs platform-wide
    });
  }

  /**
   * Scheduled execution: audit all content items + SISTRIX visibility check
   */
  async execute() {
    const results = { audited: 0, avgScore: 0, sistrix: {}, errors: [] };

    try {
      // Step 1: Audit existing content items
      const [contentItems] = await mysqlSequelize.query(
        `SELECT ci.id, ci.destination_id, ci.title, ci.body_en, ci.content_type, ci.seo_data,
                cs.keyword_cluster
         FROM content_items ci
         LEFT JOIN content_suggestions cs ON ci.suggestion_id = cs.id
         WHERE ci.approval_status IN ('draft', 'pending_review', 'approved')
         ORDER BY ci.updated_at DESC
         LIMIT 100`
      );

      let totalScore = 0;
      for (const item of contentItems) {
        try {
          const keywordCluster = typeof item.keyword_cluster === 'string'
            ? JSON.parse(item.keyword_cluster)
            : item.keyword_cluster || [];

          const analysis = await analyzeContent(
            { ...item, keyword_cluster: keywordCluster },
            item.destination_id
          );

          // Update seo_data on the content item
          await mysqlSequelize.query(
            `UPDATE content_items SET seo_data = :seoData, updated_at = NOW() WHERE id = :id`,
            {
              replacements: {
                seoData: JSON.stringify({
                  ...analysis,
                  lastAudit: new Date().toISOString(),
                }),
                id: item.id,
              },
            }
          );

          totalScore += analysis.overallScore;
          results.audited++;
        } catch (err) {
          results.errors.push({ itemId: item.id, error: err.message });
        }
      }

      results.avgScore = results.audited > 0
        ? Math.round(totalScore / results.audited)
        : 0;

      // Step 2: SISTRIX visibility audit (all destinations)
      for (const destId of [1, 2, 4]) {
        try {
          results.sistrix[destId] = await runSistrixAudit(destId);
        } catch (err) {
          results.sistrix[destId] = { error: err.message };
        }
      }

      await logAgent('seo-meester', 'all', 'content-seo-audit', {
        audited: results.audited,
        avgScore: results.avgScore,
        sistrixDomains: Object.keys(results.sistrix).length,
      });
    } catch (error) {
      results.errors.push(error.message);
      await logError('seo-meester', error, { action: 'content-seo-audit', scope: 'all' });
    }

    return results;
  }

  /**
   * On-demand: analyze a single content item (used by admin API)
   * @param {string} platform - Optional social platform for platform-specific scoring
   */
  async analyzeItem(contentItem, destinationId, platform) {
    return analyzeContent(contentItem, destinationId, platform);
  }
}

const seoMeesterAgent = new SeoMeesterAgent();
export default seoMeesterAgent;
