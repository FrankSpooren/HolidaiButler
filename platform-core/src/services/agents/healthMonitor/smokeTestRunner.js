/**
 * Smoke Test Runner
 *
 * Verantwoordelijkheid: End-to-end validatie van kritieke user journeys
 * Oorsprong: Test & Validation Agent (IMPLEMENTATIEPLAN A.9 — niet geimplementeerd)
 * Geintegreerd in: De Dokter (Agent #3, Health Monitor)
 *
 * ALLE tests zijn READ-ONLY (alleen GET requests). Nooit state wijzigen.
 *
 * @module healthMonitor/smokeTestRunner
 */

import axios from 'axios';
import mongoose from 'mongoose';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const API_BASE = 'http://127.0.0.1:3001';

// Destination configs for smoke tests
const DESTINATION_CONFIGS = {
  calpe: {
    id: 1,
    code: 'calpe',
    domain: 'https://holidaibutler.com',
    name: 'Calpe'
  },
  texel: {
    id: 2,
    code: 'texel',
    domain: 'https://texelmaps.nl',
    name: 'Texel'
  }
};

// MongoDB schema for smoke test results
const smokeTestResultSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  destinations: { type: mongoose.Schema.Types.Mixed },
  infrastructure: { type: mongoose.Schema.Types.Mixed },
  threema: { type: mongoose.Schema.Types.Mixed },
  total_passed: { type: Number },
  total_failed: { type: Number },
  total_tests: { type: Number }
}, { collection: 'smoke_test_results' });

let SmokeTestResult;
try {
  SmokeTestResult = mongoose.model('SmokeTestResult');
} catch {
  SmokeTestResult = mongoose.model('SmokeTestResult', smokeTestResultSchema);
}

