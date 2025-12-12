/**
 * Format currency amount
 * @param {number} amount - Amount in euros
 * @param {string} currency - Currency code (default: EUR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format style (short, long, time)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'long') {
  const d = new Date(date);

  const options = {
    short: { dateStyle: 'short' },
    long: { dateStyle: 'long' },
    time: { timeStyle: 'short' },
    datetime: { dateStyle: 'long', timeStyle: 'short' },
  };

  return new Intl.DateTimeFormat('nl-NL', options[format] || options.long).format(d);
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as: +31 6 12345678
  if (cleaned.startsWith('31')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3)}`;
  }

  // Format as: 06 12345678
  if (cleaned.startsWith('06')) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  }

  return phone;
}

/**
 * Generate random booking reference
 * @returns {string} Booking reference
 */
export function generateBookingReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BOOK-${timestamp}${random}`;
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Convert cents to euros
 * @param {number} cents - Amount in cents
 * @returns {number} Amount in euros
 */
export function centsToEuros(cents) {
  return cents / 100;
}

/**
 * Convert euros to cents
 * @param {number} euros - Amount in euros
 * @returns {number} Amount in cents
 */
export function eurosToCents(euros) {
  return Math.round(euros * 100);
}
