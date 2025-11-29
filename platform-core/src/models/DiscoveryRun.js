/**
 * Discovery Run Model (MySQL)
 * Tracks POI discovery operations for monitoring and auditing
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';

const DiscoveryRun = mysqlSequelize.define('DiscoveryRun', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Run identification
  run_type: {
    type: DataTypes.ENUM('destination', 'category', 'manual', 'scheduled'),
    allowNull: false,
    defaultValue: 'destination',
  },

  // Target information
  destination: {
    type: DataTypes.STRING(255),
    comment: 'Target destination (e.g., "Valencia, Spain")',
  },
  city: {
    type: DataTypes.STRING(100),
    comment: 'City extracted from destination',
  },
  country: {
    type: DataTypes.STRING(100),
    comment: 'Country extracted from destination',
  },

  // Configuration
  config_id: {
    type: DataTypes.UUID,
    comment: 'Reference to DestinationConfig if used',
  },
  categories: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Categories searched in this run',
  },
  sources: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Data sources used in this run',
  },
  criteria: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Search criteria applied',
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },

  // Progress tracking
  progress: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Progress by category/source: {food_drinks: {total: 100, processed: 50}}',
  },
  current_step: {
    type: DataTypes.STRING(255),
    comment: 'Current step being executed',
  },

  // Results
  pois_found: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total POIs found from all sources',
  },
  pois_created: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'New POIs created in database',
  },
  pois_updated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Existing POIs updated',
  },
  pois_skipped: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'POIs skipped (duplicates, failed criteria)',
  },
  pois_failed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'POIs that failed to process',
  },

  // Cost tracking
  api_calls_made: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of API calls made',
  },
  estimated_cost_eur: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Estimated cost in EUR',
  },

  // Timing
  started_at: {
    type: DataTypes.DATE,
    comment: 'When the discovery run started',
  },
  completed_at: {
    type: DataTypes.DATE,
    comment: 'When the discovery run completed',
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    comment: 'Total duration in seconds',
  },

  // Error handling
  error_message: {
    type: DataTypes.TEXT,
    comment: 'Error message if failed',
  },
  errors: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of errors encountered during run',
  },

  // Metadata
  triggered_by: {
    type: DataTypes.STRING(255),
    comment: 'User, system, or workflow that triggered this run',
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Additional notes about this run',
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional metadata',
  },
}, {
  tableName: 'discovery_runs',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['destination'] },
    { fields: ['city'] },
    { fields: ['config_id'] },
    { fields: ['started_at'] },
    { fields: ['run_type'] },
  ],
});

// Instance methods
DiscoveryRun.prototype.start = async function() {
  this.status = 'running';
  this.started_at = new Date();
  await this.save();
};

DiscoveryRun.prototype.complete = async function() {
  this.status = 'completed';
  this.completed_at = new Date();
  if (this.started_at) {
    this.duration_seconds = Math.floor((this.completed_at - this.started_at) / 1000);
  }
  await this.save();
};

DiscoveryRun.prototype.fail = async function(errorMessage) {
  this.status = 'failed';
  this.error_message = errorMessage;
  this.completed_at = new Date();
  if (this.started_at) {
    this.duration_seconds = Math.floor((this.completed_at - this.started_at) / 1000);
  }
  await this.save();
};

DiscoveryRun.prototype.updateProgress = async function(step, progressData) {
  this.current_step = step;
  if (progressData) {
    this.progress = { ...this.progress, ...progressData };
  }
  await this.save();
};

DiscoveryRun.prototype.addError = async function(error) {
  const errors = this.errors || [];
  errors.push({
    timestamp: new Date(),
    message: error.message || error,
    stack: error.stack,
  });
  this.errors = errors;
  await this.save();
};

DiscoveryRun.prototype.incrementStats = async function(stats) {
  if (stats.found) this.pois_found += stats.found;
  if (stats.created) this.pois_created += stats.created;
  if (stats.updated) this.pois_updated += stats.updated;
  if (stats.skipped) this.pois_skipped += stats.skipped;
  if (stats.failed) this.pois_failed += stats.failed;
  if (stats.apiCalls) this.api_calls_made += stats.apiCalls;
  if (stats.cost) this.estimated_cost_eur = parseFloat(this.estimated_cost_eur) + stats.cost;
  await this.save();
};

DiscoveryRun.prototype.getSummary = function() {
  return {
    id: this.id,
    destination: this.destination,
    status: this.status,
    results: {
      found: this.pois_found,
      created: this.pois_created,
      updated: this.pois_updated,
      skipped: this.pois_skipped,
      failed: this.pois_failed,
    },
    cost: {
      apiCalls: this.api_calls_made,
      estimatedCostEur: parseFloat(this.estimated_cost_eur),
    },
    timing: {
      startedAt: this.started_at,
      completedAt: this.completed_at,
      durationSeconds: this.duration_seconds,
    },
    currentStep: this.current_step,
  };
};

// Static methods
DiscoveryRun.getRecentRuns = async function(limit = 20) {
  return await this.findAll({
    order: [['created_at', 'DESC']],
    limit,
  });
};

DiscoveryRun.getRunsByDestination = async function(destination, limit = 10) {
  return await this.findAll({
    where: { destination },
    order: [['created_at', 'DESC']],
    limit,
  });
};

DiscoveryRun.getRunningRuns = async function() {
  return await this.findAll({
    where: {
      status: 'running',
    },
    order: [['started_at', 'ASC']],
  });
};

export default DiscoveryRun;
