/**
 * B5 Flow: Dokter -> Maestro/coordinateRecovery
 * Orchestrates recovery sequence when agents are sick (restart order, dependency-aware)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  sick_agents: z.array(z.object({
    agentId: z.string(),
    status: z.string(),
    lastError: z.string().optional(),
    priority: z.enum(['critical', 'high', 'normal']).default('normal')
  })),
  recovery_strategy: z.enum(['sequential', 'parallel', 'dependency_order']).default('dependency_order'),
  dry_run: z.boolean().default(false),
  sourceAgent: z.string().optional()
});

// Agent dependency graph for restart ordering
const DEPENDENCY_ORDER = [
  'maestro',        // orchestrator first
  'dokter',         // health monitor
  'koerier',        // data sync
  'geheugen',       // memory/vector sync
  'poortwachter',   // GDPR
  'bewaker',        // security
  'redacteur',      // content
  'vertaler',       // translations (depends on redacteur)
  'beeldenmaker',   // images (depends on redacteur)
  'uitgever',       // publisher (depends on content pipeline)
  'seoMeester',     // SEO
  'personaliseerder', // personalization
  'trendspotter',   // trends
  'bode',           // notifications (last — needs others healthy)
];

async function coordinateRecovery(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.coordinateRecovery', async (span) => {
    span.setAttributes({
      'flow.id': 'B5',
      'flow.source_agent': validated.sourceAgent || 'dokter',
      'flow.target_agent': 'maestro',
      'recovery.sick_count': validated.sick_agents.length,
      'recovery.strategy': validated.recovery_strategy,
      'recovery.dry_run': validated.dry_run
    });

    try {
      // Sort agents by dependency order
      const ordered = validated.recovery_strategy === 'dependency_order'
        ? [...validated.sick_agents].sort((a, b) => {
            const idxA = DEPENDENCY_ORDER.indexOf(a.agentId);
            const idxB = DEPENDENCY_ORDER.indexOf(b.agentId);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
          })
        : validated.sick_agents;

      // Critical agents first regardless of strategy
      ordered.sort((a, b) => {
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (b.priority === 'critical' && a.priority !== 'critical') return 1;
        return 0;
      });

      const plan = ordered.map((agent, idx) => ({
        step: idx + 1,
        agentId: agent.agentId,
        action: 'restart',
        priority: agent.priority,
        lastError: agent.lastError,
        status: validated.dry_run ? 'planned' : 'pending'
      }));

      logger.info(`[maestro/coordinateRecovery] Recovery plan: ${plan.length} agents, strategy=${validated.recovery_strategy}, dry_run=${validated.dry_run}`);

      const result = {
        recovery_id: `rec-${Date.now()}`,
        flow_id: 'B5',
        strategy: validated.recovery_strategy,
        dry_run: validated.dry_run,
        plan,
        total_agents: plan.length,
        timestamp: new Date().toISOString()
      };

      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

registerSkill('maestro', 'coordinateRecovery', coordinateRecovery);

export { coordinateRecovery };
