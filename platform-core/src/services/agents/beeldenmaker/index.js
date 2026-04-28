import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';

class BeeldenmakerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Beeldenmaker', version: '1.0.0', category: 'content', destinationAware: true });
  }

  async runForDestination(destinationId) {
    // Image coverage audit (zonder Pixtral processing — dat is een aparte batch)
    const [stats] = await mysqlSequelize.query(`
      SELECT
        COUNT(DISTINCT p.id) as poi_count,
        COUNT(i.id) as image_count,
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

    const result = {
      destination_id: destinationId,
      poi_count: stats?.poi_count || 0,
      total_images: stats?.image_count || 0,
      local_images: stats?.local_images || 0,
      with_keywords: stats?.with_keywords || 0,
      keyword_coverage: stats?.image_count > 0 ? Math.round(stats.with_keywords / stats.image_count * 1000) / 10 : 0,
      pois_without_images: noimages?.count || 0,
      avg_images_per_poi: stats?.poi_count > 0 ? Math.round(stats.image_count / stats.poi_count * 10) / 10 : 0
    };

    const issues = [];
    if (result.pois_without_images > 20) {
      issues.push({ severity: 'medium', category: 'other',
        title: `${result.pois_without_images} POIs zonder afbeeldingen` });
    }

    await logAgent('beeldenmaker', 'image_audit', {
      agentId: 'beeldenmaker',
      description: `Images: ${result.total_images} total, ${result.local_images} local, ${result.pois_without_images} POIs without images, keywords ${result.keyword_coverage}%`,
      status: 'completed', metadata: result
    });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'beeldenmaker', agentLabel: 'De Beeldenmaker',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `beeldenmaker-${destinationId}-${issue.title.substring(0, 20)}` });
    }
    return result;
  }
}
export default new BeeldenmakerAgent();
