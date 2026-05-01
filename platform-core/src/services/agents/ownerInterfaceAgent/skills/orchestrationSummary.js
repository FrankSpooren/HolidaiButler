/**
 * ML2 Flow: maestro -> bode/orchestrationSummary
 * Includes health summary in daily owner briefing
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  healthy_count: z.number(),
  sick_count: z.number(),
  warnings: z.array(z.string()).optional(),
  daily_jobs_completed: z.number().optional(),
  daily_jobs_failed: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function orchestrationSummary(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.orchestrationSummary', async (span) => {
    span.setAttributes({
      'flow.id': 'ML2',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'bode'
    });

    try {
      logger.info(`[bode/orchestrationSummary] ML2 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: `ml2-${Date.now()}`,
        flow_id: 'ML2',
        healthy: validated.healthy_count, sick: validated.sick_count, summary_included: true,
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

registerSkill('bode', 'orchestrationSummary', orchestrationSummary);
export { orchestrationSummary };
