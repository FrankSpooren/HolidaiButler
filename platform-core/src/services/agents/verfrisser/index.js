import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * De Verfrisser — Content Freshness Agent (Fase 6 P2)
 * Detecteert verouderde POI content en Apify sync gaps.
 * Schedule: Weekly Mon 02:00 | Type: A (destination-aware)
 */
class VerfrisserAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Verfrisser', version: '1.0.0', category: 'content', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const startTime = Date.now();

    // 1. POIs met verouderde Apify data (>90 dagen)
    const staleApify = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM POI
      WHERE destination_id = :destId AND is_active = 1
        AND (last_apify_sync IS NULL OR last_apify_sync < DATE_SUB(NOW(), INTERVAL 90 DAY))
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 2. POIs zonder enriched content
    const noContent = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM POI
      WHERE destination_id = :destId AND is_active = 1
        AND (enriched_detail_description IS NULL OR enriched_detail_description = '')
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 3. POIs met ontbrekende vertalingen
    const missingTranslations = await mysqlSequelize.query(`
      SELECT
        SUM(CASE WHEN enriched_detail_description_nl IS NULL OR enriched_detail_description_nl = '' THEN 1 ELSE 0 END) as missing_nl,
        SUM(CASE WHEN enriched_detail_description_de IS NULL OR enriched_detail_description_de = '' THEN 1 ELSE 0 END) as missing_de,
        SUM(CASE WHEN enriched_detail_description_es IS NULL OR enriched_detail_description_es = '' THEN 1 ELSE 0 END) as missing_es,
        COUNT(*) as total
      FROM POI
      WHERE destination_id = :destId AND is_active = 1
        AND enriched_detail_description IS NOT NULL AND enriched_detail_description != ''
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    // 4. Totaal actieve POIs
    const totalActive = await mysqlSequelize.query(`
      SELECT COUNT(*) as count FROM POI WHERE destination_id = :destId AND is_active = 1
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    const total = totalActive[0]?.count || 0;
    const stale = staleApify[0]?.count || 0;
    const empty = noContent[0]?.count || 0;
    const trans = missingTranslations[0] || {};
    const stalePercent = total > 0 ? (stale / total * 100) : 0;

    const result = {
      destination_id: destinationId,
      total_active: total,
      stale_apify: stale,
      stale_percent: Math.round(stalePercent * 10) / 10,
      no_content: empty,
      missing_nl: trans.missing_nl || 0,
      missing_de: trans.missing_de || 0,
      missing_es: trans.missing_es || 0
    };

    // Issues
    const issues = [];
    if (stalePercent > 30) {
      issues.push({ severity: 'medium', category: 'other', title: `${stale} POIs (${stalePercent.toFixed(1)}%) hebben verouderde Apify data (>90d)` });
    }
    if (empty > 10) {
      issues.push({ severity: 'medium', category: 'other', title: `${empty} actieve POIs zonder enriched content` });
    }

    // Log
    await logAgent('verfrisser', 'freshness_check', {
      agentId: 'verfrisser',
      description: `Freshness: ${total} POIs, ${stale} stale (${stalePercent.toFixed(1)}%), ${empty} empty, NL:${trans.missing_nl}/DE:${trans.missing_de}/ES:${trans.missing_es} missing`,
      status: 'completed',
      metadata: { ...result, destinationId }
    });

    for (const issue of issues) {
      await raiseIssue({
        agentName: 'verfrisser', agentLabel: 'De Verfrisser',
        severity: issue.severity, category: issue.category,
        title: issue.title, details: result,
        fingerprint: `verfrisser-${destinationId}-${issue.title.substring(0, 20)}`
      });
    }

    return result;
  }
}

export default new VerfrisserAgent();
