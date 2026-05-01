/**
 * CD1: Shared base for applyDistributedLesson (broadcast from leermeester to ALL)
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from './a2aSkillRegistry.js';

const LessonInputSchema = z.object({
  lesson_type: z.enum(['threshold_adjustment', 'pattern_detected', 'performance_insight', 'compliance_update']),
  applies_to: z.enum(['all', 'content', 'operations', 'development', 'strategy']),
  payload: z.record(z.unknown()),
  source_agent: z.string(),
  timestamp: z.string().optional()
});

const LessonOutputSchema = z.object({
  applied: z.boolean(),
  agent: z.string()
});

export function createApplyDistributedLessonSkill(agentName, applyHook) {
  async function applyDistributedLesson(input, context) {
    const validated = LessonInputSchema.parse(input);
    const tracer = trace.getTracer('hb-' + agentName);

    return await tracer.startActiveSpan(agentName + '.applyDistributedLesson', async (span) => {
      span.setAttributes({
        'flow.id': 'CD1',
        'flow.source_agent': context?.sourceAgent || validated.source_agent,
        'lesson.type': validated.lesson_type,
        'lesson.applies_to': validated.applies_to
      });

      try {
        if (applyHook) await applyHook(validated);
        return LessonOutputSchema.parse({ applied: true, agent: agentName });
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  registerSkill(agentName, 'applyDistributedLesson', applyDistributedLesson);
  return applyDistributedLesson;
}
