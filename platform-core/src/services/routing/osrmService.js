/**
 * OSRM Routing Service — VII-E2 Batch B, Block B2
 *
 * Connects to self-hosted OSRM on Hetzner (EU-first).
 * Provides route calculation for foot/cycling/driving profiles.
 *
 * @module services/routing/osrmService
 * @version 1.0.0
 */

import logger from '../../utils/logger.js';

const OSRM_BASE = process.env.OSRM_URL || 'http://localhost:5000';

/**
 * Get a route between waypoints.
 * @param {Array<{lat: number, lon: number}>} waypoints
 * @param {'foot'|'cycling'|'driving'} mode - Currently foot only (single OSRM instance)
 * @returns {Promise<{distance_m: number, duration_s: number, geometry: object}|null>}
 */
export async function getRoute(waypoints, mode = 'foot') {
  if (!waypoints || waypoints.length < 2) return null;

  const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/${mode}/${coords}?overview=full&geometries=geojson&steps=true`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      logger.warn(`[OSRM] HTTP ${r.status} for route`);
      return null;
    }
    const data = await r.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      distance_m: route.distance,
      duration_s: route.duration,
      geometry: route.geometry,
      legs: route.legs?.map(leg => ({
        distance_m: leg.distance,
        duration_s: leg.duration,
        summary: leg.summary,
      })),
    };
  } catch (err) {
    logger.error('[OSRM] Route error:', err.message);
    return null;
  }
}

/**
 * Health check for OSRM server.
 */
export async function isOsrmHealthy() {
  try {
    const r = await fetch(`${OSRM_BASE}/route/v1/foot/4.9,52.3;5.0,52.3?overview=false`);
    const data = await r.json();
    return data.code === 'Ok';
  } catch {
    return false;
  }
}