class SmokeTestRunner {
  /**
   * Run smoke tests for a specific destination
   * @param {Object} destConfig - Destination config from DESTINATION_CONFIGS
   * @returns {Promise<Object>} Test results for destination
   */
  async runDestinationSmokeTests(destConfig) {
    console.log(`[De Dokter] Running smoke tests for ${destConfig.name}...`);

    const results = [];
    const failures = [];
    let firstPoiId = null;

    // Test 1: API Health
    const healthResult = await this._runTest('API Health', async () => {
      const res = await axios.get(`${API_BASE}/api/v1/holibot/health`, {
        timeout: 5000,
        headers: { 'X-Destination-ID': destConfig.code }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      return { status: res.status };
    });
    results.push(healthResult);
    if (!healthResult.passed) failures.push(healthResult);

    // Test 2: POI List API
    const poiListResult = await this._runTest('POI List', async () => {
      const res = await axios.get(`${API_BASE}/api/v1/pois`, {
        timeout: 10000,
        params: { destination_id: destConfig.id, limit: 3 },
        headers: { 'X-Destination-ID': destConfig.code }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = res.data;
      const pois = data.data || data.pois || data;
      if (!Array.isArray(pois)) throw new Error('Response data is not an array');
      if (pois.length < 1) throw new Error('No POIs returned');
      firstPoiId = pois[0].id;
      return { status: res.status, poi_count: pois.length };
    });
    results.push(poiListResult);
    if (!poiListResult.passed) failures.push(poiListResult);

    // Test 3: POI Detail API (use first POI from Test 2)
    if (firstPoiId) {
      const poiDetailResult = await this._runTest('POI Detail', async () => {
        const res = await axios.get(`${API_BASE}/api/v1/pois/${firstPoiId}`, {
          timeout: 5000,
          headers: { 'X-Destination-ID': destConfig.code }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const poi = res.data.data || res.data;
        if (!poi.name) throw new Error('POI has no name property');
        return { status: res.status, name: poi.name };
      });
      results.push(poiDetailResult);
      if (!poiDetailResult.passed) failures.push(poiDetailResult);

      // Test 4: Reviews API
      const reviewsResult = await this._runTest('Reviews API', async () => {
        const res = await axios.get(`${API_BASE}/api/v1/pois/${firstPoiId}/reviews`, {
          timeout: 5000,
          headers: { 'X-Destination-ID': destConfig.code }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        return { status: res.status };
      });
      results.push(reviewsResult);
      if (!reviewsResult.passed) failures.push(reviewsResult);
    } else {
      // POI list failed, skip dependent tests
      const skip = { name: 'POI Detail', passed: false, duration_ms: 0, error: 'Skipped (no POI from Test 2)' };
      results.push(skip);
      failures.push(skip);
      const skip2 = { name: 'Reviews API', passed: false, duration_ms: 0, error: 'Skipped (no POI from Test 2)' };
      results.push(skip2);
      failures.push(skip2);
    }

    // Test 5: Frontend Bereikbaar (external URL check)
    const frontendResult = await this._runTest('Frontend', async () => {
      const res = await axios.get(destConfig.domain, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const bodyLength = (res.data || '').length;
      if (bodyLength < 1000) throw new Error(`Response body too small: ${bodyLength} bytes`);
      return { status: res.status, body_bytes: bodyLength };
    });
    results.push(frontendResult);
    if (!frontendResult.passed) failures.push(frontendResult);

    const passed = results.filter(r => r.passed).length;
    const report = {
      destination: destConfig.code,
      timestamp: new Date().toISOString(),
      tests_total: results.length,
      tests_passed: passed,
      tests_failed: results.length - passed,
      results,
      failures
    };

    console.log(`[De Dokter] Smoke ${destConfig.name}: ${passed}/${results.length} PASS`);
    return report;
  }

  /**
   * Run infrastructure smoke tests
   * @returns {Promise<Object>} Infrastructure test results
   */
  async runInfrastructureSmokeTests() {
    console.log('[De Dokter] Running infrastructure smoke tests...');

    const results = [];
    const failures = [];

    // Test 6: Redis
    const redisResult = await this._runTest('Redis', async () => {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis({ lazyConnect: true, connectTimeout: 5000 });
      try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`Expected PONG, got ${pong}`);
        return { status: 'connected' };
      } finally {
        redis.disconnect();
      }
    });
    results.push(redisResult);
    if (!redisResult.passed) failures.push(redisResult);

    // Test 7: MongoDB
    const mongoResult = await this._runTest('MongoDB', async () => {
      const stats = await mongoose.connection.db.stats();
      if (!stats.ok) throw new Error('MongoDB stats not ok');
      return { ok: stats.ok, collections: stats.collections };
    });
    results.push(mongoResult);
    if (!mongoResult.passed) failures.push(mongoResult);

    // Test 8: BullMQ Jobs
    const bullmqResult = await this._runTest('BullMQ Jobs', async () => {
      const { Queue } = await import('bullmq');
      const { connection } = await import('../../orchestrator/queues.js');
      const queue = new Queue('scheduled-tasks', { connection });
      try {
        const jobs = await queue.getRepeatableJobs();
        if (jobs.length < 35) throw new Error(`Expected >= 35 jobs, got ${jobs.length}`);
        return { job_count: jobs.length };
      } finally {
        await queue.close();
      }
    });
    results.push(bullmqResult);
    if (!bullmqResult.passed) failures.push(bullmqResult);

    const passed = results.filter(r => r.passed).length;
    const report = {
      timestamp: new Date().toISOString(),
      tests_total: results.length,
      tests_passed: passed,
      tests_failed: results.length - passed,
      results,
      failures
    };

    console.log(`[De Dokter] Infra smoke: ${passed}/${results.length} PASS`);
    return report;
  }

  /**
   * Run all smoke tests (per destination + infrastructure)
   * @returns {Promise<Object>} Combined test report
   */
  async runAllSmokeTests() {
    console.log('[De Dokter] Running all smoke tests...');

    try {
      const destinations = {};
      for (const [key, config] of Object.entries(DESTINATION_CONFIGS)) {
        destinations[key] = await this.runDestinationSmokeTests(config);
      }

      const infrastructure = await this.runInfrastructureSmokeTests();

      // Threema configuration check (passive — no real messages sent)
      const threemaCheck = await this.checkThreemaConfiguration();
      if (threemaCheck.status === 'NOT_CONFIGURED') {
        console.warn('[De Dokter] Threema NOT CONFIGURED — urgentie 5 alerts disabled');
      } else {
        console.log('[De Dokter] Threema: CONFIGURED');
      }

      // Calculate totals
      let totalPassed = infrastructure.tests_passed;
      let totalFailed = infrastructure.tests_failed;
      let totalTests = infrastructure.tests_total;
      const allFailures = [...infrastructure.failures];

      for (const dest of Object.values(destinations)) {
        totalPassed += dest.tests_passed;
        totalFailed += dest.tests_failed;
        totalTests += dest.tests_total;
        allFailures.push(...dest.failures);
      }

      const report = {
        timestamp: new Date(),
        destinations,
        infrastructure,
        threema: threemaCheck,
        total_passed: totalPassed,
        total_failed: totalFailed,
        total_tests: totalTests
      };

      // Persist to MongoDB
      await SmokeTestResult.create(report);

      await logAgent('health-monitor', 'smoke_tests_completed', {
        description: `Smoke tests: ${totalPassed}/${totalTests} PASS, ${totalFailed} FAIL`,
        metadata: { total_passed: totalPassed, total_failed: totalFailed, total_tests: totalTests }
      });

      // Alert if failures
      if (totalFailed > 0) {
        try {
          const { sendAlert } = await import('../../orchestrator/ownerInterface/index.js');
          const failNames = allFailures.map(f => f.name).join(', ');
          await sendAlert({
            urgency: totalFailed > 3 ? 4 : 3,
            title: `Smoke Tests: ${totalFailed} FAILURES`,
            message: `Failed: ${failNames}. ${totalPassed}/${totalTests} passed.`
          });
        } catch (alertError) {
          console.error('[De Dokter] Failed to send smoke test alert:', alertError.message);
        }
      }

      console.log(`[De Dokter] All smoke tests complete: ${totalPassed}/${totalTests} PASS`);
      return report;
    } catch (error) {
      await logError('health-monitor', error, { action: 'smoke_tests' });
      console.error('[De Dokter] Smoke tests failed:', error.message);
      return {
        timestamp: new Date(),
        destinations: {},
        infrastructure: {},
        total_passed: 0,
        total_failed: 0,
        total_tests: 0,
        error: error.message
      };
    }
  }

  /**
   * Check Threema Gateway configuration status
   * PASSIVE check only — never sends a real message (costs €0.05/msg)
   * Verifies that environment variables are present.
   * @returns {Promise<Object>} Threema configuration status
   */
  async checkThreemaConfiguration() {
    const THREEMA_GATEWAY_ID = process.env.THREEMA_GATEWAY_ID;
    const THREEMA_SECRET = process.env.THREEMA_SECRET;
    const OWNER_THREEMA_ID = process.env.OWNER_THREEMA_ID;

    const results = {
      test: 'Threema Configuration',
      checks: {
        THREEMA_GATEWAY_ID: !!THREEMA_GATEWAY_ID,
        THREEMA_SECRET: !!THREEMA_SECRET,
        OWNER_THREEMA_ID: !!OWNER_THREEMA_ID
      },
      all_configured: false,
      status: 'UNKNOWN'
    };

    results.all_configured = Object.values(results.checks).every(v => v);

    if (results.all_configured) {
      results.status = 'CONFIGURED';
      results.gateway_id_prefix = THREEMA_GATEWAY_ID.substring(0, 2) + '***';
      results.owner_id_prefix = OWNER_THREEMA_ID.substring(0, 3) + '***';
    } else {
      results.status = 'NOT_CONFIGURED';
      results.missing = Object.entries(results.checks)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      results.warning = 'Urgentie 5 alerts (production_down, security_breach, etc.) worden NIET via Threema verstuurd';
    }

    return results;
  }

  /**
   * Get the most recent smoke test result
   * @returns {Promise<Object|null>}
   */
  async getLatestResult() {
    try {
      return await SmokeTestResult.findOne().sort({ timestamp: -1 }).lean();
    } catch {
      return null;
    }
  }

  /**
   * Run a single test with timing and error handling
   * @private
   */
  async _runTest(name, testFn) {
    const startTime = Date.now();
    try {
      const data = await testFn();
      return {
        name,
        passed: true,
        duration_ms: Date.now() - startTime,
        ...data
      };
    } catch (error) {
      return {
        name,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

export default new SmokeTestRunner();
