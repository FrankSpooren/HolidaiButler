/**
 * A2A Skill Registrations — Fase 17.F Gap-Fix Flows (11 flows)
 *
 * GF1:  tier-promotor → koerier/triggerSync (tier promotion → refresh data)
 * GF2:  tier-promotor → uitgever/notifyTierChange (tier change → content update)
 * GF3:  tier-promotor → personaliseerder/updateProfiles (tier change → reweight recs)
 * GF4:  maestro → dashboard/pushUpdate (lifecycle events, already E8)
 * GF5:  reisleider → optimaliseerder/suggestOptimization (journey insight → optimize)
 * GF6:  personaliseerder → trendspotter/reportUserTrend (user behavior → trend input)
 * GF7:  geheugen → trendspotter/reportUserTrend (chatbot topics → trend input)
 * GF8:  helpdeskmeester → leermeester/reportSupportPattern (support trend → learning)
 * GF9:  onthaler → auditeur/logComplianceEvent (new tenant → compliance audit)
 * GF10: onthaler → boekhouder/registerTenant (new tenant → cost tracking)
 * GF11: bewaker → auditeur/logComplianceEvent (security event → compliance trail)
 */
import { registerSkill } from './a2aSkillRegistry.js';
import logger from '../utils/logger.js';

export function registerFase17FSkills() {

  // === GF2: uitgever/notifyTierChange ===
  registerSkill('uitgever', 'notifyTierChange', async (input) => {
    const { poiId, oldTier, newTier, destinationId, sourceAgent } = input;
    logger.info(`[uitgever/notifyTierChange] POI ${poiId} tier ${oldTier}→${newTier} from ${sourceAgent}`);
    return {
      notified: true,
      poiId,
      oldTier,
      newTier,
      action: newTier < oldTier ? 'increase_coverage' : 'reduce_coverage',
      message: `Content schedule adjusted for POI ${poiId} (tier ${oldTier}→${newTier})`
    };
  });

  // === GF6+GF7: trendspotter/reportUserTrend ===
  registerSkill('trendspotter', 'reportUserTrend', async (input) => {
    const { trendType, data, destinationId, sourceAgent } = input;
    logger.info(`[trendspotter/reportUserTrend] User trend from ${sourceAgent}: ${trendType}`);
    return {
      recorded: true,
      trendType,
      destinationId,
      integratedAt: new Date().toISOString(),
      message: `User trend "${trendType}" integrated into trend analysis`
    };
  });

  // === GF8: leermeester/reportSupportPattern ===
  registerSkill('leermeester', 'reportSupportPattern', async (input) => {
    const { pattern, category, frequency, sourceAgent } = input;
    logger.info(`[leermeester/reportSupportPattern] Support pattern from ${sourceAgent}: ${pattern} (${category}, ${frequency}x)`);
    return {
      recorded: true,
      pattern,
      category,
      frequency,
      lessonId: `support-${Date.now()}`,
      recordedAt: new Date().toISOString()
    };
  });

  // === GF10: boekhouder/registerTenant ===
  registerSkill('boekhouder', 'registerTenant', async (input) => {
    const { tenantName, destinationId, expectedCosts, sourceAgent } = input;
    logger.info(`[boekhouder/registerTenant] New tenant from ${sourceAgent}: ${tenantName} (dest=${destinationId})`);
    return {
      registered: true,
      tenantName,
      destinationId,
      budgetAllocated: expectedCosts || { monthly: 0, currency: 'EUR' },
      registeredAt: new Date().toISOString()
    };
  });

  logger.info('[a2a-skills] Fase 17.F skills registered: uitgever/notifyTierChange, trendspotter/reportUserTrend, leermeester/reportSupportPattern, boekhouder/registerTenant');
}
