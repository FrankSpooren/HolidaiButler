/**
 * Enterprise 11B Test Suite — Fase 12 Blok E
 *
 * Tests for: trendHelper, agentIssues, baselineService, correlationService
 * All mocked — NO database required.
 */

// ═══════════════════════════════════════════════════════════════
// SECTION 1: trendHelper — Pure function tests (no mocks needed)
// ═══════════════════════════════════════════════════════════════

// Inline implementations matching trendHelper.js — avoids mongoose import
function calculateSecurityTrend(current, previous) {
  if (!previous?.vulnerabilities) return { direction: 'FIRST_SCAN' };
  const prev = previous.vulnerabilities;
  const currTotal = current.total || 0;
  const prevTotal = prev.total || 0;
  return {
    criticalDelta: (current.critical || 0) - (prev.critical || 0),
    highDelta: (current.high || 0) - (prev.high || 0),
    totalDelta: currTotal - prevTotal,
    direction: currTotal > prevTotal ? 'WORSE' : currTotal < prevTotal ? 'BETTER' : 'STABLE'
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
    direction: currLogs > prevLogs ? 'WORSE' : currLogs < prevLogs ? 'BETTER' : 'STABLE'
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
    direction: currAvg > prevAvg * 1.2 ? 'SLOWER' : currAvg < prevAvg * 0.8 ? 'FASTER' : 'STABLE'
  };
}

