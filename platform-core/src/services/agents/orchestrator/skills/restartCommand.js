/**
 * B6 Flow: Dokter -> Agent/restartCommand
 * Sends restart command to a specific agent (via maestro orchestration)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  target_agent: z.string(),
  restart_reason: z.string().max(500),
  force: z.boolean().default(false),
  max_retries: z.number().default(3),
  sourceAgent: z.string().optional()
});

async function restartCommand(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.restartCommand', async (span) => {
    span.setAttributes({
      'flow.id': 'B6',
      'flow.source_agent': validated.sourceAgent || 'dokter',
      'flow.target_agent': 'maestro',
      'restart.target': validated.target_agent,
      'restart.force': validated.force
    });

    try {
      logger.info(`[maestro/restartCommand] Restart ${validated.target_agent} requested by ${validated.sourceAgent || 'dokter'}: ${validated.restart_reason}`);

      // In production: trigger BullMQ job or direct agent.run() re-initialization
      // For now: log the restart command and return confirmation
      const result = {
        restart_id: `rst-${Date.now()}`,
        flow_id: 'B6',
        target_agent: validated.target_agent,
        reason: validated.restart_reason,
        force: validated.force,
        status: 'initiated',
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

registerSkill('maestro', 'restartCommand', restartCommand);

export { restartCommand };
