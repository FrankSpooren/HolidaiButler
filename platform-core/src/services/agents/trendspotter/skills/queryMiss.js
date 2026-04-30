/**
 * GF7 Flow: Geheugen -> Trendspotter/queryMiss
 * Reports chatbot queries that had no good RAG results (content gaps)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  query: z.string(),
  language: z.string().default('en'),
  result_count: z.number().default(0),
  best_score: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function queryMiss(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-trendspotter');

  return await tracer.startActiveSpan('trendspotter.queryMiss', async (span) => {
    span.setAttributes({
      'flow.id': 'GF7',
      'flow.source_agent': validated.sourceAgent || 'geheugen',
      'flow.target_agent': 'trendspotter',
      'query.language': validated.language,
      'query.result_count': validated.result_count,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[trendspotter/queryMiss] "${validated.query}" (${validated.language}): ${validated.result_count} results, best_score=${validated.best_score || 'N/A'}`);

      const result = {
        miss_id: `qm-${Date.now()}`,
        flow_id: 'GF7',
        query: validated.query,
        language: validated.language,
        result_count: validated.result_count,
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

registerSkill('trendspotter', 'queryMiss', queryMiss);
export { queryMiss };
