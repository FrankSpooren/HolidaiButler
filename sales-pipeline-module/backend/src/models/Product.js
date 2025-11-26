/**
 * Product Model
 * Product/Service catalog for deals
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Product extends Model {
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      category: this.category,
      price: this.price,
      currency: this.currency,
      billingPeriod: this.billingPeriod,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

Product.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'short_description'
  },
  // Category
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  subCategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'sub_category'
  },
  type: {
    type: DataTypes.ENUM('product', 'service', 'subscription', 'bundle'),
    defaultValue: 'product'
  },
  // Pricing
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  costPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'cost_price'
  },
  // Billing
  billingPeriod: {
    type: DataTypes.ENUM('one_time', 'monthly', 'quarterly', 'annually'),
    defaultValue: 'one_time',
    field: 'billing_period'
  },
  // Quantity
  hasQuantity: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'has_quantity'
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'min_quantity'
  },
  maxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_quantity'
  },
  // Discount
  allowDiscount: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_discount'
  },
  maxDiscountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'max_discount_percent'
  },
  // Tax
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 21.00,
    field: 'tax_rate'
  },
  taxIncluded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'tax_included'
  },
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  // Features (for display)
  features: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of feature strings'
  },
  // Image
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  // Display
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  // Metrics
  totalSold: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_sold'
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'total_revenue'
  },
  // Custom fields
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'custom_fields'
  },
  // Integration
  externalIds: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'external_ids'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['code'], unique: true },
    { fields: ['category'] },
    { fields: ['type'] },
    { fields: ['is_active'] },
    { fields: ['price'] },
    { fields: ['display_order'] }
  ]
});

export default Product;
