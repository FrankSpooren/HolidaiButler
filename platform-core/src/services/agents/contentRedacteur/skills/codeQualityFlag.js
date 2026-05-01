/**
 * A14 Flow: Inspecteur -> Redacteur/codeQualityFlag
 * Flags content that fails code quality/formatting checks
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  content_type: z.string(),
  issues: z.array(z.object({
    type: z.enum(['html_invalid', 'broken_link', 'missing_alt', 'encoding_error', 'format_violation']),
    description: z.string(),
    severity: z.enum(['error', 'warning', 'info']).default('warning')
  })),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function codeQualityFlag(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.codeQualityFlag', async (span) => {
    span.setAttributes({
      'flow.id': 'A14',
      'flow.source_agent': validated.sourceAgent || 'inspecteur',
      'flow.target_agent': 'redacteur',
      'content.id': validated.content_id,
      'issues.count': validated.issues.length,
      'destination_id': validated.destination_id || 0
    });

    try {
      const errors = validated.issues.filter(i => i.severity === 'error').length;
      const warnings = validated.issues.filter(i => i.severity === 'warning').length;

      logger.info(`[redacteur/codeQualityFlag] content #${validated.content_id}: ${errors} errors, ${warnings} warnings`);

      const result = {
        flag_id: `qf-${Date.now()}`,
        flow_id: 'A14',
        content_id: validated.content_id,
        total_issues: validated.issues.length,
        errors,
        warnings,
        needs_fix: errors > 0,
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

registerSkill('redacteur', 'codeQualityFlag', codeQualityFlag);

export { codeQualityFlag };
