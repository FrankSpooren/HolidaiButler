/**
 * Ticketing API Client
 * Integration with Ticketing Module (port :3004)
 * Ticket bookings, availability & management
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.ticketing;

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  maxQuantity?: number;
  availableQuantity?: number;
}

export interface Availability {
  date: string;
  slots: {
    time: string;
    available: boolean;
    remainingCapacity?: number;
    ticketTypes?: TicketType[];
  }[];
}

export interface BookingRequest {
  poiId: string;
  date: string;
  time?: string;
  tickets: {
    ticketTypeId: string;
    quantity: number;
  }[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  specialRequests?: string;
}

export interface Ticket {
  id: string;
  bookingId: string;
  ticketTypeId: string;
  ticketType?: TicketType;
  qrCode?: string;
  status: 'valid' | 'used' | 'cancelled' | 'expired';
  validFrom?: string;
  validUntil?: string;
}

export interface Booking {
  id: string;
  poiId: string;
  date: string;
  time?: string;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  confirmationCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  specialRequests?: string;
  createdAt: string;
}

export interface BookingResponse {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export interface AvailabilityResponse {
  success: boolean;
  availability?: Availability[];
  error?: string;
}

class TicketingAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Check availability for a POI on specific dates
   */
  async checkAvailability(
    poiId: string,
    startDate: string,
    endDate?: string
  ): Promise<AvailabilityResponse> {
    try {
      const queryParams = new URLSearchParams({
        poiId,
        startDate,
        ...(endDate && { endDate }),
      });

      const response = await fetch(`${baseUrl}${endpoints.availability}?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Check availability error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.bookings}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create booking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.bookings}/${bookingId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get booking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Get user's bookings
   */
  async getMyBookings(): Promise<{ success: boolean; bookings?: Booking[]; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.bookings}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get my bookings error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.bookings}/${bookingId}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cancel booking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.tickets}/${ticketId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get ticket error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }

  /**
   * Validate a ticket (for partners/venues)
   */
  async validateTicket(ticketId: string): Promise<{ success: boolean; valid?: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.validate}/${ticketId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Validate ticket error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ticketing service unavailable',
      };
    }
  }
}

export const ticketingApi = new TicketingAPI();
export default ticketingApi;
