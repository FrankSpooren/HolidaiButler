/**
 * HK1 Flow: helpdeskmeester -> redacteur/contentGapDetected
 * Reports content gap detected from support tickets
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  gap_topic: z.string(),
  ticket_count: z.number(),
  example_queries: z.array(z.string()).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function contentGapDetected(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.contentGapDetected', async (span) => {
    span.setAttributes({
      'flow.id': 'HK1',
      'flow.source_agent': validated.sourceAgent || 'helpdeskmeester',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/contentGapDetected] HK1 invoked by ${validated.sourceAgent || 'helpdeskmeester'}`);

      const result = {
        action_id: `hk1-${Date.now()}`,
        flow_id: 'HK1',
        gap_topic: validated.gap_topic, ticket_count: validated.ticket_count, gap_recorded: true,
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

registerSkill('redacteur', 'contentGapDetected', contentGapDetected);
export { contentGapDetected };
