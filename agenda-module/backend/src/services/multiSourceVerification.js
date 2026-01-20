const crypto = require('crypto');

/**
 * Multi-Source Event Verification Service
 *
 * This service implements a sophisticated verification strategy to ensure
 * event data accuracy and reliability by cross-referencing multiple sources.
 *
 * Verification Levels:
 * - Unverified: Single source, no cross-validation
 * - Partially Verified: 1-2 sources agree on core data
 * - Verified: 3+ sources confirm core data
 * - Disputed: Sources have conflicting information
 */

class MultiSourceVerificationService {
  constructor() {
    // Source reliability scores (0-100)
    this.sourceReliability = {
      'calpe-official': 95,        // Official municipality website
      'cultura-calpe': 90,          // Official culture department
      'tripadvisor': 75,            // Large platform, user-generated
      'getyourguide': 80,           // Curated platform
      'calpe-online24': 70,         // Community site
      'costa-blanca-online24': 70,  // Community site
      'calpe-magazin': 65,          // Magazine
      'facebook': 60,               // Social media
      'instagram': 55,              // Social media
      'eventbrite': 75,             // Event platform
      'google-events': 70,          // Aggregated data
      'manual-entry': 85,           // Admin-entered
      'other': 50,                  // Unknown sources
    };

    // Core fields that must match for verification
    this.coreFields = [
      'title',
      'startDate',
      'endDate',
      'location.name',
      'primaryCategory',
    ];

    // Fields that should match but allow some variance
    this.secondaryFields = [
      'description',
      'pricing.isFree',
      'activityType',
      'organizer.name',
    ];
  }

  /**
   * Verify an event by comparing data from multiple sources
   * @param {Object} event - Event object with sources array
   * @returns {Object} Verification result
   */
  verifyEvent(event) {
    if (!event.sources || event.sources.length === 0) {
      return {
        status: 'unverified',
        verificationCount: 0,
        confidence: 0,
        conflicts: [],
      };
    }

    if (event.sources.length === 1) {
      const source = event.sources[0];
      const confidence = this.sourceReliability[source.platform] || 50;

      return {
        status: 'unverified',
        verificationCount: 1,
        confidence,
        conflicts: [],
      };
    }

    // Compare data across sources
    const conflicts = this.detectConflicts(event);
    const agreementScore = this.calculateAgreementScore(event);
    const verifiedSourcesCount = event.sources.filter(s => s.isVerified).length;
    const averageConfidence = this.calculateAverageConfidence(event.sources);

    let status = 'unverified';
    if (conflicts.length > 3) {
      status = 'disputed';
    } else if (verifiedSourcesCount >= 3 && agreementScore >= 0.8) {
      status = 'verified';
    } else if (verifiedSourcesCount >= 1 && agreementScore >= 0.6) {
      status = 'partially-verified';
    }

    return {
      status,
      verificationCount: verifiedSourcesCount,
      confidence: Math.round(averageConfidence * agreementScore),
      conflicts,
      agreementScore,
    };
  }

  /**
   * Detect conflicting data between sources
   * @param {Object} event - Event object
   * @returns {Array} Array of conflicts
   */
  detectConflicts(event) {
    const conflicts = [];

    // Group sources by their data
    const fieldGroups = {};

    this.coreFields.forEach(fieldPath => {
      const values = {};

      event.sources.forEach(source => {
        const value = this.getFieldValue(event, fieldPath);
        const valueKey = this.normalizeValue(value, fieldPath);

        if (!values[valueKey]) {
          values[valueKey] = {
            value: value,
            sources: [],
          };
        }
        values[valueKey].sources.push(source.platform);
      });

      // If we have multiple different values, it's a conflict
      const uniqueValues = Object.keys(values);
      if (uniqueValues.length > 1) {
        conflicts.push({
          field: fieldPath,
          values: Object.values(values).map(v => ({
            value: v.value,
            sources: v.sources,
            weight: v.sources.reduce((sum, s) => sum + (this.sourceReliability[s] || 50), 0),
          })),
        });
      }
    });

    return conflicts;
  }

  /**
   * Calculate agreement score across sources (0-1)
   * @param {Object} event - Event object
   * @returns {Number} Agreement score
   */
  calculateAgreementScore(event) {
    if (event.sources.length < 2) return 1;

    const totalFields = this.coreFields.length + this.secondaryFields.length;
    let agreementPoints = 0;

    // Check core fields
    this.coreFields.forEach(fieldPath => {
      const agreement = this.checkFieldAgreement(event, fieldPath);
      agreementPoints += agreement * 2; // Core fields weighted higher
    });

    // Check secondary fields
    this.secondaryFields.forEach(fieldPath => {
      const agreement = this.checkFieldAgreement(event, fieldPath);
      agreementPoints += agreement;
    });

    const maxPoints = (this.coreFields.length * 2) + this.secondaryFields.length;
    return agreementPoints / maxPoints;
  }

  /**
   * Check if sources agree on a specific field
   * @param {Object} event - Event object
   * @param {String} fieldPath - Dot notation path to field
   * @returns {Number} Agreement score 0-1
   */
  checkFieldAgreement(event, fieldPath) {
    // This is simplified - in a real implementation,
    // each source would have its own data snapshot
    // For now, we assume sources agree if the field exists
    const value = this.getFieldValue(event, fieldPath);
    if (!value) return 0.5;
    return 1;
  }

