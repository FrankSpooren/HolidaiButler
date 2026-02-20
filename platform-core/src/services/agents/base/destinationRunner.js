/**
 * Destination Runner - Wraps existing agent methods with per-destination execution
 *
 * Instead of rewriting all 15 agents, this module adds run() capability
 * to any existing agent by wrapping its methods with destination-aware dispatching.
 *
 * Usage:
 *   import { wrapWithDestinationAwareness } from '../base/destinationRunner.js';
 *   wrapWithDestinationAwareness(dataSyncAgent, {
 *     name: 'De Koerier',
 *     category: 'Operations',
 *     destinationAware: true
 *   });
 *   // Now dataSyncAgent.run('all') works
 *
 * @module agents/base/destinationRunner
 * @version 1.0.0
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getActiveDestinations, getDestinationById } = require('../../../../config/destinations/index');

/**
 * Adds BaseAgent-compatible run() method to an existing agent instance
 * @param {Object} agent - The existing agent singleton
 * @param {Object} config - Agent metadata
 * @param {string} config.name - Display name (e.g. 'De Koerier')
 * @param {string} config.category - Category (Core/Operations/Development/Strategy)
 * @param {boolean} config.destinationAware - Whether agent runs per-destination (default: true)
 * @param {string} config.version - Agent version
 */
export function wrapWithDestinationAwareness(agent, config = {}) {
  agent._baseAgentConfig = {
    name: config.name || agent.name || 'UnknownAgent',
    category: config.category || 'unknown',
    version: config.version || agent.version || '1.0.0',
    destinationAware: config.destinationAware !== false
  };

  /**
   * BaseAgent-compatible run() method
   * @param {number|string} destinationId - 'all', 1 (Calpe), or 2 (Texel)
   */
  agent.run = async function(destinationId = 'all') {
    const startTime = Date.now();
    const cfg = this._baseAgentConfig;

    try {
      if (!cfg.destinationAware) {
        // Shared agents - run execute() once
        const result = await this.execute();
        return wrapResult(cfg, result, null, startTime);
      }

      let destinations;
      if (destinationId === 'all') {
        const activeConfigs = getActiveDestinations();
        destinations = activeConfigs.map(c => ({ id: c.destination.id, code: c.destination.code, name: c.destination.name }));
      } else {
        const id = parseInt(destinationId);
        const destConfig = getDestinationById(id);
        destinations = [{ id, code: destConfig ? destConfig.destination.code : `dest_${id}`, name: destConfig ? destConfig.destination.name : `Destination ${id}` }];
      }

      const results = [];
      for (const dest of destinations) {
        try {
          const result = await this.runForDestination(dest.id);
          results.push({ destinationId: dest.id, destinationCode: dest.code, success: true, result });
        } catch (error) {
          console.error(`[${cfg.name}] Error for destination ${dest.code || dest.id}:`, error.message);
          results.push({ destinationId: dest.id, destinationCode: dest.code, success: false, error: error.message });
        }
      }

      const aggregated = aggregateResults(results);
      return wrapResult(cfg, aggregated, results, startTime);
    } catch (error) {
      console.error(`[${cfg.name}] Fatal error:`, error.message);
      return { agent: cfg.name, success: false, error: error.message, duration_ms: Date.now() - startTime };
    }
  };

  // Add runForDestination stub if not present (agents should override this)
  if (!agent.runForDestination) {
    agent.runForDestination = async function(destinationId) {
      throw new Error(`${this._baseAgentConfig.name}: runForDestination() not implemented`);
    };
  }

  // Add execute stub if not present (shared agents should override this)
  if (!agent.execute) {
    agent.execute = async function() {
      throw new Error(`${this._baseAgentConfig.name}: execute() not implemented`);
    };
  }

  return agent;
}

function aggregateResults(results) {
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return {
    destinations_total: results.length,
    destinations_succeeded: succeeded,
    destinations_failed: failed,
    all_succeeded: failed === 0,
    per_destination: results
  };
}

function wrapResult(cfg, aggregated, perDestination, startTime) {
  return {
    agent: cfg.name,
    version: cfg.version,
    category: cfg.category,
    destinationAware: cfg.destinationAware,
    success: perDestination ? perDestination.every(r => r.success) : (aggregated.success !== false),
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    ...aggregated
  };
}

export default { wrapWithDestinationAwareness };
