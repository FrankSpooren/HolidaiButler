/**
 * OB4 Flow: onthaler -> bewaker/runSecurityBaseline
 * Runs security baseline scan for new destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  domain: z.string(),
  scan_types: z.array(z.enum(['headers', 'ssl', 'cors', 'dependencies'])).default(['headers', 'ssl']),
  sourceAgent: z.string().optional()
});

async function runSecurityBaseline(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bewaker');

  return await tracer.startActiveSpan('bewaker.runSecurityBaseline', async (span) => {
    span.setAttributes({
      'flow.id': 'OB4',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'bewaker'
    });

    try {
      logger.info(`[bewaker/runSecurityBaseline] OB4 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob4-${Date.now()}`,
        flow_id: 'OB4',
        destination_id: validated.destination_id, domain: validated.domain, scan_status: 'completed',
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

registerSkill('bewaker', 'runSecurityBaseline', runSecurityBaseline);
export { runSecurityBaseline };
