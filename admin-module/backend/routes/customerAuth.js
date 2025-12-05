import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Secrets (shared with admin auth for simplicity in dev)
const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'your-admin-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Development fallback customer user
const DEV_FALLBACK_CUSTOMER = {
  id: 'dev-customer-001',
  email: 'user@holidaibutler.com',
  password: 'User2024',
  firstName: 'Demo',
  lastName: 'User',
  role: 'customer',
  status: 'active',
  language: 'nl',
  preferences: {
    notifications: true,
    newsletter: false
  }
};

// Alternative customer accounts for testing
const DEV_CUSTOMERS = [
  DEV_FALLBACK_CUSTOMER,
  {
    id: 'dev-customer-002',
    email: 'admin@holidaibutler.com',
    password: 'Admin2024',
    firstName: 'Admin',
    lastName: 'User',
    role: 'customer',
    status: 'active',
    language: 'en'
  },
  {
    id: 'dev-customer-003',
    email: 'test@test.com',
    password: 'test123',
    firstName: 'Test',
    lastName: 'Account',
    role: 'customer',
    status: 'active',
    language: 'nl'
  }
];

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

    // Find matching dev customer
    const customer = DEV_CUSTOMERS.find(
      c => c.email.toLowerCase() === email.toLowerCase() && c.password === password
    );

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        hint: 'Development accounts: user@holidaibutler.com / User2024 or test@test.com / test123'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: customer.id,
        role: customer.role,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId: customer.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    console.log(`✅ Customer login successful: ${customer.email}`);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: customer.role,
          status: customer.status,
          language: customer.language,
          preferences: customer.preferences
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
        _devMode: true
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
 * @desc    Customer registration (dev mode - auto approve)
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (email, password, firstName, lastName).'
      });
    }

    // Check if email already exists in dev accounts
    const existingUser = DEV_CUSTOMERS.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Create new dev user (in-memory only for this session)
    const newUser = {
      id: `dev-customer-${Date.now()}`,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: 'customer',
      status: 'active',
      language: 'nl'
    };

    // Add to dev customers array
    DEV_CUSTOMERS.push(newUser);

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: newUser.id,
        role: newUser.role,
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

    res.json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          status: newUser.status
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
        _devMode: true
      }
    });

  } catch (error) {
    console.error('Customer signup error:', error);
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

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        role: 'customer',
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate new refresh token
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

    // Find user in dev customers
    const customer = DEV_CUSTOMERS.find(c => c.id === decoded.userId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: customer.role,
        status: customer.status,
        language: customer.language,
        preferences: customer.preferences
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
