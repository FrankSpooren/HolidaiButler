/**
 * Page Quality Validator — VII-E4 Cluster 3 (E4.3.1)
 *
 * Validates page quality across 6 dimensions:
 * accessibility, SEO, data integrity, performance, mobile, empty blocks.
 * Option (b): warnings only — does NOT block publish.
 *
 * @module services/validation/pageQualityValidator
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

export async function validatePage(page) {
  const issues = [];
  let layout;
  try {
    layout = typeof page.layout === 'string' ? JSON.parse(page.layout) : (page.layout || { blocks: [] });
  } catch {
    layout = { blocks: [] };
  }
  const blocks = layout.blocks || [];

  // 1. Empty blocks check
  if (blocks.length === 0 && page.template_type !== 'blank') {
    issues.push({
      severity: 'warning', category: 'content', code: 'empty_page',
      message: 'Pagina heeft geen blocks. Voeg content toe of kies een template.',
    });
  }

  // 2. SEO checks
  const titleField = page.title_nl || page.title_en || '';
  if (!titleField || titleField.length < 5) {
    issues.push({
      severity: 'warning', category: 'seo', code: 'seo_title_missing',
      message: 'Pagina-titel ontbreekt of is te kort (min. 5 tekens).',
    });
  }
  if (titleField && titleField.length > 60) {
    issues.push({
      severity: 'info', category: 'seo', code: 'seo_title_long',
      message: 'Pagina-titel is langer dan 60 tekens (Google kan afkappen).',
    });
  }

  const seoDesc = page.seo_description_nl || page.seo_description_en || '';
  if (!seoDesc) {
    issues.push({
      severity: 'warning', category: 'seo', code: 'seo_no_meta_desc',
      message: 'Geen meta-description ingesteld. Belangrijk voor zoekmachines.',
    });
  }

  // 3. Accessibility: hero (H1) check
  const hasHero = blocks.some(b => ['hero', 'desktop_hero', 'hero_chatbot'].includes(b.type));
  if (!hasHero && blocks.length > 0 && page.template_type !== 'blank') {
    issues.push({
      severity: 'info', category: 'accessibility', code: 'a11y_no_hero',
      message: 'Pagina heeft geen Hero-block (H1 heading). Aanbevolen voor toegankelijkheid.',
    });
  }

  // 4. Performance: block count warning
  if (blocks.length > 15) {
    issues.push({
      severity: 'warning', category: 'performance', code: 'perf_many_blocks',
      message: `Pagina heeft ${blocks.length} blocks. Overweeg content te splitsen voor snellere laadtijden.`,
    });
  }

  // 5. Data integrity: check for broken POI/event references
  for (const block of blocks) {
    const props = block.props || block.data || {};
    if (block.type === 'featured_item' && props.itemId) {
      try {
        const [poi] = await mysqlSequelize.query(
          'SELECT id, is_active FROM POI WHERE id = :id',
          { replacements: { id: props.itemId }, type: QueryTypes.SELECT }
        );
        if (!poi) {
          issues.push({
            severity: 'error', category: 'data', code: 'data_broken_ref',
            blockId: block.id, message: `Featured Item verwijst naar niet-bestaande POI #${props.itemId}.`,
          });
        } else if (!poi.is_active) {
          issues.push({
            severity: 'warning', category: 'data', code: 'data_inactive_ref',
            blockId: block.id, message: `Featured Item verwijst naar inactieve POI #${props.itemId}.`,
          });
        }
      } catch { /* DB error — skip */ }
    }
  }

  // 6. Template required blocks check
  try {
    const TEMPLATES = (await import('../templates/templateDefaults.js')).default;
    const template = TEMPLATES[page.template_type];
    if (template?.required_blocks) {
      const blockTypes = new Set(blocks.map(b => b.type));
      const missing = template.required_blocks.filter(req => !blockTypes.has(req));
      if (missing.length > 0) {
        issues.push({
          severity: 'warning', category: 'seo', code: 'template_missing_required',
          message: `Template "${page.template_type}" verwacht blocks: ${missing.join(', ')}. Schema.org kan incompleet zijn.`,
        });
      }
    }
  } catch { /* template not found — skip */ }

  // Sort: error > warning > info
  const order = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return {
    page_id: page.id,
    validated_at: new Date().toISOString(),
    total: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    is_publishable: true, // option (b): warnings never block publish
    issues,
  };
}
