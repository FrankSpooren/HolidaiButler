/**
 * Deal Routes
 * Sales pipeline and deal management
 */

import { Router } from 'express';
import DealService from '../services/DealService.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate, dealSchemas, querySchemas } from '../middleware/validators.js';
import logger from '../utils/logger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/deals
 * @desc List deals with filters
 */
router.get('/',
  validate(querySchemas.pagination, 'query'),
  async (req, res) => {
    try {
      const filters = {
        pipelineId: req.query.pipelineId,
        stageId: req.query.stageId,
        stage: req.query.stage,
        status: req.query.status,
        ownerId: req.query.ownerId || (req.query.myDeals === 'true' ? req.userId : undefined),
        teamId: req.query.teamId,
        accountId: req.query.accountId,
        minValue: req.query.minValue,
        maxValue: req.query.maxValue,
        expectedCloseDateFrom: req.query.expectedCloseDateFrom,
        expectedCloseDateTo: req.query.expectedCloseDateTo,
        search: req.query.search,
        tags: req.query.tags?.split(',')
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await DealService.list(filters, pagination);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('List deals error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/v1/deals/pipeline/:pipelineId
 * @desc Get pipeline view with deals by stage
 */
router.get('/pipeline/:pipelineId', async (req, res) => {
  try {
    const filters = {
      ownerId: req.query.ownerId || (req.query.myDeals === 'true' ? req.userId : undefined),
      teamId: req.query.teamId
    };

    const result = await DealService.getPipelineView(req.params.pipelineId, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get pipeline view error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/deals/forecast
 * @desc Get deal forecast
 */
router.get('/forecast', async (req, res) => {
  try {
    const filters = {
      ownerId: req.query.ownerId || req.userId,
      teamId: req.query.teamId,
      pipelineId: req.query.pipelineId,
      period: req.query.period || 'quarter'
    };

    const result = await DealService.getForecast(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/deals/stale
 * @desc Get stale deals
 */
router.get('/stale', async (req, res) => {
  try {
    const pipelineId = req.query.pipelineId;
    const staleDays = parseInt(req.query.staleDays) || 14;

    const deals = await DealService.getStaleDeals(pipelineId, staleDays);

    res.json({
      success: true,
      data: deals,
      count: deals.length
    });
  } catch (error) {
    logger.error('Get stale deals error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/deals/:id
 * @desc Get deal by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const deal = await DealService.getById(req.params.id);

    res.json({
      success: true,
      data: deal
    });
  } catch (error) {
    logger.error('Get deal error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/deals
 * @desc Create new deal
 */
router.post('/',
  requirePermission('deals', 'create'),
  validate(dealSchemas.create),
  async (req, res) => {
    try {
      const deal = await DealService.create(req.body, req.userId);

      res.status(201).json({
        success: true,
        data: deal
      });
    } catch (error) {
      logger.error('Create deal error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route PUT /api/v1/deals/:id
 * @desc Update deal
 */
router.put('/:id',
  requirePermission('deals', 'update'),
  validate(dealSchemas.update),
  async (req, res) => {
    try {
      const deal = await DealService.update(req.params.id, req.body, req.userId);

      res.json({
        success: true,
        data: deal
      });
    } catch (error) {
      logger.error('Update deal error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/deals/:id/won
 * @desc Mark deal as won
 */
router.post('/:id/won',
  requirePermission('deals', 'update'),
  validate(dealSchemas.markWon),
  async (req, res) => {
    try {
      const deal = await DealService.markWon(req.params.id, req.userId, req.body);

      res.json({
        success: true,
        data: deal,
        message: 'Deal marked as won!'
      });
    } catch (error) {
      logger.error('Mark deal won error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/deals/:id/lost
 * @desc Mark deal as lost
 */
router.post('/:id/lost',
  requirePermission('deals', 'update'),
  validate(dealSchemas.markLost),
  async (req, res) => {
    try {
      const { lossReason, lossReasonDetail, competitorName } = req.body;

      const deal = await DealService.markLost(
        req.params.id,
        req.userId,
        lossReason,
        lossReasonDetail,
        competitorName
      );

      res.json({
        success: true,
        data: deal,
        message: 'Deal marked as lost'
      });
    } catch (error) {
      logger.error('Mark deal lost error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/deals/:id/stage
 * @desc Move deal to new stage
 */
router.post('/:id/stage',
  requirePermission('deals', 'update'),
  async (req, res) => {
    try {
      const { stageId } = req.body;

      if (!stageId) {
        return res.status(400).json({
          success: false,
          error: 'Stage ID is required'
        });
      }

      const deal = await DealService.update(req.params.id, { stageId }, req.userId);

      res.json({
        success: true,
        data: deal
      });
    } catch (error) {
      logger.error('Move deal stage error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/v1/deals/:id
 * @desc Delete deal
 */
router.delete('/:id',
  requirePermission('deals', 'delete'),
  async (req, res) => {
    try {
      await DealService.delete(req.params.id, req.userId);

      res.json({
        success: true,
        message: 'Deal deleted successfully'
      });
    } catch (error) {
      logger.error('Delete deal error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
