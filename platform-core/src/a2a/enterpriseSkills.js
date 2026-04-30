/**
 * Enterprise Skill Barrel — Fase 20.B
 * Imports all 46 enterprise-level skill files (Zod + OTel flow.id spans).
 * These OVERRIDE the inline Fase 16-17 registrations in a2aSkillRegistry.
 * Must be called AFTER registerFase16/17Skills() so the override takes effect.
 */
import '../services/agents/auditeur/skills/c2_logComplianceEvent.js';
import '../services/agents/beeldenmaker/skills/a3_generateImages.js';
import '../services/agents/beeldenmaker/skills/c5_pauseProcessing.js';
import '../services/agents/beeldenmaker/skills/c6_resumeProcessing.js';
import '../services/agents/boekhouder/skills/gf4_registerTenant.js';
import '../services/agents/contentRedacteur/skills/a5_reviseDraft.js';
import '../services/agents/contentRedacteur/skills/a6_flagStaleContent.js';
import '../services/agents/contentRedacteur/skills/a7_flagQualityIssue.js';
import '../services/agents/contentRedacteur/skills/a8a_imageReady.js';
import '../services/agents/contentRedacteur/skills/a8b_translationReady.js';
import '../services/agents/contentRedacteur/skills/b11_suggestContent.js';
import '../services/agents/contentRedacteur/skills/d5_suggestSeasonalContent.js';
import '../services/agents/dataSync/skills/b1_triggerSync.js';
import '../services/agents/financialMonitor/skills/b3_checkBudget.js';
import '../services/agents/financialMonitor/skills/b4_reconcile.js';
import '../services/agents/gdpr/skills/b9_auditAccess.js';
import '../services/agents/gdpr/skills/c1_enforceCompliance.js';
import '../services/agents/healthMonitor/skills/b2_runHealthCheck.js';
import '../services/agents/holibotSync/skills/b7_syncNewTenant.js';
import '../services/agents/leermeester/skills/c7_recordComplianceLesson.js';
import '../services/agents/leermeester/skills/d3_reportConfigEffect.js';
import '../services/agents/leermeester/skills/d6_reportPerformancePattern.js';
import '../services/agents/leermeester/skills/d7_reportAnomalyPattern.js';
import '../services/agents/leermeester/skills/d8_reportOptimizationResult.js';
import '../services/agents/leermeester/skills/d9_reportQualityTrend.js';
import '../services/agents/leermeester/skills/gf3_reportSupportPattern.js';
import '../services/agents/maestro/skills/d1_applyLesson.js';
import '../services/agents/maestro/skills/e8a_pushUpdate.js';
import '../services/agents/maestro/skills/e8b_getEvents.js';
import '../services/agents/optimaliseerder/skills/b8_suggestOptimization.js';
import '../services/agents/ownerInterfaceAgent/skills/e1_aggregateBriefing.js';
import '../services/agents/ownerInterfaceAgent/skills/e2_sendAlert.js';
import '../services/agents/performanceWachter/skills/a10_trackPublication.js';
import '../services/agents/personaliseerder/skills/b10_updateProfiles.js';
import '../services/agents/personaliseerder/skills/d4_updateSeasonalProfiles.js';
import '../services/agents/publisher/skills/a9_schedulePublish.js';
import '../services/agents/publisher/skills/c3_pausePublishing.js';
import '../services/agents/publisher/skills/c4_resumePublishing.js';
import '../services/agents/publisher/skills/gf1_notifyTierChange.js';
import '../services/agents/seoMeester/skills/a2_validateSEO.js';
import '../services/agents/strategyLayer/skills/d10_requestForecast.js';
import '../services/agents/strategyLayer/skills/d2_adjustConfig.js';
import '../services/agents/trendspotter/skills/gf2_reportUserTrend.js';
import '../services/agents/vertaler/skills/a4_translateContent.js';
import '../services/agents/vertaler/skills/c5b_pauseProcessing.js';
import '../services/agents/vertaler/skills/c6b_resumeProcessing.js';

console.log('[a2a-skills] Fase 20.B: 46 enterprise skills loaded (OTel traced)');
