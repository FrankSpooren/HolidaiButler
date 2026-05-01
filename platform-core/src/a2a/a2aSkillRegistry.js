/**
 * A2A Skill Registry
 * Maps agent skills to handler functions
 * Each agent registers its available skills here
 */
import logger from '../utils/logger.js';

const skills = new Map();

/**
 * Register a skill handler for an agent
 */
export function registerSkill(agentId, skillName, handler) {
  const key = `${agentId}/${skillName}`;
  skills.set(key, { agentId, skillName, handler });
  logger.info(`[a2a-skills] Registered: ${key}`);
}

/**
 * Invoke a registered skill
 */
export async function handleSkillInvocation(targetAgent, skill, input) {
  const key = `${targetAgent}/${skill}`;
  const registration = skills.get(key);
  if (!registration) {
    throw new Error(`A2A skill not found: ${key}. Available: ${[...skills.keys()].join(', ')}`);
  }
  return registration.handler(input);
}

/**
 * List all registered skills
 */
export function listSkills() {
  return [...skills.entries()].map(([key, { agentId, skillName }]) => ({
    key, agentId, skillName
  }));
}

export default { registerSkill, handleSkillInvocation, listSkills };
