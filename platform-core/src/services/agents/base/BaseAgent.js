/**
 * BaseAgent - Foundation class voor destination-aware agents
 * Alle 15 agents erven van deze class.
 *
 * Pattern:
 *   agent.run('all')     -> draait voor ALLE actieve destinations
 *   agent.run(1)         -> draait alleen voor Calpe
 *   agent.run(2)         -> draait alleen voor Texel
 *
 * @module agents/base/BaseAgent
 * @version 1.0.0
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getActiveDestinations, getDestinationById } = require('../../../../config/destinations/index');

class BaseAgent {
  constructor(config = {}) {
    this.name = config.name || 'BaseAgent';
    this.version = config.version || '1.0.0';
    this.category = config.category || 'unknown';
    this.destinationAware = config.destinationAware !== false; // default: true
  }

  /**
   * Main entry point - runs for one or all destinations
   * @param {number|string} destinationId - Specific ID or 'all'
   * @returns {Promise<Object>} Aggregated results
   */
  async run(destinationId = 'all') {
    const startTime = Date.now();

    try {
      if (!this.destinationAware) {
        // Shared agents (Code, Security, Architecture, UX) - run once
        const result = await this.execute();
        return this.wrapResult(result, null, startTime);
      }

      let destinations;
      if (destinationId === 'all') {
        const activeConfigs = getActiveDestinations();
        destinations = activeConfigs.map(c => ({ id: c.destination.id, code: c.destination.code, name: c.destination.name }));
      } else {
        const id = parseInt(destinationId);
        const config = getDestinationById(id);
        destinations = [{ id, code: config ? config.destination.code : `dest_${id}`, name: config ? config.destination.name : `Destination ${id}` }];
      }

      const results = [];
      for (const dest of destinations) {
        try {
          const result = await this.runForDestination(dest.id);
          results.push({ destinationId: dest.id, destinationCode: dest.code, success: true, result });
        } catch (error) {
          console.error(`[${this.name}] Error for destination ${dest.code || dest.id}:`, error.message);
          results.push({ destinationId: dest.id, destinationCode: dest.code, success: false, error: error.message });
        }
      }

      const aggregated = this.aggregateResults(results);
      return this.wrapResult(aggregated, results, startTime);
    } catch (error) {
      console.error(`[${this.name}] Fatal error:`, error.message);
      return { agent: this.name, success: false, error: error.message, duration_ms: Date.now() - startTime };
    }
  }

  /**
   * Override in subclass: destination-specific logic
   * @param {number} destinationId - The destination ID (1=Calpe, 2=Texel)
   */
  async runForDestination(destinationId) {
    throw new Error(`${this.name}: runForDestination() not implemented`);
  }

  /**
   * Override in subclass: non-destination logic (shared agents)
   */
  async execute() {
    throw new Error(`${this.name}: execute() not implemented`);
  }

  /**
   * Override in subclass for custom aggregation
   */
  aggregateResults(results) {
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

  wrapResult(aggregated, perDestination, startTime) {
    return {
      agent: this.name,
      version: this.version,
      category: this.category,
      destinationAware: this.destinationAware,
      success: perDestination ? perDestination.every(r => r.success) : true,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      ...aggregated
    };
  }
}

export default BaseAgent;
