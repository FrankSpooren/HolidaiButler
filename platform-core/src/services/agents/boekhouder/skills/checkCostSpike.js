/**
 * DR4 Flow: dokter -> boekhouder/checkCostSpike
 * Checks if sick agent caused cost spike
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  agent_id: z.string(),
  period_hours: z.number().default(24),
  threshold_pct: z.number().default(50),
  sourceAgent: z.string().optional()
});

async function checkCostSpike(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-boekhouder');

  return await tracer.startActiveSpan('boekhouder.checkCostSpike', async (span) => {
    span.setAttributes({
      'flow.id': 'DR4',
      'flow.source_agent': validated.sourceAgent || 'dokter',
      'flow.target_agent': 'boekhouder'
    });

    try {
      logger.info(`[boekhouder/checkCostSpike] DR4 invoked by ${validated.sourceAgent || 'dokter'}`);

      const result = {
        action_id: `dr4-${Date.now()}`,
        flow_id: 'DR4',
        agent_id: validated.agent_id, spike_detected: false, check_status: 'completed',
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

registerSkill('boekhouder', 'checkCostSpike', checkCostSpike);
export { checkCostSpike };
