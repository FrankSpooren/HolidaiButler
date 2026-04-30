/**
 * Temporal Workflow: Weekly Learning Cycle Saga
 * 4 steps: aggregate metrics -> analyze patterns -> distribute lessons (CD1) -> verify adoption
 * Compensation: re-run on failure
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  sendAlert, pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '5 minutes' });

const {
  aggregateWeeklyMetrics, analyzePatterns, distributeLessons, verifyLessonAdoption
} = proxyActivities({ startToCloseTimeout: '15 minutes' });

export async function weeklyLearningCycleSaga(input) {
  const { week_start, week_end } = input;
  const steps = [];

  try {
    // Step 1: Aggregate
    const metrics = await aggregateWeeklyMetrics({ week_start, week_end });
    steps.push('aggregate');

    // Step 2: Analyze
    const patterns = await analyzePatterns({ metrics: metrics.data });
    steps.push('analyze');

    if (patterns.lessons.length === 0) {
      return { success: true, lessons_distributed: 0, steps };
    }

    // Step 3: Distribute via CD1 broadcast
    const distribution = await distributeLessons({ lessons: patterns.lessons });
    steps.push('distribute');

    // Step 4: Wait + verify
    await sleep('30 seconds');
    const verification = await verifyLessonAdoption({
      lesson_ids: distribution.lesson_ids
    });
    steps.push('verify');

    await pushDashboardEvent('leermeester', 'learning_cycle_completed', 'info', {
      week_start, lessons: patterns.lessons.length, adopted: verification.adopted_count
    });

    return {
      success: true,
      lessons_distributed: patterns.lessons.length,
      adopted: verification.adopted_count,
      steps
    };
  } catch (error) {
    await sendAlert('warning', `Weekly learning cycle failed: ${error.message}`, { steps });
    throw error;
  }
}
