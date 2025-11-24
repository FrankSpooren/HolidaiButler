import validator from 'validator';

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized output
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and escape special characters
  let sanitized = validator.escape(input.trim());

  // Additional cleanup
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove any remaining < >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  return sanitized;
};

/**
 * Sanitize email address
 * @param {string} email - Email address
 * @returns {string|null} - Sanitized email or null if invalid
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const normalized = validator.normalizeEmail(email.trim().toLowerCase());

  if (normalized && validator.isEmail(normalized)) {
    return normalized;
  }

  return null;
};

/**
 * Sanitize URL
 * @param {string} url - URL string
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  // Validate URL
  if (validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    return trimmed;
  }

  return null;
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except + at start
  return phone.trim().replace(/[^\d+]/g, '').substring(0, 20);
};

/**
 * Sanitize object recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      message: 'Password is required'
    };
  }

  // Minimum requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long`
    };
  }

  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (!hasLowerCase) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (!hasNumbers) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  if (!hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must contain at least one special character'
    };
  }

  return {
    valid: true,
    message: 'Password is strong'
  };
};
