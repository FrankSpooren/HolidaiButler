/**
 * GDPR Data Inventory
 * Tracks all personal data storage locations per Art. 30 GDPR
 *
 * Enterprise-level data mapping for compliance
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

/**
 * Data Inventory - Maps all personal data locations
 * Based on actual HolidaiButler database schema
 */
const DATA_INVENTORY = {
  // User personal data locations
  USER_DATA: {
    category: 'Customer Data',
    legalBasis: 'Contract Performance (Art. 6.1.b)',
    retentionPeriod: '3 years after last activity',
    locations: [
      {
        table: 'Users',
        database: 'MySQL',
        fields: ['email', 'name', 'uuid', 'last_login', 'created_at'],
        purpose: 'Account management and service delivery',
        encryption: 'At rest (AES-256)'
      },
      {
        table: 'User_Preferences',
        database: 'MySQL',
        fields: ['travel_companion', 'interests', 'dietary_preferences', 'accessibility_needs', 'preferred_language', 'home_location'],
        purpose: 'Personalized recommendations',
        encryption: 'At rest (AES-256)'
      },
      {
        table: 'user_consent',
        database: 'MySQL',
        fields: ['consent_essential', 'consent_analytics', 'consent_personalization', 'consent_marketing'],
        purpose: 'GDPR consent tracking',
        encryption: 'At rest'
      },
      {
        collection: 'chat_logs',
        database: 'MongoDB',
        fields: ['user_id', 'messages', 'session_data'],
        purpose: 'Customer support and AI improvement',
        encryption: 'At rest',
        retention: '90 days'
      }
    ]
  },

  // Partner/AdminUser data
  PARTNER_DATA: {
    category: 'Business Partner Data',
    legalBasis: 'Contract Performance (Art. 6.1.b)',
    retentionPeriod: '7 years (fiscal requirements)',
    approvalRequired: true,
    locations: [
      {
        table: 'AdminUsers',
        database: 'MySQL',
        fields: ['email', 'first_name', 'last_name', 'phone', 'company_name'],
        purpose: 'Partner portal access and communication',
        encryption: 'At rest (AES-256)'
      }
    ]
  },

  // Booking and transaction data
  TRANSACTION_DATA: {
    category: 'Transaction Data',
    legalBasis: 'Contract Performance + Legal Obligation (Art. 6.1.b/c)',
    retentionPeriod: '7 years (fiscal requirements)',
    locations: [
      {
        table: 'transactions',
        database: 'MySQL',
        fields: ['customer_user_id', 'customer_email', 'customer_name', 'customer_phone', 'billing_address', 'total_amount'],
        purpose: 'Payment processing and fiscal compliance',
        encryption: 'At rest (AES-256)'
      },
      {
        table: 'tickets',
        database: 'MySQL',
        fields: ['user_id', 'holder_name', 'holder_email', 'holder_phone'],
        purpose: 'Ticket delivery and event access',
        encryption: 'At rest'
      },
      {
        table: 'bookings',
        database: 'MySQL',
        fields: ['user_id', 'guest_name', 'guest_email', 'guest_phone'],
        purpose: 'Reservation management',
        encryption: 'At rest'
      }
    ]
  },

  // Communication data
  COMMUNICATION_DATA: {
    category: 'Communication Data',
    legalBasis: 'Contract Performance (Art. 6.1.b)',
    retentionPeriod: '90 days',
    locations: [
      {
        table: 'user_journeys',
        database: 'MySQL',
        fields: ['user_id', 'journey_type', 'metadata'],
        purpose: 'Marketing automation journeys',
        retention: '90 days'
      },
      {
        table: 'journey_scheduled_emails',
        database: 'MySQL',
        fields: ['template_id', 'subject'],
        purpose: 'Email delivery tracking',
        retention: '90 days'
      }
    ]
  },

  // Analytics and audit data
  ANALYTICS_DATA: {
    category: 'Analytics Data',
    legalBasis: 'Legitimate Interest (Art. 6.1.f)',
    retentionPeriod: '30 days',
    locations: [
      {
        collection: 'audit_logs',
        database: 'MongoDB',
        fields: ['user_id', 'action', 'ip_address', 'user_agent'],
        purpose: 'Security and compliance monitoring',
        retention: '30 days'
      },
      {
        table: 'holibot_sessions',
        database: 'MySQL',
        fields: ['user_id', 'session_data'],
        purpose: 'Chatbot interaction tracking',
        retention: 'Configurable'
      }
    ]
  },

  // Vector database embeddings
  VECTOR_DATA: {
    category: 'AI Processing Data',
    legalBasis: 'Legitimate Interest (Art. 6.1.f)',
    retentionPeriod: 'Until source data deletion',
    locations: [
      {
        collection: 'holidaibutler_pois',
        database: 'ChromaDB',
        fields: ['poi_id', 'embedding'],
        purpose: 'AI-powered search and recommendations',
        note: 'No direct personal data, derived from POI content'
      },
      {
        collection: 'holidaibutler_qas',
        database: 'ChromaDB',
        fields: ['qa_id', 'embedding'],
        purpose: 'AI-powered chatbot responses',
        note: 'No direct personal data'
      }
    ]
  }
};

