/**
 * Data Validator
 * Enterprise-level data validation, integrity checking, and rollback management
 *
 * Features:
 * - Schema validation on Apify responses
 * - Business rules validation (rating 0-5, phone format, etc.)
 * - Referential integrity checks
 * - Before/after diff logging
 * - Automatic rollback on batch failures > 10%
 * - Anomaly detection (rating drops, mass closures)
 *
 * @module agents/dataSync/dataValidator
 * @version 1.0.0
 */

import { logAgent, logAlert, logError } from "../../orchestrator/auditTrail/index.js";

// Validation thresholds
const ROLLBACK_THRESHOLD = 0.10; // 10% failure rate triggers rollback
const RATING_DROP_THRESHOLD = 0.5; // Alert if rating drops by 0.5 or more
const MASS_CLOSURE_THRESHOLD = 0.05; // Alert if >5% of POIs marked closed in one batch

// Schema definitions for validation
const SCHEMAS = {
  poi: {
    required: ["name"],
    optional: ["address", "phone", "website", "rating", "review_count", "opening_hours", "latitude", "longitude"],
    rules: {
      rating: { type: "number", min: 0, max: 5 },
      review_count: { type: "number", min: 0 },
      latitude: { type: "number", min: -90, max: 90 },
      longitude: { type: "number", min: -180, max: 180 },
      phone: { type: "string", pattern: /^[\d\s\+\-\(\)\.]+$/ },
      website: { type: "string", pattern: /^https?:\/\/.+/ }
    }
  },
  review: {
    required: ["rating"],
    optional: ["text", "reviewer_name", "review_date"],
    rules: {
      rating: { type: "number", min: 1, max: 5 },
      text: { type: "string", maxLength: 5000 }
    }
  },
  qa: {
    required: ["question", "answer", "language"],
    optional: ["source", "priority"],
    rules: {
      language: { type: "string", enum: ["nl", "en", "es"] },
      priority: { type: "number", min: 0, max: 100 }
    }
  }
};

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  ratingDropPercent: 20, // Alert if rating drops >20%
  reviewCountDrop: 50, // Alert if review count drops significantly
  massClosureCount: 10, // Alert if >10 POIs closed in one batch
  dataQualityMinScore: 0.7 // Minimum acceptable data quality score
};

class DataValidator {
  constructor() {
    this.sequelize = null;
    this.rollbackStack = new Map(); // Store rollback data by batch ID
    this.batchStats = new Map(); // Track batch statistics
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Validate data against schema
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Schema name (poi, review, qa)
   * @returns {Object} Validation result
   */
  validateSchema(data, schemaName) {
    const schema = SCHEMAS[schemaName];
    if (!schema) {
      return { valid: false, errors: [`Unknown schema: ${schemaName}`] };
    }

    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field rules
    for (const [field, rules] of Object.entries(schema.rules)) {
      const value = data[field];
      if (value === undefined || value === null) continue;

      // Type check
      if (rules.type === "number" && typeof value !== "number") {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          errors.push(`Field ${field} must be a number, got: ${typeof value}`);
          continue;
        }
      }

      if (rules.type === "string" && typeof value !== "string") {
        warnings.push(`Field ${field} expected string, got: ${typeof value}`);
      }

      // Range check for numbers
      if (rules.type === "number") {
        const numValue = typeof value === "number" ? value : parseFloat(value);
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push(`Field ${field} below minimum (${rules.min}): ${numValue}`);
        }
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push(`Field ${field} above maximum (${rules.max}): ${numValue}`);
        }
      }

