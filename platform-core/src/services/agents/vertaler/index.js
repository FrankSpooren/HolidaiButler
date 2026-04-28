import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class VertalerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Vertaler', version: '1.0.0', category: 'content', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const LANGS = ['nl', 'de', 'es'];
    const result = { destination_id: destinationId, checked: 0, missing: {}, coverage: {} };

    // Check translation coverage per language
    for (const lang of LANGS) {
      const col = `enriched_detail_description_${lang}`;
      const [stats] = await mysqlSequelize.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ${col} IS NOT NULL AND ${col} != '' THEN 1 ELSE 0 END) as translated
        FROM POI WHERE destination_id = :destId AND is_active = 1
          AND enriched_detail_description IS NOT NULL AND enriched_detail_description != ''
      `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

      const total = stats?.total || 0;
      const translated = stats?.translated || 0;
      const pct = total > 0 ? Math.round(translated / total * 1000) / 10 : 0;
      result.coverage[lang] = { total, translated, percent: pct };
      result.missing[lang] = total - translated;
      result.checked += total;
    }

    // Check content_items translations
    const [ciStats] = await mysqlSequelize.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN body_nl IS NULL OR body_nl = '' THEN 1 ELSE 0 END) as missing_nl,
        SUM(CASE WHEN body_de IS NULL OR body_de = '' THEN 1 ELSE 0 END) as missing_de,
        SUM(CASE WHEN body_es IS NULL OR body_es = '' THEN 1 ELSE 0 END) as missing_es
      FROM content_items WHERE destination_id = :destId AND body_en IS NOT NULL AND body_en != ''
    `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });

    result.content_items = {
      total: ciStats?.total || 0,
      missing_nl: ciStats?.missing_nl || 0,
      missing_de: ciStats?.missing_de || 0,
      missing_es: ciStats?.missing_es || 0
    };

    // Issues
    const issues = [];
    for (const lang of LANGS) {
      if (result.coverage[lang].percent < 90 && result.coverage[lang].total > 50) {
        issues.push({
          severity: 'medium', category: 'other',
          title: `POI ${lang.toUpperCase()} translation coverage ${result.coverage[lang].percent}% (<90%)`
        });
      }
    }

    await logAgent('vertaler', 'translation_check', {
      agentId: 'vertaler',
      description: `Translation: NL ${result.coverage.nl?.percent}% DE ${result.coverage.de?.percent}% ES ${result.coverage.es?.percent}%`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'vertaler', agentLabel: 'De Vertaler',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `vertaler-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }
}
export default new VertalerAgent();
