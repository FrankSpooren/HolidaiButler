/**
 * GF5 Flow: Reisleider -> Optimaliseerder/journeyPattern
 * Reports user journey patterns for conversion optimization
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  pattern_type: z.enum(['drop_off', 'conversion', 'loop', 'bounce', 'exploration']),
  page_sequence: z.array(z.string()),
  occurrence_count: z.number(),
  avg_time_seconds: z.number().optional(),
  conversion_rate: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function journeyPattern(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-optimaliseerder');

  return await tracer.startActiveSpan('optimaliseerder.journeyPattern', async (span) => {
    span.setAttributes({
      'flow.id': 'GF5',
      'flow.source_agent': validated.sourceAgent || 'reisleider',
      'flow.target_agent': 'optimaliseerder',
      'pattern.type': validated.pattern_type,
      'pattern.occurrences': validated.occurrence_count,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[optimaliseerder/journeyPattern] ${validated.pattern_type}: ${validated.page_sequence.join(' → ')} (${validated.occurrence_count}x)`);

      const result = {
        pattern_id: `jp-${Date.now()}`,
        flow_id: 'GF5',
        pattern_type: validated.pattern_type,
        pages: validated.page_sequence.length,
        occurrences: validated.occurrence_count,
        recorded: true,
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

registerSkill('optimaliseerder', 'journeyPattern', journeyPattern);
export { journeyPattern };
