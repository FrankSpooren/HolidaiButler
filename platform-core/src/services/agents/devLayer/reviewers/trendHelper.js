/**
 * Trend Helper v1.0 — Week-over-week vergelijking voor dev agents
 * Gebruikt door: securityReviewer, codeReviewer, uxReviewer
 */

import mongoose from 'mongoose';

async function getPreviousScan(agentName, action) {
  try {
    const db = mongoose.connection.db;
    if (!db) return null;
    // Skip the most recent one (that's the current scan being written),
    // get the one before that
    const previous = await db.collection('audit_logs')
      .find({ 'actor.name': agentName, action: action, status: 'completed' })
      .sort({ timestamp: -1 })
      .skip(1)
      .limit(1)
      .toArray();
    return previous[0]?.metadata || null;
  } catch (e) {
    console.error(`[TrendHelper] Failed to get previous scan for ${agentName}:`, e.message);
    return null;
  }
}

function calculateSecurityTrend(current, previous) {
  if (!previous?.vulnerabilities) return { direction: 'FIRST_SCAN' };
  const prev = previous.vulnerabilities;
  const currTotal = current.total || 0;
  const prevTotal = prev.total || 0;
  return {
    criticalDelta: (current.critical || 0) - (prev.critical || 0),
    highDelta: (current.high || 0) - (prev.high || 0),
    totalDelta: currTotal - prevTotal,
    direction: currTotal > prevTotal ? 'WORSE' :
               currTotal < prevTotal ? 'BETTER' : 'STABLE'
  };
}

function calculateCodeTrend(current, previous) {
  if (!previous) return { direction: 'FIRST_SCAN' };
  const currLogs = current.consoleLogs || 0;
  const prevLogs = previous.consoleLogs || 0;
  const currTodos = current.todos || 0;
  const prevTodos = previous.todos || 0;
  return {
    consoleLogDelta: currLogs - prevLogs,
    todoDelta: currTodos - prevTodos,
    direction: currLogs > prevLogs ? 'WORSE' :
               currLogs < prevLogs ? 'BETTER' : 'STABLE'
  };
}

function calculatePerformanceTrend(currentChecks, previousChecks) {
  if (!previousChecks || previousChecks.length === 0) return { direction: 'FIRST_SCAN' };
  const avg = checks => checks.reduce((s, c) => s + (parseInt(c.ttfb) || 0), 0) / checks.length;
  const currAvg = avg(currentChecks);
  const prevAvg = avg(previousChecks);
  return {
    ttfbDelta: Math.round(currAvg - prevAvg),
    avgTtfb: Math.round(currAvg),
    prevAvgTtfb: Math.round(prevAvg),
    direction: currAvg > prevAvg * 1.2 ? 'SLOWER' :
               currAvg < prevAvg * 0.8 ? 'FASTER' : 'STABLE'
  };
}

export { getPreviousScan, calculateSecurityTrend, calculateCodeTrend, calculatePerformanceTrend };
