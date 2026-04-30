/**
 * D11 Flow: Optimaliseerder -> Leermeester/reportExperimentResult
 * Reports A/B test and optimization experiment results for learning
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  experiment_id: z.string(),
  experiment_type: z.enum(['ab_test', 'publish_time', 'content_format', 'channel_mix']),
  variant_a: z.object({ label: z.string(), metric: z.number() }),
  variant_b: z.object({ label: z.string(), metric: z.number() }),
  winner: z.enum(['a', 'b', 'inconclusive']),
  confidence: z.number().min(0).max(100).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function reportExperimentResult(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportExperimentResult', async (span) => {
    span.setAttributes({
      'flow.id': 'D11',
      'flow.source_agent': validated.sourceAgent || 'optimaliseerder',
      'flow.target_agent': 'leermeester',
      'experiment.type': validated.experiment_type,
      'experiment.winner': validated.winner
    });

    try {
      logger.info(`[leermeester/reportExperimentResult] ${validated.experiment_type} ${validated.experiment_id}: winner=${validated.winner} (confidence ${validated.confidence || 'N/A'}%)`);

      const result = {
        learning_id: `exp-${Date.now()}`,
        flow_id: 'D11',
        experiment_id: validated.experiment_id,
        experiment_type: validated.experiment_type,
        winner: validated.winner,
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

registerSkill('leermeester', 'reportExperimentResult', reportExperimentResult);
export { reportExperimentResult };
