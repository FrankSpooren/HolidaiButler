/**
 * Request Validation Middleware
 * Input validation using Joi schemas
 */

import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Generic validation middleware
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    req[property] = value;
    next();
  };
};

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Auth schemas
export const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    rememberMe: Joi.boolean().default(false)
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: Joi.string().allow('', null),
    role: Joi.string().valid('sales_rep', 'sales_manager', 'marketing', 'support', 'viewer').default('sales_rep')
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required()
  }),

  verify2FA: Joi.object({
    tempToken: Joi.string().required(),
    code: Joi.string().length(6).required()
  })
};

// User schemas
export const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: Joi.string().allow('', null),
    whatsappNumber: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    role: Joi.string().valid('super_admin', 'admin', 'sales_manager', 'sales_rep', 'marketing', 'support', 'viewer').required(),
    teamId: Joi.string().uuid().allow(null),
    managerId: Joi.string().uuid().allow(null),
    quotaTarget: Joi.number().min(0).allow(null)
  }),

  update: Joi.object({
    email: Joi.string().email(),
    firstName: Joi.string().min(1).max(100),
    lastName: Joi.string().min(1).max(100),
    phone: Joi.string().allow('', null),
    whatsappNumber: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    role: Joi.string().valid('super_admin', 'admin', 'sales_manager', 'sales_rep', 'marketing', 'support', 'viewer'),
    teamId: Joi.string().uuid().allow(null),
    managerId: Joi.string().uuid().allow(null),
    status: Joi.string().valid('active', 'inactive', 'suspended'),
    quotaTarget: Joi.number().min(0).allow(null),
    notificationPreferences: Joi.object()
  })
};

// Account schemas
export const accountSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    legalName: Joi.string().allow('', null),
    domain: Joi.string().uri().allow('', null),
    website: Joi.string().uri().allow('', null),
    industry: Joi.string().allow('', null),
    type: Joi.string().valid('prospect', 'customer', 'partner', 'competitor', 'vendor', 'other').default('prospect'),
    tier: Joi.string().valid('enterprise', 'mid_market', 'smb', 'startup').allow(null),
    employeeCount: Joi.number().integer().min(0).allow(null),
    annualRevenue: Joi.number().min(0).allow(null),
    phone: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null),
    billingAddress: Joi.object({
      street: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().allow(''),
      postalCode: Joi.string().allow(''),
      country: Joi.string().allow('')
    }).default({}),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()).default([]),
    customFields: Joi.object().default({})
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255),
    legalName: Joi.string().allow('', null),
    domain: Joi.string().uri().allow('', null),
    website: Joi.string().uri().allow('', null),
    industry: Joi.string().allow('', null),
    type: Joi.string().valid('prospect', 'customer', 'partner', 'competitor', 'vendor', 'other'),
    status: Joi.string().valid('active', 'inactive', 'churned', 'at_risk', 'on_hold'),
    tier: Joi.string().valid('enterprise', 'mid_market', 'smb', 'startup').allow(null),
    employeeCount: Joi.number().integer().min(0).allow(null),
    annualRevenue: Joi.number().min(0).allow(null),
    phone: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null),
    billingAddress: Joi.object(),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object()
  })
};

// Contact schemas
export const contactSchemas = {
  create: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null),
    mobilePhone: Joi.string().allow('', null),
    whatsappNumber: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    accountId: Joi.string().uuid().allow(null),
    isPrimary: Joi.boolean().default(false),
    ownerId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()).default([]),
    customFields: Joi.object().default({})
  }),

  update: Joi.object({
    firstName: Joi.string().min(1).max(100),
    lastName: Joi.string().min(1).max(100),
    email: Joi.string().email(),
    phone: Joi.string().allow('', null),
    mobilePhone: Joi.string().allow('', null),
    whatsappNumber: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    accountId: Joi.string().uuid().allow(null),
    isPrimary: Joi.boolean(),
    status: Joi.string().valid('active', 'inactive', 'bounced', 'unsubscribed'),
    ownerId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object()
  })
};

