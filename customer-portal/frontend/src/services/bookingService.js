/**
 * Booking Service
 * API calls for ticketing and booking management
 */

import { ticketingApi } from './api';

const BOOKINGS_ENDPOINT = '/bookings';
const TICKETS_ENDPOINT = '/tickets';
const AVAILABILITY_ENDPOINT = '/availability';

// ============================================================================
// Availability
// ============================================================================

/**
 * Check availability for a POI
 * @param {string} poiId - POI ID
 * @param {Object} params - Query parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {number} params.guests - Number of guests
 * @returns {Promise<Object>} Availability data
 */
export const checkAvailability = async (poiId, params = {}) => {
  const response = await ticketingApi.get(`${AVAILABILITY_ENDPOINT}/${poiId}`, {
    params,
  });
  return response.data;
};

/**
 * Get availability for date range
 * @param {string} poiId - POI ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Availability calendar
 */
export const getAvailabilityRange = async (poiId, startDate, endDate) => {
  const response = await ticketingApi.get(`${AVAILABILITY_ENDPOINT}/${poiId}/range`, {
    params: { startDate, endDate },
  });
  return response.data;
};

// ============================================================================
// Bookings
// ============================================================================

/**
 * Create a new booking
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} Created booking
 */
export const createBooking = async (bookingData) => {
  const response = await ticketingApi.post(BOOKINGS_ENDPOINT, bookingData);
  return response.data;
};

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Booking data
 */
export const getBooking = async (bookingId) => {
  const response = await ticketingApi.get(`${BOOKINGS_ENDPOINT}/${bookingId}`);
  return response.data;
};

/**
 * Get booking by reference
 * @param {string} reference - Booking reference (e.g., BK-2025-000001)
 * @returns {Promise<Object>} Booking data
 */
export const getBookingByReference = async (reference) => {
  const response = await ticketingApi.get(`${BOOKINGS_ENDPOINT}/reference/${reference}`);
  return response.data;
};

/**
 * Get user's bookings
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<Object>} User bookings with pagination
 */
export const getUserBookings = async (params = {}) => {
  const response = await ticketingApi.get(`${BOOKINGS_ENDPOINT}/my-bookings`, {
    params,
  });
  return response.data;
};

/**
 * Cancel a booking
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled booking
 */
export const cancelBooking = async (bookingId, reason = '') => {
  const response = await ticketingApi.put(`${BOOKINGS_ENDPOINT}/${bookingId}/cancel`, {
    reason,
  });
  return response.data;
};

/**
 * Confirm booking (after payment)
 * @param {string} bookingId - Booking ID
 * @param {Object} paymentData - Payment confirmation data
 * @returns {Promise<Object>} Confirmed booking
 */
export const confirmBooking = async (bookingId, paymentData) => {
  const response = await ticketingApi.post(`${BOOKINGS_ENDPOINT}/${bookingId}/confirm`, paymentData);
  return response.data;
};

// ============================================================================
// Tickets
// ============================================================================

/**
 * Get ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Ticket data
 */
export const getTicket = async (ticketId) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/${ticketId}`);
  return response.data;
};

/**
 * Get ticket by number
 * @param {string} ticketNumber - Ticket number (e.g., HB-2025-000001)
 * @returns {Promise<Object>} Ticket data
 */
export const getTicketByNumber = async (ticketNumber) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/number/${ticketNumber}`);
  return response.data;
};

/**
 * Get user's tickets
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} User tickets with pagination
 */
export const getUserTickets = async (params = {}) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/my-tickets`, {
    params,
  });
  return response.data;
};

/**
 * Download ticket as PDF
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Blob>} PDF blob
 */
export const downloadTicketPDF = async (ticketId) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/${ticketId}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Get Apple Wallet pass URL
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Wallet pass URL
 */
export const getAppleWalletPass = async (ticketId) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/${ticketId}/apple-wallet`);
  return response.data;
};

/**
 * Get Google Pay pass URL
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Google Pay URL
 */
export const getGooglePayPass = async (ticketId) => {
  const response = await ticketingApi.get(`${TICKETS_ENDPOINT}/${ticketId}/google-pay`);
  return response.data;
};

/**
 * Resend ticket email
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Success response
 */
export const resendTicketEmail = async (ticketId) => {
  const response = await ticketingApi.post(`${TICKETS_ENDPOINT}/${ticketId}/resend`);
  return response.data;
};

/**
 * Transfer ticket to another person
 * @param {string} ticketId - Ticket ID
 * @param {Object} transferData - Transfer details
 * @param {string} transferData.recipientName - Recipient name
 * @param {string} transferData.recipientEmail - Recipient email
 * @returns {Promise<Object>} Transferred ticket
 */
export const transferTicket = async (ticketId, transferData) => {
  const response = await ticketingApi.post(`${TICKETS_ENDPOINT}/${ticketId}/transfer`, transferData);
  return response.data;
};

export default {
  // Availability
  checkAvailability,
  getAvailabilityRange,
  // Bookings
  createBooking,
  getBooking,
  getBookingByReference,
  getUserBookings,
  cancelBooking,
  confirmBooking,
  // Tickets
  getTicket,
  getTicketByNumber,
  getUserTickets,
  downloadTicketPDF,
  getAppleWalletPass,
  getGooglePayPass,
  resendTicketEmail,
  transferTicket,
};
