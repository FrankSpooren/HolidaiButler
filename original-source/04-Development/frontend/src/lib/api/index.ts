/**
 * API Client Configuration
 * Central export point for all API services
 */

import { Availability } from './Availability';
import { Bookings } from './Bookings';
import { Tickets } from './Tickets';
import { Health } from './Health';

// Re-export all data contracts
export * from './data-contracts';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_TICKETING_API_URL || 'http://localhost:5000/api/v1/ticketing';

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
  baseURL: API_BASE_URL,
  securityWorker,
  secure: true,
});

export const bookingsApi = new Bookings({
  baseURL: API_BASE_URL,
  securityWorker,
  secure: true,
});

export const ticketsApi = new Tickets({
  baseURL: API_BASE_URL,
  securityWorker,
  secure: true,
});

export const healthApi = new Health({
  baseURL: API_BASE_URL.replace('/ticketing', ''),
  securityWorker,
  secure: false,
});
