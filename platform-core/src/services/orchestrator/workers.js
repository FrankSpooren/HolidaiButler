import { Worker } from 'bullmq';
import { connection } from './queues.js';

let scheduledWorker = null;
let alertWorker = null;
let orchestratorWorker = null;

export function startWorkers() {
  console.log('[Orchestrator] Starting workers...');

  // Scheduled Tasks Worker
  scheduledWorker = new Worker('scheduled-tasks', async (job) => {
    console.log('[Orchestrator] Processing scheduled job: ' + job.name);
    
    switch (job.name) {
      case 'daily-briefing':
        console.log('[Orchestrator] Generating daily briefing for owners...');
        // TODO: Implement owner briefing logic
        break;
        
      case 'cost-check':
        try {
          const { getReport } = await import('./costController/index.js');
          const report = await getReport();
          console.log('[Orchestrator] Cost check completed:', JSON.stringify({
            totalSpent: report.summary.totalSpent.toFixed(2),
            percentage: report.summary.percentageUsed.toFixed(1) + '%',
            alerts: report.alerts.length
          }));
          return report;
        } catch (error) {
          console.error('[Orchestrator] Cost check failed:', error.message);
        }
        break;
        
      case 'health-check':
        console.log('[Orchestrator] Running system health check...');
        // TODO: Implement health check logic
        break;
        
      case 'weekly-cost-report':
        try {
          const { getReport } = await import('./costController/index.js');
          const report = await getReport();
          console.log('[Orchestrator] Weekly cost report generated');
          // TODO: Send report via email
          return report;
        } catch (error) {
          console.error('[Orchestrator] Weekly report failed:', error.message);
        }
        break;
        
      default:
        console.log('[Orchestrator] Unknown job type: ' + job.name);
    }
    
    return { success: true, processedAt: new Date().toISOString() };
  }, { connection });

  // Alert Worker
  alertWorker = new Worker('alerts', async (job) => {
    console.log('[Orchestrator] Processing alert: ' + job.name);
    if (job.name === 'budget-alert') {
      console.log('[Orchestrator] Budget alert:', JSON.stringify(job.data));
      // TODO: Send alert to Owner Interface Agent
    }
    return { success: true };
  }, { connection });

  // Main Orchestrator Worker
  orchestratorWorker = new Worker('orchestrator', async (job) => {
    console.log('[Orchestrator] Processing task: ' + job.name);
    // TODO: Implement main orchestration logic
    return { success: true };
  }, { connection });

  // Error handlers
  scheduledWorker.on('failed', (job, err) => {
    console.error('[Orchestrator] Scheduled job failed: ' + (job?.name || 'unknown'), err.message);
  });

  alertWorker.on('failed', (job, err) => {
    console.error('[Orchestrator] Alert job failed: ' + (job?.name || 'unknown'), err.message);
  });

  orchestratorWorker.on('failed', (job, err) => {
    console.error('[Orchestrator] Orchestrator job failed: ' + (job?.name || 'unknown'), err.message);
  });

  console.log('[Orchestrator] Workers started');
  console.log('[Orchestrator] - Scheduled Tasks Worker: active');
  console.log('[Orchestrator] - Alert Worker: active');
  console.log('[Orchestrator] - Orchestrator Worker: active');
}

export async function stopWorkers() {
  console.log('[Orchestrator] Stopping workers...');
  if (scheduledWorker) await scheduledWorker.close();
  if (alertWorker) await alertWorker.close();
  if (orchestratorWorker) await orchestratorWorker.close();
  console.log('[Orchestrator] Workers stopped');
}

export { scheduledWorker, alertWorker, orchestratorWorker };
