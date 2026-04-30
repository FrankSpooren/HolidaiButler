/**
 * RJ3 Flow: reisleider -> helpdeskmeester/frustrationPattern
 * Detects user frustration patterns for support triggers
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  pattern_type: z.enum(['rage_click', 'back_loop', 'search_fail', 'form_abandon']),
  page_url: z.string().optional(),
  occurrence_count: z.number(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function frustrationPattern(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-helpdeskmeester');

  return await tracer.startActiveSpan('helpdeskmeester.frustrationPattern', async (span) => {
    span.setAttributes({
      'flow.id': 'RJ3',
      'flow.source_agent': validated.sourceAgent || 'reisleider',
      'flow.target_agent': 'helpdeskmeester'
    });

    try {
      logger.info(`[helpdeskmeester/frustrationPattern] RJ3 invoked by ${validated.sourceAgent || 'reisleider'}`);

      const result = {
        action_id: `rj3-${Date.now()}`,
        flow_id: 'RJ3',
        pattern_type: validated.pattern_type, occurrences: validated.occurrence_count, support_triggered: true,
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

registerSkill('helpdeskmeester', 'frustrationPattern', frustrationPattern);
export { frustrationPattern };
