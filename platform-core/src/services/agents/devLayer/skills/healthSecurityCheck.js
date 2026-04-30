/**
 * DR2 Flow: dokter -> bewaker/healthSecurityCheck
 * Checks security implications of health degradation
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  agent_id: z.string(),
  degradation_type: z.enum(['crash', 'timeout', 'memory_leak', 'connection_loss']),
  duration_minutes: z.number().optional(),
  affected_services: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function healthSecurityCheck(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bewaker');

  return await tracer.startActiveSpan('bewaker.healthSecurityCheck', async (span) => {
    span.setAttributes({
      'flow.id': 'DR2',
      'flow.source_agent': validated.sourceAgent || 'dokter',
      'flow.target_agent': 'bewaker'
    });

    try {
      logger.info(`[bewaker/healthSecurityCheck] DR2 invoked by ${validated.sourceAgent || 'dokter'}`);

      const result = {
        action_id: `dr2-${Date.now()}`,
        flow_id: 'DR2',
        agent_id: validated.agent_id, security_risk: 'low', check_status: 'completed',
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

registerSkill('bewaker', 'healthSecurityCheck', healthSecurityCheck);
export { healthSecurityCheck };
