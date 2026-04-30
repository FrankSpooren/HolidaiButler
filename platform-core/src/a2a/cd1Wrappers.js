/**
 * CD1: Register applyDistributedLesson for all active agents
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { createApplyDistributedLessonSkill } from './applyDistributedLessonBase.js';

const agents = ["maestro", "bode", "dokter", "koerier", "geheugen", "gastheer", "poortwachter", "stylist", "corrector", "bewaker", "inspecteur", "leermeester", "thermostaat", "weermeester", "smokeTest", "backupHealth", "contentQuality", "makelaar", "kassier", "magazijnier", "trendspotter", "redacteur", "seoMeester", "uitgever", "promotor", "vertaler", "beeldenmaker", "personaliseerder", "performanceWachter", "anomaliedetective", "auditeur", "optimaliseerder", "reisleider", "verfrisser", "boekhouder", "onthaler", "helpdeskmeester"];

// Register for all active agents (architect excluded - deactivated)
for (const agentName of agents) {
  createApplyDistributedLessonSkill(agentName);
}

export const CD1_AGENTS = agents;
