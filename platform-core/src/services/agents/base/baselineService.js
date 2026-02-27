/**
 * Baseline Service v1.0 — Rolling averages + anomaliedetectie
 *
 * Berekent baselines op basis van de laatste N scans per agent.
 * Detecteert anomalieën wanneer een waarde > 2 standaarddeviaties
 * van het gemiddelde afwijkt.
 *
 * Fase 11B Blok H — Niveau 7A
 */

import mongoose from 'mongoose';
import { raiseIssue } from './agentIssues.js';

const BASELINE_WINDOW = 14;  // Laatste 14 scans voor baseline

/**
 * Bereken rolling baseline voor een specifieke metric van een agent.
 * @param {string} agentName - actor.name in audit_logs
 * @param {string} action - actie filter
 * @param {string} metricPath - pad naar de metric in metadata (bv. 'vulnerabilities.total')
 * @returns {{ mean, stdDev, min, max, count, values }}
 */
async function calculateBaseline(agentName, action, metricPath) {
  try {
    const db = mongoose.connection.db;
    const entries = await db.collection('audit_logs')
      .find({ 'actor.name': agentName, action: action, status: 'completed' })
      .sort({ timestamp: -1 })
      .limit(BASELINE_WINDOW)
      .toArray();

    if (entries.length < 3) return null;

    // Extract metric waarden via pad — data is in metadata (logAgent stores { metadata: results })
    const values = entries.map(e => {
      const parts = metricPath.split('.');
      let val = e.metadata;
      for (const part of parts) {
        val = val?.[part];
      }
      return typeof val === 'number' ? val : null;
    }).filter(v => v !== null);

    if (values.length < 3) return null;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      values
    };
  } catch (e) {
    console.error('[Baseline] Failed:', e.message);
    return null;
  }
}

/**
 * Detecteer anomalie: is de huidige waarde > 2 stdDev van baseline?
 * @returns {{ isAnomaly, deviation, direction, baseline }}
 */
async function detectAnomaly(agentName, action, metricPath, currentValue) {
  const baseline = await calculateBaseline(agentName, action, metricPath);
  if (!baseline || baseline.stdDev === 0) {
    return { isAnomaly: false, reason: baseline ? 'no_variance' : 'insufficient_data' };
  }

  const deviation = (currentValue - baseline.mean) / baseline.stdDev;
  const isAnomaly = Math.abs(deviation) > 2;

  return {
    isAnomaly,
    deviation: Math.round(deviation * 100) / 100,
    direction: deviation > 0 ? 'ABOVE_NORMAL' : 'BELOW_NORMAL',
    baseline: { mean: baseline.mean, stdDev: baseline.stdDev },
    threshold: {
      upper: Math.round((baseline.mean + 2 * baseline.stdDev) * 100) / 100,
      lower: Math.round((baseline.mean - 2 * baseline.stdDev) * 100) / 100
    }
  };
}

const AGENT_LABELS = {
  'security-reviewer': 'De Bewaker',
  'code-reviewer': 'De Corrector',
  'ux-ui-reviewer': 'De Stylist'
};

const AGENT_CATEGORIES = {
  'security-reviewer': 'security',
  'code-reviewer': 'code_quality',
  'ux-ui-reviewer': 'performance'
};

/**
 * Voer anomaliedetectie uit voor alle dev agent metrieken.
 * Retourneert lijst van gedetecteerde anomalieën.
 */
async function runAnomalyDetection() {
  const checks = [
    { agent: 'security-reviewer', action: 'npm_audit_scan', metric: 'total', label: 'Total npm vulnerabilities' },
    { agent: 'security-reviewer', action: 'npm_audit_scan', metric: 'vulnerabilities.critical', label: 'Critical vulnerabilities' },
    { agent: 'code-reviewer', action: 'code_quality_scan', metric: 'consoleLogs', label: 'Console.log count' },
    { agent: 'ux-ui-reviewer', action: 'performance_check', metric: 'trend.avgTtfb', label: 'Average TTFB' }
  ];

  const anomalies = [];
  const db = mongoose.connection.db;

  for (const check of checks) {
    const latest = await db.collection('audit_logs').findOne(
      { 'actor.name': check.agent, action: check.action, status: 'completed' },
      { sort: { timestamp: -1 } }
    );
    if (!latest?.metadata) continue;

    // Extract huidige waarde from metadata
    const parts = check.metric.split('.');
    let currentValue = latest.metadata;
    for (const part of parts) currentValue = currentValue?.[part];
    if (typeof currentValue !== 'number') continue;

    const result = await detectAnomaly(check.agent, check.action, check.metric, currentValue);
    if (result.isAnomaly) {
      const anomaly = { ...check, currentValue, ...result };
      anomalies.push(anomaly);

      // H3: automatisch issue aanmaken bij anomalie
      try {
        await raiseIssue({
          agentName: check.agent,
          agentLabel: AGENT_LABELS[check.agent] || check.agent,
          severity: Math.abs(result.deviation) > 3 ? 'high' : 'medium',
          category: AGENT_CATEGORIES[check.agent] || 'other',
          title: `Anomalie: ${check.label} (${currentValue} vs normaal ${result.baseline.mean})`,
          description: `Afwijking van ${Math.abs(result.deviation)}σ gedetecteerd. Drempel: ${result.threshold.lower} - ${result.threshold.upper}`,
          details: anomaly,
          fingerprint: `anomaly-${check.agent}-${check.metric}`
        });
      } catch (e) {
        console.error('[Baseline] Issue creation failed:', e.message);
      }
    }
  }

  return anomalies;
}

export { calculateBaseline, detectAnomaly, runAnomalyDetection };
