/**
 * OSM-First POI Discovery Service
 *
 * Scans OpenStreetMap (free) for POIs that don't exist in the HB database.
 * Approved prospects are then enriched via Apify (paid) — 90%+ cost saving.
 *
 * Flow: OSM scan -> discovery_prospects (pending) -> human review -> approved -> Apify scrape -> POI import
 */

import logger from '../utils/logger.js';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes, Op } from 'sequelize';
import DiscoveryProspect from '../models/DiscoveryProspect.js';
import DiscoveryRun from '../models/DiscoveryRun.js';

// Destination bounding boxes for Overpass API
const DESTINATION_BOUNDS = {
  1: { name: 'Calpe', south: 38.620, west: 0.020, north: 38.670, east: 0.070 },
  2: { name: 'Texel', south: 52.980, west: 4.700, north: 53.185, east: 4.920 },
  3: { name: 'Alicante', south: 38.320, west: -0.530, north: 38.400, east: -0.440 },
};

// OSM tags -> HolidaiButler categories
const OSM_CATEGORY_MAP = {
  'amenity=restaurant': 'food_drinks',
  'amenity=cafe': 'food_drinks',
  'amenity=bar': 'food_drinks',
  'amenity=pub': 'food_drinks',
  'amenity=fast_food': 'food_drinks',
  'amenity=ice_cream': 'food_drinks',
  'tourism=museum': 'museum',
  'tourism=gallery': 'museum',
  'tourism=artwork': 'museum',
  'natural=beach': 'beach',
  'leisure=beach_resort': 'beach',
  'historic=monument': 'historical',
  'historic=memorial': 'historical',
  'historic=castle': 'historical',
  'historic=archaeological_site': 'historical',
  'historic=church': 'historical',
  'tourism=attraction': 'activities',
  'leisure=park': 'activities',
  'leisure=playground': 'activities',
  'leisure=nature_reserve': 'activities',
  'leisure=marina': 'activities',
  'sport=swimming': 'activities',
  'sport=diving': 'activities',
  'shop=supermarket': 'shopping',
  'shop=clothes': 'shopping',
  'shop=gift': 'shopping',
  'shop=bakery': 'shopping',
  'amenity=marketplace': 'shopping',
  'tourism=hotel': 'accommodation',
  'tourism=hostel': 'accommodation',
  'tourism=guest_house': 'accommodation',
  'tourism=apartment': 'accommodation',
  'tourism=camp_site': 'accommodation',
  'amenity=nightclub': 'nightlife',
  'amenity=pharmacy': 'healthcare',
  'amenity=hospital': 'healthcare',
  'amenity=doctors': 'healthcare',
  'tourism=viewpoint': 'routes',
  'tourism=picnic_site': 'routes',
  'tourism=information': 'routes',
};

class OsmDiscoveryService {
  constructor() {
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    this.requestDelay = 1500; // respectful rate limiting
    this.lastRequest = 0;
  }