// Deal schemas
export const dealSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    value: Joi.number().min(0).required(),
    currency: Joi.string().length(3).default('EUR'),
    stageId: Joi.string().uuid().required(),
    probability: Joi.number().min(0).max(100).allow(null),
    expectedCloseDate: Joi.date().allow(null),
    accountId: Joi.string().uuid().allow(null),
    contactId: Joi.string().uuid().allow(null),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    campaignId: Joi.string().uuid().allow(null),
    dealType: Joi.string().valid('new_business', 'expansion', 'renewal', 'upsell', 'cross_sell').default('new_business'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    source: Joi.string().allow('', null),
    nextStep: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string()).default([]),
    customFields: Joi.object().default({})
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255),
    value: Joi.number().min(0),
    currency: Joi.string().length(3),
    stageId: Joi.string().uuid(),
    probability: Joi.number().min(0).max(100).allow(null),
    expectedCloseDate: Joi.date().allow(null),
    accountId: Joi.string().uuid().allow(null),
    contactId: Joi.string().uuid().allow(null),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    dealType: Joi.string().valid('new_business', 'expansion', 'renewal', 'upsell', 'cross_sell'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    forecastCategory: Joi.string().valid('omit', 'pipeline', 'best_case', 'commit', 'closed'),
    nextStep: Joi.string().allow('', null),
    nextStepDate: Joi.date().allow(null),
    description: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object()
  }),

  markWon: Joi.object({
    actualCloseDate: Joi.date().default(() => new Date()),
    notes: Joi.string().allow('', null)
  }),

  markLost: Joi.object({
    lossReason: Joi.string().required(),
    lossReasonDetail: Joi.string().allow('', null),
    competitorName: Joi.string().allow('', null)
  })
};

// Lead schemas
export const leadSchemas = {
  create: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    industry: Joi.string().allow('', null),
    source: Joi.string().allow('', null),
    status: Joi.string().valid('new', 'contacted', 'engaged', 'qualified', 'unqualified', 'nurturing').default('new'),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    campaignId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()).default([]),
    customFields: Joi.object().default({})
  }),

  update: Joi.object({
    firstName: Joi.string().min(1).max(100),
    lastName: Joi.string().min(1).max(100),
    email: Joi.string().email(),
    phone: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    jobTitle: Joi.string().allow('', null),
    industry: Joi.string().allow('', null),
    source: Joi.string().allow('', null),
    status: Joi.string().valid('new', 'contacted', 'engaged', 'qualified', 'unqualified', 'converted', 'nurturing', 'recycled', 'dead'),
    score: Joi.number().min(0).max(100),
    ownerId: Joi.string().uuid().allow(null),
    teamId: Joi.string().uuid().allow(null),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object()
  }),

  convert: Joi.object({
    createAccount: Joi.boolean().default(true),
    createContact: Joi.boolean().default(true),
    createDeal: Joi.boolean().default(false),
    accountName: Joi.string().when('createAccount', { is: true, then: Joi.required() }),
    dealName: Joi.string().when('createDeal', { is: true, then: Joi.required() }),
    dealValue: Joi.number().min(0).when('createDeal', { is: true, then: Joi.required() }),
    stageId: Joi.string().uuid().when('createDeal', { is: true, then: Joi.required() })
  })
};

// Task schemas
export const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(500).required(),
    description: Joi.string().allow('', null),
    type: Joi.string().valid('call', 'email', 'meeting', 'follow_up', 'demo', 'proposal', 'contract', 'review', 'research', 'administrative', 'other').default('follow_up'),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    dueDate: Joi.date().allow(null),
    assignedTo: Joi.string().uuid().allow(null),
    accountId: Joi.string().uuid().allow(null),
    contactId: Joi.string().uuid().allow(null),
    dealId: Joi.string().uuid().allow(null),
    leadId: Joi.string().uuid().allow(null),
    reminders: Joi.array().items(Joi.object({
      type: Joi.string().valid('email', 'whatsapp', 'inapp').required(),
      offset: Joi.number().integer().required() // minutes before due
    })).default([])
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(500),
    description: Joi.string().allow('', null),
    type: Joi.string().valid('call', 'email', 'meeting', 'follow_up', 'demo', 'proposal', 'contract', 'review', 'research', 'administrative', 'other'),
    status: Joi.string().valid('not_started', 'in_progress', 'waiting', 'deferred', 'completed', 'cancelled'),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
    dueDate: Joi.date().allow(null),
    assignedTo: Joi.string().uuid().allow(null),
    outcome: Joi.string().allow('', null),
    reminders: Joi.array().items(Joi.object({
      type: Joi.string().valid('email', 'whatsapp', 'inapp').required(),
      offset: Joi.number().integer().required()
    }))
  })
};

