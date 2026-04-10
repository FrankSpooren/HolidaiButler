import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// JWT Secrets
const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'your-admin-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Max login attempts before lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * @route   POST /api/v1/auth/login
 * @desc    Customer login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        status: { [Op.ne]: 'deleted' }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is locked. Try again in ${remainingTime} minutes.`
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Check if account is pending
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for activation.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      const loginAttempts = (user.login_attempts || 0) + 1;
      const updateData = { login_attempts: loginAttempts };

      // Lock account if max attempts reached
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lock_until = new Date(Date.now() + LOCK_TIME);
        await user.update(updateData);
        return res.status(423).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 15 minutes.'
        });
      }

      await user.update(updateData);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - loginAttempts
      });
    }

    // Reset login attempts on successful login
    await user.update({
      login_attempts: 0,
      lock_until: null,
      last_login: new Date()
    });

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: 'customer',
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    console.log(`✅ Customer login successful: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          language: user.language,
          subscriptionType: user.subscription_type,
          status: user.status,
          emailVerified: user.email_verified,
          preferences: user.preferences
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Customer registration
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, language } = req.body || {};

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (email, password, firstName, lastName).'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password, // Will be hashed by beforeCreate hook
      first_name: firstName,
      last_name: lastName,
      language: language || 'nl',
      status: 'active',
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: newUser.id,
        role: 'customer',
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: newUser.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    console.log(`✅ New customer registered: ${newUser.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          language: newUser.language,
          status: newUser.status
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Customer signup error:', error);

    // Handle Sequelize unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // Check if user still exists and is active
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status === 'deleted' || user.status === 'suspended') {
      return res.status(401).json({
        success: false,
        message: 'User account is no longer valid.'
      });
    }

    // Generate new tokens
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        role: 'customer',
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh.'
    });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current customer
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user in database
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        phoneNumber: user.phone_number,
        language: user.language,
        country: user.country,
        subscriptionType: user.subscription_type,
        subscriptionEndsAt: user.subscription_ends_at,
        status: user.status,
        emailVerified: user.email_verified,
        preferences: user.preferences,
        stats: user.stats,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update customer profile
 * @access  Private
 */
router.put('/profile', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Update allowed fields
    const { firstName, lastName, phoneNumber, language, country, preferences } = req.body;
    const updateData = { updated_at: new Date() };

    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (phoneNumber !== undefined) updateData.phone_number = phoneNumber;
    if (language) updateData.language = language;
    if (country !== undefined) updateData.country = country;
    if (preferences) updateData.preferences = preferences;

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        language: user.language,
        country: user.country,
        preferences: user.preferences
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout customer
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

export default router;
