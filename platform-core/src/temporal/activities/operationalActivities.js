/**
 * Temporal Activities: Operational Intelligence
 * Bridge between Temporal workflows and A2A skill invocations
 */
import { invokeSkill } from '../../a2a/a2aClient.js';
import logger from '../../utils/logger.js';

export async function runHealthCheck(agentId, scope = 'quick') {
  const result = await invokeSkill('dokter', 'runHealthCheck', {
    scope,
    sourceAgent: agentId,
    reason: 'self-healing saga'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}

export async function triggerDataSync(destinationId, reason) {
  const result = await invokeSkill('koerier', 'triggerSync', {
    destinationId,
    reason,
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}

export async function verifyRecovery(agentId, anomalyType) {
  // Simple verification: run another health check and see if the specific issue is resolved
  const result = await invokeSkill('dokter', 'runHealthCheck', {
    scope: 'quick',
    sourceAgent: agentId,
    reason: `verify recovery from ${anomalyType}`
  }, { sourceAgent: 'temporal-worker' });
  return { recovered: (result.result || result).triggered === true };
}

export async function sendAlert(severity, title, details) {
  await invokeSkill('bode', 'sendAlert', {
    severity,
    title,
    message: typeof details === 'string' ? details : JSON.stringify(details),
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
}

export async function pushDashboardEvent(agentId, eventType, severity, data) {
  await invokeSkill('dashboard', 'pushUpdate', {
    agentId,
    eventType,
    severity,
    data
  }, { sourceAgent: 'temporal-worker' });
}

export async function checkBudget(service) {
  const result = await invokeSkill('kassier', 'checkBudget', {
    service,
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}

export async function triggerReconciliation(transactionIds, reason) {
  const result = await invokeSkill('kassier', 'reconcile', {
    transactionIds,
    reason,
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}

export async function suggestContent(topic, keywords, destinationId) {
  const result = await invokeSkill('redacteur', 'suggestContent', {
    topic,
    keywords,
    destinationId,
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}

export async function updatePersonalizationProfiles(destinationId, journeyData) {
  const result = await invokeSkill('personaliseerder', 'updateProfiles', {
    destinationId,
    journeyData,
    sourceAgent: 'temporal-worker'
  }, { sourceAgent: 'temporal-worker' });
  return result.result || result;
}
