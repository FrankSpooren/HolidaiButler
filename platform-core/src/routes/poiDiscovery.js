/**
 * POI Discovery Routes
 * API endpoints for advanced POI discovery and dataset creation
 */

import express from 'express';
import poiDiscoveryService from '../services/poiDiscovery.js';
import DestinationConfig from '../models/DestinationConfig.js';
import DiscoveryRun from '../models/DiscoveryRun.js';
import workflowManager from '../automation/workflowManager.js';
import logger from '../utils/logger.js';
import { validate, validateQuery, validateParams, discoverySchemas, commonSchemas } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

/**
 * POST /api/v1/poi-discovery/destination
 * Start destination discovery
 */
router.post('/destination', validate(discoverySchemas.destination), async (req, res) => {
  try {
    const {
      destination,
      categories,
      criteria,
      sources,
      maxPOIsPerCategory,
      autoClassify,
      autoEnrich,
      configId,
    } = req.body;

    logger.info('Starting destination discovery via API', {
      destination,
      categories,
      sources,
    });

    // Start discovery (async)
    const result = await poiDiscoveryService.discoverDestination({
      destination,
      categories,
      criteria,
      sources,
      maxPOIsPerCategory,
      autoClassify,
      autoEnrich,
      configId,
      triggeredBy: req.user?.id || 'api',
    });

    res.json({
      success: true,
      run: result.run,
      message: 'Destination discovery completed',
    });
  } catch (error) {
    logger.error('Destination discovery API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/poi-discovery/destination/async
 * Start destination discovery (async via workflow)
 */
router.post('/destination/async', async (req, res) => {
  try {
    const {
      destination,
      categories,
      criteria,
      sources,
      maxPOIsPerCategory,
      autoClassify,
      autoEnrich,
      configId,
    } = req.body;

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Destination is required',
      });
    }

    logger.info('Starting async destination discovery via API', { destination });

    // Create discovery run
    const discoveryRun = await DiscoveryRun.create({
      run_type: 'destination',
      destination,
      city: destination.split(',')[0].trim(),
      country: destination.split(',').length > 1 ? destination.split(',')[1].trim() : 'Unknown',
      config_id: configId,
      categories: categories || [],
      sources: sources || ['google_places'],
      criteria: criteria || {},
      triggered_by: req.user?.id || 'api',
      status: 'pending',
    });

    // Execute workflow asynchronously
    workflowManager
      .execute('destination-discovery', {
        destination,
        categories,
        criteria,
        sources,
        maxPOIsPerCategory,
        autoClassify,
        autoEnrich,
        configId,
      })
      .catch((error) => {
        logger.error('Async discovery workflow failed:', error);
      });

    res.json({
      success: true,
      runId: discoveryRun.id,
      status: 'pending',
      message: 'Destination discovery started. Use /runs/:id to check status.',
    });
  } catch (error) {
    logger.error('Async destination discovery API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/poi-discovery/runs/:id
 * Get discovery run status
 */
router.get('/runs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const run = await DiscoveryRun.findByPk(id);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Discovery run not found',
      });
    }

    res.json({
      success: true,
      run: run.getSummary(),
    });
  } catch (error) {
    logger.error('Get discovery run API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/poi-discovery/runs
 * Get recent discovery runs
 */
router.get('/runs', async (req, res) => {
  try {
    const { limit = 20, destination } = req.query;

    let runs;
    if (destination) {
      runs = await DiscoveryRun.getRunsByDestination(destination, parseInt(limit));
    } else {
      runs = await DiscoveryRun.getRecentRuns(parseInt(limit));
    }

    res.json({
      success: true,
      runs: runs.map((r) => r.getSummary()),
      total: runs.length,
    });
  } catch (error) {
    logger.error('Get discovery runs API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/poi-discovery/configs
 * Create destination configuration
 */
router.post('/configs', async (req, res) => {
  try {
    const {
      name,
      description,
      categories,
      criteria,
      sources,
      maxPOIsPerCategory,
      autoClassify,
      autoEnrich,
      tags,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Configuration name is required',
      });
    }

    const config = await DestinationConfig.create({
      name,
      description,
      categories: categories || [],
      criteria: criteria || {},
      sources: sources || ['google_places'],
      max_pois_per_category: maxPOIsPerCategory || 50,
      auto_classify: autoClassify !== false,
      auto_enrich: autoEnrich !== false,
      tags: tags || [],
      created_by: req.user?.id || 'api',
      active: true,
    });

    logger.info('Destination config created', {
      configId: config.id,
      name: config.name,
    });

    res.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        description: config.description,
        categories: config.categories,
        criteria: config.criteria,
        sources: config.sources,
      },
    });
  } catch (error) {
    logger.error('Create config API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/poi-discovery/configs
 * Get all destination configurations
 */
router.get('/configs', async (req, res) => {
  try {
    const { active = true } = req.query;

    const configs = await DestinationConfig.findAll({
      where: active === 'false' ? {} : { active: true },
      order: [['usage_count', 'DESC']],
    });

    res.json({
      success: true,
      configs: configs.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        categories: c.categories,
        criteria: c.criteria,
        sources: c.sources,
        maxPOIsPerCategory: c.max_pois_per_category,
        usageCount: c.usage_count,
        tags: c.tags,
        createdAt: c.createdAt,
      })),
      total: configs.length,
    });
  } catch (error) {
    logger.error('Get configs API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/poi-discovery/configs/:id
 * Get specific configuration
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await DestinationConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
      });
    }

    res.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        description: config.description,
        categories: config.categories,
        criteria: config.criteria,
        sources: config.sources,
        maxPOIsPerCategory: config.max_pois_per_category,
        autoClassify: config.auto_classify,
        autoEnrich: config.auto_enrich,
        usageCount: config.usage_count,
        lastUsedAt: config.last_used_at,
        tags: config.tags,
        createdAt: config.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get config API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/poi-discovery/configs/:id
 * Update configuration
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const config = await DestinationConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
      });
    }

    // Update allowed fields
    if (updates.name) config.name = updates.name;
    if (updates.description !== undefined) config.description = updates.description;
    if (updates.categories) config.categories = updates.categories;
    if (updates.criteria) config.criteria = updates.criteria;
    if (updates.sources) config.sources = updates.sources;
    if (updates.maxPOIsPerCategory) config.max_pois_per_category = updates.maxPOIsPerCategory;
    if (updates.autoClassify !== undefined) config.auto_classify = updates.autoClassify;
    if (updates.autoEnrich !== undefined) config.auto_enrich = updates.autoEnrich;
    if (updates.tags) config.tags = updates.tags;
    if (updates.active !== undefined) config.active = updates.active;

    await config.save();

    logger.info('Destination config updated', { configId: config.id });

    res.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        description: config.description,
      },
    });
  } catch (error) {
    logger.error('Update config API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/poi-discovery/configs/:id
 * Delete configuration (soft delete)
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await DestinationConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
      });
    }

    // Soft delete
    config.active = false;
    await config.save();

    logger.info('Destination config deleted', { configId: config.id });

    res.json({
      success: true,
      message: 'Configuration deleted',
    });
  } catch (error) {
    logger.error('Delete config API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/poi-discovery/stats
 * Get discovery statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalRuns = await DiscoveryRun.count();
    const completedRuns = await DiscoveryRun.count({ where: { status: 'completed' } });
    const failedRuns = await DiscoveryRun.count({ where: { status: 'failed' } });
    const runningRuns = await DiscoveryRun.count({ where: { status: 'running' } });

    const totalConfigs = await DestinationConfig.count({ where: { active: true } });
    const popularConfigs = await DestinationConfig.getPopularConfigs(5);

    // Get total POIs discovered
    const allRuns = await DiscoveryRun.findAll({
      where: { status: 'completed' },
      attributes: ['pois_created', 'pois_updated', 'estimated_cost_eur'],
    });

    const totalPOIsCreated = allRuns.reduce((sum, run) => sum + run.pois_created, 0);
    const totalPOIsUpdated = allRuns.reduce((sum, run) => sum + run.pois_updated, 0);
    const totalCost = allRuns.reduce((sum, run) => sum + parseFloat(run.estimated_cost_eur || 0), 0);

    res.json({
      success: true,
      stats: {
        runs: {
          total: totalRuns,
          completed: completedRuns,
          failed: failedRuns,
          running: runningRuns,
        },
        pois: {
          created: totalPOIsCreated,
          updated: totalPOIsUpdated,
          total: totalPOIsCreated + totalPOIsUpdated,
        },
        configs: {
          total: totalConfigs,
          popular: popularConfigs.map((c) => ({
            id: c.id,
            name: c.name,
            usageCount: c.usage_count,
          })),
        },
        costs: {
          totalEur: totalCost.toFixed(2),
        },
      },
    });
  } catch (error) {
    logger.error('Get stats API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
