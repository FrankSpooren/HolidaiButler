import express from 'express';
import { Message, Outreach, Candidate, Vacancy } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import MailerLiteService from '../services/messaging/MailerLiteService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const mailerLite = new MailerLiteService();

/**
 * @route   GET /api/messages
 * @desc    Get all messages
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { candidateId, vacancyId, status } = req.query;

  const where = {};
  if (candidateId) where.candidateId = candidateId;
  if (vacancyId) where.vacancyId = vacancyId;
  if (status) where.status = status;

  const messages = await Message.findAll({
    where,
    include: [
      { model: Candidate, as: 'candidate' },
      { model: Vacancy, as: 'vacancy' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    success: true,
    count: messages.length,
    data: messages
  });
}));

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const message = await Message.findByPk(req.params.id, {
    include: [
      { model: Candidate, as: 'candidate' },
      { model: Vacancy, as: 'vacancy' },
      { model: Outreach, as: 'outreach' }
    ]
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  res.json({
    success: true,
    data: message
  });
}));

/**
 * @route   POST /api/messages/generate
 * @desc    Generate personalized message for candidate
 * @access  Private
 */
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
  const { candidateId, template } = req.body;

  if (!candidateId) {
    return res.status(400).json({
      success: false,
      message: 'candidateId is required'
    });
  }

  const candidate = await Candidate.findByPk(candidateId, {
    include: [{ model: Vacancy, as: 'vacancy' }]
  });

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  logger.info(`🤖 Generating message for: ${candidate.firstName} ${candidate.lastName}`);

  // Generate message using MailerLite AI
  const messageData = await mailerLite.generatePersonalizedMessage(
    candidate,
    candidate.vacancy,
    template
  );

  // Create message record
  const message = await Message.create({
    candidateId: candidate.id,
    vacancyId: candidate.vacancyId,
    subject: messageData.subject,
    body: messageData.body,
    bodyHtml: messageData.bodyHtml,
    messageType: 'email',
    isAiGenerated: true,
    aiProvider: 'MailerLite AI',
    personalizationData: messageData.personalizationData,
    status: 'draft',
    createdBy: req.user.id
  });

  // Update candidate status
  if (candidate.status === 'sourced' || candidate.status === 'qualified') {
    await candidate.update({ status: 'message_drafted' });
  }

  logger.info(`✅ Message generated: ${message.id}`);

  res.status(201).json({
    success: true,
    data: message
  });
}));

/**
 * @route   POST /api/messages/generate-batch
 * @desc    Generate messages for multiple candidates
 * @access  Private
 */
router.post('/generate-batch', authenticate, asyncHandler(async (req, res) => {
  const { candidateIds, template } = req.body;

  if (!candidateIds || !Array.isArray(candidateIds)) {
    return res.status(400).json({
      success: false,
      message: 'candidateIds array is required'
    });
  }

  const results = {
    total: candidateIds.length,
    generated: 0,
    errors: [],
    messages: []
  };

  for (const candidateId of candidateIds) {
    try {
      const candidate = await Candidate.findByPk(candidateId, {
        include: [{ model: Vacancy, as: 'vacancy' }]
      });

      if (!candidate) {
        results.errors.push({ candidateId, error: 'Candidate not found' });
        continue;
      }

      const messageData = await mailerLite.generatePersonalizedMessage(
        candidate,
        candidate.vacancy,
        template
      );

      const message = await Message.create({
        candidateId: candidate.id,
        vacancyId: candidate.vacancyId,
        subject: messageData.subject,
        body: messageData.body,
        bodyHtml: messageData.bodyHtml,
        messageType: 'email',
        isAiGenerated: true,
        aiProvider: 'MailerLite AI',
        personalizationData: messageData.personalizationData,
        status: 'draft',
        createdBy: req.user.id
      });

      await candidate.update({ status: 'message_drafted' });

      results.messages.push(message);
      results.generated++;

    } catch (error) {
      logger.error(`❌ Failed to generate for candidate ${candidateId}:`, error);
      results.errors.push({ candidateId, error: error.message });
    }
  }

  logger.info(`✅ Batch generation complete: ${results.generated}/${results.total}`);

  res.json({
    success: true,
    data: results
  });
}));

/**
 * @route   POST /api/messages/:id/send
 * @desc    Send message via MailerLite
 * @access  Private
 */
router.post('/:id/send', authenticate, asyncHandler(async (req, res) => {
  const message = await Message.findByPk(req.params.id, {
    include: [{ model: Candidate, as: 'candidate' }]
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (message.status === 'sent') {
    return res.status(400).json({
      success: false,
      message: 'Message already sent'
    });
  }

  const candidate = message.candidate;

  if (!candidate.email) {
    return res.status(400).json({
      success: false,
      message: 'Candidate has no email address'
    });
  }

  logger.info(`📧 Sending message to: ${candidate.email}`);

  try {
    // Add subscriber to MailerLite
    await mailerLite.addSubscriber(
      candidate.email,
      candidate.firstName,
      candidate.lastName,
      {
        vacancy: message.vacancy?.title,
        match_percentage: candidate.matchPercentage
      }
    );

    // Send email
    const sendResult = await mailerLite.sendEmail(
      candidate.email,
      message.subject,
      message.bodyHtml || message.body
    );

    // Update message status
    await message.update({
      status: 'sent',
      sentAt: new Date(),
      externalId: sendResult.campaignId
    });

    // Create outreach record
    const outreach = await Outreach.create({
      candidateId: candidate.id,
      messageId: message.id,
      sentAt: new Date(),
      sentBy: req.user.id,
      sentVia: 'MailerLite',
      deliveryStatus: 'pending',
      externalTrackingId: sendResult.campaignId
    });

    // Update candidate status
    await candidate.update({ status: 'contacted' });

    logger.info(`✅ Message sent: ${message.id}`);

    res.json({
      success: true,
      data: {
        message,
        outreach
      }
    });

  } catch (error) {
    logger.error('❌ Failed to send message:', error);

    await message.update({ status: 'failed' });

    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
}));

/**
 * @route   PUT /api/messages/:id
 * @desc    Update message
 * @access  Private
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const message = await Message.findByPk(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (message.status === 'sent') {
    return res.status(400).json({
      success: false,
      message: 'Cannot edit sent message'
    });
  }

  await message.update(req.body);

  res.json({
    success: true,
    data: message
  });
}));

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const message = await Message.findByPk(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (message.status === 'sent') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete sent message'
    });
  }

  await message.destroy();

  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
}));

/**
 * @route   GET /api/messages/outreach/:candidateId
 * @desc    Get outreach history for candidate
 * @access  Private
 */
router.get('/outreach/:candidateId', authenticate, asyncHandler(async (req, res) => {
  const outreach = await Outreach.findAll({
    where: { candidateId: req.params.candidateId },
    include: [
      { model: Message, as: 'message' }
    ],
    order: [['sentAt', 'DESC']]
  });

  res.json({
    success: true,
    count: outreach.length,
    data: outreach
  });
}));

/**
 * @route   GET /api/messaging/status
 * @desc    Get MailerLite integration status
 * @access  Private
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const status = await mailerLite.getStatus();

  res.json({
    success: true,
    data: status
  });
}));

export default router;
