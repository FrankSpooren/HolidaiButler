/**
 * API Health Check
 * Monitors external API connections and endpoints
 *
 * @module healthMonitor/checks/apiHealth
 */

import axios from 'axios';
import https from 'https';

class APIHealthCheck {
  constructor() {
    this.timeout = 10000; // 10 second timeout
    // Agent that allows self-signed or mismatched certs for internal checks
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  }

  /**
   * Make a health check request
   * @param {string} url - URL to check
   * @param {Object} options - Additional axios options
   * @returns {Promise<Object>} Request result
   */
  async makeRequest(url, options = {}) {
    const startTime = Date.now();

    try {
      const response = await axios({
        url,
        method: 'GET',
        timeout: this.timeout,
        validateStatus: (status) => status < 500,
        ...options
      });

      return {
        success: true,
        statusCode: response.status,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Check HolidaiButler API
   * Uses internal localhost check when running on server, external check otherwise
   * @returns {Promise<Object>} API health result
   */
  async checkHolidaiButlerAPI() {
    // First try internal health endpoint (localhost)
    const internalUrl = process.env.API_INTERNAL_URL || 'http://localhost:3000/api/v1/health';
    let result = await this.makeRequest(internalUrl);

    // If internal check fails, try external with SSL verification disabled
    if (!result.success) {
      const externalUrl = process.env.API_URL || 'https://api.holidaibutler.com/api/v1/health';
      result = await this.makeRequest(externalUrl, {
        httpsAgent: this.httpsAgent
      });
    }

    return {
      check: 'holidaibutler_api',
      status: result.success && result.statusCode === 200 ? 'healthy' : 'unhealthy',
      statusCode: result.statusCode,
      latency: result.latency,
      error: result.error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check MistralAI API connectivity
   * @returns {Promise<Object>} MistralAI health result
   */
  async checkMistralAI() {
    try {
      // Just check if we can reach the API endpoint
      const result = await this.makeRequest('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY || 'test'}`
        }
      });

      // 401 means API is reachable but key invalid (still healthy from connectivity perspective)
      const isReachable = result.success && (result.statusCode === 200 || result.statusCode === 401);

      return {
        check: 'mistral_ai',
        status: isReachable ? 'healthy' : 'unhealthy',
        statusCode: result.statusCode,
        latency: result.latency,
        error: result.error,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'mistral_ai',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check Apify API connectivity
   * Uses the user endpoint with API token to verify connectivity
   * @returns {Promise<Object>} Apify health result
   */
  async checkApify() {
    try {
      const apiToken = process.env.APIFY_API_TOKEN;

      if (!apiToken) {
        return {
          check: 'apify',
          status: 'warning',
          message: 'APIFY_API_TOKEN not configured',
          timestamp: new Date().toISOString()
        };
      }

      // Use the user endpoint to verify API token and connectivity
      const result = await this.makeRequest(`https://api.apify.com/v2/users/me?token=${apiToken}`);

      // 200 = success, 401 = bad token but API reachable
      const isReachable = result.success && (result.statusCode === 200 || result.statusCode === 401);

      return {
        check: 'apify',
        status: isReachable ? 'healthy' : 'unhealthy',
        statusCode: result.statusCode,
        latency: result.latency,
        error: result.error,
        authenticated: result.statusCode === 200,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'apify',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check ChromaDB connectivity
   * Supports both local and cloud ChromaDB configurations
   * @returns {Promise<Object>} ChromaDB health result
   */
  async checkChromaDB() {
    try {
      const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';

      if (useCloud) {
        // ChromaDB Cloud check
        const apiKey = process.env.CHROMADB_API_KEY;
        const tenant = process.env.CHROMADB_TENANT;
        const database = process.env.CHROMADB_DATABASE;

        if (!apiKey || !tenant) {
          return {
            check: 'chromadb',
            status: 'warning',
            message: 'ChromaDB Cloud credentials not fully configured',
            timestamp: new Date().toISOString()
          };
        }

        // ChromaDB Cloud API endpoint
        const cloudUrl = 'https://api.trychroma.com/api/v1/heartbeat';
        const result = await this.makeRequest(cloudUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Chroma-Tenant': tenant,
            'X-Chroma-Database': database || 'default'
          }
        });

        return {
          check: 'chromadb',
          status: result.success ? 'healthy' : 'warning',
          mode: 'cloud',
          statusCode: result.statusCode,
          latency: result.latency,
          error: result.error,
          timestamp: new Date().toISOString()
        };
      } else {
        // Local ChromaDB check
        const chromaHost = process.env.CHROMA_HOST || 'http://localhost:8000';
        const result = await this.makeRequest(`${chromaHost}/api/v1/heartbeat`);

        return {
          check: 'chromadb',
          status: result.success && result.statusCode === 200 ? 'healthy' : 'unhealthy',
          mode: 'local',
          statusCode: result.statusCode,
          latency: result.latency,
          error: result.error,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        check: 'chromadb',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check Bugsink (EU-hosted error monitoring) connectivity
   * @returns {Promise<Object>} Bugsink health result
   */
  async checkBugsink() {
    try {
      const bugsinkDsn = process.env.BUGSINK_DSN;
      if (!bugsinkDsn) {
        return {
          check: 'bugsink',
          status: 'warning',
          message: 'BUGSINK_DSN not configured',
          timestamp: new Date().toISOString()
        };
      }

      // Extract host from DSN and check connectivity
      const url = new URL(bugsinkDsn);
      const result = await this.makeRequest(`${url.protocol}//${url.host}/health`);

      return {
        check: 'bugsink',
        status: result.success ? 'healthy' : 'warning',
        statusCode: result.statusCode,
        latency: result.latency,
        error: result.error,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'bugsink',
        status: 'warning',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run all API health checks
   * @returns {Promise<Array>} All check results
   */
  async runAllChecks() {
    const [holidaibutler, mistral, apify, chromadb, bugsink] = await Promise.all([
      this.checkHolidaiButlerAPI(),
      this.checkMistralAI(),
      this.checkApify(),
      this.checkChromaDB(),
      this.checkBugsink()
    ]);

    return [holidaibutler, mistral, apify, chromadb, bugsink];
  }
}

export default new APIHealthCheck();
