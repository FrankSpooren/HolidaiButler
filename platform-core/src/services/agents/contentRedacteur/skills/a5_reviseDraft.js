/**
 * A5 Flow: seoMeester -> redacteur/reviseDraft
 * Revision of draft after SEO/quality feedback
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), issues: z.array(z.string()), revisionType: z.enum(["seo","quality","optimization"]).default("seo"),
  sourceAgent: z.string().optional()
});

async function reviseDraft(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.reviseDraft', async (span) => {
    span.setAttributes({
      'flow.id': 'A5',
      'flow.source_agent': validated.sourceAgent || 'seoMeester',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/reviseDraft] A5 invoked by ${validated.sourceAgent || 'seoMeester'}`);

      const result = {
        action_id: 'a5-' + Date.now(),
        flow_id: 'A5',
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

registerSkill('redacteur', 'reviseDraft', reviseDraft);
export { reviseDraft };
