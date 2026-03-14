/**
 * SocialAccount Model
 * Social media accounts per destination — Content Module Fase A
 * Includes AES-256-CBC token encryption helpers
 */

import { DataTypes } from 'sequelize';
import { mysqlSequelize } from '../config/database.js';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const getEncryptionKey = () => {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me-32-chars!!';
  // Ensure 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
};

const SocialAccount = mysqlSequelize.define('SocialAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  destination_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  platform: {
    type: DataTypes.ENUM('facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'snapchat'),
    allowNull: false,
  },
  account_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  account_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  access_token_encrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refresh_token_encrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  connected_by: {
    type: DataTypes.STRING(36),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'disconnected', 'expired', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
  },
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'social_accounts',
  timestamps: false,
});

// ============================================================================
// Token encryption helpers (AES-256-CBC)
// ============================================================================

SocialAccount.encryptToken = function (plaintext) {
  if (!plaintext) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

SocialAccount.decryptToken = function (ciphertext) {
  if (!ciphertext) return null;
  const key = getEncryptionKey();
  const [ivHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !encrypted) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export default SocialAccount;