// Activity schemas
export const activitySchemas = {
  create: Joi.object({
    type: Joi.string().valid('call', 'email', 'meeting', 'task', 'note', 'whatsapp', 'sms', 'linkedin', 'demo', 'proposal', 'contract', 'follow_up', 'other').required(),
    subject: Joi.string().min(1).max(500).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled').default('completed'),
    outcome: Joi.string().valid('successful', 'unsuccessful', 'no_answer', 'voicemail', 'busy', 'wrong_number', 'not_interested', 'follow_up_needed', 'meeting_booked', 'proposal_sent', 'deal_advanced', 'deal_lost', 'other').allow(null),
    dueDate: Joi.date().allow(null),
    startTime: Joi.date().allow(null),
    endTime: Joi.date().allow(null),
    duration: Joi.number().integer().min(0).allow(null),
    accountId: Joi.string().uuid().allow(null),
    contactId: Joi.string().uuid().allow(null),
    dealId: Joi.string().uuid().allow(null),
    leadId: Joi.string().uuid().allow(null),
    assignedTo: Joi.string().uuid().allow(null)
  }),

  update: Joi.object({
    subject: Joi.string().min(1).max(500),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'),
    outcome: Joi.string().valid('successful', 'unsuccessful', 'no_answer', 'voicemail', 'busy', 'wrong_number', 'not_interested', 'follow_up_needed', 'meeting_booked', 'proposal_sent', 'deal_advanced', 'deal_lost', 'other').allow(null),
    outcomeNotes: Joi.string().allow('', null),
    dueDate: Joi.date().allow(null),
    startTime: Joi.date().allow(null),
    endTime: Joi.date().allow(null),
    duration: Joi.number().integer().min(0).allow(null)
  })
};

// Import/Export schemas
export const importExportSchemas = {
  createImport: Joi.object({
    name: Joi.string().allow('', null),
    entityType: Joi.string().valid('accounts', 'contacts', 'leads', 'deals', 'activities', 'products').required(),
    columnMapping: Joi.object().default({}),
    skipDuplicates: Joi.boolean().default(true),
    updateExisting: Joi.boolean().default(false),
    validateOnly: Joi.boolean().default(false),
    duplicateField: Joi.string().allow('', null),
    duplicateAction: Joi.string().valid('skip', 'update', 'create').default('skip'),
    defaultValues: Joi.object().default({}),
    assignToUserId: Joi.string().uuid().allow(null),
    assignToTeamId: Joi.string().uuid().allow(null)
  }),

  createExport: Joi.object({
    name: Joi.string().allow('', null),
    entityType: Joi.string().valid('accounts', 'contacts', 'leads', 'deals', 'activities', 'tasks', 'products', 'quotes').required(),
    format: Joi.string().valid('csv', 'xlsx', 'json').default('csv'),
    filters: Joi.object().default({}),
    columns: Joi.array().items(Joi.string()).default([]),
    columnLabels: Joi.object().default({}),
    sortBy: Joi.string().allow('', null),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('DESC')
  }),

  dateRange: Joi.object({
    dateFrom: Joi.date().allow(null),
    dateTo: Joi.date().allow(null)
  })
};

export default {
  validate,
  authSchemas,
  userSchemas,
  accountSchemas,
  contactSchemas,
  dealSchemas,
  leadSchemas,
  taskSchemas,
  activitySchemas,
  importExportSchemas,
  querySchemas
};
