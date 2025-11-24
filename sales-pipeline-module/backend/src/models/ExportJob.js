/**
 * ExportJob Model
 * Track data export operations
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class ExportJob extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      entityType: this.entityType,
      status: this.status,
      fileFormat: this.fileFormat,
      totalRecords: this.totalRecords,
      fileUrl: this.fileUrl,
      fileSize: this.fileSize,
      expiresAt: this.expiresAt,
      createdBy: this.createdBy,
      completedAt: this.completedAt,
      createdAt: this.createdAt
    };
  }
}

ExportJob.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Entity type being exported
  entityType: {
    type: DataTypes.ENUM(
      'accounts',
      'contacts',
      'leads',
      'deals',
      'activities',
      'tasks',
      'products',
      'quotes',
      'reports',
      'custom'
    ),
    allowNull: false,
    field: 'entity_type'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'expired'
    ),
    defaultValue: 'pending'
  },
  // Format
  fileFormat: {
    type: DataTypes.ENUM('csv', 'xlsx', 'json', 'pdf'),
    defaultValue: 'csv',
    field: 'file_format'
  },
  // Filters
  filters: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Query filters applied to export'
  },
  // Columns
  columns: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Columns to include in export'
  },
  columnLabels: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'column_labels',
    comment: 'Custom labels for columns'
  },
  // Sort
  sortBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'sort_by'
  },
  sortOrder: {
    type: DataTypes.ENUM('asc', 'desc'),
    defaultValue: 'desc',
    field: 'sort_order'
  },
  // Progress
  totalRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_records'
  },
  processedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'processed_records'
  },
  // Output file
  fileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_name'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size'
  },
  // Expiry
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
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
  // Error
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  // Ownership
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  // Options
  options: {
    type: DataTypes.JSONB,
    defaultValue: {
      includeHeaders: true,
      dateFormat: 'YYYY-MM-DD',
      timezone: 'Europe/Amsterdam',
      encoding: 'utf-8'
    }
  },
  // Notification
  notifyOnComplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_on_complete'
  },
  notifyEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'notify_email'
  },
  // Download tracking
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count'
  },
  lastDownloadedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_downloaded_at'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'ExportJob',
  tableName: 'export_jobs',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['entity_type'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
    { fields: ['expires_at'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeCreate: async (job) => {
      // Set default expiry to 7 days
      if (!job.expiresAt) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        job.expiresAt = expiryDate;
      }
    },
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

export default ExportJob;
