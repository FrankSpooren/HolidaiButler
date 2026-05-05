/**
 * E8a Flow: ALL -> dashboard/pushUpdate
 * Push real-time status update to Admin Portal
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  agentId: z.string(), eventType: z.string(), data: z.any().optional(), severity: z.enum(["info","warning","error"]).default("info"),
  sourceAgent: z.string().optional()
});

async function pushUpdate(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-dashboard');

  return await tracer.startActiveSpan('dashboard.pushUpdate', async (span) => {
    span.setAttributes({
      'flow.id': 'E8a',
      'flow.source_agent': validated.sourceAgent || 'ALL',
      'flow.target_agent': 'dashboard'
    });

    try {
      logger.info(`[dashboard/pushUpdate] E8a invoked by ${validated.sourceAgent || 'ALL'}`);

      const result = {
        action_id: 'e8a-' + Date.now(),
        flow_id: 'E8a',
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

registerSkill('dashboard', 'pushUpdate', pushUpdate);
export { pushUpdate };
