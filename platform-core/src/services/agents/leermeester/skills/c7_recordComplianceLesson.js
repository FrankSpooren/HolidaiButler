/**
 * C7 Flow: ALL -> leermeester/recordComplianceLesson
 * Record compliance lesson for learning
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  lesson: z.string(), regulation: z.enum(["GDPR","EU_AI_Act","PCI_DSS"]).default("EU_AI_Act"), severity: z.enum(["low","medium","high"]).default("medium"),
  sourceAgent: z.string().optional()
});

async function recordComplianceLesson(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.recordComplianceLesson', async (span) => {
    span.setAttributes({
      'flow.id': 'C7',
      'flow.source_agent': validated.sourceAgent || 'ALL',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/recordComplianceLesson] C7 invoked by ${validated.sourceAgent || 'ALL'}`);

      const result = {
        action_id: 'c7-' + Date.now(),
        flow_id: 'C7',
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

registerSkill('leermeester', 'recordComplianceLesson', recordComplianceLesson);
export { recordComplianceLesson };
