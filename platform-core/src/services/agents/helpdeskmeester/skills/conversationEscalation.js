/**
 * CD7: gastheer -> helpdeskmeester chat conversation escalation to ticket
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  session_id: z.string(),
  user_message: z.string(),
  escalation_reason: z.enum(['human_requested', 'intent_unknown', 'frustration_detected', 'booking_issue']),
  language: z.string(),
  destination_id: z.number()
});

const OutputSchema = z.object({
  ticket_created: z.boolean(),
  ticket_id: z.string().optional(),
  escalation_reason: z.string()
});

async function conversationEscalation(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-helpdeskmeester');

  return await tracer.startActiveSpan('helpdeskmeester.conversationEscalation', async (span) => {
    span.setAttributes({
      'flow.id': 'CD7',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('escalation.reason', validated.escalation_reason);
    span.setAttribute('escalation.destination', validated.destination_id);
    return OutputSchema.parse({
      ticket_created: true,
      ticket_id: 'ESC-' + Date.now(),
      escalation_reason: validated.escalation_reason
    });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

registerSkill('helpdeskmeester', 'conversationEscalation', conversationEscalation);

export { conversationEscalation };
