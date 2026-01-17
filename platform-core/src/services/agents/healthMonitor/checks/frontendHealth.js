/**
 * Frontend Health Check
 * Monitors all HolidaiButler portal availability
 *
 * @module healthMonitor/checks/frontendHealth
 */

import axios from 'axios';

class FrontendHealthCheck {
  constructor() {
    this.timeout = 15000; // 15 second timeout for frontend checks

    // Portal URLs configuration
    this.portals = {
      production: {
        url: 'https://holidaibutler.com',
        name: 'Production Portal'
      },
      test: {
        url: 'https://test.holidaibutler.com',
        name: 'Test Portal'
      },
      dev: {
        url: 'https://dev.holidaibutler.com',
        name: 'Dev Portal'
      },
      admin: {
        url: 'https://admin.holidaibutler.com',
        name: 'Admin Portal'
      }
    };
  }

  /**
   * Check a specific portal's availability
   * @param {string} portalKey - Key from portals config (production, test, dev, admin)
   * @returns {Promise<Object>} Portal health result
   */
  async checkPortal(portalKey) {
    const portal = this.portals[portalKey];

    if (!portal) {
      return {
        check: `frontend_${portalKey}`,
        status: 'error',
        error: `Unknown portal: ${portalKey}`,
        timestamp: new Date().toISOString()
      };
    }

    const startTime = Date.now();

    try {
      const response = await axios({
        url: portal.url,
        method: 'GET',
        timeout: this.timeout,
        validateStatus: (status) => status < 500,
        // Follow redirects
        maxRedirects: 5
      });

      const latency = Date.now() - startTime;

      // Determine status based on response
      let status = 'healthy';
      if (response.status >= 400) {
        status = 'unhealthy';
      } else if (latency > 5000) {
        status = 'degraded';
      } else if (latency > 3000) {
        status = 'warning';
      }

      return {
        check: `frontend_${portalKey}`,
        type: portalKey,
        name: portal.name,
        status,
        statusCode: response.status,
        latency,
        url: portal.url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: `frontend_${portalKey}`,
        type: portalKey,
        name: portal.name,
        status: 'unhealthy',
        error: error.message,
        url: portal.url,
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check all portals
   * @returns {Promise<Array>} All portal check results
   */
  async checkAllPortals() {
    const results = await Promise.all([
      this.checkPortal('production'),
      this.checkPortal('test'),
      this.checkPortal('dev'),
      this.checkPortal('admin')
    ]);

    return results;
  }

  /**
   * Check production portal specifically
   * @returns {Promise<Object>} Production portal health
   */
  async checkProduction() {
    return this.checkPortal('production');
  }

  /**
   * Check admin portal specifically
   * @returns {Promise<Object>} Admin portal health
   */
  async checkAdmin() {
    return this.checkPortal('admin');
  }

  /**
   * Run all frontend health checks
   * @returns {Promise<Array>} All check results
   */
  async runAllChecks() {
    return this.checkAllPortals();
  }
}

export default new FrontendHealthCheck();
