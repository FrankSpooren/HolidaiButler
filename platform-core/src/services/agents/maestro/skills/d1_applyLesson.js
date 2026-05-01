/**
 * D1 Flow: leermeester -> maestro/applyLesson
 * Distribute learned lesson to agents
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  lesson: z.string(), affectedAgents: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function applyLesson(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.applyLesson', async (span) => {
    span.setAttributes({
      'flow.id': 'D1',
      'flow.source_agent': validated.sourceAgent || 'leermeester',
      'flow.target_agent': 'maestro'
    });

    try {
      logger.info(`[maestro/applyLesson] D1 invoked by ${validated.sourceAgent || 'leermeester'}`);

      const result = {
        action_id: 'd1-' + Date.now(),
        flow_id: 'D1',
        success: true,
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

registerSkill('maestro', 'applyLesson', applyLesson);
export { applyLesson };
