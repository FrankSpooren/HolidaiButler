/**
 * Itinerary Route — VII-E2 Batch B, Block B2
 *
 * POST /api/v1/itinerary/route — Calculate route between waypoints via OSRM
 * GET  /api/v1/itinerary/health — OSRM health check
 *
 * @module routes/itinerary
 * @version 1.0.0
 */

import express from 'express';
import { getRoute, isOsrmHealthy } from '../services/routing/osrmService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/itinerary/route
 * Body: { waypoints: [{lat, lon, name?}], mode: 'foot'|'cycling'|'driving' }
 */
router.post('/route', async (req, res) => {
  try {
    const { waypoints, mode = 'foot' } = req.body;

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: 'At least 2 waypoints required' });
    }
    if (waypoints.length > 25) {
      return res.status(400).json({ error: 'Maximum 25 waypoints' });
    }

    const route = await getRoute(waypoints, mode);

    if (!route) {
      return res.status(502).json({
        error: 'Route calculation failed',
        fallback: true,
        message: 'OSRM unavailable — showing straight-line distances',
      });
    }

    res.json({
      success: true,
      route: {
        distance_km: (route.distance_m / 1000).toFixed(1),
        duration_min: Math.round(route.duration_s / 60),
        geometry: route.geometry,
        legs: route.legs,
      },
      waypoints: waypoints.map((wp, i) => ({ ...wp, order: i })),
      mode,
    });
  } catch (error) {
    logger.error('[Itinerary] Route error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/itinerary/health
 */
router.get('/health', async (_req, res) => {
  const healthy = await isOsrmHealthy();
  res.json({ osrm: healthy ? 'ok' : 'down' });
});

export default router;
