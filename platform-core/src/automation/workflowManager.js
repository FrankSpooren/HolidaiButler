/**
 * Workflow Manager
 * Central registry and executor for all workflows
 */

import logger from '../utils/logger.js';
import Redis from 'ioredis';

class WorkflowManager {
  constructor() {
    this.workflows = new Map();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }

  /**
   * Register a workflow
   */
  register(id, config) {
    if (this.workflows.has(id)) {
      logger.warn(`Workflow ${id} already registered, overwriting`);
    }

    this.workflows.set(id, {
      id,
      name: config.name,
      description: config.description,
      handler: config.handler,
      enabled: config.enabled !== false,
      retryPolicy: config.retryPolicy || { maxRetries: 3, delay: 1000 },
      timeout: config.timeout || 30000,
      createdAt: new Date().toISOString(),
    });

    logger.info(`Workflow registered: ${id} - ${config.name}`);
  }

  /**
   * Execute a workflow
   */
  async execute(id, data = {}) {
    const workflow = this.workflows.get(id);

    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    if (!workflow.enabled) {
      logger.warn(`Workflow ${id} is disabled, skipping execution`);
      return { skipped: true, reason: 'disabled' };
    }

    const executionId = `${id}_${Date.now()}`;

    logger.workflow(id, 'started', { executionId, data });

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        workflow.handler,
        data,
        workflow.timeout
      );

      // Store success in history
      await this.storeExecution(id, executionId, {
        status: 'success',
        data,
        result,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      logger.workflow(id, 'completed', { executionId, result });

      return result;
    } catch (error) {
      // Store failure in history
      await this.storeExecution(id, executionId, {
        status: 'failed',
        data,
        error: error.message,
        startedAt: new Date().toISOString(),
        failedAt: new Date().toISOString(),
      });

      logger.error(`Workflow ${id} failed:`, error);

      // Retry if policy allows
      if (workflow.retryPolicy.maxRetries > 0) {
        return await this.retryWorkflow(id, data, workflow.retryPolicy, 0);
      }

      throw error;
    }
  }

  /**
   * Execute workflow with timeout
   */
  async executeWithTimeout(handler, data, timeout) {
    return Promise.race([
      handler(data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workflow timeout')), timeout)
      ),
    ]);
  }

  /**
   * Retry workflow with exponential backoff
   */
  async retryWorkflow(id, data, retryPolicy, attempt) {
    if (attempt >= retryPolicy.maxRetries) {
      throw new Error(`Workflow ${id} failed after ${attempt} retries`);
    }

    const delay = retryPolicy.delay * Math.pow(2, attempt);

    logger.workflow(id, 'retrying', {
      attempt: attempt + 1,
      maxRetries: retryPolicy.maxRetries,
      delay,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const workflow = this.workflows.get(id);
      return await workflow.handler(data);
    } catch (error) {
      return await this.retryWorkflow(id, data, retryPolicy, attempt + 1);
    }
  }

  /**
   * Store workflow execution in history
   */
  async storeExecution(workflowId, executionId, details) {
    try {
      const key = `workflow_history:${workflowId}`;
      const execution = {
        executionId,
        ...details,
      };

      await this.redis.lpush(key, JSON.stringify(execution));
      await this.redis.ltrim(key, 0, 999); // Keep last 1000 executions
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days retention
    } catch (error) {
      logger.error('Failed to store workflow execution:', error);
    }
  }

  /**
   * Get workflow execution history
   */
  async getHistory(workflowId, limit = 50) {
    try {
      const key = `workflow_history:${workflowId}`;
      const executions = await this.redis.lrange(key, 0, limit - 1);
      return executions.map(e => JSON.parse(e));
    } catch (error) {
      logger.error('Failed to get workflow history:', error);
      return [];
    }
  }

  /**
   * Get all workflows
   */
  getAll() {
    return Array.from(this.workflows.values()).map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      enabled: w.enabled,
      createdAt: w.createdAt,
    }));
  }

  /**
   * Get workflow by ID
   */
  getById(id) {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      enabled: workflow.enabled,
      retryPolicy: workflow.retryPolicy,
      timeout: workflow.timeout,
      createdAt: workflow.createdAt,
    };
  }

  /**
   * Enable/disable workflow
   */
  setStatus(id, enabled) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    workflow.enabled = enabled;
    logger.info(`Workflow ${id} ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
const workflowManager = new WorkflowManager();
export default workflowManager;
