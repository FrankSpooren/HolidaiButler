import { initializeScheduler } from './scheduler.js';
import { startWorkers, stopWorkers } from './workers.js';
import { orchestratorQueue, alertQueue, scheduledQueue, connection } from './queues.js';
import { mysqlSequelize } from '../../config/database.js';
import dataSyncAgent from '../agents/dataSync/index.js';

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

    // Then initialize scheduler (creates core repeatable jobs)
    await initializeScheduler();

    // Initialize Data Sync Agent with database connection
    // This registers all 13 enterprise sync jobs
    try {
      await dataSyncAgent.initialize(mysqlSequelize);
      console.log('[Orchestrator] Data Sync Agent initialized');
    } catch (error) {
      console.error('[Orchestrator] Data Sync Agent initialization failed:', error.message);
      // Don't throw - allow orchestrator to continue without Data Sync
      // Jobs will be skipped if agent is not initialized
    }

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
