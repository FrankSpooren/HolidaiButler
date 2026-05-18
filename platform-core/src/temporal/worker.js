// OpenTelemetry + Sentry bootstrap — MUST be first import (ESM hoisted,
// dependencies evaluated depth-first before @temporalio/worker)
// OTEL_SERVICE_NAME=hb-temporal-worker injected via PM2 --update-env
import '../observability/tracing.js';
import { Worker } from '@temporalio/worker';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startWorker() {
  const worker = await Worker.create({
    workflowsPath: path.resolve(__dirname, './workflows'),
    activities: (await import('./activities/index.js')).default,
    taskQueue: 'hb-agents',
    namespace: process.env.TEMPORAL_NAMESPACE || 'hb-production',
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 5
  });

  logger.info('[temporal-worker] Started, listening on hb-agents queue');
  await worker.run();
}

startWorker().catch(err => {
  logger.error('[temporal-worker] Fatal:', err);
  process.exit(1);
});
