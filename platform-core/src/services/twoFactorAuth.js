/**
 * Two-Factor Authentication Service
 * Handles TOTP generation, verification, and backup codes
 */

import crypto from 'crypto';

// TOTP Configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'SHA1';
const BACKUP_CODES_COUNT = 10;

/**
 * Generate a random base32 secret for TOTP
 * @returns {string} Base32 encoded secret
 */
export function generateSecret() {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Base32 encode a buffer
 * @param {Buffer} buffer
 * @returns {string}
 */
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let result = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substr(i, 5).padEnd(5, '0');
    result += alphabet[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Base32 decode a string to buffer
 * @param {string} str
 * @returns {Buffer}
 */
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (const char of str.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code for a given secret and time
 * @param {string} secret - Base32 encoded secret
 * @param {number} time - Unix timestamp (optional, defaults to now)
 * @returns {string} 6-digit TOTP code
 */
export function generateTOTP(secret, time = null) {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_PERIOD);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code
 * @param {string} secret - Base32 encoded secret
 * @param {string} code - User-provided code
 * @param {number} window - Number of periods to check before/after (default 1)
 * @returns {boolean} Whether the code is valid
 */
export function verifyTOTP(secret, code, window = 1) {
  if (!code || code.length !== TOTP_DIGITS) {
    return false;
  }

  const now = Date.now() / 1000;

  // Check current period and adjacent periods within window
  for (let i = -window; i <= window; i++) {
    const time = now + (i * TOTP_PERIOD);
    const expectedCode = generateTOTP(secret, time);
    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth URI for QR code
 * @param {string} secret - Base32 encoded secret
 * @param {string} email - User's email
 * @param {string} issuer - App name (default: HolidaiButler)
 * @returns {string} otpauth URI
 */
export function generateOtpauthUri(secret, email, issuer = 'HolidaiButler') {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate backup codes
 * @returns {Object} { codes: string[], hashedCodes: string[] }
 */
export function generateBackupCodes() {
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
    // Hash the code for storage
    hashedCodes.push(hashBackupCode(code));
  }

  return { codes, hashedCodes };
}

/**
 * Hash a backup code for secure storage
 * @param {string} code
 * @returns {string}
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Verify a backup code
 * @param {string} code - User-provided code
 * @param {string[]} hashedCodes - Array of hashed backup codes
 * @returns {number} Index of matched code, or -1 if not found
 */
export function verifyBackupCode(code, hashedCodes) {
  const hashedInput = hashBackupCode(code);
  return hashedCodes.findIndex(hashed => hashed === hashedInput);
}

export default {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateOtpauthUri,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode
};
