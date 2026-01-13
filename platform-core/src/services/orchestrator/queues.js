import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

export const orchestratorQueue = new Queue('orchestrator', { connection });
export const alertQueue = new Queue('alerts', { connection });
export const scheduledQueue = new Queue('scheduled-tasks', { connection });

export { connection };
