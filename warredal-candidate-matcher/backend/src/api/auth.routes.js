import express from 'express';
import { User } from '../models/index.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public (should be restricted in production)
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    role: role || 'recruiter'
  });

  const token = generateToken(user.id);

  logger.info(`✅ User registered: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      user,
      token
    }
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.scope('withPassword').findOne({ where: { email } });

  if (!user || !await user.validatePassword(password)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Update last login
  await user.update({ lastLogin: new Date() });

  const token = generateToken(user.id);

  // Remove password from response
  const userData = user.toJSON();

  logger.info(`✅ User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: userData,
      token
    }
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { firstName, lastName, linkedinProfile } = req.body;

  await req.user.update({
    firstName,
    lastName,
    linkedinProfile
  });

  res.json({
    success: true,
    data: req.user
  });
}));

export default router;
