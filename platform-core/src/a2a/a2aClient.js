/**
 * A2A Internal Client
 * Enables agent-to-agent communication via A2A protocol
 * Uses internal HTTP calls to target agent skill handlers
 */
import logger from '../utils/logger.js';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('hb-a2a-client');
const A2A_BASE = 'http://127.0.0.1:3001'; // platform-core
const A2A_TOKEN = process.env.A2A_INTERNAL_TOKEN;

/**
 * Invoke an A2A skill on a target agent
 * @param {string} targetAgent - Registry key of target agent (e.g. 'bode')
 * @param {string} skill - Skill name (e.g. 'sendAlert')
 * @param {object} input - Skill input payload
 * @param {object} options - Optional: sourceAgent, traceId
 */
export async function invokeSkill(targetAgent, skill, input, options = {}) {
  const { sourceAgent = 'unknown' } = options;

  return tracer.startActiveSpan(`a2a.invokeSkill`, { attributes: {
    'a2a.source': sourceAgent,
    'a2a.target': targetAgent,
    'a2a.skill': skill
  }}, async (span) => {
    try {
      const response = await fetch(`${A2A_BASE}/a2a/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-A2A-Token': A2A_TOKEN || '',
          'X-A2A-Source': sourceAgent,
          'X-A2A-Target': targetAgent
        },
        body: JSON.stringify({ targetAgent, skill, input })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`A2A call failed: ${response.status} ${errText}`);
      }

      const result = await response.json();
      span.setStatus({ code: SpanStatusCode.OK });
      logger.info(`[a2a] ${sourceAgent} → ${targetAgent}/${skill} OK`);
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      logger.error(`[a2a] ${sourceAgent} → ${targetAgent}/${skill} FAILED: ${error.message}`);
      throw error;
    } finally {
      span.end();
    }
  });
}

export default { invokeSkill };
