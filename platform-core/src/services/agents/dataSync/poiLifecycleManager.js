/**
 * POI Lifecycle Manager
 * Enterprise-level POI creation, deactivation, and duplicate detection
 *
 * Features:
 * - Duplicate detection (Google Place ID + name+address hash)
 * - Soft delete with grace period (30 days)
 * - Permanent closed detection from Apify
 * - Temporary vs permanent closure distinction
 * - Owner notification before deactivation
 * - Auto-categorization support
 *
 * @module agents/dataSync/poiLifecycleManager
 * @version 1.0.0
 */

import crypto from "crypto";
import { logAgent, logAlert } from "../../orchestrator/auditTrail/index.js";
import apifyIntegration from "./apifyIntegration.js";

// Grace period before permanent deactivation (days)
const DEACTIVATION_GRACE_PERIOD_DAYS = 30;

// POI status constants
const POI_STATUS = {
  ACTIVE: "active",
  TEMPORARILY_CLOSED: "temporarily_closed",
  PENDING_DEACTIVATION: "pending_deactivation",
  DEACTIVATED: "deactivated"
};

// Category mapping for auto-categorization
const CATEGORY_MAPPING = {
  restaurant: { category: "food", subcategory: "restaurant" },
  cafe: { category: "food", subcategory: "cafe" },
  bar: { category: "food", subcategory: "bar" },
  bakery: { category: "food", subcategory: "bakery" },
  museum: { category: "culture", subcategory: "museum" },
  church: { category: "culture", subcategory: "church" },
  park: { category: "nature", subcategory: "park" },
  beach: { category: "nature", subcategory: "beach" },
  hiking_area: { category: "nature", subcategory: "hiking" },
  gym: { category: "active", subcategory: "gym" },
  stadium: { category: "active", subcategory: "sports" },
  hospital: { category: "practical", subcategory: "health" },
  pharmacy: { category: "practical", subcategory: "health" },
  police: { category: "practical", subcategory: "emergency" },
  bank: { category: "practical", subcategory: "finance" },
  atm: { category: "practical", subcategory: "finance" },
  supermarket: { category: "practical", subcategory: "shopping" },
  shopping_mall: { category: "practical", subcategory: "shopping" },
  tourist_attraction: { category: "culture", subcategory: "attraction" },
  spa: { category: "active", subcategory: "wellness" },
  amusement_park: { category: "active", subcategory: "entertainment" }
};

class POILifecycleManager {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Generate hash for duplicate detection
   * @param {string} name - POI name
   * @param {string} address - POI address
   * @returns {string} Hash string
   */
  generateDuplicateHash(name, address) {
    const normalized = `${(name || "").toLowerCase().trim()}|${(address || "").toLowerCase().trim()}`;
    return crypto.createHash("md5").update(normalized).digest("hex");
  }

  /**
   * Check for duplicate POI
   * @param {string} googlePlaceId - Google Place ID
   * @param {string} name - POI name
   * @param {string} address - POI address
   * @returns {Object} Duplicate check result
   */
  async checkDuplicate(googlePlaceId, name, address) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    // Check by Google Place ID first (exact match)
    const [byPlaceId] = await this.sequelize.query(
      "SELECT id, name, google_placeid FROM POI WHERE google_placeid = ?",
      { replacements: [googlePlaceId] }
    );

    if (byPlaceId.length > 0) {
      return {
        isDuplicate: true,
        type: "exact_match",
        existingPOI: byPlaceId[0]
      };
    }

    // Check by name+address hash (fuzzy match)
    const hash = this.generateDuplicateHash(name, address);
    const [byHash] = await this.sequelize.query(
      "SELECT id, name, address, google_placeid FROM POI WHERE duplicate_hash = ?",
      { replacements: [hash] }
    );

    if (byHash.length > 0) {
      return {
        isDuplicate: true,
        type: "fuzzy_match",
        existingPOI: byHash[0],
        hash
      };
    }

