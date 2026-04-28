import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import mongoose from 'mongoose';

class OnthalerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Onthaler', version: '2.0.0', category: 'operations', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const db = mongoose.connection.db;
    const checks = [];

    // 1. POI count
    const [poi] = await mysqlSequelize.query('SELECT COUNT(*) as c FROM POI WHERE destination_id = :id AND is_active = 1', { replacements: { id: destinationId }, type: QueryTypes.SELECT });
    checks.push({ check: 'active_pois', value: poi?.c || 0, required: 10, ok: (poi?.c || 0) >= 10 });

    // 2. Content (enriched)
    const [enriched] = await mysqlSequelize.query("SELECT COUNT(*) as c FROM POI WHERE destination_id = :id AND is_active = 1 AND enriched_detail_description IS NOT NULL AND enriched_detail_description != ''", { replacements: { id: destinationId }, type: QueryTypes.SELECT });
    checks.push({ check: 'enriched_pois', value: enriched?.c || 0, required: 10, ok: (enriched?.c || 0) >= 10 });

    // 3. Translations (NL+DE+ES)
    for (const lang of ['nl', 'de', 'es']) {
      const col = `enriched_detail_description_${lang}`;
      const [tr] = await mysqlSequelize.query(`SELECT COUNT(*) as c FROM POI WHERE destination_id = :id AND is_active = 1 AND ${col} IS NOT NULL AND ${col} != ''`, { replacements: { id: destinationId }, type: QueryTypes.SELECT });
      checks.push({ check: `translation_${lang}`, value: tr?.c || 0, required: 10, ok: (tr?.c || 0) >= 10 });
    }

    // 4. Images
    const [imgs] = await mysqlSequelize.query('SELECT COUNT(DISTINCT i.poi_id) as c FROM imageurls i JOIN POI p ON p.id = i.poi_id WHERE p.destination_id = :id AND p.is_active = 1', { replacements: { id: destinationId }, type: QueryTypes.SELECT });
    checks.push({ check: 'pois_with_images', value: imgs?.c || 0, required: 10, ok: (imgs?.c || 0) >= 10 });

    // 5. Pages
    const [pages] = await mysqlSequelize.query('SELECT COUNT(*) as c FROM pages WHERE destination_id = :id', { replacements: { id: destinationId }, type: QueryTypes.SELECT }).catch(() => [{ c: 0 }]);
    checks.push({ check: 'pages', value: pages?.c || 0, required: 1, ok: (pages?.c || 0) >= 1 });

    // 6. ChromaDB collection per destination
    const destCodes = { 1: 'calpe_pois', 2: 'texel_pois', 4: 'warrewijzer_pois' };
    const expectedCollection = destCodes[destinationId];
    const chromaSnapshot = await db.collection('chromadb_state_snapshots').findOne({}, { sort: { timestamp: -1 } });
    const chromaCollections = chromaSnapshot?.collections || {};
    const chromaCount = expectedCollection ? (chromaCollections[expectedCollection] || 0) : 0;
    const hasChroma = chromaCount > 0;
    checks.push({ check: 'chromadb_vectors', value: hasChroma ? chromaCount : 'missing', required: '>0', ok: hasChroma });

    // 7. Reviews
    const [reviews] = await mysqlSequelize.query('SELECT COUNT(*) as c FROM reviews WHERE destination_id = :id', { replacements: { id: destinationId }, type: QueryTypes.SELECT }).catch(() => [{ c: 0 }]);
    checks.push({ check: 'reviews', value: reviews?.c || 0, required: 0, ok: true });

    const passed = checks.filter(c => c.ok).length;
    const total = checks.length;
    const completeness = Math.round(passed / total * 100);
    const allOk = checks.every(c => c.ok);

    const result = { destination_id: destinationId, checks, passed, total, completeness, all_ok: allOk };

    const issues = [];
    if (!allOk) {
      const failing = checks.filter(c => !c.ok).map(c => c.check).join(', ');
      issues.push({ severity: completeness < 50 ? 'high' : 'medium', category: 'configuration',
        title: `Tenant ${destinationId} completeness ${completeness}%: missing ${failing}` });
    }

    await logAgent('onthaler', 'tenant_health', { agentId: 'onthaler',
      description: `Tenant ${destinationId}: ${passed}/${total} checks passed (${completeness}%)`,
      status: 'completed', metadata: result });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'onthaler', agentLabel: 'De Onthaler',
        severity: issue.severity, category: issue.category, title: issue.title, details: result,
        fingerprint: `onthaler-${destinationId}-completeness` });
    }
    return result;
  }
}
export default new OnthalerAgent();
