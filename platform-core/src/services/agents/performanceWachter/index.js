import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import mongoose from 'mongoose';

// Performance history for trending
const PerfHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, expires: 30 * 24 * 3600 },
  endpoints: [{ name: String, status: Number, ttfb: Number, ok: Boolean }],
  avg_ttfb: Number,
  all_up: Boolean
}, { collection: 'performance_history' });
const PerfHistory = mongoose.models.PerfHistory || mongoose.model('PerfHistory', PerfHistorySchema);

const ENDPOINTS = [
  { name: 'API Health', url: 'https://api.holidaibutler.com/health' },
  { name: 'Calpe Portal', url: 'https://holidaibutler.com' },
  { name: 'Texel Portal', url: 'https://texelmaps.nl' },
  { name: 'Admin Portal', url: 'https://admin.holidaibutler.com' },
  { name: 'Dev Portal', url: 'https://dev.holidaibutler.com' },
  { name: 'API POI', url: 'https://api.holidaibutler.com/api/v1/pois?destination_id=1&limit=1' },
  { name: 'API Chat', url: 'https://api.holidaibutler.com/health' }
];

class PerformanceWachterAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Performance Wachter', version: '2.0.0', category: 'operations', destinationAware: false });
  }

  async execute() {
    const checks = [];

    for (const ep of ENDPOINTS) {
      const start = Date.now();
      try {
        const res = await fetch(ep.url, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'HolidaiButler-PerformanceWachter/2.0' }
        });
        checks.push({ name: ep.name, status: res.status, ttfb: Date.now() - start, ok: res.ok });
      } catch (err) {
        checks.push({ name: ep.name, status: 0, ttfb: Date.now() - start, ok: false, error: err.message?.substring(0, 100) });
      }
    }

    const avgTtfb = Math.round(checks.reduce((s, c) => s + c.ttfb, 0) / checks.length);
    const allUp = checks.every(c => c.ok);
    const downCount = checks.filter(c => !c.ok).length;
    const slowCount = checks.filter(c => c.ok && c.ttfb > 2000).length;

    // Persist for trending
    await PerfHistory.create({ endpoints: checks, avg_ttfb: avgTtfb, all_up: allUp });

    // Trend: compare with 1h ago
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const prevChecks = await PerfHistory.find({ timestamp: { $lte: hourAgo } }).sort({ timestamp: -1 }).limit(1).lean();
    const trend = prevChecks.length > 0 ? {
      direction: avgTtfb > prevChecks[0].avg_ttfb * 1.5 ? 'SLOWER' : avgTtfb < prevChecks[0].avg_ttfb * 0.7 ? 'FASTER' : 'STABLE',
      prev_avg_ttfb: prevChecks[0].avg_ttfb,
      delta: avgTtfb - prevChecks[0].avg_ttfb
    } : { direction: 'NEW', prev_avg_ttfb: null, delta: 0 };

    const result = { endpoints: checks, avg_ttfb: avgTtfb, all_up: allUp, down_count: downCount, slow_count: slowCount, trend };

    const issues = [];
    for (const c of checks) {
      if (!c.ok) issues.push({ severity: 'critical', category: 'performance', title: `${c.name} DOWN (status ${c.status}: ${c.error || 'unreachable'})` });
      else if (c.ttfb > 3000) issues.push({ severity: 'high', category: 'performance', title: `${c.name} critical TTFB: ${c.ttfb}ms (>3s)` });
      else if (c.ttfb > 2000) issues.push({ severity: 'medium', category: 'performance', title: `${c.name} slow TTFB: ${c.ttfb}ms (>2s)` });
    }

    await logAgent('performance-wachter', 'performance_check', { agentId: 'performanceWachter',
      description: `Performance: ${checks.length} endpoints, avg TTFB ${avgTtfb}ms, ${downCount} down, ${slowCount} slow [${trend.direction}]`,
      status: 'completed', metadata: result });

    for (const issue of issues) {
      await raiseIssue({ agentName: 'performanceWachter', agentLabel: 'De Performance Wachter',
        severity: issue.severity, category: issue.category, title: issue.title,
        fingerprint: `perfwachter-${issue.title.substring(0, 25)}` });
    }
    return result;
  }
}
export default new PerformanceWachterAgent();
