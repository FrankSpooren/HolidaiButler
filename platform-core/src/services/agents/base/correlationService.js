/**
 * Cross-Agent Correlation Service v1.0
 *
 * Analyseert patronen TUSSEN agent bevindingen:
 * - Security + Performance: correlatie vulnerabilities ↔ TTFB
 * - Code Quality trend: console.log groei detectie
 * - Persistent health issues: structurele waarschuwingen
 * - Issue velocity: open issues backlog
 *
 * Draait wekelijks (maandag) als onderdeel van De Bode briefing.
 *
 * Fase 11B Blok I — Niveau 7B
 */

import mongoose from 'mongoose';
import { getOpenIssues } from './agentIssues.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';

async function generateCorrelationReport() {
  const db = mongoose.connection.db;
  const report = { correlations: [], insights: [], generatedAt: new Date() };

  // --- CORRELATIE 1: Security trend vs Performance trend ---
  try {
    const securityEntries = await db.collection('audit_logs')
      .find({ 'actor.name': 'security-reviewer', action: 'npm_audit_scan', status: 'completed' })
      .sort({ timestamp: -1 }).limit(7).toArray();

    const perfEntries = await db.collection('audit_logs')
      .find({ 'actor.name': 'ux-ui-reviewer', action: 'performance_check', status: 'completed' })
      .sort({ timestamp: -1 }).limit(7).toArray();

    if (securityEntries.length >= 2 && perfEntries.length >= 2) {
      const secTrend = securityEntries[0]?.metadata?.trend?.direction;
      const perfTrend = perfEntries[0]?.metadata?.trend?.direction;

      if (secTrend === 'WORSE' && (perfTrend === 'SLOWER' || perfTrend === 'WORSE')) {
        report.correlations.push({
          type: 'security_performance_decline',
          severity: 'high',
          description: 'Zowel security als performance verslechteren gelijktijdig — mogelijke systematische degradatie',
          agents: ['security-reviewer', 'ux-ui-reviewer']
        });
      }
    }
  } catch (e) {
    console.error('[Correlation] Security-perf check failed:', e.message);
  }

  // --- CORRELATIE 2: Code quality trend ---
  try {
    const codeEntries = await db.collection('audit_logs')
      .find({ 'actor.name': 'code-reviewer', action: 'code_quality_scan', status: 'completed' })
      .sort({ timestamp: -1 }).limit(4).toArray();

    if (codeEntries.length >= 2) {
      const curr = codeEntries[0]?.metadata;
      const prev = codeEntries[1]?.metadata;
      const currLogs = curr?.consoleLogs || curr?.consoleLogCount || 0;
      const prevLogs = prev?.consoleLogs || prev?.consoleLogCount || 0;

      if (currLogs > prevLogs * 1.1 && currLogs > 300) {
        report.insights.push({
          type: 'console_log_growth',
          description: `Console.log statements groeien: ${prevLogs} → ${currLogs} (+${currLogs - prevLogs}). Overweeg een cleanup sprint.`,
          severity: 'low'
        });
      }
    }
  } catch (e) {
    console.error('[Correlation] Code quality check failed:', e.message);
  }

  // --- CORRELATIE 3: Gezondheid ecosysteem samenvatting ---
  try {
    const healthEntries = await db.collection('audit_logs')
      .find({ 'actor.name': 'health-monitor', status: 'completed' })
      .sort({ timestamp: -1 }).limit(7).toArray();

    const unhealthyDays = healthEntries.filter(e =>
      e.metadata?.unhealthyServices?.length > 0 ||
      e.metadata?.warnings?.length > 0
    ).length;

    if (unhealthyDays > 3) {
      report.correlations.push({
        type: 'persistent_health_issues',
        severity: 'medium',
        description: `${unhealthyDays} van ${healthEntries.length} recente health checks tonen waarschuwingen — structureel probleem mogelijk`,
        agents: ['health-monitor']
      });
    }
  } catch (e) {
    console.error('[Correlation] Health check failed:', e.message);
  }

  // --- CORRELATIE 4: Issue velocity ---
  try {
    const openIssues = await getOpenIssues();
    const weekOldIssues = openIssues.filter(i =>
      (Date.now() - new Date(i.detectedAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    );

    if (weekOldIssues.length > 3) {
      report.insights.push({
        type: 'issue_backlog',
        description: `${weekOldIssues.length} issues zijn ouder dan 7 dagen zonder resolutie. Issue velocity te laag.`,
        severity: 'medium'
      });
    }
  } catch (e) {
    console.error('[Correlation] Issue velocity check failed:', e.message);
  }

  // Log correlatie rapport
  try {
    await logAgent('correlation-engine', 'weekly_correlation_report', {
      status: 'completed',
      metadata: report
    });
  } catch (e) {
    console.error('[Correlation] Audit log failed:', e.message);
  }

  return report;
}

export { generateCorrelationReport };
