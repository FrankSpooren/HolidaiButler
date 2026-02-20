/**
 * De Dokter — Frontend Health Check
 * Monitors all HolidaiButler + TexelMaps portal availability and SSL certificates
 *
 * @module healthMonitor/checks/frontendHealth
 */

import axios from 'axios';
import tls from 'tls';

class FrontendHealthCheck {
  constructor() {
    this.timeout = 15000; // 15 second timeout for frontend checks

    // Portal URLs configuration (multi-destination)
    this.portals = {
      production: {
        url: 'https://holidaibutler.com',
        name: 'Calpe Production'
      },
      test: {
        url: 'https://test.holidaibutler.com',
        name: 'Calpe Test'
      },
      dev: {
        url: 'https://dev.holidaibutler.com',
        name: 'Calpe Dev'
      },
      admin: {
        url: 'https://admin.holidaibutler.com',
        name: 'Admin Portal'
      },
      api: {
        url: 'https://api.holidaibutler.com',
        name: 'API'
      },
      texelProd: {
        url: 'https://texelmaps.nl',
        name: 'Texel Production'
      },
      texelDev: {
        url: 'https://dev.texelmaps.nl',
        name: 'Texel Dev'
      }
    };

    // Domains to check SSL expiry for
    this.sslDomains = [
      'holidaibutler.com',
      'api.holidaibutler.com',
      'admin.holidaibutler.com',
      'texelmaps.nl',
      'dev.texelmaps.nl'
    ];
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
    const results = await Promise.all(
      Object.keys(this.portals).map(key => this.checkPortal(key))
    );

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
   * Check SSL certificate expiry for a hostname
   * @param {string} hostname - Domain to check
   * @returns {Promise<Object>} SSL check result
   */
  async checkSSLExpiry(hostname) {
    return new Promise((resolve) => {
      const socket = tls.connect(443, hostname, { servername: hostname }, () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.valid_to) {
            resolve({
              check: `ssl_${hostname}`,
              hostname,
              status: 'error',
              error: 'No certificate found',
              timestamp: new Date().toISOString()
            });
            return;
          }

          const expiryDate = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));

          let status = 'healthy';
          if (daysUntilExpiry <= 7) {
            status = 'unhealthy';
          } else if (daysUntilExpiry <= 14) {
            status = 'degraded';
          } else if (daysUntilExpiry <= 30) {
            status = 'warning';
          }

          resolve({
            check: `ssl_${hostname}`,
            hostname,
            status,
            issuer: cert.issuer?.O || cert.issuer?.CN || 'unknown',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysUntilExpiry,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          socket.end();
          resolve({
            check: `ssl_${hostname}`,
            hostname,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.setTimeout(10000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          check: `ssl_${hostname}`,
          hostname,
          status: 'error',
          error: 'Connection timeout',
          timestamp: new Date().toISOString()
        });
      });
      socket.on('error', (error) => {
        resolve({
          check: `ssl_${hostname}`,
          hostname,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  /**
   * Check SSL for all monitored domains
   * @returns {Promise<Array>} All SSL check results
   */
  async checkAllSSL() {
    const results = await Promise.all(
      this.sslDomains.map(domain => this.checkSSLExpiry(domain))
    );

    const expiring = results.filter(r => r.status !== 'healthy' && r.status !== 'error');
    if (expiring.length > 0) {
      console.log(`[De Dokter] SSL warning: ${expiring.map(r => `${r.hostname} (${r.daysUntilExpiry}d)`).join(', ')}`);
    }

    return results;
  }

  /**
   * Run all frontend health checks (portals + SSL)
   * @returns {Promise<Object>} All check results grouped
   */
  async runAllChecks() {
    const [portalResults, sslResults] = await Promise.all([
      this.checkAllPortals(),
      this.checkAllSSL()
    ]);

    return {
      portals: portalResults,
      ssl: sslResults,
      timestamp: new Date().toISOString()
    };
  }
}

export default new FrontendHealthCheck();
