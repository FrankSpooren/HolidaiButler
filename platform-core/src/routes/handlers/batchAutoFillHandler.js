/**
 * Batch Auto-Fill Pages Handler
 *
 * POST /api/v1/admin-portal/pages/batch-auto-fill
 * Body: { destinationId, onlyEmpty: true }
 *
 * Triggert auto-fill basis voor ALLE pages van destination die lege SEO-velden
 * hebben (title_en/seo_title_en/seo_description_en). Hergebruikt handler-logica
 * van handlePagesAutoFillBasis.
 *
 * Use case: na BrandProfileBootstrap success — gebruiker krijgt one-click
 * actie om alle bestaande lege pagina's automatisch te vullen.
 *
 * @version BLOK F UX-feedback (2026-05-24)
 */

import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import { handlePagesAutoFillBasis } from './pagesAutoFillBasis.js';

export async function handleBatchAutoFillPages(req, res) {
  const destId = Number(req.body?.destinationId || 0);
  const onlyEmpty = req.body?.onlyEmpty !== false;

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    // Find pages met lege SEO-velden
    const whereParts = ['destination_id = :destId'];
    if (onlyEmpty) {
      whereParts.push("(seo_title_en IS NULL OR seo_title_en = '' OR seo_description_en IS NULL OR seo_description_en = '')");
    }

    const [pages] = await mysqlSequelize.query(
      `SELECT id, slug, title_en, seo_title_en, seo_description_en
         FROM pages
         WHERE ${whereParts.join(' AND ')}
         ORDER BY sort_order ASC, id ASC`,
      { replacements: { destId }, type: QueryTypes.SELECT }
    ).catch(err => {
      logger.warn('[batch-auto-fill] page query failed:', err.message);
      return [[]];
    });

    if (!pages || pages.length === 0) {
      return res.json({ success: true, data: { processed: 0, results: [], message: 'Geen pages met lege SEO-velden gevonden.' } });
    }

    // Process sequentieel (Mistral rate-limit safe)
    const results = [];
    for (const page of pages) {
      try {
        // Simuleer een handler-call via in-memory request-object
        const fakeReq = { body: { destinationId: destId, pageType: page.slug || 'general', pageTopic: page.title_en || '' } };
        let captured = null;
        const fakeRes = {
          status: (code) => ({ json: (body) => { captured = { status: code, body }; return fakeRes; } }),
          json: (body) => { captured = { status: 200, body }; return fakeRes; },
        };
        await handlePagesAutoFillBasis(fakeReq, fakeRes);

        if (captured?.status === 200 && captured.body?.success && captured.body.data) {
          const sugg = captured.body.data;
          // Apply suggestion naar deze page (PUT-equivalent inline)
          const setParts = [];
          const repl = { id: page.id };
          ['en', 'nl', 'de', 'es', 'fr'].forEach(lang => {
            if (sugg.title?.[lang]) {
              const col = `title_${lang}`;
              setParts.push(`${col} = :${col}`);
              repl[col] = String(sugg.title[lang]).slice(0, 255);
            }
            if (sugg.seo_title?.[lang]) {
              const col = `seo_title_${lang}`;
              setParts.push(`${col} = :${col}`);
              repl[col] = String(sugg.seo_title[lang]).slice(0, 255);
            }
            if (sugg.seo_description?.[lang]) {
              const col = `seo_description_${lang}`;
              setParts.push(`${col} = :${col}`);
              repl[col] = String(sugg.seo_description[lang]).slice(0, 1000);
            }
          });
          if (sugg.og_image_url) {
            setParts.push('og_image_url = :og');
            repl.og = String(sugg.og_image_url).slice(0, 500);
          }
          if (setParts.length > 0) {
            await mysqlSequelize.query(
              `UPDATE pages SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = :id`,
              { replacements: repl, type: QueryTypes.UPDATE }
            );
            results.push({ page_id: page.id, slug: page.slug, status: 'filled', ai_log_id: sugg.ai_generation_log_id, attempts: sugg.provenance?.attempts });
          } else {
            results.push({ page_id: page.id, slug: page.slug, status: 'no_fields_to_update' });
          }
        } else {
          results.push({ page_id: page.id, slug: page.slug, status: 'failed', error: captured?.body?.error?.message || 'unknown' });
        }
      } catch (err) {
        logger.warn(`[batch-auto-fill] page ${page.id} failed:`, err.message);
        results.push({ page_id: page.id, slug: page.slug, status: 'error', error: err.message });
      }
    }

    const successCount = results.filter(r => r.status === 'filled').length;
    return res.json({
      success: true,
      data: {
        processed: pages.length,
        succeeded: successCount,
        failed: pages.length - successCount,
        results,
      }
    });
  } catch (error) {
    logger.error('[batch-auto-fill] error:', error);
    return res.status(500).json({ success: false, error: { code: 'BATCH_AUTOFILL_ERROR', message: error.message } });
  }
}
