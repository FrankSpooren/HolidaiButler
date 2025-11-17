/**
 * POI Classification Routes
 * API endpoints for POI classification system
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import poiClassificationService from '../services/poiClassification.js';
import apifyService from '../services/apify.js';
import touristRelevanceService from '../services/touristRelevance.js';
import POI from '../models/POI.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Get POI classification statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { city } = req.query;

    const stats = await poiClassificationService.getStatistics(city);

    res.json({
      success: true,
      city: city || 'all',
      stats,
    });
  } catch (error) {
    logger.error('Failed to get classification stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

/**
 * Get budget usage
 */
router.get('/budget', authenticate, async (req, res) => {
  try {
    const usage = await apifyService.getMonthlyUsage();

    res.json({
      success: true,
      usage,
    });
  } catch (error) {
    logger.error('Failed to get budget usage:', error);
    res.status(500).json({
      error: 'Failed to get budget usage',
      message: error.message,
    });
  }
});

/**
 * Get POIs by tier
 */
router.get('/tier/:tier', authenticate, async (req, res) => {
  try {
    const { tier } = req.params;
    const { city, category, limit = 100 } = req.query;

    const where = {
      tier: parseInt(tier),
      active: true,
    };

    if (city) where.city = city;
    if (category) where.category = category;

    const pois = await POI.findAll({
      where,
      order: [['poi_score', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      tier: parseInt(tier),
      count: pois.length,
      pois,
    });
  } catch (error) {
    logger.error('Failed to get POIs by tier:', error);
    res.status(500).json({
      error: 'Failed to get POIs',
      message: error.message,
    });
  }
});

/**
 * Classify a single POI
 */
router.post('/classify/:poiId', authenticate, async (req, res) => {
  try {
    const { poiId } = req.params;
    const { updateData = true, sources } = req.body;

    const result = await poiClassificationService.classifyPOI(poiId, {
      updateData,
      updateTouristRelevance: true,
      updateBookingFrequency: true,
      sources: sources || ['google_places', 'tripadvisor'],
    });

    res.json({
      success: true,
      poi: result.poi,
      score: result.score,
      tier: result.tier,
      tierChanged: result.tierChanged,
    });
  } catch (error) {
    logger.error('POI classification failed:', error);
    res.status(500).json({
      error: 'Classification failed',
      message: error.message,
    });
  }
});

/**
 * Batch classify multiple POIs
 */
router.post('/batch-classify', authenticate, async (req, res) => {
  try {
    const { poiIds, updateData = true, sources } = req.body;

    if (!Array.isArray(poiIds) || poiIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'poiIds array is required',
      });
    }

    const results = await poiClassificationService.batchClassify(poiIds, {
      updateData,
      updateTouristRelevance: true,
      updateBookingFrequency: true,
      sources: sources || ['google_places'],
    });

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Batch classification failed:', error);
    res.status(500).json({
      error: 'Batch classification failed',
      message: error.message,
    });
  }
});

/**
 * Discover new POIs
 */
router.post('/discover', authenticate, async (req, res) => {
  try {
    const { city, category, maxResults = 20 } = req.body;

    if (!city) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'city is required',
      });
    }

    const workflowManager = (await import('../automation/workflowManager.js')).default;

    const result = await workflowManager.execute('poi-discovery', {
      city,
      category,
      maxResults,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('POI discovery failed:', error);
    res.status(500).json({
      error: 'Discovery failed',
      message: error.message,
    });
  }
});

/**
 * Get weather-based recommendations
 */
router.get('/recommendations/weather', async (req, res) => {
  try {
    const { city, weather, limit = 10 } = req.query;

    if (!city || !weather) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'city and weather are required',
      });
    }

    const recommendations = await touristRelevanceService.getWeatherBasedRecommendations(
      city,
      weather,
      parseInt(limit)
    );

    res.json({
      success: true,
      city,
      weather,
      recommendations,
    });
  } catch (error) {
    logger.error('Failed to get weather recommendations:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message,
    });
  }
});

/**
 * Balance tier distribution
 */
router.post('/balance-tiers', authenticate, async (req, res) => {
  try {
    const { tier, city } = req.body;

    if (!tier) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'tier is required',
      });
    }

    const result = await poiClassificationService.balanceTierDistribution(
      parseInt(tier),
      city
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Tier balancing failed:', error);
    res.status(500).json({
      error: 'Tier balancing failed',
      message: error.message,
    });
  }
});

/**
 * Get POIs due for update
 */
router.get('/due-for-update', authenticate, async (req, res) => {
  try {
    const { tier, limit = 100 } = req.query;

    const pois = await poiClassificationService.getPOIsForUpdate(
      tier ? parseInt(tier) : null,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: pois.length,
      pois,
    });
  } catch (error) {
    logger.error('Failed to get POIs due for update:', error);
    res.status(500).json({
      error: 'Failed to get POIs',
      message: error.message,
    });
  }
});

export default router;
