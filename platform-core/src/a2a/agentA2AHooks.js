/**
 * A2A Hooks for Agent Integration
 * Provides pre-built hooks that agents call after key operations.
 * Each hook fires A2A skills to target agents.
 *
 * Usage in any agent:
 *   import { afterHealthCheck, afterSecurityScan, afterBudgetCheck } from '../../a2a/agentA2AHooks.js';
 *   // After your check completes:
 *   await afterHealthCheck('dokter', checkResult);
 */
import { invokeSkill } from './a2aClient.js';
import logger from '../utils/logger.js';

/**
 * E2: After health check detects anomaly → alert Bode
 */
export async function afterHealthCheck(sourceAgent, result) {
  try {
    // Always push to dashboard (E8)
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'health_check',
      severity: result.healthy ? 'info' : 'critical',
      data: { status: result.healthy ? 'ok' : 'anomaly', details: result }
    }, { sourceAgent });

    // Alert Bode if unhealthy (E2)
    if (!result.healthy || result.status === 'critical') {
      await invokeSkill('bode', 'sendAlert', {
        severity: 'critical',
        title: `Health anomaly detected by ${sourceAgent}`,
        message: result.error || result.message || 'Health check failed',
        metrics: result.metrics || result,
        sourceAgent
      }, { sourceAgent });
    }
  } catch (error) {
    logger.error(`[a2a-hooks] afterHealthCheck failed for ${sourceAgent}:`, error.message);
  }
}

/**
 * E3: After security scan → alert Bode
 */
export async function afterSecurityScan(sourceAgent, result) {
  try {
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'security_scan',
      severity: result.vulnerabilities > 0 ? 'warning' : 'info',
      data: result
    }, { sourceAgent });

    if (result.vulnerabilities > 0 || result.severity === 'critical') {
      await invokeSkill('bode', 'sendAlert', {
        severity: result.severity || 'warning',
        title: `Security alert from ${sourceAgent}`,
        message: `${result.vulnerabilities} vulnerabilities detected`,
        metrics: result,
        sourceAgent
      }, { sourceAgent });
    }
  } catch (error) {
    logger.error(`[a2a-hooks] afterSecurityScan failed for ${sourceAgent}:`, error.message);
  }
}

/**
 * E4+E5: After financial/budget check → alert Bode
 */
export async function afterBudgetCheck(sourceAgent, result) {
  try {
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'budget_check',
      severity: result.exceeded ? 'critical' : 'info',
      data: result
    }, { sourceAgent });

    if (result.exceeded || result.warningThreshold) {
      const severity = result.exceeded ? 'critical' : 'warning';
      await invokeSkill('bode', 'sendAlert', {
        severity,
        title: `Budget ${result.exceeded ? 'EXCEEDED' : 'warning'}: ${result.service || 'unknown'}`,
        message: `Spent: EUR ${result.spent} / EUR ${result.budget}`,
        metrics: result,
        sourceAgent
      }, { sourceAgent });

      // C1: If exceeded, pause publishing
      if (result.exceeded) {
        await invokeSkill('uitgever', 'pausePublishing', {
          reason: `Budget exceeded for ${result.service}: EUR ${result.spent} / EUR ${result.budget}`,
          budgetInfo: result,
          sourceAgent
        }, { sourceAgent });
      }
    }
  } catch (error) {
    logger.error(`[a2a-hooks] afterBudgetCheck failed for ${sourceAgent}:`, error.message);
  }
}

/**
 * E6: After compliance/GDPR check → alert Bode
 */
export async function afterComplianceCheck(sourceAgent, result) {
  try {
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'compliance_check',
      severity: result.violations > 0 ? 'critical' : 'info',
      data: result
    }, { sourceAgent });

    if (result.violations > 0) {
      await invokeSkill('bode', 'sendAlert', {
        severity: 'critical',
        title: `Compliance violation detected by ${sourceAgent}`,
        message: `${result.violations} violations found`,
        metrics: result,
        sourceAgent
      }, { sourceAgent });
    }
  } catch (error) {
    logger.error(`[a2a-hooks] afterComplianceCheck failed for ${sourceAgent}:`, error.message);
  }
}

/**
 * E7: After SLA/availability check → alert Bode
 */
export async function afterSLACheck(sourceAgent, result) {
  try {
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'sla_check',
      severity: result.breached ? 'critical' : 'info',
      data: result
    }, { sourceAgent });

    if (result.breached) {
      await invokeSkill('bode', 'sendAlert', {
        severity: 'critical',
        title: `SLA breach detected by ${sourceAgent}`,
        message: result.message || `Uptime: ${result.uptime}%, target: ${result.target}%`,
        metrics: result,
        sourceAgent
      }, { sourceAgent });
    }
  } catch (error) {
    logger.error(`[a2a-hooks] afterSLACheck failed for ${sourceAgent}:`, error.message);
  }
}

/**
 * E1: Collect briefing report from an agent (called during daily briefing aggregation)
 */
export async function submitBriefingReport(sourceAgent, report) {
  try {
    await invokeSkill('dashboard', 'pushUpdate', {
      agentId: sourceAgent,
      eventType: 'briefing_report',
      severity: 'info',
      data: report
    }, { sourceAgent });
  } catch (error) {
    logger.error(`[a2a-hooks] submitBriefingReport failed for ${sourceAgent}:`, error.message);
  }
}

export default {
  afterHealthCheck,
  afterSecurityScan,
  afterBudgetCheck,
  afterComplianceCheck,
  afterSLACheck,
  submitBriefingReport
};
