import { initializeScheduler } from './scheduler.js';
import { startWorkers, stopWorkers } from './workers.js';
import { orchestratorQueue, alertQueue, scheduledQueue, connection } from './queues.js';
import { mysqlSequelize } from '../../config/database.js';
import dataSyncAgent from '../agents/dataSync/index.js';
import holibotSyncAgent from '../agents/holibotSync/index.js';
import communicationFlowAgent from '../agents/communicationFlow/index.js';
import gdprAgent from '../agents/gdpr/index.js';
import devLayerAgent from '../agents/devLayer/index.js';

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

    // Initialize HoliBot Sync Agent with database connection
    // This registers 4 ChromaDB sync jobs (POI sync, Q&A sync, full reindex, cleanup)
    try {
      await holibotSyncAgent.initialize(mysqlSequelize);
      console.log('[Orchestrator] HoliBot Sync Agent initialized');
    } catch (error) {
      console.error('[Orchestrator] HoliBot Sync Agent initialization failed:', error.message);
      // Don't throw - allow orchestrator to continue without HoliBot Sync
      // Jobs will be skipped if agent is not initialized
    }

    // Initialize Communication Flow Agent with database connection
    // This registers 3 communication jobs (journey processor, user sync, cleanup)
    try {
      await communicationFlowAgent.initialize(mysqlSequelize);
      console.log('[Orchestrator] Communication Flow Agent initialized');
    } catch (error) {
      console.error('[Orchestrator] Communication Flow Agent initialization failed:', error.message);
      // Don't throw - allow orchestrator to continue without Communication Flow
      // Jobs will be skipped if agent is not initialized
    }

    // Initialize GDPR Agent with database connection
    // This handles GDPR compliance: data export, erasure, consent management
    // 4 scheduled jobs (overdue check, export cleanup, retention check, consent audit)
    try {
      await gdprAgent.initialize(mysqlSequelize);
      console.log('[Orchestrator] GDPR Agent initialized');
    } catch (error) {
      console.error('[Orchestrator] GDPR Agent initialization failed:', error.message);
      // Don't throw - allow orchestrator to continue without GDPR Agent
      // Jobs will be skipped if agent is not initialized
    }

    // Initialize Development Layer Agent
    // This handles code quality automation: UX review, code review, security review
    // 3 scheduled jobs (security scan, dependency audit, quality report)
    try {
      await devLayerAgent.initialize(mysqlSequelize);
      console.log('[Orchestrator] Development Layer Agent initialized');
    } catch (error) {
      console.error('[Orchestrator] Development Layer Agent initialization failed:', error.message);
      // Don't throw - allow orchestrator to continue without Dev Layer Agent
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
