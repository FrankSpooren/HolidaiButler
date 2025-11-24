/**
 * Document Model
 * Document management for contracts, proposals, etc.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Document extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      category: this.category,
      fileUrl: this.fileUrl,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      version: this.version,
      status: this.status,
      accountId: this.accountId,
      dealId: this.dealId,
      createdAt: this.createdAt
    };
  }
}

Document.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Type
  type: {
    type: DataTypes.ENUM(
      'contract',
      'proposal',
      'quote',
      'invoice',
      'presentation',
      'case_study',
      'brochure',
      'nda',
      'sow',
      'other'
    ),
    defaultValue: 'other'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
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
    field: 'file_size',
    comment: 'Size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'mime_type'
  },
  fileExtension: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'file_extension'
  },
  // Storage
  storageProvider: {
    type: DataTypes.ENUM('local', 's3', 'gcs', 'azure'),
    defaultValue: 'local',
    field: 'storage_provider'
  },
  storagePath: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'storage_path'
  },
  // Versioning
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  parentDocumentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_document_id'
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'draft',
      'pending_review',
      'approved',
      'sent',
      'signed',
      'expired',
      'archived'
    ),
    defaultValue: 'draft'
  },
  // Relationships
  accountId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'account_id'
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'contact_id'
  },
  dealId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'deal_id'
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'quote_id'
  },
  // Ownership
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'owner_id'
  },
  // Sharing
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  publicUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'public_url'
  },
  publicUrlExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'public_url_expires_at'
  },
  sharedWith: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'shared_with',
    comment: 'Array of { userId, permission: view|edit }'
  },
  // Tracking
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'view_count'
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count'
  },
  lastViewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_viewed_at'
  },
  lastViewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'last_viewed_by'
  },
  // E-signature
  requiresSignature: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'requires_signature'
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'signed_at'
  },
  signedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'signed_by'
  },
  signatureFields: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'signature_fields'
  },
  // Expiry
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  // Tags
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'custom_fields'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Document',
  tableName: 'documents',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['deal_id'] },
    { fields: ['quote_id'] },
    { fields: ['created_by'] },
    { fields: ['owner_id'] },
    { fields: ['is_public'] },
    { fields: ['created_at'] },
    { fields: ['tags'], using: 'gin' }
  ]
});

export default Document;
