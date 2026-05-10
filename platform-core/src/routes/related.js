/**
 * Related Items Route — VII-E2 Batch A, Block A4
 *
 * GET /api/v1/related?type=poi&id=123&strategy=same_category&limit=4&lang=en
 *
 * Returns related items based on strategy:
 * - same_category: items with same category
 * - nearby: geographically closest items (Haversine)
 * - editorial: manually curated (future)
 *
 * @module routes/related
 * @version 1.0.0
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { QueryTypes } = (await import('sequelize')).default;

const DESTINATION_CODES = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };

function getDestinationId(req) {
  const h = req.headers['x-destination-id'];
  if (!h) return 1;
  const n = parseInt(h);
  if (!isNaN(n) && n > 0) return n;
  return DESTINATION_CODES[h.toLowerCase()] || 1;
}

router.get('/', async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const { type = 'poi', id, strategy = 'same_category', limit = 4, lang = 'en' } = req.query;

    if (!id) return res.status(400).json({ error: 'id parameter required' });

    const parsedLimit = Math.min(parseInt(limit) || 4, 12);
    const parsedId = parseInt(id);

    if (type === 'poi') {
      // Get source POI
      const [source] = await mysqlSequelize.query(
        'SELECT id, name, category, latitude, longitude FROM POI WHERE id = :id AND destination_id = :destId',
        { replacements: { id: parsedId, destId: destinationId }, type: QueryTypes.SELECT }
      );
      if (!source) return res.json({ related: [], strategy, source_id: parsedId });

      let related;
      if (strategy === 'nearby' && source.latitude && source.longitude) {
        // Haversine distance ordering
        related = await mysqlSequelize.query(`
          SELECT id, name, category, rating, google_review_count AS review_count,
                 latitude, longitude,
                 enriched_tile_description AS tile_en,
                 enriched_tile_description_nl AS tile_nl,
                 (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) *
                  cos(radians(longitude) - radians(:lon)) +
                  sin(radians(:lat)) * sin(radians(latitude)))) AS distance_km
          FROM POI
          WHERE destination_id = :destId AND is_active = 1 AND id != :id
          HAVING distance_km < 10
          ORDER BY distance_km ASC
          LIMIT :lim
        `, {
          replacements: { lat: source.latitude, lon: source.longitude, destId: destinationId, id: parsedId, lim: parsedLimit },
          type: QueryTypes.SELECT,
        });
      } else {
        // Same category
        related = await mysqlSequelize.query(`
          SELECT id, name, category, rating, google_review_count AS review_count,
                 latitude, longitude,
                 enriched_tile_description AS tile_en,
                 enriched_tile_description_nl AS tile_nl
          FROM POI
          WHERE destination_id = :destId AND is_active = 1 AND id != :id
            AND category = :cat
          ORDER BY rating DESC
          LIMIT :lim
        `, {
          replacements: { destId: destinationId, id: parsedId, cat: source.category, lim: parsedLimit },
          type: QueryTypes.SELECT,
        });
      }

      res.json({
        related: related.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          rating: r.rating ? parseFloat(r.rating) : null,
          review_count: r.review_count || 0,
          tile_description: r[`tile_${lang}`] || r.tile_en || null,
          distance_km: r.distance_km ? parseFloat(r.distance_km).toFixed(1) : null,
          result_type: 'poi',
        })),
        strategy,
        source_id: parsedId,
      });
    } else if (type === 'event') {
      const related = await mysqlSequelize.query(`
        SELECT id, title, short_description, date, location_name, image
        FROM agenda
        WHERE destination_id = :destId AND date >= CURDATE() AND id != :id
        ORDER BY date ASC
        LIMIT :lim
      `, {
        replacements: { destId: destinationId, id: parsedId, lim: parsedLimit },
        type: QueryTypes.SELECT,
      });

      res.json({
        related: related.map(r => ({
          id: r.id,
          title: r.title,
          description: r.short_description,
          date: r.date,
          location: r.location_name,
          image: r.image,
          result_type: 'event',
        })),
        strategy,
        source_id: parsedId,
      });
    } else {
      res.json({ related: [], strategy, source_id: parsedId });
    }
  } catch (error) {
    logger.error('[Related] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch related items' });
  }
});

export default router;