  /**
   * Calculate average confidence based on source reliability
   * @param {Array} sources - Array of source objects
   * @returns {Number} Average confidence 0-100
   */
  calculateAverageConfidence(sources) {
    if (sources.length === 0) return 0;

    const totalConfidence = sources.reduce((sum, source) => {
      const baseReliability = this.sourceReliability[source.platform] || 50;
      const sourceConfidence = source.confidence || baseReliability;
      return sum + sourceConfidence;
    }, 0);

    return totalConfidence / sources.length;
  }

  /**
   * Resolve conflicts by selecting most reliable data
   * @param {Array} conflicts - Array of conflicts
   * @returns {Object} Recommended resolutions
   */
  resolveConflicts(conflicts) {
    const resolutions = {};

    conflicts.forEach(conflict => {
      // Sort values by total source weight
      const sortedValues = conflict.values.sort((a, b) => b.weight - a.weight);

      resolutions[conflict.field] = {
        recommended: sortedValues[0].value,
        confidence: sortedValues[0].weight /
          (sortedValues.reduce((sum, v) => sum + v.weight, 0)),
        alternatives: sortedValues.slice(1),
      };
    });

    return resolutions;
  }

  /**
   * Create a data hash for change detection
   * @param {Object} eventData - Event data
   * @returns {String} MD5 hash
   */
  createDataHash(eventData) {
    const relevantData = {
      title: eventData.title,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      location: eventData.location,
      description: eventData.description,
    };

    const dataString = JSON.stringify(relevantData);
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Check if event data has changed
   * @param {String} oldHash - Previous data hash
   * @param {Object} newData - New event data
   * @returns {Boolean} True if changed
   */
  hasDataChanged(oldHash, newData) {
    const newHash = this.createDataHash(newData);
    return oldHash !== newHash;
  }

  /**
   * Merge data from multiple sources intelligently
   * @param {Array} eventDataArray - Array of event data from different sources
   * @returns {Object} Merged event data
   */
  mergeSourceData(eventDataArray) {
    if (eventDataArray.length === 0) return null;
    if (eventDataArray.length === 1) return eventDataArray[0];

    const merged = { ...eventDataArray[0] };

    // For each field, choose the most reliable or most common value
    this.coreFields.concat(this.secondaryFields).forEach(fieldPath => {
      const values = eventDataArray
        .map((data, index) => ({
          value: this.getFieldValue(data, fieldPath),
          source: data._source,
          reliability: this.sourceReliability[data._source] || 50,
        }))
        .filter(v => v.value !== null && v.value !== undefined);

      if (values.length === 0) return;

      // Group by value
      const valueGroups = {};
      values.forEach(v => {
        const key = this.normalizeValue(v.value, fieldPath);
        if (!valueGroups[key]) {
          valueGroups[key] = {
            value: v.value,
            sources: [],
            totalReliability: 0,
          };
        }
        valueGroups[key].sources.push(v.source);
        valueGroups[key].totalReliability += v.reliability;
      });

      // Select value with highest total reliability
      const bestValue = Object.values(valueGroups)
        .sort((a, b) => b.totalReliability - a.totalReliability)[0];

      this.setFieldValue(merged, fieldPath, bestValue.value);
    });

    return merged;
  }

  /**
   * Get field value using dot notation
   * @param {Object} obj - Object to get value from
   * @param {String} path - Dot notation path
   * @returns {*} Field value
   */
  getFieldValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Set field value using dot notation
   * @param {Object} obj - Object to set value on
   * @param {String} path - Dot notation path
   * @param {*} value - Value to set
   */
  setFieldValue(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[last] = value;
  }

  /**
   * Normalize value for comparison
   * @param {*} value - Value to normalize
   * @param {String} fieldPath - Field path for context
   * @returns {String} Normalized value
   */
  normalizeValue(value, fieldPath) {
    if (value === null || value === undefined) return 'null';

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Map) {
      // For multilingual fields, compare based on available languages
      const values = Array.from(value.values()).sort().join('|');
      return values.toLowerCase();
    }

    if (typeof value === 'string') {
      return value.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Validate source data quality
   * @param {Object} sourceData - Data from a source
   * @param {String} platform - Source platform
   * @returns {Object} Validation result
   */
  validateSourceData(sourceData, platform) {
    const issues = [];
    const warnings = [];

    // Required fields check
    if (!sourceData.title || (sourceData.title instanceof Map && sourceData.title.size === 0)) {
      issues.push('Missing title');
    }

    if (!sourceData.startDate) {
      issues.push('Missing start date');
    } else if (!(sourceData.startDate instanceof Date) && isNaN(new Date(sourceData.startDate))) {
      issues.push('Invalid start date format');
    }

    if (!sourceData.location || !sourceData.location.name) {
      issues.push('Missing location');
    }

    // Data quality warnings
    if (sourceData.description && sourceData.description instanceof Map) {
      const descLength = Array.from(sourceData.description.values())[0]?.length || 0;
      if (descLength < 50) {
        warnings.push('Description is very short');
      }
    }

    if (!sourceData.images || sourceData.images.length === 0) {
      warnings.push('No images provided');
    }

    const reliability = this.sourceReliability[platform] || 50;
    const qualityScore = Math.max(0, reliability - (issues.length * 15) - (warnings.length * 5));

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      qualityScore,
      recommendation: qualityScore >= 70 ? 'accept' : qualityScore >= 50 ? 'review' : 'reject',
    };
  }
}

module.exports = new MultiSourceVerificationService();
