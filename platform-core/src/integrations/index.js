/**
 * Integration Modules Export
 * Centralized access to all module integrations
 */

import adminModuleIntegration from './adminModule.js';
import ticketingModuleIntegration from './ticketingModule.js';
import paymentModuleIntegration from './paymentModule.js';

export {
  adminModuleIntegration,
  ticketingModuleIntegration,
  paymentModuleIntegration,
};

export default {
  admin: adminModuleIntegration,
  ticketing: ticketingModuleIntegration,
  payment: paymentModuleIntegration,
};