  /**
   * Run a full OSM scan for a destination.
   * Returns the number of new prospects found.
   */
  async scanDestination(destinationId, triggeredBy = 'admin') {
    const bounds = DESTINATION_BOUNDS[destinationId];
    if (!bounds) {
      throw new Error(`No bounding box configured for destination_id=${destinationId}`);
    }

    logger.info(`OSM scan starting for ${bounds.name} (dest ${destinationId})`);

    // Create discovery run
    const run = await DiscoveryRun.create({
      run_type: 'destination',
      destination: `OSM Scan dest ${destinationId}`,
      city: bounds.name,
      country: destinationId === 2 ? 'Netherlands' : 'Spain',
      sources: ['openstreetmap'],
      triggered_by: triggeredBy,
      status: 'running',
      started_at: new Date(),
    });

    try {
      // Query Overpass for all mapped categories
      const osmPois = await this.queryOverpass(bounds);
      logger.info(`OSM returned ${osmPois.length} raw POIs for ${bounds.name}`);

      // Load existing POIs for deduplication
      const existingPois = await this.loadExistingPois(destinationId);

      // Filter: only POIs with a name, not already in DB
      const prospects = [];
      for (const poi of osmPois) {
        const name = poi.tags?.name || poi.tags?.['name:en'];
        if (!name) continue;

        const match = this.findBestMatch(name, poi.lat, poi.lon, existingPois);
        // Skip if very high match (already exists)
        if (match.score >= 0.90) continue;

        const category = this.categorize(poi.tags);
        if (!category) continue;

        prospects.push({
          scan_id: run.id,
          destination_id: destinationId,
          osm_node_id: poi.id,
          osm_name: name,
          osm_type: poi.type,
          hb_category: category,
          latitude: poi.lat || poi.center?.lat,
          longitude: poi.lon || poi.center?.lon,
          best_match_name: match.name,
          best_match_score: match.score,
          status: 'pending',
        });
      }

      // Dedup within this batch (same osm_node_id)
      const uniqueProspects = this.dedup(prospects);

      // Also skip prospects that already exist from previous scans
      const existingOsmIds = await this.getExistingOsmNodeIds(destinationId);
      const newProspects = uniqueProspects.filter(
        (p) => !existingOsmIds.has(p.osm_node_id)
      );

      // Bulk insert
      if (newProspects.length > 0) {
        await DiscoveryProspect.bulkCreate(newProspects);
      }

      // Update run
      run.status = 'completed';
      run.pois_found = newProspects.length;
      run.current_step = `${newProspects.length} prospects gevonden`;
      run.completed_at = new Date();
      await run.save();

      logger.info(`OSM scan complete: ${newProspects.length} new prospects for ${bounds.name}`);
      return { run_id: run.id, prospects: newProspects.length };
    } catch (error) {
      run.status = 'failed';
      run.error_message = error.message;
      run.completed_at = new Date();
      await run.save();
      logger.error('OSM scan failed:', error);
      throw error;
    }
  }

  /**
   * Query Overpass API for all relevant POI types within bounding box.
   */
  async queryOverpass(bounds) {
    await this.rateLimit();

    // Build tag filters for all categories
    const tagFilters = Object.keys(OSM_CATEGORY_MAP)
      .map((tag) => {
        const [key, val] = tag.split('=');
        return `node["${key}"="${val}"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
                way["${key}"="${val}"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});`;
      })
      .join('\n');

    const query = `[out:json][timeout:60];(\n${tagFilters}\n);out center 2000;`;

    const response = await fetch(this.overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'HolidaiButler/2.0' },
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return (data.elements || []).map((el) => ({
      ...el,
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon,
    }));
  }

  /**
   * Load existing POIs for a destination (name + coords for matching).
   */
  async loadExistingPois(destinationId) {
    const [rows] = await mysqlSequelize.query(
      `SELECT id, name, latitude, longitude FROM POI WHERE destination_id = ? AND is_active = 1`,
      { replacements: [destinationId], type: QueryTypes.SELECT, raw: true, nest: true }
    );
    // query returns array directly with type SELECT
    return Array.isArray(rows) ? rows : [rows].filter(Boolean);
  }

  /**
   * Find the closest existing POI by name similarity + coordinate proximity.
   */
  findBestMatch(name, lat, lon, existingPois) {
    let bestName = null;
    let bestScore = 0;

    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = normalize(name);

    for (const poi of existingPois) {
      // Coordinate distance (rough, degrees)
      const dLat = Math.abs((poi.latitude || 0) - (lat || 0));
      const dLon = Math.abs((poi.longitude || 0) - (lon || 0));
      const distDeg = Math.sqrt(dLat * dLat + dLon * dLon);

      // Only consider POIs within ~500m (~0.005 degrees)
      if (distDeg > 0.005) continue;

      // Simple Dice coefficient for name similarity
      const normPoi = normalize(poi.name);
      const score = this.diceCoefficient(normName, normPoi);

      if (score > bestScore) {
        bestScore = score;
        bestName = poi.name;
      }
    }

    return { name: bestName, score: Math.round(bestScore * 1000) / 1000 };
  }

  /**
   * Dice coefficient for string similarity (bigram-based).
   */
  diceCoefficient(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const bigrams = (s) => {
      const set = new Set();
      for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
      return set;
    };
    const setA = bigrams(a);
    const setB = bigrams(b);
    let intersection = 0;
    for (const bg of setA) if (setB.has(bg)) intersection++;
    return (2 * intersection) / (setA.size + setB.size) || 0;
  }