/**
 * Data Subject Rights (GDPR Chapter 3)
 */
const DATA_SUBJECT_RIGHTS = {
  ACCESS: {
    article: 'Art. 15',
    name: 'Right of Access',
    deadline: '30 days',
    description: 'Provide copy of all personal data'
  },
  RECTIFICATION: {
    article: 'Art. 16',
    name: 'Right to Rectification',
    deadline: '30 days',
    description: 'Correct inaccurate personal data'
  },
  ERASURE: {
    article: 'Art. 17',
    name: 'Right to Erasure',
    deadline: '72 hours',
    description: 'Delete personal data (right to be forgotten)'
  },
  RESTRICTION: {
    article: 'Art. 18',
    name: 'Right to Restriction',
    deadline: '30 days',
    description: 'Restrict processing of personal data'
  },
  PORTABILITY: {
    article: 'Art. 20',
    name: 'Right to Data Portability',
    deadline: '30 days',
    description: 'Receive data in machine-readable format'
  },
  OBJECTION: {
    article: 'Art. 21',
    name: 'Right to Object',
    deadline: '30 days',
    description: 'Object to processing based on legitimate interest'
  }
};

class DataInventory {
  /**
   * Get complete data inventory
   */
  getInventory() {
    return DATA_INVENTORY;
  }

  /**
   * Get data subject rights
   */
  getDataSubjectRights() {
    return DATA_SUBJECT_RIGHTS;
  }

  /**
   * Get data locations for a specific user type
   */
  getDataLocationsForUserType(userType = 'USER') {
    const inventoryKey = `${userType}_DATA`;
    return DATA_INVENTORY[inventoryKey] || null;
  }

  /**
   * Get all tables/collections containing personal data
   */
  getAllPersonalDataLocations() {
    const locations = [];

    for (const [category, data] of Object.entries(DATA_INVENTORY)) {
      for (const location of data.locations) {
        locations.push({
          category,
          legalBasis: data.legalBasis,
          retentionPeriod: data.retentionPeriod,
          approvalRequired: data.approvalRequired || false,
          ...location
        });
      }
    }

    return locations;
  }

  /**
   * Check if a table contains personal data
   */
  containsPersonalData(tableName) {
    const locations = this.getAllPersonalDataLocations();
    return locations.some(loc =>
      loc.table === tableName || loc.collection === tableName
    );
  }

  /**
   * Get retention period for a specific data type
   */
  getRetentionPeriod(category) {
    return DATA_INVENTORY[category]?.retentionPeriod || 'Not specified';
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      dataCategories: Object.keys(DATA_INVENTORY).length,
      totalDataLocations: this.getAllPersonalDataLocations().length,
      inventory: DATA_INVENTORY,
      dataSubjectRights: DATA_SUBJECT_RIGHTS
    };

    await logAgent('gdpr', 'compliance_report_generated', {
      description: 'Generated GDPR compliance report',
      metadata: {
        categories: report.dataCategories,
        locations: report.totalDataLocations
      }
    });

    return report;
  }
}

export default new DataInventory();
