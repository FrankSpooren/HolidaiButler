/**
 * Quote Model
 * Sales quotes/proposals
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Quote extends Model {
  // Calculate totals
  calculateTotals() {
    const items = this.lineItems || [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountAmount || (lineTotal * (item.discountPercent || 0) / 100);
      const taxableAmount = lineTotal - discount;
      const tax = taxableAmount * (item.taxRate || 0) / 100;

      subtotal += lineTotal;
      totalDiscount += discount;
      totalTax += tax;
    });

    // Apply quote-level discount
    if (this.discountPercent) {
      totalDiscount += subtotal * this.discountPercent / 100;
    }
    if (this.discountAmount) {
      totalDiscount += this.discountAmount;
    }

    const total = subtotal - totalDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  }

  toPublicJSON() {
    const totals = this.calculateTotals();
    return {
      id: this.id,
      quoteNumber: this.quoteNumber,
      name: this.name,
      status: this.status,
      ...totals,
      currency: this.currency,
      validUntil: this.validUntil,
      accountId: this.accountId,
      dealId: this.dealId,
      createdAt: this.createdAt
    };
  }
}

Quote.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'quote_number'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Status
  status: {
    type: DataTypes.ENUM(
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'viewed',
      'accepted',
      'rejected',
      'expired',
      'cancelled'
    ),
    defaultValue: 'draft'
  },
  // Relationships
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  // Line items
  lineItems: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'line_items',
    comment: 'Array of { productId, name, description, quantity, unitPrice, discountPercent, discountAmount, taxRate, total }'
  },
  // Pricing
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  subtotal: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'discount_percent'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    field: 'discount_amount'
  },
  totalDiscount: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'total_discount'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    field: 'tax_amount'
  },
  total: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0
  },
  // Terms
  paymentTerms: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'payment_terms'
  },
  deliveryTerms: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'delivery_terms'
  },
  // Dates
  validUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'valid_until'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at'
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'viewed_at'
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'accepted_at'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at'
  },
  // Content
  introduction: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Signature
  requireSignature: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'require_signature'
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
  signatureData: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'signature_data'
  },
  // Template
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'template_id'
  },
  // PDF
  pdfUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'pdf_url'
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
  // Approval
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  // Versioning
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  parentQuoteId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_quote_id'
  },
  // Custom fields
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
  modelName: 'Quote',
  tableName: 'quotes',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['quote_number'], unique: true },
    { fields: ['status'] },
    { fields: ['account_id'] },
    { fields: ['contact_id'] },
    { fields: ['deal_id'] },
    { fields: ['created_by'] },
    { fields: ['owner_id'] },
    { fields: ['valid_until'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeSave: async (quote) => {
      const totals = quote.calculateTotals();
      quote.subtotal = totals.subtotal;
      quote.totalDiscount = totals.totalDiscount;
      quote.taxAmount = totals.totalTax;
      quote.total = totals.total;
    }
  }
});

export default Quote;