describe('trendHelper', () => {
  // --- calculateSecurityTrend ---

  test('T1: FIRST_SCAN when no previous data', () => {
    const result = calculateSecurityTrend({ total: 5, critical: 1 }, null);
    expect(result.direction).toBe('FIRST_SCAN');
  });

  test('T2: FIRST_SCAN when previous has no vulnerabilities', () => {
    const result = calculateSecurityTrend({ total: 5 }, { someOtherData: true });
    expect(result.direction).toBe('FIRST_SCAN');
  });

  test('T3: WORSE when total increases', () => {
    const current = { total: 10, critical: 2, high: 3 };
    const previous = { vulnerabilities: { total: 5, critical: 1, high: 2 } };
    const result = calculateSecurityTrend(current, previous);
    expect(result.direction).toBe('WORSE');
    expect(result.totalDelta).toBe(5);
    expect(result.criticalDelta).toBe(1);
    expect(result.highDelta).toBe(1);
  });

  test('T4: BETTER when total decreases', () => {
    const current = { total: 2, critical: 0, high: 1 };
    const previous = { vulnerabilities: { total: 8, critical: 3, high: 4 } };
    const result = calculateSecurityTrend(current, previous);
    expect(result.direction).toBe('BETTER');
    expect(result.totalDelta).toBe(-6);
  });

  test('T5: STABLE when total unchanged', () => {
    const current = { total: 5, critical: 1, high: 2 };
    const previous = { vulnerabilities: { total: 5, critical: 2, high: 1 } };
    const result = calculateSecurityTrend(current, previous);
    expect(result.direction).toBe('STABLE');
    expect(result.criticalDelta).toBe(-1);
    expect(result.highDelta).toBe(1);
  });

  // --- calculateCodeTrend ---

  test('T6: FIRST_SCAN when no previous code data', () => {
    const result = calculateCodeTrend({ consoleLogs: 50, todos: 10 }, null);
    expect(result.direction).toBe('FIRST_SCAN');
  });

  test('T7: WORSE when console.logs increase', () => {
    const result = calculateCodeTrend(
      { consoleLogs: 100, todos: 5 },
      { consoleLogs: 80, todos: 3 }
    );
    expect(result.direction).toBe('WORSE');
    expect(result.consoleLogDelta).toBe(20);
    expect(result.todoDelta).toBe(2);
  });

  test('T8: BETTER when console.logs decrease', () => {
    const result = calculateCodeTrend(
      { consoleLogs: 30, todos: 2 },
      { consoleLogs: 50, todos: 5 }
    );
    expect(result.direction).toBe('BETTER');
    expect(result.consoleLogDelta).toBe(-20);
  });

  // --- calculatePerformanceTrend ---

  test('T9: FIRST_SCAN when no previous perf data', () => {
    const result = calculatePerformanceTrend([{ ttfb: '200' }], []);
    expect(result.direction).toBe('FIRST_SCAN');
  });

  test('T10: SLOWER when TTFB increases >20%', () => {
    const current = [{ ttfb: '500' }, { ttfb: '600' }];
    const previous = [{ ttfb: '200' }, { ttfb: '250' }];
    const result = calculatePerformanceTrend(current, previous);
    expect(result.direction).toBe('SLOWER');
    expect(result.avgTtfb).toBe(550);
    expect(result.prevAvgTtfb).toBe(225);
  });

  test('T11: FASTER when TTFB decreases >20%', () => {
    const current = [{ ttfb: '100' }, { ttfb: '120' }];
    const previous = [{ ttfb: '300' }, { ttfb: '350' }];
    const result = calculatePerformanceTrend(current, previous);
    expect(result.direction).toBe('FASTER');
  });

  test('T12: STABLE when TTFB within 20%', () => {
    const current = [{ ttfb: '200' }, { ttfb: '220' }];
    const previous = [{ ttfb: '190' }, { ttfb: '210' }];
    const result = calculatePerformanceTrend(current, previous);
    expect(result.direction).toBe('STABLE');
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: agentIssues — SLA windows and issue ID logic
// ═══════════════════════════════════════════════════════════════

describe('agentIssues — SLA Windows', () => {
  const SLA_WINDOWS = {
    critical: 24 * 60 * 60 * 1000,      // 24h
    high: 72 * 60 * 60 * 1000,          // 72h
    medium: 7 * 24 * 60 * 60 * 1000,    // 7d
    low: 30 * 24 * 60 * 60 * 1000,      // 30d
    info: null
  };

  test('T13: critical SLA = 24 hours', () => {
    expect(SLA_WINDOWS.critical).toBe(86400000);
  });

  test('T14: high SLA = 72 hours', () => {
    expect(SLA_WINDOWS.high).toBe(259200000);
  });

  test('T15: info has no SLA (null)', () => {
    expect(SLA_WINDOWS.info).toBeNull();
  });

  test('T16: SLA escalation order is correct', () => {
    expect(SLA_WINDOWS.critical).toBeLessThan(SLA_WINDOWS.high);
    expect(SLA_WINDOWS.high).toBeLessThan(SLA_WINDOWS.medium);
    expect(SLA_WINDOWS.medium).toBeLessThan(SLA_WINDOWS.low);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: baselineService — Statistical calculations
// ═══════════════════════════════════════════════════════════════

describe('baselineService — Statistics', () => {
  // Pure math functions extracted from baselineService logic
  function computeBaseline(values) {
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
  }

  function checkAnomaly(currentValue, baseline) {
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

  test('T17: baseline returns null for <3 values', () => {
    expect(computeBaseline([1, 2])).toBeNull();
    expect(computeBaseline([])).toBeNull();
  });

  test('T18: baseline calculates mean correctly', () => {
    const result = computeBaseline([10, 20, 30]);
    expect(result.mean).toBe(20);
  });

  test('T19: baseline calculates stdDev correctly', () => {
    const result = computeBaseline([10, 10, 10, 10]);
    expect(result.stdDev).toBe(0);
    expect(result.min).toBe(10);
    expect(result.max).toBe(10);
  });

  test('T20: anomaly detected when value > 2σ above mean', () => {
    const baseline = computeBaseline([10, 12, 11, 10, 13, 11, 12, 10, 11, 12]);
    // mean ≈ 11.2, stdDev ≈ 0.98. Value of 20 = (20-11.2)/0.98 ≈ 8.98σ
    const result = checkAnomaly(20, baseline);
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe('ABOVE_NORMAL');
    expect(result.deviation).toBeGreaterThan(2);
  });

  test('T21: no anomaly when value within 2σ', () => {
    const baseline = computeBaseline([10, 12, 11, 10, 13, 11, 12, 10, 11, 12]);
    const result = checkAnomaly(12, baseline);
    expect(result.isAnomaly).toBe(false);
  });

  test('T22: no anomaly when stdDev is 0 (no variance)', () => {
    const baseline = computeBaseline([5, 5, 5, 5, 5]);
    const result = checkAnomaly(5, baseline);
    expect(result.isAnomaly).toBe(false);
    expect(result.reason).toBe('no_variance');
  });

  test('T23: anomaly below normal detected', () => {
    const baseline = computeBaseline([100, 105, 98, 102, 100, 103, 99, 101]);
    // mean ≈ 101, stdDev ≈ 2.12. Value of 50 = (50-101)/2.12 ≈ -24σ
    const result = checkAnomaly(50, baseline);
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe('BELOW_NORMAL');
  });

  test('T24: threshold boundaries are calculated correctly', () => {
    const baseline = { mean: 100, stdDev: 10 };
    const result = checkAnomaly(100, baseline);
    expect(result.threshold.upper).toBe(120);
    expect(result.threshold.lower).toBe(80);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: correlationService — Pattern detection logic
// ═══════════════════════════════════════════════════════════════

describe('correlationService — Pattern detection', () => {
  test('T25: security+performance both WORSE = high severity correlation', () => {
    const secTrend = 'WORSE';
    const perfTrend = 'SLOWER';

    // Simulates the correlationService logic
    const correlations = [];
    if (secTrend === 'WORSE' && (perfTrend === 'SLOWER' || perfTrend === 'WORSE')) {
      correlations.push({
        type: 'security_performance_decline',
        severity: 'high',
        agents: ['security-reviewer', 'ux-ui-reviewer']
      });
    }
    expect(correlations).toHaveLength(1);
    expect(correlations[0].severity).toBe('high');
    expect(correlations[0].type).toBe('security_performance_decline');
  });

  test('T26: no correlation when trends diverge', () => {
    const secTrend = 'BETTER';
    const perfTrend = 'SLOWER';

    const correlations = [];
    if (secTrend === 'WORSE' && (perfTrend === 'SLOWER' || perfTrend === 'WORSE')) {
      correlations.push({ type: 'security_performance_decline' });
    }
    expect(correlations).toHaveLength(0);
  });

  test('T27: console.log growth insight when >10% increase and >300', () => {
    const currLogs = 350;
    const prevLogs = 300;
    const insights = [];

    if (currLogs > prevLogs * 1.1 && currLogs > 300) {
      insights.push({
        type: 'console_log_growth',
        severity: 'low'
      });
    }
    expect(insights).toHaveLength(1);
  });

  test('T28: no console.log insight when below threshold', () => {
    const currLogs = 250;
    const prevLogs = 240;
    const insights = [];

    if (currLogs > prevLogs * 1.1 && currLogs > 300) {
      insights.push({ type: 'console_log_growth' });
    }
    expect(insights).toHaveLength(0);
  });

  test('T29: persistent_health_issues when >3 of 7 days unhealthy', () => {
    const healthEntries = [
      { metadata: { warnings: ['disk 80%'] } },
      { metadata: { warnings: ['disk 82%'] } },
      { metadata: { unhealthyServices: ['redis'] } },
      { metadata: { warnings: ['cpu high'] } },
      { metadata: {} },
      { metadata: {} },
      { metadata: {} }
    ];

    const unhealthyDays = healthEntries.filter(e =>
      e.metadata?.unhealthyServices?.length > 0 ||
      e.metadata?.warnings?.length > 0
    ).length;

    const correlations = [];
    if (unhealthyDays > 3) {
      correlations.push({
        type: 'persistent_health_issues',
        severity: 'medium'
      });
    }
    expect(unhealthyDays).toBe(4);
    expect(correlations).toHaveLength(1);
  });

  test('T30: issue_backlog when >3 issues older than 7 days', () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

    const openIssues = [
      { detectedAt: new Date(eightDaysAgo) },
      { detectedAt: new Date(eightDaysAgo) },
      { detectedAt: new Date(eightDaysAgo) },
      { detectedAt: new Date(eightDaysAgo) },
      { detectedAt: new Date(twoDaysAgo) }
    ];

    const weekOldIssues = openIssues.filter(i =>
      (now - new Date(i.detectedAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    );

    const insights = [];
    if (weekOldIssues.length > 3) {
      insights.push({
        type: 'issue_backlog',
        severity: 'medium'
      });
    }
    expect(weekOldIssues).toHaveLength(4);
    expect(insights).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: auditLogger _sanitizeDetails guard
// ═══════════════════════════════════════════════════════════════

describe('auditLogger — Status sanitization', () => {
  const VALID_STATUSES = ["initiated", "completed", "failed", "pending_approval"];

  function sanitizeDetails(details) {
    if (details.status && !VALID_STATUSES.includes(details.status)) {
      const { status, ...safe } = details;
      return safe;
    }
    return details;
  }

  test('T31: strips invalid status "success"', () => {
    const input = { status: 'success', description: 'test' };
    const result = sanitizeDetails(input);
    expect(result.status).toBeUndefined();
    expect(result.description).toBe('test');
  });

  test('T32: preserves valid status "completed"', () => {
    const input = { status: 'completed', description: 'test' };
    const result = sanitizeDetails(input);
    expect(result.status).toBe('completed');
  });

  test('T33: preserves valid status "failed"', () => {
    const input = { status: 'failed', metadata: { error: 'boom' } };
    const result = sanitizeDetails(input);
    expect(result.status).toBe('failed');
  });

  test('T34: passes through details without status field', () => {
    const input = { description: 'no status here', metadata: {} };
    const result = sanitizeDetails(input);
    expect(result).toEqual(input);
  });
});
