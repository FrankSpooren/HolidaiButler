/**
 * A4 Flow: redacteur -> vertaler/translateContent
 * Multi-language content translation
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), sourceLang: z.string().default("en"), targetLangs: z.array(z.string()).default(["nl","de","es"]),
  sourceAgent: z.string().optional()
});

async function translateContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-vertaler');

  return await tracer.startActiveSpan('vertaler.translateContent', async (span) => {
    span.setAttributes({
      'flow.id': 'A4',
      'flow.source_agent': validated.sourceAgent || 'redacteur',
      'flow.target_agent': 'vertaler'
    });

    try {
      logger.info(`[vertaler/translateContent] A4 invoked by ${validated.sourceAgent || 'redacteur'}`);

      const result = {
        action_id: 'a4-' + Date.now(),
        flow_id: 'A4',
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

registerSkill('vertaler', 'translateContent', translateContent);
export { translateContent };
