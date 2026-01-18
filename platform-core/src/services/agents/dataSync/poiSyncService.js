/**
 * POI Sync Service
 * Handles synchronization of POI data using Apify
 *
 * @module agents/dataSync/poiSyncService
 */

import apifyIntegration from "./apifyIntegration.js";
import poiTierManager from "./poiTierManager.js";
import { logAgent, logError } from "../../orchestrator/auditTrail/index.js";

class POISyncService {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  async syncPOIsByTier(tier, destination = "Calpe, Spain") {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized - call setSequelize first");
    }

    const tierConfig = poiTierManager.getTierConfig()[tier];
    console.log(`[POISyncService] Starting tier ${tier} sync for ${destination} (max ${tierConfig.maxPOIs || 'unlimited'} POIs)`);

    try {
      const poisToUpdate = await poiTierManager.getPOIsForUpdate(this.sequelize, tier);
      console.log(`[POISyncService] Found ${poisToUpdate.length} tier ${tier} POIs to update`);

      if (poisToUpdate.length === 0) {
        return { updated: 0, tier, destination, message: "No POIs to update" };
      }

      let totalUpdated = 0;
      const batchSize = 10;
      const errors = [];

      for (let i = 0; i < poisToUpdate.length; i += batchSize) {
        const batch = poisToUpdate.slice(i, i + batchSize);

        for (const poi of batch) {
          try {
            if (poi.google_placeid) {
              const details = await apifyIntegration.getPlaceDetails(poi.google_placeid);
              if (details) {
                await this.updatePOI(poi.id, details);
                totalUpdated++;
              }
            }
          } catch (error) {
            if (error.message.includes("budget")) {
              console.log("[POISyncService] Budget exceeded - stopping sync");
              await logAgent("data-sync", "sync_stopped_budget", {
                description: `Tier ${tier} sync stopped: budget exceeded`,
                metadata: { tier, updated: totalUpdated, remaining: poisToUpdate.length - i }
              });
              return { updated: totalUpdated, tier, destination, stopped: "budget" };
            }
            errors.push({ poiId: poi.id, error: error.message });
            console.error(`[POISyncService] Error updating POI ${poi.id}:`, error.message);
          }
        }

        // Rate limiting between batches
        if (i + batchSize < poisToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      await logAgent("data-sync", "tier_sync_complete", {
        description: `Tier ${tier} sync: updated ${totalUpdated}/${poisToUpdate.length} POIs`,
        metadata: { tier, destination, updated: totalUpdated, total: poisToUpdate.length, errors: errors.length }
      });

      console.log(`[POISyncService] Tier ${tier} sync complete: ${totalUpdated} updated`);

      return {
        updated: totalUpdated,
        tier,
        destination,
        total: poisToUpdate.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      await logError("data-sync", error, { tier, destination });
      throw error;
    }
  }

  async updatePOI(poiId, apifyData) {
    const transformed = apifyIntegration.transformToHolidaiButlerFormat(apifyData);

    await this.sequelize.query(`
      UPDATE POI SET
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        website = COALESCE(?, website),
        rating = COALESCE(?, rating),
        review_count = COALESCE(?, review_count),
        opening_hours = COALESCE(?, opening_hours),
        is_active = ?,
        last_updated = NOW()
      WHERE id = ?
    `, {
      replacements: [
        transformed.address,
        transformed.phone,
        transformed.website,
        transformed.rating,
        transformed.review_count,
        transformed.opening_hours,
        transformed.is_active ? 1 : 0,
        poiId
      ]
    });

    console.log(`[POISyncService] Updated POI ${poiId}: ${transformed.name}`);
  }

  async discoverNewPOIs(destination, categories) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    console.log(`[POISyncService] Discovering new POIs in ${destination}`);

    const newPOIs = await apifyIntegration.searchPlaces(destination, categories, {
      maxResults: 100,
      skipClosed: true
    });

    let added = 0;
    let skipped = 0;

    for (const place of newPOIs) {
      const [existing] = await this.sequelize.query(
        "SELECT id FROM POI WHERE google_placeid = ?",
        { replacements: [place.placeId] }
      );

      if (existing.length === 0) {
        const transformed = apifyIntegration.transformToHolidaiButlerFormat(place);

        await this.sequelize.query(`
          INSERT INTO POI (
            google_placeid, name, address, latitude, longitude,
            phone, website, category, subcategory, rating,
            review_count, price_level, opening_hours, is_active,
            city, created_at, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            transformed.google_placeid, transformed.name, transformed.address,
            transformed.latitude, transformed.longitude, transformed.phone,
            transformed.website, transformed.category, transformed.subcategory,
            transformed.rating, transformed.review_count,
            transformed.price_level, transformed.opening_hours,
            transformed.is_active ? 1 : 0, destination.split(",")[0]
          ]
        });
        added++;
      } else {
        skipped++;
      }
    }

    await logAgent("data-sync", "poi_discovery_complete", {
      description: `Discovered ${added} new POIs in ${destination}`,
      metadata: { destination, categories, found: newPOIs.length, added, skipped }
    });

    console.log(`[POISyncService] Discovery complete: ${added} added, ${skipped} already exist`);

    return { found: newPOIs.length, added, skipped, destination };
  }

  async getStatus() {
    if (!this.sequelize) {
      return { initialized: false };
    }

    const [countResult] = await this.sequelize.query(
      "SELECT COUNT(*) as total FROM POI WHERE is_active = 1 OR is_active IS NULL"
    );

    return {
      initialized: true,
      totalPOIs: countResult[0]?.total || 0,
      timestamp: new Date().toISOString()
    };
  }
}

export default new POISyncService();
