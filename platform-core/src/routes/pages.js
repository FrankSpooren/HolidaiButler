/**
 * Pages & Destinations Routes (Fase V)
 * Public endpoints for Next.js frontend tenant config + page layouts
 *
 * Endpoints:
 * - GET /destinations/:code — Tenant config with branding + feature flags
 * - GET /:destinationCode/:pageSlug — Page layout for rendering
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

/**
 * GET /api/v1/pages/destinations/:code
 * Returns full destination config including branding for tenant theming
 */
router.get('/destinations/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const [destination] = await mysqlSequelize.query(
      `SELECT id, code, name, display_name, domain, country, region, timezone,
              currency, default_language, supported_languages, feature_flags,
              branding, is_active
       FROM destinations
       WHERE code = :code AND is_active = 1`,
      {
        replacements: { code },
        type: QueryTypes.SELECT,
      }
    );

    if (!destination) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    // Parse JSON fields
    let featureFlags = {};
    let branding = {};
    let supportedLanguages = [];
    try { featureFlags = typeof destination.feature_flags === 'string' ? JSON.parse(destination.feature_flags) : (destination.feature_flags || {}); } catch (e) { /* empty */ }
    try { branding = typeof destination.branding === 'string' ? JSON.parse(destination.branding) : (destination.branding || {}); } catch (e) { /* empty */ }
    try { supportedLanguages = typeof destination.supported_languages === 'string' ? JSON.parse(destination.supported_languages) : (destination.supported_languages || []); } catch (e) { /* empty */ }

    res.json({
      success: true,
      data: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        displayName: destination.display_name,
        domain: destination.domain,
        country: destination.country,
        region: destination.region,
        timezone: destination.timezone,
        currency: destination.currency,
        defaultLanguage: destination.default_language,
        supportedLanguages,
        featureFlags,
        branding,
        isActive: !!destination.is_active,
      },
    });
  } catch (error) {
    console.error('Error fetching destination:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/pages/:destinationCode/:pageSlug
 * Returns page layout with blocks for the Next.js page renderer
 */
router.get('/:destinationCode/:pageSlug', async (req, res) => {
  try {
    const { destinationCode, pageSlug } = req.params;
    const locale = req.query.locale || 'en';

    // Resolve destination_id from code
    const [destination] = await mysqlSequelize.query(
      'SELECT id FROM destinations WHERE code = :code AND is_active = 1',
      { replacements: { code: destinationCode }, type: QueryTypes.SELECT }
    );

    if (!destination) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    const [page] = await mysqlSequelize.query(
      `SELECT id, destination_id, slug,
              title_nl, title_en, title_es, title_de,
              seo_title_nl, seo_title_en,
              seo_description_nl, seo_description_en,
              og_image_url, layout, status, sort_order
       FROM pages
       WHERE destination_id = :destId AND slug = :slug AND status = 'published'`,
      {
        replacements: { destId: destination.id, slug: pageSlug },
        type: QueryTypes.SELECT,
      }
    );

    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    // Select localized fields
    const titleField = locale === 'en' ? 'title_en' : `title_${locale}`;
    const seoTitleField = locale === 'en' ? 'seo_title_en' : `seo_title_${locale}`;
    const seoDescField = locale === 'en' ? 'seo_description_en' : `seo_description_${locale}`;

    let layout = { blocks: [] };
    try { layout = typeof page.layout === 'string' ? JSON.parse(page.layout) : (page.layout || { blocks: [] }); } catch (e) { /* empty */ }

    res.json({
      success: true,
      data: {
        id: page.id,
        destinationId: page.destination_id,
        slug: page.slug,
        title: page[titleField] || page.title_en || page.title_nl || '',
        seoTitle: page[seoTitleField] || page.seo_title_en || '',
        seoDescription: page[seoDescField] || page.seo_description_en || '',
        ogImageUrl: page.og_image_url,
        layout,
        status: page.status,
      },
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
