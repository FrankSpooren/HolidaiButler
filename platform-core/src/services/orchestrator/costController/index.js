import costTracker from './costTracker.js';
import { MONTHLY_BUDGET, ALERT_THRESHOLDS, STOPPABLE_SERVICES, FIXED_SERVICES } from './budgetConfig.js';

// Convenience methods
export const logCost = (service, operation, cost, metadata) => 
  costTracker.logCost(service, operation, cost, metadata);

export const getCosts = () => costTracker.getMonthlyCosts();

export const getReport = () => costTracker.generateCostReport();

export const checkBudget = () => costTracker.checkBudgetStatus();

export {
  costTracker,
  MONTHLY_BUDGET,
  ALERT_THRESHOLDS,
  STOPPABLE_SERVICES,
  FIXED_SERVICES
};

export default costTracker;
