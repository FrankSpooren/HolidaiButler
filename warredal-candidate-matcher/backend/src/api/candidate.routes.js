import express from 'express';
import { Candidate, Vacancy, CandidateScore, Message, Outreach } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import LinkedInScraper from '../services/scraper/LinkedInScraper.js';
import MatchingEngine from '../services/matcher/MatchingEngine.js';
import { logger } from '../utils/logger.js';
import ExcelJS from 'exceljs';

const router = express.Router();
const scraper = new LinkedInScraper();
const matcher = new MatchingEngine();

/**
 * @route   GET /api/candidates
 * @desc    Get all candidates (with filtering)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { vacancyId, status, minMatchPercentage } = req.query;

  const where = {};
  if (vacancyId) where.vacancyId = vacancyId;
  if (status) where.status = status;

  const candidates = await Candidate.findAll({
    where,
    include: [
      { model: Vacancy, as: 'vacancy', attributes: ['id', 'title', 'organization'] },
      { model: CandidateScore, as: 'scores' },
      { model: Message, as: 'messages' }
    ],
    order: [['matchPercentage', 'DESC']]
  });

  // Filter by match percentage if specified
  let filteredCandidates = candidates;
  if (minMatchPercentage) {
    filteredCandidates = candidates.filter(c =>
      parseFloat(c.matchPercentage) >= parseFloat(minMatchPercentage)
    );
  }

  res.json({
    success: true,
    count: filteredCandidates.length,
    data: filteredCandidates
  });
}));

/**
 * @route   GET /api/candidates/:id
 * @desc    Get candidate by ID
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id, {
    include: [
      { model: Vacancy, as: 'vacancy' },
      {
        model: CandidateScore,
        as: 'scores',
        include: [{ association: 'criterion' }]
      },
      { model: Message, as: 'messages' },
      { model: Outreach, as: 'outreach' }
    ]
  });

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  res.json({
    success: true,
    data: candidate
  });
}));

/**
 * @route   POST /api/candidates
 * @desc    Add candidate manually
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const candidate = await Candidate.create({
    ...req.body,
    addedBy: req.user.id,
    source: 'manual'
  });

  // Auto-score if requested
  if (req.body.autoScore) {
    await matcher.scoreCandidate(candidate.id, req.user.id);
    await candidate.reload();
  }

  logger.info(`✅ Candidate added: ${candidate.firstName} ${candidate.lastName}`);

  res.status(201).json({
    success: true,
    data: candidate
  });
}));

/**
 * @route   PUT /api/candidates/:id
 * @desc    Update candidate
 * @access  Private
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  await candidate.update(req.body);

  // Re-score if requested
  if (req.body.rescore) {
    await matcher.scoreCandidate(candidate.id, req.user.id);
    await candidate.reload();
  }

  res.json({
    success: true,
    data: candidate
  });
}));

/**
 * @route   DELETE /api/candidates/:id
 * @desc    Delete candidate
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  await candidate.destroy();

  logger.info(`✅ Candidate deleted: ${candidate.firstName} ${candidate.lastName}`);

  res.json({
    success: true,
    message: 'Candidate deleted successfully'
  });
}));

/**
 * @route   POST /api/candidates/scrape
 * @desc    Scrape LinkedIn profile and add candidate
 * @access  Private
 */
router.post('/scrape', authenticate, asyncHandler(async (req, res) => {
  const { linkedinUrl, vacancyId } = req.body;

  if (!linkedinUrl || !vacancyId) {
    return res.status(400).json({
      success: false,
      message: 'LinkedIn URL and vacancyId are required'
    });
  }

  // Check if candidate already exists
  const existing = await Candidate.findOne({
    where: { linkedinUrl, vacancyId }
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Candidate already exists for this vacancy'
    });
  }

  logger.info(`🔍 Scraping profile: ${linkedinUrl}`);

  try {
    // Scrape profile
    const profileData = await scraper.scrapeProfile(linkedinUrl);

    // Create candidate
    const candidate = await Candidate.create({
      ...profileData,
      vacancyId,
      addedBy: req.user.id,
      source: 'linkedin_scrape',
      sourceUrl: linkedinUrl,
      lastScrapedAt: new Date()
    });

    // Auto-score
    await matcher.scoreCandidate(candidate.id, req.user.id);
    await candidate.reload({
      include: [{ model: CandidateScore, as: 'scores' }]
    });

    logger.info(`✅ Candidate scraped and scored: ${candidate.firstName} ${candidate.lastName} (${candidate.matchPercentage}%)`);

    res.status(201).json({
      success: true,
      data: candidate
    });

  } catch (error) {
    logger.error('❌ Scraping error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to scrape profile',
      error: error.message
    });
  }
}));

