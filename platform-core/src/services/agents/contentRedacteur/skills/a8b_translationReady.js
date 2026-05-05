/**
 * A8b Flow: vertaler -> redacteur/translationReady
 * Notify content that translations are done
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), languages: z.array(z.string()), translationIds: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function translationReady(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.translationReady', async (span) => {
    span.setAttributes({
      'flow.id': 'A8b',
      'flow.source_agent': validated.sourceAgent || 'vertaler',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/translationReady] A8b invoked by ${validated.sourceAgent || 'vertaler'}`);

      const result = {
        action_id: 'a8b-' + Date.now(),
        flow_id: 'A8b',
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

registerSkill('redacteur', 'translationReady', translationReady);
export { translationReady };
