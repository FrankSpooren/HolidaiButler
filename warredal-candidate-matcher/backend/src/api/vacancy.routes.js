import express from 'express';
import { Vacancy, Criterion, Candidate, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /api/vacancies
 * @desc    Get all vacancies
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};
  if (status) where.status = status;

  const vacancies = await Vacancy.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: Criterion, as: 'criteria' },
      { model: Candidate, as: 'candidates' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    success: true,
    count: vacancies.length,
    data: vacancies
  });
}));

/**
 * @route   GET /api/vacancies/:id
 * @desc    Get vacancy by ID
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findByPk(req.params.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: Criterion, as: 'criteria', order: [['order', 'ASC']] },
      { model: Candidate, as: 'candidates' }
    ]
  });

  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  res.json({
    success: true,
    data: vacancy
  });
}));

/**
 * @route   POST /api/vacancies
 * @desc    Create new vacancy
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    title,
    organization,
    location,
    description,
    requirements,
    websiteUrl,
    targetCount,
    settings
  } = req.body;

  const vacancy = await Vacancy.create({
    title,
    organization,
    location,
    description,
    requirements,
    websiteUrl,
    targetCount,
    settings,
    createdBy: req.user.id
  });

  logger.info(`✅ Vacancy created: ${title}`);

  res.status(201).json({
    success: true,
    data: vacancy
  });
}));

/**
 * @route   PUT /api/vacancies/:id
 * @desc    Update vacancy
 * @access  Private
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findByPk(req.params.id);

  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  await vacancy.update(req.body);

  logger.info(`✅ Vacancy updated: ${vacancy.title}`);

  res.json({
    success: true,
    data: vacancy
  });
}));

/**
 * @route   DELETE /api/vacancies/:id
 * @desc    Delete vacancy
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findByPk(req.params.id);

  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  await vacancy.destroy();

  logger.info(`✅ Vacancy deleted: ${vacancy.title}`);

  res.json({
    success: true,
    message: 'Vacancy deleted successfully'
  });
}));

/**
 * @route   POST /api/vacancies/:id/criteria
 * @desc    Add criterion to vacancy
 * @access  Private
 */
router.post('/:id/criteria', authenticate, asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findByPk(req.params.id);

  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  const criterion = await Criterion.create({
    ...req.body,
    vacancyId: vacancy.id
  });

  logger.info(`✅ Criterion added: ${criterion.name}`);

  res.status(201).json({
    success: true,
    data: criterion
  });
}));

/**
 * @route   GET /api/vacancies/:id/criteria
 * @desc    Get all criteria for vacancy
 * @access  Private
 */
router.get('/:id/criteria', authenticate, asyncHandler(async (req, res) => {
  const criteria = await Criterion.findAll({
    where: { vacancyId: req.params.id },
    order: [['order', 'ASC']]
  });

  res.json({
    success: true,
    count: criteria.length,
    data: criteria
  });
}));

/**
 * @route   PUT /api/vacancies/:id/criteria/:criterionId
 * @desc    Update criterion
 * @access  Private
 */
router.put('/:id/criteria/:criterionId', authenticate, asyncHandler(async (req, res) => {
  const criterion = await Criterion.findOne({
    where: {
      id: req.params.criterionId,
      vacancyId: req.params.id
    }
  });

  if (!criterion) {
    return res.status(404).json({
      success: false,
      message: 'Criterion not found'
    });
  }

  await criterion.update(req.body);

  res.json({
    success: true,
    data: criterion
  });
}));

/**
 * @route   DELETE /api/vacancies/:id/criteria/:criterionId
 * @desc    Delete criterion
 * @access  Private
 */
router.delete('/:id/criteria/:criterionId', authenticate, asyncHandler(async (req, res) => {
  const criterion = await Criterion.findOne({
    where: {
      id: req.params.criterionId,
      vacancyId: req.params.id
    }
  });

  if (!criterion) {
    return res.status(404).json({
      success: false,
      message: 'Criterion not found'
    });
  }

  await criterion.destroy();

  res.json({
    success: true,
    message: 'Criterion deleted successfully'
  });
}));

/**
 * @route   GET /api/vacancies/:id/stats
 * @desc    Get vacancy statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, asyncHandler(async (req, res) => {
  const vacancy = await Vacancy.findByPk(req.params.id, {
    include: [
      { model: Candidate, as: 'candidates' }
    ]
  });

  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  const candidates = vacancy.candidates;

  const stats = {
    totalCandidates: candidates.length,
    byStatus: {
      sourced: candidates.filter(c => c.status === 'sourced').length,
      qualified: candidates.filter(c => c.status === 'qualified').length,
      contacted: candidates.filter(c => c.status === 'contacted').length,
      responded: candidates.filter(c => c.status === 'responded').length,
      interview: candidates.filter(c => c.status === 'interview').length,
      hired: candidates.filter(c => c.status === 'hired').length
    },
    averageMatchPercentage: candidates.length > 0
      ? (candidates.reduce((sum, c) => sum + parseFloat(c.matchPercentage || 0), 0) / candidates.length).toFixed(2)
      : 0,
    topCandidates: candidates
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        matchPercentage: c.matchPercentage,
        status: c.status
      }))
  };

  res.json({
    success: true,
    data: stats
  });
}));

export default router;
