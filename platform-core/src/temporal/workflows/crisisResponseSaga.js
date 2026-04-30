/**
 * Temporal Workflow: Crisis Response Saga
 * 6 steps: detect -> assess severity -> coordinate agents -> notify Frank -> execute plan -> resolve
 * Compensation: partial recovery
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  sendAlert, pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '5 minutes' });

const {
  assessCrisisSeverity, coordinateAgentResponse, notifyOwner,
  executeCrisisPlan, resolveCrisis, rollbackCrisisPlan
} = proxyActivities({ startToCloseTimeout: '15 minutes' });

export async function crisisResponseSaga(input) {
  const { crisis_type, detected_by, details } = input;
  const compensations = [];
  const steps = [];

  try {
    // Step 1: Assess
    const assessment = await assessCrisisSeverity({ crisis_type, details });
    steps.push('assess');

    // Step 2: Coordinate
    const coordination = await coordinateAgentResponse({
      severity: assessment.severity,
      affected_agents: assessment.affected_agents
    });
    steps.push('coordinate');

    // Step 3: Notify Frank
    await notifyOwner({
      crisis_type,
      severity: assessment.severity,
      affected: assessment.affected_agents,
      recommended_action: assessment.recommended_action
    });
    steps.push('notify');

    // Step 4: Execute plan (if auto-actionable)
    if (assessment.auto_actionable) {
      const execution = await executeCrisisPlan({
        plan: assessment.recommended_action,
        affected_agents: assessment.affected_agents
      });
      compensations.push(() => rollbackCrisisPlan({ execution_id: execution.id }));
      steps.push('execute');
    }

    // Step 5: Wait for stabilization
    await sleep('60 seconds');

    // Step 6: Resolve
    const resolution = await resolveCrisis({
      crisis_type,
      steps_taken: steps,
      severity: assessment.severity
    });
    steps.push('resolve');

    await pushDashboardEvent('maestro', 'crisis_saga_completed', 'info', {
      crisis_type, severity: assessment.severity, steps, resolved: resolution.resolved
    });

    return { success: true, crisis_type, severity: assessment.severity, steps, resolution };
  } catch (error) {
    for (const compensate of compensations.reverse()) {
      try { await compensate(); } catch (e) { /* continue */ }
    }
    await sendAlert('critical', `Crisis response saga failed: ${error.message}`, { crisis_type, steps });
    throw error;
  }
}
