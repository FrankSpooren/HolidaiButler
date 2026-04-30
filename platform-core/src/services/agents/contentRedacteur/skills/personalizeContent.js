/**
 * A13 Flow: Personaliseerder -> Redacteur/personalizeContent
 * Requests content personalization based on audience persona and context
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  persona_id: z.number().optional(),
  persona_name: z.string().optional(),
  personalization_context: z.object({
    season: z.string().optional(),
    weather: z.string().optional(),
    time_of_day: z.string().optional(),
    user_interests: z.array(z.string()).optional(),
    language: z.string().optional()
  }).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function personalizeContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.personalizeContent', async (span) => {
    span.setAttributes({
      'flow.id': 'A13',
      'flow.source_agent': validated.sourceAgent || 'personaliseerder',
      'flow.target_agent': 'redacteur',
      'content.id': validated.content_id,
      'persona.name': validated.persona_name || 'default',
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[redacteur/personalizeContent] content #${validated.content_id} for persona ${validated.persona_name || 'default'}`);

      const result = {
        personalization_id: `pers-${Date.now()}`,
        flow_id: 'A13',
        content_id: validated.content_id,
        persona_name: validated.persona_name,
        context_applied: validated.personalization_context || {},
        queued: true,
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

registerSkill('redacteur', 'personalizeContent', personalizeContent);

export { personalizeContent };
