/**
 * A7 Flow: inspecteur -> redacteur/flagQualityIssue
 * Flag content quality issue
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string().optional(), poiId: z.number().optional(), issueType: z.string(), severity: z.enum(["low","medium","high"]),
  sourceAgent: z.string().optional()
});

async function flagQualityIssue(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.flagQualityIssue', async (span) => {
    span.setAttributes({
      'flow.id': 'A7',
      'flow.source_agent': validated.sourceAgent || 'inspecteur',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/flagQualityIssue] A7 invoked by ${validated.sourceAgent || 'inspecteur'}`);

      const result = {
        action_id: 'a7-' + Date.now(),
        flow_id: 'A7',
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

registerSkill('redacteur', 'flagQualityIssue', flagQualityIssue);
export { flagQualityIssue };
