/**
 * Temporal Workflow: Self-Healing Saga
 * Orchestrates multi-step recovery when anomalies are detected.
 *
 * Flow: anomalie detected → health check → conditional sync → verify → alert
 * Compensations: undo partial actions on failure
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  runHealthCheck,
  triggerDataSync,
  verifyRecovery,
  sendAlert,
  pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '2 minutes', retry: { maximumAttempts: 3 } });

export async function selfHealingSaga(input) {
  const { anomalyType, severity, agentId, destinationId, details } = input;
  const steps = [];

  try {
    // Step 1: Run deep health check
    await pushDashboardEvent(agentId, 'self_healing_started', 'info', { anomalyType, severity });
    const healthResult = await runHealthCheck(agentId, 'full');
    steps.push('health_check');

    if (healthResult.healthy) {
      // False alarm — anomaly resolved itself
      await pushDashboardEvent(agentId, 'self_healing_resolved', 'info', { reason: 'health_check_passed' });
      return { success: true, resolution: 'self_resolved', steps };
    }

    // Step 2: Trigger data sync if data-related
    if (['data_stale', 'sync_failure', 'content_drift'].includes(anomalyType)) {
      await triggerDataSync(destinationId, anomalyType);
      steps.push('data_sync');

      // Wait for sync to complete
      await sleep('30 seconds');

      // Step 3: Verify recovery
      const verifyResult = await verifyRecovery(agentId, anomalyType);
      steps.push('verify');

      if (verifyResult.recovered) {
        await pushDashboardEvent(agentId, 'self_healing_success', 'info', { steps });
        return { success: true, resolution: 'auto_recovered', steps };
      }
    }

    // Step 4: Could not auto-recover — escalate to owner
    await sendAlert('critical', `Self-healing failed for ${agentId}: ${anomalyType}`, details);
    steps.push('escalated');
    await pushDashboardEvent(agentId, 'self_healing_escalated', 'warning', { anomalyType, steps });

    return { success: false, resolution: 'escalated', steps };

  } catch (error) {
    // Compensation: alert owner about failed self-healing attempt
    await sendAlert('critical', `Self-healing saga error for ${agentId}: ${error.message}`, { steps, error: error.message });
    throw error;
  }
}
