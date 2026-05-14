/**
 * Mistral Agents Service — EU web_search fallback for AI content generation
 *
 * Used when brand_knowledge is empty (hasInternalSources=false) AND
 * feature flag `ai_content.mistral_websearch_fallback` is enabled.
 *
 * Compliance:
 *   - Mistral SA (Paris, France) — EU-supplier, GDPR DPA in effect via ToS
 *   - Customer data NOT used for model training (per DPA)
 *   - All processing EU-hosted
 *   - API: client.beta.agents + conversations (beta as of 2026)
 *
 * Architecture:
 *   - Lazy-initialized agent (created once per service lifecycle)
 *   - Returns normalized source chunks identical in shape to brand_knowledge sources
 *   - Soft-fail: errors return empty result, never throw to caller
 *
 * @module mistralAgentsService
 * @version 1.0.0
 */

import { Mistral } from '@mistralai/mistralai';
import logger from '../utils/logger.js';

const MODEL = 'mistral-large-latest';
const AGENT_NAME = 'HolidaiButler Brand Researcher';
const AGENT_DESC = 'Searches the web for verified factual brand information using web_search tool.';
const AGENT_INSTRUCTIONS = [
  'You are a research assistant for HolidaiButler / PubliQio AI content platform.',
  'When asked a research question:',
  '1. Use the web_search tool to find authoritative, verified information.',
  '2. Prioritize official sources (organization websites, government, established news).',
  '3. Return concise factual findings with source URLs.',
  '4. NEVER fabricate facts. If unsure or insufficient data: state this clearly.',
  '5. Cite every fact with the source URL it came from.',
  'Output format: short factual summary + list of source URLs with title and key facts.',
].join('\n');

class MistralAgentsService {
  constructor() {
    this.client = null;
    this.agentId = null;
    this._initPromise = null;
    this._initFailed = false;
  }

  // -------------------------------------------------------------------
  // Lazy initialization
  // -------------------------------------------------------------------

  _getClient() {
    if (!this.client) {
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) {
        throw new Error('MISTRAL_API_KEY not configured');
      }
      this.client = new Mistral({ apiKey });
    }
    return this.client;
  }

  async _ensureAgent() {
    if (this.agentId) return this.agentId;
    if (this._initFailed) throw new Error('Mistral agent init previously failed');

    if (!this._initPromise) {
      this._initPromise = this._createAgent().catch(err => {
        this._initFailed = true;
        this._initPromise = null;
        throw err;
      });
    }
    return this._initPromise;
  }

  async _createAgent() {
    const client = this._getClient();
    try {
      const agent = await client.beta.agents.create({
        model: MODEL,
        name: AGENT_NAME,
        description: AGENT_DESC,
        instructions: AGENT_INSTRUCTIONS,
        tools: [{ type: 'web_search' }],
      });
      this.agentId = agent.id;
      logger.info(`[MistralAgents] Agent created: ${this.agentId}`);
      return this.agentId;
    } catch (err) {
      logger.error('[MistralAgents] Agent create failed:', err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Perform a web search using Mistral Agents (EU-hosted).
   * Returns normalized chunks in the same shape as brand_knowledge sources,
   * so they can be consumed identically by promptGuardrails.
   *
   * @param {string} query
   * @param {Object} [opts]
   * @param {number} [opts.timeoutMs=30000]
   * @returns {Promise<{chunks: Array, model: string, durationMs: number, error?: string}>}
   */
  async webSearch(query, opts = {}) {
    const { timeoutMs = 30000 } = opts;
    const startedAt = Date.now();

    if (!query || typeof query !== 'string') {
      return { chunks: [], model: MODEL, durationMs: 0, error: 'invalid_query' };
    }

    try {
      const client = this._getClient();
      const agentId = await this._ensureAgent();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Mistral web_search timeout')), timeoutMs)
      );

      const conversationPromise = client.beta.conversations.start({
        agentId,
        inputs: [{ role: 'user', content: query }],
      });

      const result = await Promise.race([conversationPromise, timeoutPromise]);

      const chunks = this._extractSourceChunks(result);
      return {
        chunks,
        model: MODEL,
        durationMs: Date.now() - startedAt,
      };
    } catch (err) {
      logger.warn(`[MistralAgents] web_search failed: ${err.message}`);
      return {
        chunks: [],
        model: MODEL,
        durationMs: Date.now() - startedAt,
        error: err.message,
      };
    }
  }

  /**
   * Extract source chunks from Mistral Agents response.
   * Response shape (per Mistral docs):
   *   outputs: [
   *     { type: 'tool.execution', name: 'web_search', ... },
   *     { type: 'message.output', content: [
   *         { type: 'text', text: '...' },
   *         { type: 'tool_reference', title, url, source }
   *     ]}
   *   ]
   */
  _extractSourceChunks(result) {
    if (!result || !Array.isArray(result.outputs)) return [];

    const chunks = [];
    let combinedText = '';

    for (const output of result.outputs) {
      if (output.type === 'message.output' && Array.isArray(output.content)) {
        for (const part of output.content) {
          if (part.type === 'text' && typeof part.text === 'string') {
            combinedText += part.text + '\n';
          } else if (part.type === 'tool_reference' && part.url) {
            chunks.push({
              source_name: part.title || part.url,
              source_url: part.url,
              source_type: 'mistral_websearch',
              content_text: part.source || part.title || '',
            });
          }
        }
      }
    }

    // Prepend Mistral's synthesized text as a "summary" chunk if non-empty
    if (combinedText.trim().length > 0) {
      chunks.unshift({
        source_name: 'Mistral AI Web Search Summary',
        source_url: null,
        source_type: 'mistral_websearch',
        content_text: combinedText.trim().substring(0, 3000),
      });
    }

    return chunks;
  }

  /**
   * Healthcheck — verifies Mistral API reachability without creating agents.
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async healthCheck() {
    try {
      const client = this._getClient();
      // Lightweight: list models
      const models = await client.models.list();
      return { ok: Boolean(models), modelCount: models?.data?.length ?? 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

const mistralAgentsService = new MistralAgentsService();
export default mistralAgentsService;
export { MistralAgentsService };
