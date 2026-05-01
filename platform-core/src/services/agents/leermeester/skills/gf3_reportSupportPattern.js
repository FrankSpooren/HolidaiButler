/**
 * GF3 Flow: helpdeskmeester -> leermeester/reportSupportPattern
 * Report recurring support pattern for learning
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  pattern: z.string(), category: z.string().optional(), frequency: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function reportSupportPattern(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportSupportPattern', async (span) => {
    span.setAttributes({
      'flow.id': 'GF3',
      'flow.source_agent': validated.sourceAgent || 'helpdeskmeester',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportSupportPattern] GF3 invoked by ${validated.sourceAgent || 'helpdeskmeester'}`);

      const result = {
        action_id: 'gf3-' + Date.now(),
        flow_id: 'GF3',
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

registerSkill('leermeester', 'reportSupportPattern', reportSupportPattern);
export { reportSupportPattern };
