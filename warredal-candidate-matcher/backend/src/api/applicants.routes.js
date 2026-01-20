import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { createReadStream, unlinkSync } from 'fs';
import { Candidate, Vacancy } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import MatchingEngine from '../services/matcher/MatchingEngine.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput } from '../utils/sanitizer.js';

const router = express.Router();
const matcher = new MatchingEngine();

// Configure multer for CSV/Excel uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

/**
 * @route   POST /api/applicants/import-linkedin-csv
 * @desc    Import LinkedIn Easy Apply applicants from CSV export
 * @access  Private
 *
 * LinkedIn Easy Apply CSV format:
 * - First Name, Last Name, Email, Phone, LinkedIn Profile URL
 * - Resume/CV (file path - optional)
 * - Applied Date, Cover Letter, Custom Responses
 */
router.post('/import-linkedin-csv', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  const { vacancyId } = req.body;

  if (!vacancyId) {
    return res.status(400).json({
      success: false,
      message: 'vacancyId is required'
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Verify vacancy exists
  const vacancy = await Vacancy.findByPk(vacancyId);
  if (!vacancy) {
    unlinkSync(req.file.path); // Cleanup
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  logger.info(`📥 Importing LinkedIn applicants from CSV: ${req.file.originalname}`);

  const results = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    candidates: []
  };

  const candidates = [];

  // Parse CSV
  await new Promise((resolve, reject) => {
    createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        results.total++;

        try {
          // Map CSV columns (flexible mapping)
          const candidate = {
            firstName: sanitizeInput(row['First Name'] || row['first_name'] || row['firstName'] || ''),
            lastName: sanitizeInput(row['Last Name'] || row['last_name'] || row['lastName'] || ''),
            email: sanitizeInput(row['Email'] || row['email'] || row['Email Address'] || '').toLowerCase(),
            phone: sanitizeInput(row['Phone'] || row['phone'] || row['Phone Number'] || ''),
            linkedinUrl: sanitizeInput(row['LinkedIn Profile URL'] || row['linkedin_url'] || row['LinkedIn URL'] || ''),
            location: sanitizeInput(row['Location'] || row['location'] || ''),
            currentTitle: sanitizeInput(row['Current Title'] || row['current_title'] || row['Job Title'] || ''),
            currentCompany: sanitizeInput(row['Current Company'] || row['current_company'] || row['Company'] || ''),

            // Application specific data
            appliedDate: row['Applied Date'] || row['applied_date'] || new Date(),
            coverLetter: sanitizeInput(row['Cover Letter'] || row['cover_letter'] || ''),
            resumePath: row['Resume'] || row['resume'] || null,

            // Metadata
            source: 'linkedin_applicant',
            status: 'sourced',
            vacancyId,
            addedBy: req.user.id
          };

          // Validation
          if (!candidate.firstName || !candidate.lastName || !candidate.email) {
            results.errors.push({
              row: results.total,
              error: 'Missing required fields (firstName, lastName, email)'
            });
            results.skipped++;
            return;
          }

          candidates.push(candidate);

        } catch (error) {
          logger.error(`Error parsing row ${results.total}:`, error);
          results.errors.push({
            row: results.total,
            error: error.message
          });
          results.skipped++;
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Import candidates to database
  for (const candidateData of candidates) {
    try {
      // Check if already exists (by email + vacancy)
      const existing = await Candidate.findOne({
        where: {
          email: candidateData.email,
          vacancyId: vacancyId
        }
      });

      if (existing) {
        logger.info(`⏭️ Skipping duplicate: ${candidateData.email}`);
        results.skipped++;
        continue;
      }

      // Create candidate
      const candidate = await Candidate.create(candidateData);

      // Auto-score
      await matcher.scoreCandidate(candidate.id, req.user.id);
      await candidate.reload();

      results.candidates.push({
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        matchPercentage: candidate.matchPercentage
      });

      results.imported++;

      logger.info(`✅ Imported applicant: ${candidate.firstName} ${candidate.lastName} (${candidate.matchPercentage}%)`);

    } catch (error) {
      logger.error(`❌ Failed to import candidate:`, error);
      results.errors.push({
        email: candidateData.email,
        error: error.message
      });
      results.skipped++;
    }
  }

  // Cleanup uploaded file
  unlinkSync(req.file.path);

  logger.info(`✅ Import complete: ${results.imported}/${results.total} applicants imported`);

  res.json({
    success: true,
    message: `Successfully imported ${results.imported} applicants`,
    data: results
  });
}));

/**
 * @route   POST /api/applicants/import-linkedin-json
 * @desc    Import LinkedIn applicants from JSON (API webhook)
 * @access  Private
 */
router.post('/import-linkedin-json', authenticate, asyncHandler(async (req, res) => {
  const { vacancyId, applicants } = req.body;

  if (!vacancyId || !applicants || !Array.isArray(applicants)) {
    return res.status(400).json({
      success: false,
      message: 'vacancyId and applicants array are required'
    });
  }

  // Verify vacancy exists
  const vacancy = await Vacancy.findByPk(vacancyId);
  if (!vacancy) {
    return res.status(404).json({
      success: false,
      message: 'Vacancy not found'
    });
  }

  logger.info(`📥 Importing ${applicants.length} LinkedIn applicants from JSON`);

  const results = {
    total: applicants.length,
    imported: 0,
    skipped: 0,
    errors: [],
    candidates: []
  };

  for (const applicantData of applicants) {
    try {
      // Sanitize all inputs
      const candidate = {
        firstName: sanitizeInput(applicantData.firstName || ''),
        lastName: sanitizeInput(applicantData.lastName || ''),
        email: sanitizeInput(applicantData.email || '').toLowerCase(),
        phone: sanitizeInput(applicantData.phone || ''),
        linkedinUrl: sanitizeInput(applicantData.linkedinUrl || ''),
        location: sanitizeInput(applicantData.location || ''),
        currentTitle: sanitizeInput(applicantData.currentTitle || ''),
        currentCompany: sanitizeInput(applicantData.currentCompany || ''),
        experience: applicantData.experience || [],
        education: applicantData.education || [],
        skills: applicantData.skills || [],
        source: 'linkedin_applicant',
        status: 'sourced',
        vacancyId,
        addedBy: req.user.id
      };

      // Validation
      if (!candidate.firstName || !candidate.lastName || !candidate.email) {
        results.errors.push({
          applicant: applicantData,
          error: 'Missing required fields'
        });
        results.skipped++;
        continue;
      }

      // Check if already exists
      const existing = await Candidate.findOne({
        where: {
          email: candidate.email,
          vacancyId: vacancyId
        }
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Create candidate
      const newCandidate = await Candidate.create(candidate);

      // Auto-score
      await matcher.scoreCandidate(newCandidate.id, req.user.id);
      await newCandidate.reload();

      results.candidates.push({
        id: newCandidate.id,
        name: `${newCandidate.firstName} ${newCandidate.lastName}`,
        email: newCandidate.email,
        matchPercentage: newCandidate.matchPercentage
      });

      results.imported++;

    } catch (error) {
      logger.error(`❌ Failed to import applicant:`, error);
      results.errors.push({
        applicant: applicantData,
        error: error.message
      });
      results.skipped++;
    }
  }

  logger.info(`✅ Import complete: ${results.imported}/${results.total} applicants imported`);

  res.json({
    success: true,
    message: `Successfully imported ${results.imported} applicants`,
    data: results
  });
}));

/**
 * @route   GET /api/applicants/vacancy/:vacancyId
 * @desc    Get all applicants for a vacancy (filter by source)
 * @access  Private
 */
router.get('/vacancy/:vacancyId', authenticate, asyncHandler(async (req, res) => {
  const { vacancyId } = req.params;

  const applicants = await Candidate.findAll({
    where: {
      vacancyId,
      source: 'linkedin_applicant'
    },
    order: [['matchPercentage', 'DESC']]
  });

  res.json({
    success: true,
    count: applicants.length,
    data: applicants
  });
}));

/**
 * @route   GET /api/applicants/templates/csv
 * @desc    Download CSV template for LinkedIn applicants import
 * @access  Private
 */
router.get('/templates/csv', authenticate, (req, res) => {
  const csvTemplate = `First Name,Last Name,Email,Phone,LinkedIn Profile URL,Location,Current Title,Current Company,Applied Date,Cover Letter
John,Doe,john.doe@example.com,+31612345678,https://linkedin.com/in/johndoe,Amsterdam Netherlands,Marketing Manager,TechCorp,2024-01-15,I am very interested in this position...
Jane,Smith,jane.smith@example.com,+32498765432,https://linkedin.com/in/janesmith,Brussels Belgium,Sales Director,SalesInc,2024-01-16,Looking forward to discussing...`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=linkedin-applicants-template.csv');
  res.send(csvTemplate);
});

export default router;
