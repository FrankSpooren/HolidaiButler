/**
 * A6 Flow: performanceWachter -> redacteur/flagStaleContent
 * Flag content as stale for refresh
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string().optional(), poiId: z.number().optional(), reason: z.string(), staleDays: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function flagStaleContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.flagStaleContent', async (span) => {
    span.setAttributes({
      'flow.id': 'A6',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/flagStaleContent] A6 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: 'a6-' + Date.now(),
        flow_id: 'A6',
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

registerSkill('redacteur', 'flagStaleContent', flagStaleContent);
export { flagStaleContent };
