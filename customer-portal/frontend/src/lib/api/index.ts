/**
 * API Client Configuration
 * Central export point for all API services
 *
 * NEW Ticketing Module Integration:
 * - Events API (ticketing-module:3004)
 * - Payments API (payment-module:3005)
 * - Tickets/Bookings API
 */

import { Availability } from './Availability';
import { Bookings } from './Bookings';
import { Tickets } from './Tickets';
import { Health } from './Health';
import { Events } from './Events';
import { Payments } from './Payments';

// Re-export all data contracts
export * from './data-contracts';

// API Configuration - Support production and cloud environments
const isProduction =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('holidaibutler.com');

const isCloudEnvironment =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('.app.github.dev') ||
    window.location.hostname.includes('.gitpod.io'));

// Base URLs for different services - production uses relative URLs (Apache proxy)
const TICKETING_API_URL =
  import.meta.env.VITE_TICKETING_API_URL ||
  (isProduction || isCloudEnvironment ? '/api/v1/ticketing' : 'http://localhost:3004/api/v1/ticketing');

const PAYMENT_API_URL =
  import.meta.env.VITE_PAYMENT_API_URL ||
  (isProduction || isCloudEnvironment ? '/api/v1/payments' : 'http://localhost:3005/api/v1');

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * Security worker for adding JWT token to requests
 */
const securityWorker = () => {
  const token = getAuthToken();
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
  return {};
};

// Initialize API instances
export const availabilityApi = new Availability({
  baseURL: TICKETING_API_URL,
  securityWorker,
  secure: true,
});

export const bookingsApi = new Bookings({
  baseURL: TICKETING_API_URL,
  securityWorker,
  secure: true,
});

export const ticketsApi = new Tickets({
  baseURL: TICKETING_API_URL,
  securityWorker,
  secure: true,
});

export const healthApi = new Health({
  baseURL: TICKETING_API_URL.replace('/ticketing', ''),
  securityWorker,
  secure: false,
});

// NEW: Events API for ticketing-module
export const eventsApi = new Events({
  baseURL: TICKETING_API_URL,
  securityWorker,
  secure: true,
});

// NEW: Payments API for Adyen integration
export const paymentsApi = new Payments({
  baseURL: PAYMENT_API_URL,
  securityWorker,
  secure: true,
});

// Re-export eventsService with fallback data
export { eventsService } from './eventsService';
