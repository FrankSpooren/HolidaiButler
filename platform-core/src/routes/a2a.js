/**
 * A2A v1.2 Discovery Routes
 * Provides /.well-known/agents and per-agent card endpoints
 */
import { Router } from 'express';
import { getAllAgents, getAgent } from '../services/agents/base/agentRegistry.js';
import { generateAgentCard, signAgentCard, verifyAgentCard } from '../a2a/agentCardTemplate.js';
import { handleSkillInvocation, listSkills } from '../a2a/a2aSkillRegistry.js';

const router = Router();

/**
 * GET /.well-known/agents — A2A discovery endpoint
 * Returns all active agent cards (signed)
 */
router.get('/.well-known/agents', (req, res) => {
  const registry = getAllAgents();
  const cards = Object.entries(registry)
    .filter(([, agent]) => agent.active !== false)
    .map(([id, agent]) => signAgentCard(generateAgentCard(id, agent)));

  res.json({
    schemaVersion: '1.2',
    provider: {
      name: 'HolidaiButler',
      organization: 'HolidaiButler B.V.',
      url: 'https://holidaibutler.com'
    },
    agents: cards
  });
});

/**
 * GET /a2a/agents/:agentId/card — Individual agent card
 */
router.get('/a2a/agents/:agentId/card', (req, res) => {
  const agent = getAgent(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const card = signAgentCard(generateAgentCard(req.params.agentId, agent));
  res.json(card);
});

/**
 * POST /a2a/verify — Verify an agent card signature
 */
router.post('/a2a/verify', (req, res) => {
  const valid = verifyAgentCard(req.body);
  res.json({ valid });
});

/**
 * POST /a2a/invoke — Invoke a skill on a target agent (internal A2A)
 */
router.post('/a2a/invoke', async (req, res) => {
  const { targetAgent, skill, input } = req.body;
  if (!targetAgent || !skill) {
    return res.status(400).json({ error: 'targetAgent and skill are required' });
  }
  try {
    const result = await handleSkillInvocation(targetAgent, skill, input || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
});

/**
 * GET /a2a/skills — List all registered A2A skills
 */
router.get('/a2a/skills', (req, res) => {
  res.json({ skills: listSkills() });
});

export default router;