/**
 * @route   POST /api/candidates/search
 * @desc    Search LinkedIn and scrape multiple profiles
 * @access  Private
 */
router.post('/search', authenticate, asyncHandler(async (req, res) => {
  const { query, vacancyId, filters, maxResults = 10 } = req.body;

  if (!query || !vacancyId) {
    return res.status(400).json({
      success: false,
      message: 'Search query and vacancyId are required'
    });
  }

  logger.info(`🔍 Searching LinkedIn: ${query}`);

  try {
    // Search for profiles
    const profileUrls = await scraper.searchProfiles(query, filters);

    const results = {
      found: profileUrls.length,
      scraped: 0,
      errors: [],
      candidates: []
    };

    // Scrape each profile (up to maxResults)
    for (const url of profileUrls.slice(0, maxResults)) {
      try {
        // Check if already exists
        const existing = await Candidate.findOne({
          where: { linkedinUrl: url, vacancyId }
        });

        if (existing) {
          logger.info(`⏭️ Skipping existing candidate: ${url}`);
          continue;
        }

        const profileData = await scraper.scrapeProfile(url);

        const candidate = await Candidate.create({
          ...profileData,
          vacancyId,
          addedBy: req.user.id,
          source: 'linkedin_scrape',
          sourceUrl: url,
          lastScrapedAt: new Date()
        });

        // Auto-score
        await matcher.scoreCandidate(candidate.id, req.user.id);
        await candidate.reload();

        results.candidates.push(candidate);
        results.scraped++;

        // Delay between scrapes
        await scraper.randomDelay(3000, 6000);

      } catch (error) {
        logger.error(`❌ Failed to scrape ${url}:`, error.message);
        results.errors.push({ url, error: error.message });
      }
    }

    logger.info(`✅ Search complete: ${results.scraped} candidates added`);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('❌ Search error:', error);

    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/candidates/export/:vacancyId
 * @desc    Export candidates to Excel
 * @access  Private
 */
router.get('/export/:vacancyId', authenticate, asyncHandler(async (req, res) => {
  const candidates = await Candidate.findAll({
    where: { vacancyId: req.params.vacancyId },
    include: [
      {
        model: CandidateScore,
        as: 'scores',
        include: [{ association: 'criterion' }]
      }
    ],
    order: [['matchPercentage', 'DESC']]
  });

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Kandidaten');

  // Define columns
  worksheet.columns = [
    { header: 'Naam', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Telefoon', key: 'phone', width: 15 },
    { header: 'Locatie', key: 'location', width: 20 },
    { header: 'Huidige functie', key: 'currentTitle', width: 25 },
    { header: 'Huidig bedrijf', key: 'currentCompany', width: 25 },
    { header: 'LinkedIn', key: 'linkedinUrl', width: 50 },
    { header: 'Match %', key: 'matchPercentage', width: 10 },
    { header: 'Totaalscore', key: 'totalScore', width: 12 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  // Add rows
  candidates.forEach(candidate => {
    worksheet.addRow({
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email || '',
      phone: candidate.phone || '',
      location: candidate.location || '',
      currentTitle: candidate.currentTitle || '',
      currentCompany: candidate.currentCompany || '',
      linkedinUrl: candidate.linkedinUrl || '',
      matchPercentage: candidate.matchPercentage,
      totalScore: candidate.totalScore,
      status: candidate.status
    });
  });

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=kandidaten-${req.params.vacancyId}-${Date.now()}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
}));

export default router;
