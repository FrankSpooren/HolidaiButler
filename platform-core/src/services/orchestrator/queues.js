import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

export const orchestratorQueue = new Queue('orchestrator', { connection });
export const alertQueue = new Queue('alerts', { connection });
export const scheduledQueue = new Queue('scheduled-tasks', { connection });

/**
 * Content Generation Queue
 * Long-running, async content generation jobs (Mistral AI calls).
 * Survives PM2 restarts, supports retries, dead-letter on failure.
 */
export const contentGenerationQueue = new Queue('content-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { age: 86400, count: 500 },   // keep 1 day / 500 jobs
    removeOnFail: { age: 604800, count: 1000 },     // keep 7 days / 1000 jobs
  },
});

export { connection };

/**
 * Media Processing Queue
 * Handles: thumbnail generation, EXIF extraction, quality classification, pHash, AI tagging, video processing
 */
export const mediaProcessingQueue = new Queue('media-processing', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  }
});