    return {
      isDuplicate: false,
      hash
    };
  }

  /**
   * Auto-categorize POI based on Google types
   * @param {Array} types - Google Place types
   * @returns {Object} Category and subcategory
   */
  autoCategorize(types) {
    if (!types || !Array.isArray(types)) {
      return { category: "other", subcategory: "general" };
    }

    for (const type of types) {
      if (CATEGORY_MAPPING[type]) {
        return CATEGORY_MAPPING[type];
      }
    }

    // Fallback based on common patterns
    if (types.includes("food") || types.includes("meal_takeaway")) {
      return { category: "food", subcategory: "restaurant" };
    }
    if (types.includes("lodging")) {
      return { category: "accommodation", subcategory: "hotel" };
    }
    if (types.includes("point_of_interest")) {
      return { category: "culture", subcategory: "attraction" };
    }

    return { category: "other", subcategory: "general" };
  }

  /**
   * Create new POI with duplicate check and auto-categorization
   * @param {Object} poiData - POI data from Apify
   * @param {string} destination - Destination name
   * @returns {Object} Creation result
   */
  async createPOI(poiData, destination) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const transformed = apifyIntegration.transformToHolidaiButlerFormat(poiData);

    // Check for duplicates
    const duplicateCheck = await this.checkDuplicate(
      transformed.google_placeid,
      transformed.name,
      transformed.address
    );

    if (duplicateCheck.isDuplicate) {
      console.log(`[POILifecycle] Duplicate found for ${transformed.name}: ${duplicateCheck.type}`);
      return {
        success: false,
        reason: "duplicate",
        duplicateType: duplicateCheck.type,
        existingPOI: duplicateCheck.existingPOI
      };
    }

    // Auto-categorize if not provided
    const categories = transformed.category
      ? { category: transformed.category, subcategory: transformed.subcategory }
      : this.autoCategorize(poiData.types || poiData.categories);

    // Skip accommodations
    if (categories.category === "accommodation") {
      console.log(`[POILifecycle] Skipping accommodation: ${transformed.name}`);
      return {
        success: false,
        reason: "accommodation_excluded"
      };
    }

    // Insert new POI
    const [result] = await this.sequelize.query(`
      INSERT INTO POI (
        google_placeid, name, address, latitude, longitude,
        phone, website, category, subcategory, rating,
        review_count, price_level, opening_hours, is_active,
        city, status, duplicate_hash, created_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: [
        transformed.google_placeid,
        transformed.name,
        transformed.address,
        transformed.latitude,
        transformed.longitude,
        transformed.phone,
        transformed.website,
        categories.category,
        categories.subcategory,
        transformed.rating,
        transformed.review_count,
        transformed.price_level,
        transformed.opening_hours,
        destination.split(",")[0],
        POI_STATUS.ACTIVE,
        duplicateCheck.hash
      ]
    });

    await logAgent("data-sync", "poi_created", {
      description: `Created POI: ${transformed.name}`,
      metadata: {
        poiId: result.insertId,
        name: transformed.name,
        category: categories.category,
        destination
      }
    });

    console.log(`[POILifecycle] Created POI: ${transformed.name} (${categories.category}/${categories.subcategory})`);

    return {
      success: true,
      poiId: result.insertId,
      name: transformed.name,
      category: categories.category,
      subcategory: categories.subcategory
    };
  }

  /**
   * Check POI closure status and handle appropriately
   * @param {number} poiId - POI ID
   * @param {Object} apifyData - Fresh data from Apify
   * @returns {Object} Status update result
   */
  async checkClosureStatus(poiId, apifyData) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const isPermanentlyClosed = apifyData.permanentlyClosed === true;
    const isTemporarilyClosed = apifyData.temporarilyClosed === true;

    // Get current POI status
    const [currentPOI] = await this.sequelize.query(
      "SELECT id, name, status, pending_deactivation_date FROM POI WHERE id = ?",
      { replacements: [poiId] }
    );

    if (currentPOI.length === 0) {
      return { success: false, reason: "poi_not_found" };
    }

    const poi = currentPOI[0];

    // Handle permanently closed
    if (isPermanentlyClosed) {
      return this.handlePermanentClosure(poi);
    }

    // Handle temporarily closed
    if (isTemporarilyClosed) {
      return this.handleTemporaryClosure(poi);
    }

    // POI is open - reset any pending deactivation
    if (poi.status === POI_STATUS.PENDING_DEACTIVATION || poi.status === POI_STATUS.TEMPORARILY_CLOSED) {
      await this.sequelize.query(`
        UPDATE POI SET
          status = ?,
          pending_deactivation_date = NULL,
          last_updated = NOW()
        WHERE id = ?
      `, { replacements: [POI_STATUS.ACTIVE, poiId] });

      console.log(`[POILifecycle] POI ${poi.name} reopened - status reset to active`);

      return {
        success: true,
        action: "reactivated",
        previousStatus: poi.status
      };
    }

    return { success: true, action: "no_change" };
  }

  /**
   * Handle permanent closure detection
   * @param {Object} poi - POI record
   * @returns {Object} Result
   */
  async handlePermanentClosure(poi) {
    const now = new Date();
    const graceDate = new Date(now.getTime() + DEACTIVATION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    if (poi.status === POI_STATUS.PENDING_DEACTIVATION) {
      // Check if grace period has passed
      if (poi.pending_deactivation_date && new Date(poi.pending_deactivation_date) <= now) {
        // Grace period passed - deactivate
        await this.sequelize.query(`
          UPDATE POI SET
            status = ?,
            is_active = 0,
            deactivated_at = NOW(),
            last_updated = NOW()
          WHERE id = ?
        `, { replacements: [POI_STATUS.DEACTIVATED, poi.id] });

        await logAlert("medium", `POI permanently deactivated: ${poi.name}`, {
          poiId: poi.id,
          reason: "grace_period_expired"
        });

        console.log(`[POILifecycle] POI ${poi.name} deactivated after grace period`);

        return {
          success: true,
          action: "deactivated",
          reason: "grace_period_expired"
        };
      }

      // Still within grace period
      return {
        success: true,
        action: "pending_deactivation",
        graceEndDate: poi.pending_deactivation_date
      };
    }

    // First detection of permanent closure - start grace period
    await this.sequelize.query(`
      UPDATE POI SET
        status = ?,
        pending_deactivation_date = ?,
        last_updated = NOW()
      WHERE id = ?
    `, { replacements: [POI_STATUS.PENDING_DEACTIVATION, graceDate, poi.id] });

    await logAgent("data-sync", "poi_pending_deactivation", {
      description: `POI marked for deactivation: ${poi.name}`,
      metadata: {
        poiId: poi.id,
        graceEndDate: graceDate.toISOString(),
        gracePeriodDays: DEACTIVATION_GRACE_PERIOD_DAYS
      }
    });

    console.log(`[POILifecycle] POI ${poi.name} marked for deactivation (grace period until ${graceDate.toISOString()})`);

    return {
      success: true,
      action: "grace_period_started",
      graceEndDate: graceDate
    };
  }

  /**
   * Handle temporary closure
   * @param {Object} poi - POI record
   * @returns {Object} Result
   */
  async handleTemporaryClosure(poi) {
    if (poi.status !== POI_STATUS.TEMPORARILY_CLOSED) {
      await this.sequelize.query(`
        UPDATE POI SET
          status = ?,
          last_updated = NOW()
        WHERE id = ?
      `, { replacements: [POI_STATUS.TEMPORARILY_CLOSED, poi.id] });

      await logAgent("data-sync", "poi_temporarily_closed", {
        description: `POI temporarily closed: ${poi.name}`,
        metadata: { poiId: poi.id }
      });

      console.log(`[POILifecycle] POI ${poi.name} marked as temporarily closed`);
    }

    return {
      success: true,
      action: "temporarily_closed"
    };
  }

  /**
   * Process pending deactivations (run daily)
   * @returns {Object} Processing result
   */
  async processPendingDeactivations() {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const now = new Date();

    // Find POIs where grace period has expired
    const [expiredPOIs] = await this.sequelize.query(`
      SELECT id, name, pending_deactivation_date
      FROM POI
      WHERE status = ?
        AND pending_deactivation_date <= ?
    `, { replacements: [POI_STATUS.PENDING_DEACTIVATION, now] });

    let deactivated = 0;
    const deactivatedPOIs = [];

    for (const poi of expiredPOIs) {
      await this.sequelize.query(`
        UPDATE POI SET
          status = ?,
          is_active = 0,
          deactivated_at = NOW(),
          last_updated = NOW()
        WHERE id = ?
      `, { replacements: [POI_STATUS.DEACTIVATED, poi.id] });

      deactivatedPOIs.push({ id: poi.id, name: poi.name });
      deactivated++;
    }

    if (deactivated > 0) {
      await logAgent("data-sync", "batch_deactivation", {
        description: `Deactivated ${deactivated} POIs after grace period`,
        metadata: { count: deactivated, pois: deactivatedPOIs }
      });

      console.log(`[POILifecycle] Batch deactivation: ${deactivated} POIs`);
    }

    return {
      processed: expiredPOIs.length,
      deactivated,
      deactivatedPOIs
    };
  }

  /**
   * Get POIs pending deactivation (for owner review)
   * @returns {Array} POIs pending deactivation
   */
  async getPendingDeactivations() {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const [pending] = await this.sequelize.query(`
      SELECT id, name, category, city, pending_deactivation_date,
             DATEDIFF(pending_deactivation_date, NOW()) as days_remaining
      FROM POI
      WHERE status = ?
      ORDER BY pending_deactivation_date ASC
    `, { replacements: [POI_STATUS.PENDING_DEACTIVATION] });

    return pending;
  }

  /**
   * Cancel pending deactivation (owner override)
   * @param {number} poiId - POI ID
   * @param {string} reason - Reason for cancellation
   * @returns {Object} Result
   */
  async cancelDeactivation(poiId, reason) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    await this.sequelize.query(`
      UPDATE POI SET
        status = ?,
        pending_deactivation_date = NULL,
        last_updated = NOW()
      WHERE id = ?
    `, { replacements: [POI_STATUS.ACTIVE, poiId] });

    await logAgent("data-sync", "deactivation_cancelled", {
      description: `Deactivation cancelled for POI ${poiId}`,
      metadata: { poiId, reason, cancelledBy: "owner" }
    });

    return { success: true, action: "deactivation_cancelled" };
  }

  /**
   * Get lifecycle statistics
   * @returns {Object} Statistics
   */
  async getStats() {
    if (!this.sequelize) {
      return { initialized: false };
    }

    const [stats] = await this.sequelize.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM POI
      GROUP BY status
    `);

    const [recentCreations] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [recentDeactivations] = await this.sequelize.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE deactivated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    return {
      byStatus: stats,
      last7Days: {
        created: recentCreations[0]?.count || 0,
        deactivated: recentDeactivations[0]?.count || 0
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default new POILifecycleManager();
export { POI_STATUS, CATEGORY_MAPPING, DEACTIVATION_GRACE_PERIOD_DAYS };
