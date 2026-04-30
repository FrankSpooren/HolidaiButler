/**
 * HK3 Flow: helpdeskmeester -> verfrisser/staleInfoTicket
 * Triggers freshness check from stale info support ticket
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number().optional(),
  topic: z.string(),
  ticket_id: z.string().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function staleInfoTicket(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-verfrisser');

  return await tracer.startActiveSpan('verfrisser.staleInfoTicket', async (span) => {
    span.setAttributes({
      'flow.id': 'HK3',
      'flow.source_agent': validated.sourceAgent || 'helpdeskmeester',
      'flow.target_agent': 'verfrisser'
    });

    try {
      logger.info(`[verfrisser/staleInfoTicket] HK3 invoked by ${validated.sourceAgent || 'helpdeskmeester'}`);

      const result = {
        action_id: `hk3-${Date.now()}`,
        flow_id: 'HK3',
        topic: validated.topic, freshness_check_queued: true,
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

registerSkill('verfrisser', 'staleInfoTicket', staleInfoTicket);
export { staleInfoTicket };
