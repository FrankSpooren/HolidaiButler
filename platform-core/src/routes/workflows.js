/**
 * Workflow Routes
 * Manage automated workflows and protocols
 */

import express from 'express';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import workflowManager from '../automation/workflowManager.js';

const router = express.Router();

/**
 * Get all workflows
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const workflows = workflowManager.getAll();

    res.json({
      count: workflows.length,
      workflows,
    });
  } catch (error) {
    logger.error('Get workflows failed:', error);
    res.status(500).json({
      error: 'Failed to get workflows',
      message: error.message,
    });
  }
});

/**
 * Get workflow by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workflow = workflowManager.getById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
      });
    }

    res.json(workflow);
  } catch (error) {
    logger.error('Get workflow failed:', error);
    res.status(500).json({
      error: 'Failed to get workflow',
      message: error.message,
    });
  }
});

/**
 * Execute workflow manually
 */
router.post('/:id/execute', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { data = {} } = req.body;

    logger.workflow(id, 'manual_execution', {
      userId: req.user.id,
      data,
    });

    const result = await workflowManager.execute(id, data);

    res.json({
      success: true,
      workflow: id,
      result,
    });
  } catch (error) {
    logger.error(`Workflow execution failed (${req.params.id}):`, error);
    res.status(500).json({
      error: 'Workflow Execution Failed',
      message: error.message,
    });
  }
});

/**
 * Get workflow execution history
 */
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const history = await workflowManager.getHistory(req.params.id, parseInt(limit));

    res.json({
      workflow: req.params.id,
      count: history.length,
      executions: history,
    });
  } catch (error) {
    logger.error('Get workflow history failed:', error);
    res.status(500).json({
      error: 'Failed to get workflow history',
      message: error.message,
    });
  }
});

/**
 * Enable/disable workflow
 */
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;

    workflowManager.setStatus(req.params.id, enabled);

    logger.workflow(req.params.id, 'status_changed', {
      enabled,
      userId: req.user.id,
    });

    res.json({
      success: true,
      workflow: req.params.id,
      enabled,
    });
  } catch (error) {
    logger.error('Update workflow status failed:', error);
    res.status(500).json({
      error: 'Failed to update workflow status',
      message: error.message,
    });
  }
});

export default router;
