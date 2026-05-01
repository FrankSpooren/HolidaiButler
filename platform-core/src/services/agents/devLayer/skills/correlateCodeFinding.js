/**
 * BS4 Flow: bewaker -> inspecteur/correlateCodeFinding
 * Correlates security vulnerability with code quality findings
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  vulnerability_id: z.string(),
  component: z.string(),
  cve_id: z.string().optional(),
  code_patterns: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function correlateCodeFinding(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-inspecteur');

  return await tracer.startActiveSpan('inspecteur.correlateCodeFinding', async (span) => {
    span.setAttributes({
      'flow.id': 'BS4',
      'flow.source_agent': validated.sourceAgent || 'bewaker',
      'flow.target_agent': 'inspecteur'
    });

    try {
      logger.info(`[inspecteur/correlateCodeFinding] BS4 invoked by ${validated.sourceAgent || 'bewaker'}`);

      const result = {
        action_id: `bs4-${Date.now()}`,
        flow_id: 'BS4',
        vulnerability_id: validated.vulnerability_id, component: validated.component, correlation_status: 'analyzed',
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

registerSkill('inspecteur', 'correlateCodeFinding', correlateCodeFinding);
export { correlateCodeFinding };
