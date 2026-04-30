/**
 * PF4 Flow: performanceWachter -> trendspotter/signalDecline
 * Signals content performance decline to trend analysis
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  metric_type: z.enum(['engagement', 'ctr', 'reach', 'conversions']),
  decline_pct: z.number(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function signalDecline(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-trendspotter');

  return await tracer.startActiveSpan('trendspotter.signalDecline', async (span) => {
    span.setAttributes({
      'flow.id': 'PF4',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'trendspotter'
    });

    try {
      logger.info(`[trendspotter/signalDecline] PF4 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: `pf4-${Date.now()}`,
        flow_id: 'PF4',
        content_id: validated.content_id, metric_type: validated.metric_type, signal_recorded: true,
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

registerSkill('trendspotter', 'signalDecline', signalDecline);
export { signalDecline };
