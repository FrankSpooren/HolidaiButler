import { Worker } from 'bullmq';
import { connection } from './queues.js';

let scheduledWorker = null;
let alertWorker = null;
let orchestratorWorker = null;

export function startWorkers() {
  console.log('[Orchestrator] Starting workers...');

  // Scheduled Tasks Worker
  scheduledWorker = new Worker('scheduled-tasks', async (job) => {
    console.log(`[Orchestrator] Processing scheduled job: ${job.name}`);
    
    switch (job.name) {
      case 'daily-briefing':
        console.log('[Orchestrator] Generating daily briefing for owners...');
        // TODO: Implement owner briefing logic
        break;
        
      case 'cost-check':
        console.log('[Orchestrator] Checking budget usage...');
        // TODO: Implement cost checking logic
        break;
        
      case 'health-check':
        console.log('[Orchestrator] Running system health check...');
        // TODO: Implement health check logic
        break;
        
      case 'weekly-cost-report':
        console.log('[Orchestrator] Generating weekly cost report...');
        // TODO: Implement weekly report logic
        break;
        
      default:
        console.log(`[Orchestrator] Unknown job type: ${job.name}`);
    }
    
    return { success: true, processedAt: new Date().toISOString() };
  }, { connection });

  // Alert Worker
  alertWorker = new Worker('alerts', async (job) => {
    console.log(`[Orchestrator] Processing alert: ${job.name}`);
    // TODO: Implement alert processing
    return { success: true };
  }, { connection });

  // Main Orchestrator Worker
  orchestratorWorker = new Worker('orchestrator', async (job) => {
    console.log(`[Orchestrator] Processing task: ${job.name}`);
    // TODO: Implement main orchestration logic
    return { success: true };
  }, { connection });

  // Error handlers
  scheduledWorker.on('failed', (job, err) => {
    console.error(`[Orchestrator] Scheduled job failed: ${job?.name}`, err.message);
  });

  alertWorker.on('failed', (job, err) => {
    console.error(`[Orchestrator] Alert job failed: ${job?.name}`, err.message);
  });

  orchestratorWorker.on('failed', (job, err) => {
    console.error(`[Orchestrator] Orchestrator job failed: ${job?.name}`, err.message);
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