  /**
   * Determine HB category from OSM tags.
   */
  categorize(tags) {
    if (!tags) return null;
    for (const [osmTag, hbCat] of Object.entries(OSM_CATEGORY_MAP)) {
      const [key, val] = osmTag.split('=');
      if (tags[key] === val) return hbCat;
    }
    return null;
  }

  /**
   * Dedup prospects within a batch by osm_node_id.
   */
  dedup(prospects) {
    const seen = new Set();
    return prospects.filter((p) => {
      if (!p.osm_node_id || seen.has(p.osm_node_id)) return false;
      seen.add(p.osm_node_id);
      return true;
    });
  }

  /**
   * Get OSM node IDs that already exist as prospects (any status).
   */
  async getExistingOsmNodeIds(destinationId) {
    const rows = await DiscoveryProspect.findAll({
      where: { destination_id: destinationId },
      attributes: ['osm_node_id'],
      raw: true,
    });
    return new Set(rows.map((r) => r.osm_node_id));
  }

  /**
   * Get prospects with filtering + pagination.
   */
  async getProspects({ status, destination_id, scan_id, page = 1, limit = 200 }) {
    const where = {};
    if (status) where.status = status;
    if (destination_id) where.destination_id = destination_id;
    if (scan_id) where.scan_id = scan_id;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const { count, rows } = await DiscoveryProspect.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      limit: parseInt(limit),
      offset,
    });

    return { prospects: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Approve prospects by IDs.
   */
  async approveProspects(ids, reviewedBy = 'admin') {
    const [count] = await DiscoveryProspect.update(
      { status: 'approved', reviewed_at: new Date(), reviewed_by: reviewedBy },
      { where: { id: { [Op.in]: ids }, status: 'pending' } }
    );
    logger.info(`Approved ${count} prospects`, { ids, reviewedBy });
    return count;
  }

  /**
   * Reject prospects by IDs.
   */
  async rejectProspects(ids, reviewedBy = 'admin') {
    const [count] = await DiscoveryProspect.update(
      { status: 'rejected', reviewed_at: new Date(), reviewed_by: reviewedBy },
      { where: { id: { [Op.in]: ids }, status: 'pending' } }
    );
    logger.info(`Rejected ${count} prospects`, { ids, reviewedBy });
    return count;
  }

  /**
   * Full pipeline: Apify scrape → POI create → bronze/silver/gold → classify → reviews → images.
   * Uses existing enterprise services (apifyIntegration, poiSyncService, poiClassification).
   */
  async scrapeApproved(destinationId) {
    const approved = await DiscoveryProspect.findAll({
      where: { status: 'approved', ...(destinationId ? { destination_id: destinationId } : {}) },
    });

    if (approved.length === 0) {
      return { message: 'Geen goedgekeurde prospects om te scrapen', scraped: 0, failed: 0, created: 0 };
    }

    logger.info(`Starting Apify enrichment for ${approved.length} approved prospects`);

    // Dynamic imports — enterprise services from dataSync agent
    const { default: apifyIntegration } = await import('./agents/dataSync/apifyIntegration.js');
    const { default: dataSyncAgent } = await import('./agents/dataSync/index.js');
    let poiClassificationService;
    try {
      const mod = await import('./poiClassification.js');
      poiClassificationService = mod.default;
    } catch { /* classification optional */ }

    let scraped = 0;
    let failed = 0;
    let created = 0;

    for (const prospect of approved) {
      try {
        // Step 1: Apify search by name + location
        const destName = DESTINATION_BOUNDS[prospect.destination_id]?.name || '';
        const searchResults = await apifyIntegration.searchPlaces(
          destName,
          [`${prospect.osm_name} ${destName}`],
          { maxResults: 3, maxImages: 10 }
        );

        // Find best match from results (by name similarity)
        let bestPlace = null;
        let bestScore = 0;
        for (const place of (searchResults || [])) {
          const score = this.diceCoefficient(
            (prospect.osm_name || '').toLowerCase(),
            (place.title || '').toLowerCase()
          );
          if (score > bestScore) {
            bestScore = score;
            bestPlace = place;
          }
        }

        if (!bestPlace || bestScore < 0.3) {
          logger.warn(`No Apify match for prospect ${prospect.id} "${prospect.osm_name}" (best score: ${bestScore.toFixed(2)})`);
          prospect.status = 'failed';
          failed++;
          await prospect.save();
          continue;
        }

        const placeId = bestPlace.placeId || null;
        prospect.apify_place_id = placeId;

        // Step 2: Check if POI already exists by google_placeid
        const [existingRows] = await mysqlSequelize.query(
          'SELECT id FROM POI WHERE google_placeid = ? LIMIT 1',
          { replacements: [placeId] }
        );

        let poiId;
        if (existingRows && existingRows.length > 0) {
          // POI already exists — link prospect to it
          poiId = existingRows[0].id;
          logger.info(`Prospect ${prospect.id} matched existing POI ${poiId}`);
        } else {
          // Step 3: Create new POI record
          const transformed = apifyIntegration.transformToHolidaiButlerFormat(bestPlace);
          const [insertResult] = await mysqlSequelize.query(`
            INSERT INTO POI (
              google_placeid, name, address, latitude, longitude,
              phone, website, category, subcategory, rating,
              review_count, price_level, opening_hours_json, is_active,
              destination_id, city, tier, created_at, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 4, NOW(), NOW())
          `, {
            replacements: [
              transformed.google_placeid, transformed.name, transformed.address,
              transformed.latitude, transformed.longitude, transformed.phone,
              transformed.website, transformed.category || prospect.hb_category,
              transformed.subcategory || bestPlace.categoryName,
              transformed.rating, transformed.review_count,
              transformed.price_level, JSON.stringify(bestPlace.openingHours || {}),
              prospect.destination_id, destName
            ]
          });
          poiId = insertResult; // insertId
          created++;
          logger.info(`Created new POI ${poiId} from prospect ${prospect.id} "${prospect.osm_name}"`);
        }

        // Step 4: Bronze/Silver pipeline — full Apify data processing
        try {
          const poiSyncMod = await import('./agents/dataSync/poiSyncService.js');
          const poiSyncService = poiSyncMod.default;
          if (poiSyncService.sequelize || poiSyncService.initialize) {
            if (poiSyncService.initialize) await poiSyncService.initialize(mysqlSequelize);
            // Bronze: save raw data
            await poiSyncService.saveRawData(poiId, placeId, prospect.destination_id, bestPlace);
            // Silver: update POI with structured Apify fields
            await poiSyncService.updatePOI(poiId, bestPlace, prospect.destination_id);
            // Reviews
            if (bestPlace.reviews && bestPlace.reviews.length > 0) {
              await poiSyncService.extractReviews(poiId, prospect.destination_id, bestPlace.reviews);
            }
            // Images
            if (bestPlace.imageUrls || bestPlace.images) {
              await poiSyncService.downloadNewImages(poiId, prospect.destination_id, placeId, bestPlace);
            }
          }
        } catch (pipelineErr) {
          logger.error(`Bronze/Silver pipeline error for POI ${poiId}:`, pipelineErr);
          // Continue — POI is created, enrichment can be retried via tier sync
        }

        // Step 5: 3-level classification
        try {
          if (poiClassificationService) {
            await poiClassificationService.classifyPOI(poiId);
            logger.info(`Classified POI ${poiId}`);
          }
        } catch (classErr) {
          logger.error(`Classification error for POI ${poiId}:`, classErr);
          // Non-fatal — tier sync will classify later
        }

        // Step 6: Update prospect with poi_id
        prospect.poi_id = poiId;
        prospect.status = 'scraped';
        scraped++;
        await prospect.save();

        logger.info(`Prospect ${prospect.id} fully processed → POI ${poiId}`);
      } catch (error) {
        logger.error(`Full pipeline failed for prospect ${prospect.id}:`, error);
        prospect.status = 'failed';
        failed++;
        await prospect.save();
      }
    }

    logger.info(`Discovery import complete: ${scraped} scraped, ${created} new POIs, ${failed} failed`);
    return { message: `${scraped} prospects verwerkt, ${created} nieuwe POIs, ${failed} mislukt`, scraped, created, failed };
  }

  async rateLimit() {
    const now = Date.now();
    const diff = now - this.lastRequest;
    if (diff < this.requestDelay) {
      await new Promise((r) => setTimeout(r, this.requestDelay - diff));
    }
    this.lastRequest = Date.now();
  }
}

const osmDiscoveryService = new OsmDiscoveryService();
export default osmDiscoveryService;