      // Pattern check for strings
      if (rules.pattern && typeof value === "string" && !rules.pattern.test(value)) {
        warnings.push(`Field ${field} does not match expected pattern: ${value.substring(0, 50)}`);
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field ${field} must be one of: ${rules.enum.join(", ")}`);
      }

      // Max length check
      if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
        warnings.push(`Field ${field} exceeds max length (${rules.maxLength}): ${value.length}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldCount: Object.keys(data).length
    };
  }

  /**
   * Start a validation batch
   * @param {string} batchId - Unique batch identifier
   * @param {string} type - Batch type (poi_sync, review_sync, etc.)
   * @returns {Object} Batch context
   */
  startBatch(batchId, type) {
    const batch = {
      id: batchId,
      type,
      startTime: Date.now(),
      items: [],
      successes: 0,
      failures: 0,
      warnings: 0,
      rollbackData: []
    };

    this.batchStats.set(batchId, batch);
    console.log(`[DataValidator] Started batch ${batchId} (${type})`);

    return batch;
  }

  /**
   * Record before state for potential rollback
   * @param {string} batchId - Batch ID
   * @param {string} table - Table name
   * @param {number} recordId - Record ID
   * @param {Object} beforeState - State before update
   */
  async recordBeforeState(batchId, table, recordId, beforeState) {
    const batch = this.batchStats.get(batchId);
    if (!batch) return;

    batch.rollbackData.push({
      table,
      recordId,
      beforeState,
      timestamp: Date.now()
    });
  }

  /**
   * Validate and record a batch item
   * @param {string} batchId - Batch ID
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Schema name
   * @param {Object} context - Additional context
   * @returns {Object} Validation result
   */
  validateBatchItem(batchId, data, schemaName, context = {}) {
    const batch = this.batchStats.get(batchId);
    if (!batch) {
      return { valid: false, errors: ["Batch not found"] };
    }

    const validation = this.validateSchema(data, schemaName);

    batch.items.push({
      data,
      validation,
      context,
      timestamp: Date.now()
    });

    if (validation.valid) {
      batch.successes++;
    } else {
      batch.failures++;
    }

    if (validation.warnings.length > 0) {
      batch.warnings += validation.warnings.length;
    }

    return validation;
  }

  /**
   * Complete a batch and check if rollback is needed
   * @param {string} batchId - Batch ID
   * @returns {Object} Batch result
   */
  async completeBatch(batchId) {
    const batch = this.batchStats.get(batchId);
    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    batch.endTime = Date.now();
    batch.duration = batch.endTime - batch.startTime;

    const totalItems = batch.successes + batch.failures;
    const failureRate = totalItems > 0 ? batch.failures / totalItems : 0;

    console.log(`[DataValidator] Batch ${batchId} complete: ${batch.successes}/${totalItems} success, ${batch.warnings} warnings`);

    // Check if rollback is needed
    if (failureRate >= ROLLBACK_THRESHOLD && totalItems >= 5) {
      console.log(`[DataValidator] Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold - triggering rollback`);

      const rollbackResult = await this.rollbackBatch(batchId);

      await logAlert("high", `Batch ${batchId} rolled back due to high failure rate`, {
        batchId,
        failureRate: (failureRate * 100).toFixed(1) + "%",
        failures: batch.failures,
        total: totalItems,
        rollbackResult
      });

      return {
        success: false,
        rolledBack: true,
        rollbackResult,
        stats: this.getBatchStats(batchId)
      };
    }

    // Log batch completion
    await logAgent("data-sync", "batch_validated", {
      description: `Batch ${batchId} validated: ${batch.successes}/${totalItems} items`,
      metadata: {
        batchId,
        type: batch.type,
        successes: batch.successes,
        failures: batch.failures,
        warnings: batch.warnings,
        duration: batch.duration
      }
    });

    // Clean up old batches (keep last 10)
    if (this.batchStats.size > 10) {
      const oldestKey = this.batchStats.keys().next().value;
      this.batchStats.delete(oldestKey);
    }

    return {
      success: true,
      stats: this.getBatchStats(batchId)
    };
  }

  /**
   * Rollback a batch
   * @param {string} batchId - Batch ID
   * @returns {Object} Rollback result
   */
  async rollbackBatch(batchId) {
    if (!this.sequelize) {
      return { success: false, error: "Sequelize not initialized" };
    }

    const batch = this.batchStats.get(batchId);
    if (!batch || batch.rollbackData.length === 0) {
      return { success: false, error: "No rollback data available" };
    }

    let rolledBack = 0;
    let failed = 0;

    for (const item of batch.rollbackData) {
      try {
        // Build UPDATE query from before state
        const fields = Object.keys(item.beforeState);
        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const values = [...fields.map(f => item.beforeState[f]), item.recordId];

        await this.sequelize.query(
          `UPDATE ${item.table} SET ${setClause}, last_updated = NOW() WHERE id = ?`,
          { replacements: values }
        );

        rolledBack++;
      } catch (error) {
        console.error(`[DataValidator] Rollback failed for ${item.table}:${item.recordId}:`, error.message);
        failed++;
      }
    }

    await logAgent("data-sync", "batch_rollback", {
      description: `Rolled back batch ${batchId}: ${rolledBack} items restored`,
      metadata: { batchId, rolledBack, failed }
    });

    return { success: true, rolledBack, failed };
  }

  /**
   * Get batch statistics
   * @param {string} batchId - Batch ID
   * @returns {Object} Batch statistics
   */
  getBatchStats(batchId) {
    const batch = this.batchStats.get(batchId);
    if (!batch) return null;

    const totalItems = batch.successes + batch.failures;

    return {
      id: batch.id,
      type: batch.type,
      total: totalItems,
      successes: batch.successes,
      failures: batch.failures,
      warnings: batch.warnings,
      successRate: totalItems > 0 ? ((batch.successes / totalItems) * 100).toFixed(1) + "%" : "N/A",
      duration: batch.duration ? `${batch.duration}ms` : "In progress",
      rollbackDataCount: batch.rollbackData.length
    };
  }

  /**
   * Detect anomalies in data changes
   * @param {Object} before - Before state
   * @param {Object} after - After state
   * @param {string} type - Data type (poi, review, etc.)
   * @returns {Object} Anomaly detection result
   */
  detectAnomalies(before, after, type) {
    const anomalies = [];

    if (type === "poi") {
      // Check for significant rating drop
      if (before.rating && after.rating) {
        const ratingDrop = before.rating - after.rating;
        if (ratingDrop >= RATING_DROP_THRESHOLD) {
          anomalies.push({
            type: "rating_drop",
            severity: ratingDrop >= 1 ? "high" : "medium",
            message: `Rating dropped from ${before.rating} to ${after.rating}`,
            data: { before: before.rating, after: after.rating, drop: ratingDrop }
          });
        }
      }

      // Check for review count drop
      if (before.review_count && after.review_count) {
        const reviewDrop = before.review_count - after.review_count;
        if (reviewDrop >= ANOMALY_THRESHOLDS.reviewCountDrop) {
          anomalies.push({
            type: "review_count_drop",
            severity: "medium",
            message: `Review count dropped from ${before.review_count} to ${after.review_count}`,
            data: { before: before.review_count, after: after.review_count }
          });
        }
      }

      // Check for status change to closed
      if (before.status !== "pending_deactivation" && after.status === "pending_deactivation") {
        anomalies.push({
          type: "poi_marked_closed",
          severity: "low",
          message: `POI marked for deactivation`,
          data: { name: before.name || after.name }
        });
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Detect batch-level anomalies
   * @param {string} batchId - Batch ID
   * @returns {Object} Batch anomaly result
   */
  async detectBatchAnomalies(batchId) {
    const batch = this.batchStats.get(batchId);
    if (!batch) return { hasAnomalies: false };

    const anomalies = [];

    // Check for mass closures
    const closures = batch.items.filter(item =>
      item.context?.statusChange === "closed" ||
      item.context?.statusChange === "pending_deactivation"
    );

    const totalItems = batch.items.length;
    const closureRate = totalItems > 0 ? closures.length / totalItems : 0;

    if (closures.length >= ANOMALY_THRESHOLDS.massClosureCount ||
        closureRate >= MASS_CLOSURE_THRESHOLD) {
      anomalies.push({
        type: "mass_closure",
        severity: "high",
        message: `${closures.length} POIs marked as closed in single batch (${(closureRate * 100).toFixed(1)}%)`,
        data: { count: closures.length, rate: closureRate }
      });

      await logAlert("high", "Mass closure detected", {
        batchId,
        closureCount: closures.length,
        closureRate: (closureRate * 100).toFixed(1) + "%"
      });
    }

    // Check for high warning rate
    const warningRate = totalItems > 0 ? batch.warnings / totalItems : 0;
    if (warningRate > 0.3) { // >30% warnings
      anomalies.push({
        type: "high_warning_rate",
        severity: "medium",
        message: `High warning rate: ${(warningRate * 100).toFixed(1)}%`,
        data: { warnings: batch.warnings, total: totalItems }
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      batchId
    };
  }

  /**
   * Calculate data quality score for a record
   * @param {Object} data - Record data
   * @param {string} type - Data type
   * @returns {Object} Quality score result
   */
  calculateQualityScore(data, type) {
    let score = 1.0;
    const factors = [];

    if (type === "poi") {
      // Completeness checks
      if (!data.address) { score -= 0.1; factors.push("missing_address"); }
      if (!data.phone) { score -= 0.05; factors.push("missing_phone"); }
      if (!data.website) { score -= 0.05; factors.push("missing_website"); }
      if (!data.opening_hours) { score -= 0.1; factors.push("missing_hours"); }
      if (!data.latitude || !data.longitude) { score -= 0.15; factors.push("missing_coords"); }

      // Quality checks
      if (data.rating === 0 || data.rating === null) { score -= 0.1; factors.push("no_rating"); }
      if (data.review_count === 0 || data.review_count === null) { score -= 0.1; factors.push("no_reviews"); }

      // Freshness check
      if (data.last_updated) {
        const daysSinceUpdate = (Date.now() - new Date(data.last_updated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 30) { score -= 0.1; factors.push("stale_data"); }
        if (daysSinceUpdate > 90) { score -= 0.1; factors.push("very_stale_data"); }
      }
    }

    return {
      score: Math.max(0, Math.round(score * 100) / 100),
      factors,
      meetsThreshold: score >= ANOMALY_THRESHOLDS.dataQualityMinScore
    };
  }

  /**
   * Validate referential integrity
   * @param {string} table - Table name
   * @param {Object} data - Data to check
   * @returns {Object} Integrity check result
   */
  async checkReferentialIntegrity(table, data) {
    if (!this.sequelize) {
      return { valid: false, error: "Sequelize not initialized" };
    }

    const issues = [];

    if (table === "Reviews" && data.poi_id) {
      const [poi] = await this.sequelize.query(
        "SELECT id FROM POI WHERE id = ?",
        { replacements: [data.poi_id] }
      );
      if (poi.length === 0) {
        issues.push({ field: "poi_id", issue: "Referenced POI does not exist" });
      }
    }

    if (table === "QA" && data.poi_id) {
      const [poi] = await this.sequelize.query(
        "SELECT id FROM POI WHERE id = ?",
        { replacements: [data.poi_id] }
      );
      if (poi.length === 0) {
        issues.push({ field: "poi_id", issue: "Referenced POI does not exist" });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate diff between two states
   * @param {Object} before - Before state
   * @param {Object} after - After state
   * @returns {Object} Diff object
   */
  generateDiff(before, after) {
    const changes = [];

    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    for (const key of allKeys) {
      const beforeVal = before?.[key];
      const afterVal = after?.[key];

      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes.push({
          field: key,
          before: beforeVal,
          after: afterVal
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changeCount: changes.length,
      changes
    };
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const batches = Array.from(this.batchStats.values());
    const recentBatches = batches.slice(-10);

    let totalItems = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let totalRollbacks = 0;

    for (const batch of recentBatches) {
      totalItems += batch.successes + batch.failures;
      totalSuccesses += batch.successes;
      totalFailures += batch.failures;
      if (batch.rolledBack) totalRollbacks++;
    }

    return {
      recentBatches: recentBatches.length,
      totalItems,
      totalSuccesses,
      totalFailures,
      totalRollbacks,
      overallSuccessRate: totalItems > 0 ? ((totalSuccesses / totalItems) * 100).toFixed(1) + "%" : "N/A",
      rollbackThreshold: (ROLLBACK_THRESHOLD * 100) + "%",
      schemas: Object.keys(SCHEMAS),
      timestamp: new Date().toISOString()
    };
  }
}

export default new DataValidator();
export { SCHEMAS, ROLLBACK_THRESHOLD, ANOMALY_THRESHOLDS };
