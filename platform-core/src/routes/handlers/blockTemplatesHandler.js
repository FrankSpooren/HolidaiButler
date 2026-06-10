/**
 * Block Templates Handler
 *
 * GET    /admin-portal/page-builder/templates?destinationId=X&blockType=Y
 * POST   /admin-portal/page-builder/templates                (save block as template)
 * DELETE /admin-portal/page-builder/templates/:id
 * POST   /admin-portal/page-builder/templates/:id/use        (insert tracker)
 *
 * @version BLOK F6 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';

export async function listTemplates(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const blockType = req.query.blockType ? String(req.query.blockType) : null;
  const includeGlobal = req.query.includeGlobal !== 'false';

  try {
    const where = [];
    const replacements = {};
    if (destId) {
      const scope = includeGlobal ? `(destination_id = :destId OR is_global = 1)` : `destination_id = :destId`;
      where.push(scope);
      replacements.destId = destId;
    } else if (includeGlobal) {
      where.push('is_global = 1');
    }
    if (blockType) {
      where.push('block_type = :blockType');
      replacements.blockType = blockType;
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [items] = await mysqlSequelize.query(
      `SELECT id, destination_id, name, description, block_type, block_payload, thumbnail,
              is_global, category, use_count, last_used_at, created_at
         FROM page_builder_templates
         ${whereClause}
         ORDER BY is_global DESC, use_count DESC, created_at DESC`,
      { replacements }
    );

    const parsed = (items || []).map(t => ({
      ...t,
      block_payload: (() => {
        try { return typeof t.block_payload === 'string' ? JSON.parse(t.block_payload) : t.block_payload; }
        catch { return null; }
      })(),
    }));

    return res.json({ success: true, data: { items: parsed, total: parsed.length } });
  } catch (error) {
    logger.error('[block-templates] list error:', error);
    return res.status(500).json({ success: false, error: { code: 'TEMPLATES_LIST_ERROR', message: error.message } });
  }
}

export async function createTemplate(req, res) {
  const { destinationId, name, description, block, isGlobal, category } = req.body || {};
  if (!block || !block.type) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_BLOCK', message: 'block with type required' } });
  }
  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'name required' } });
  }
  const destId = isGlobal ? null : Number(destinationId || 0);
  if (!isGlobal && !destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required (or set isGlobal=true)' } });
  }

  try {
    // Strip _updatedAt of andere ephemeral fields uit block
    const clone = JSON.parse(JSON.stringify(block));
    delete clone.id; // genereer nieuwe id bij insert
    delete clone._updatedAt;

    const [result] = await mysqlSequelize.query(
      `INSERT INTO page_builder_templates
        (destination_id, name, description, block_type, block_payload, is_global, category, created_by)
       VALUES (:destId, :name, :desc, :blockType, :payload, :isGlobal, :category, :createdBy)`,
      { replacements: {
        destId,
        name: String(name).slice(0, 255),
        desc: description ? String(description).slice(0, 1000) : null,
        blockType: block.type,
        payload: JSON.stringify(clone),
        isGlobal: isGlobal ? 1 : 0,
        category: category || 'content',
        createdBy: req.adminUser?.id || null,
      }, type: QueryTypes.INSERT }
    );

    return res.status(201).json({ success: true, data: { id: result, name, block_type: block.type, is_global: !!isGlobal } });
  } catch (error) {
    logger.error('[block-templates] create error:', error);
    return res.status(500).json({ success: false, error: { code: 'TEMPLATE_CREATE_ERROR', message: error.message } });
  }
}

export async function deleteTemplate(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'id required' } });
  try {
    await mysqlSequelize.query('DELETE FROM page_builder_templates WHERE id = :id', { replacements: { id } });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('[block-templates] delete error:', error);
    return res.status(500).json({ success: false, error: { code: 'TEMPLATE_DELETE_ERROR', message: error.message } });
  }
}

export async function useTemplate(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'id required' } });
  try {
    await mysqlSequelize.query(
      'UPDATE page_builder_templates SET use_count = use_count + 1, last_used_at = NOW() WHERE id = :id',
      { replacements: { id } }
    );
    return res.json({ success: true, data: { tracked: true } });
  } catch (error) {
    logger.warn('[block-templates] use-tracker error (non-blocking):', error.message);
    return res.json({ success: true, data: { tracked: false } });
  }
}
