/**
 * ImportJob Model
 * Track data import operations
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class ImportJob extends Model {
  getProgress() {
    if (this.totalRows === 0) return 0;
    return Math.round((this.processedRows / this.totalRows) * 100);
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      entityType: this.entityType,
      status: this.status,
      progress: this.getProgress(),
      totalRows: this.totalRows,
      successCount: this.successCount,
      errorCount: this.errorCount,
      duplicateCount: this.duplicateCount,
      createdBy: this.createdBy,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt
    };
  }
}

ImportJob.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Entity type being imported
  entityType: {
    type: DataTypes.ENUM(
      'accounts',
      'contacts',
      'leads',
      'deals',
      'activities',
      'products',
      'custom'
    ),
    allowNull: false,
    field: 'entity_type'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'pending',
      'validating',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'paused'
    ),
    defaultValue: 'pending'
  },
  // File info
  fileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size'
  },
  fileFormat: {
    type: DataTypes.ENUM('csv', 'xlsx', 'json'),
    allowNull: false,
    field: 'file_format'
  },
  // Mapping
  columnMapping: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'column_mapping',
    comment: '{ sourceColumn: targetField }'
  },
  // Options
  options: {
    type: DataTypes.JSONB,
    defaultValue: {
      skipDuplicates: true,
      updateExisting: false,
      validateOnly: false,
      batchSize: 100
    }
  },
  // Duplicate detection
  duplicateField: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'duplicate_field',
    comment: 'Field to check for duplicates (e.g., email)'
  },
  duplicateAction: {
    type: DataTypes.ENUM('skip', 'update', 'create'),
    defaultValue: 'skip',
    field: 'duplicate_action'
  },
  // Progress
  totalRows: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_rows'
  },
  processedRows: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'processed_rows'
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'success_count'
  },
  errorCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'error_count'
  },
  duplicateCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'duplicate_count'
  },
  skippedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'skipped_count'
  },
  // Errors
  errors: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of { row, field, error, data }'
  },
  errorFileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'error_file_url'
  },
  // Created records
  createdIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'created_ids'
  },
  updatedIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'updated_ids'
  },
  // Timing
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  // Ownership
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  // Default values for imported records
  defaultValues: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'default_values',
    comment: 'Default values to apply to all imported records'
  },
  // Assign to
  assignToUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assign_to_user_id'
  },
  assignToTeamId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assign_to_team_id'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'ImportJob',
  tableName: 'import_jobs',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['entity_type'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeUpdate: async (job) => {
      if (job.changed('status')) {
        if (job.status === 'processing' && !job.startedAt) {
          job.startedAt = new Date();
        }
        if (['completed', 'failed', 'cancelled'].includes(job.status) && !job.completedAt) {
          job.completedAt = new Date();
          if (job.startedAt) {
            job.duration = Math.floor((job.completedAt - job.startedAt) / 1000);
          }
        }
      }
    }
  }
});

export default ImportJob;
