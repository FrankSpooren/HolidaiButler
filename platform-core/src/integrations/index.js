/**
 * Integration Modules Export
 * Centralized access to all module integrations
 */

import ticketingModuleIntegration from './ticketingModule.js';
import paymentModuleIntegration from './paymentModule.js';

export {
  ticketingModuleIntegration,
  paymentModuleIntegration,
};

export default {
  ticketing: ticketingModuleIntegration,
  payment: paymentModuleIntegration,
};
