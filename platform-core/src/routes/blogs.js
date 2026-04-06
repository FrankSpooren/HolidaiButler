/**
 * Public Blog API — No authentication required
 * Serves published blog content from Content Studio for CalpeTrip.com and other frontends.
 *
 * GET /api/v1/blogs          — List published blogs (paginated)
 * GET /api/v1/blogs/:slug    — Single blog by slug
 */

import { Router } from 'express';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const DESTINATION_IDS = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
function getDestinationFromRequest(req) {
  const header = req.headers['x-destination-id'];
  if (header) {
    const mapped = DESTINATION_IDS[String(header).toLowerCase()];
    if (mapped) return mapped;
    const num = parseInt(header);
    if (!isNaN(num) && num > 0) return num;
  }
  if (req.query.destination) {
    const mapped = DESTINATION_IDS[String(req.query.destination).toLowerCase()];
    if (mapped) return mapped;
  }
  return 1; // default Calpe
}

const router = Router();

/**
 * GET /blogs — List published blog articles
 * Query: ?limit=9&offset=0&lang=en&ids=1,2,3 (optional filter by IDs for BlogGrid block)
 */
router.get('/', async (req, res) => {
  try {
    const destinationId = getDestinationFromRequest(req);
    const limit = Math.min(Number(req.query.limit) || 9, 50);
    const offset = Number(req.query.offset) || 0;
    const lang = req.query.lang || 'en';
    const sortBy = req.query.sort || 'newest';
    const ids = req.query.ids ? req.query.ids.split(',').map(Number).filter(n => n > 0) : null;

    let whereClause = `ci.destination_id = :destId AND ci.content_type = 'blog' AND ci.approval_status = 'published'`;
    const replacements = { destId: destinationId, limit, offset };

    if (ids && ids.length > 0) {
      whereClause += ` AND ci.id IN (:ids)`;
      replacements.ids = ids;
    }

    const orderBy = sortBy === 'score' ? 'ci.seo_score DESC' : sortBy === 'popular' ? 'ci.seo_score DESC' : 'ci.published_at DESC';

    const [blogs] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.body_${lang} as body, ci.body_en,
              ci.seo_data, ci.seo_score, ci.published_at, ci.created_at,
              ci.media_ids, ci.target_platform
       FROM content_items ci
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT :limit OFFSET :offset`,
      { replacements }
    );

    const [[{ total }]] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM content_items ci WHERE ${whereClause}`,
      { replacements }
    );

    // Resolve images + extract SEO metadata for each blog
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    const results = await Promise.all(blogs.map(async (blog) => {
      let seoData = {};
      try { seoData = typeof blog.seo_data === 'string' ? JSON.parse(blog.seo_data) : (blog.seo_data || {}); } catch { /* */ }
      const suggestions = seoData.seoSuggestions || {};

      const slug = seoData.slug || (suggestions.slug || '').replace(/^blog\//, '') ||
        (blog.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const metaTitle = seoData.meta_title || suggestions.meta_title || blog.title;
      const metaDesc = seoData.meta_description && !seoData.meta_description.startsWith('<')
        ? seoData.meta_description
        : (suggestions.meta_description && !suggestions.meta_description.startsWith('<'))
          ? suggestions.meta_description
          : (blog.body_en || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 155);

      // Resolve first image
      let image = null;
      try {
        const mediaIds = blog.media_ids ? (typeof blog.media_ids === 'string' ? JSON.parse(blog.media_ids) : blog.media_ids) : [];
        if (mediaIds.length > 0) {
          // Check if first entry is a URL string
          const firstId = mediaIds[0];
          if (typeof firstId === 'string' && firstId.startsWith('http')) {
            image = firstId;
          } else if (typeof firstId === 'string' && firstId.startsWith('/')) {
            image = `${imageBase}${firstId}`;
          }
          // Otherwise try numeric ID in imageurls
          if (!image) {
            const numId = Number(String(firstId).replace('poi:', ''));
            if (!isNaN(numId) && numId > 0) {
              const [imgs] = await mysqlSequelize.query('SELECT local_path, image_url FROM imageurls WHERE id = :id', { replacements: { id: numId } });
              if (imgs[0]) {
                const imgPath = imgs[0].local_path ? imgs[0].local_path.replace(/^\/poi-images\//, '/') : null;
                image = imgPath ? `${imageBase}/api/v1/img${imgPath}?w=600&f=webp` : imgs[0].image_url;
              }
            }
          }
        }
      } catch { /* non-blocking */ }

      return {
        id: blog.id,
        title: blog.title,
        slug,
        metaTitle,
        metaDescription: metaDesc,
        body: blog.body || blog.body_en,
        excerpt: (blog.body || blog.body_en || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200) + '...',
        image,
        seoScore: blog.seo_score,
        publishedAt: blog.published_at,
        createdAt: blog.created_at,
      };
    }));

    res.json({ success: true, data: { blogs: results, total, limit, offset } });
  } catch (error) {
    logger.error('[Blogs] List error:', error);
    res.status(500).json({ success: false, error: { code: 'BLOG_LIST_ERROR', message: error.message } });
  }
});

/**
 * GET /blogs/:slug — Single blog article by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const destinationId = getDestinationFromRequest(req);
    const { slug } = req.params;
    const lang = req.query.lang || 'en';

    // Find blog by slug in seo_data JSON, or by title-derived slug
    const [blogs] = await mysqlSequelize.query(
      `SELECT ci.id, ci.title, ci.body_${lang} as body, ci.body_en, ci.body_nl, ci.body_de, ci.body_es, ci.body_fr,
              ci.seo_data, ci.seo_score, ci.published_at, ci.created_at, ci.media_ids
       FROM content_items ci
       WHERE ci.destination_id = :destId AND ci.content_type = 'blog' AND ci.approval_status = 'published'
       ORDER BY ci.published_at DESC`,
      { replacements: { destId: destinationId } }
    );

    // Match by slug
    const blog = blogs.find(b => {
      let seoData = {};
      try { seoData = typeof b.seo_data === 'string' ? JSON.parse(b.seo_data) : (b.seo_data || {}); } catch { /* */ }
      const suggestions = seoData.seoSuggestions || {};
      const blogSlug = seoData.slug || (suggestions.slug || '').replace(/^blog\//, '') ||
        (b.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return blogSlug === slug;
    });

    if (!blog) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Blog not found' } });
    }

    let seoData = {};
    try { seoData = typeof blog.seo_data === 'string' ? JSON.parse(blog.seo_data) : (blog.seo_data || {}); } catch { /* */ }
    const suggestions = seoData.seoSuggestions || {};

    // Resolve image
    const imageBase = process.env.IMAGE_BASE_URL || 'https://test.holidaibutler.com';
    let image = null;
    try {
      const mediaIds = blog.media_ids ? (typeof blog.media_ids === 'string' ? JSON.parse(blog.media_ids) : blog.media_ids) : [];
      if (mediaIds.length > 0) {
        const firstId = mediaIds[0];
        if (typeof firstId === 'string' && firstId.startsWith('http')) {
          image = firstId;
        } else if (typeof firstId === 'string' && firstId.startsWith('/')) {
          image = `${imageBase}${firstId}`;
        }
        if (!image) {
          const numId = Number(String(firstId).replace('poi:', ''));
          if (!isNaN(numId) && numId > 0) {
            const [imgs] = await mysqlSequelize.query('SELECT local_path, image_url FROM imageurls WHERE id = :id', { replacements: { id: numId } });
            if (imgs[0]) {
              const imgPath = imgs[0].local_path ? imgs[0].local_path.replace(/^\/poi-images\//, '/') : null;
              image = imgPath ? `${imageBase}/api/v1/img${imgPath}?w=1200&f=webp` : imgs[0].image_url;
            }
          }
        }
      }
    } catch { /* non-blocking */ }

    res.json({
      success: true,
      data: {
        id: blog.id,
        title: blog.title,
        slug: req.params.slug,
        metaTitle: seoData.meta_title || suggestions.meta_title || blog.title,
        metaDescription: seoData.meta_description && !seoData.meta_description.startsWith('<')
          ? seoData.meta_description : (blog.body_en || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 155),
        body: blog.body || blog.body_en,
        bodyTranslations: {
          en: blog.body_en, nl: blog.body_nl, de: blog.body_de, es: blog.body_es, fr: blog.body_fr,
        },
        image,
        seoScore: blog.seo_score,
        publishedAt: blog.published_at,
        createdAt: blog.created_at,
      },
    });
  } catch (error) {
    logger.error('[Blogs] Detail error:', error);
    res.status(500).json({ success: false, error: { code: 'BLOG_DETAIL_ERROR', message: error.message } });
  }
});

export default router;
