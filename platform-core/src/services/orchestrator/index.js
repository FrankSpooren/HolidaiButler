import { initializeScheduler } from './scheduler.js';
import { startWorkers, stopWorkers } from './workers.js';
import { orchestratorQueue, alertQueue, scheduledQueue, connection } from './queues.js';

let isInitialized = false;

export async function initializeOrchestrator() {
  if (isInitialized) {
    console.log('[Orchestrator] Already initialized, skipping...');
    return;
  }

  console.log('[Orchestrator] Starting Orchestrator Agent...');
  
  try {
    // Start workers first
    startWorkers();
    
    // Then initialize scheduler (creates repeatable jobs)
    await initializeScheduler();
    
    isInitialized = true;
    console.log('[Orchestrator] Orchestrator Agent ready');
  } catch (error) {
    console.error('[Orchestrator] Failed to initialize:', error.message);
    throw error;
  }
}

export async function shutdownOrchestrator() {
  console.log('[Orchestrator] Shutting down...');
  await stopWorkers();
  await orchestratorQueue.close();
  await alertQueue.close();
  await scheduledQueue.close();
  isInitialized = false;
  console.log('[Orchestrator] Shutdown complete');
}

export { orchestratorQueue, alertQueue, scheduledQueue, connection };
