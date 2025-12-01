/**
 * Reservations API Client
 * Integration with Reservations Module (port :3006)
 * Restaurant table bookings & guest management
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.reservations;

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine?: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  images?: string[];
  rating?: number;
  priceLevel?: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remainingSeats?: number;
}

export interface AvailabilityResponse {
  success: boolean;
  date: string;
  restaurant?: Restaurant;
  slots?: TimeSlot[];
  error?: string;
}

export interface ReservationRequest {
  restaurantId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurant?: Restaurant;
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmationCode?: string;
  createdAt: string;
}

export interface ReservationResponse {
  success: boolean;
  reservation?: Reservation;
  error?: string;
}

class ReservationsAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Get list of restaurants
   */
  async getRestaurants(params?: {
    cuisine?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; restaurants?: Restaurant[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.cuisine) queryParams.append('cuisine', params.cuisine);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${baseUrl}${endpoints.restaurants}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get restaurants error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurant(restaurantId: string): Promise<{ success: boolean; restaurant?: Restaurant; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.restaurants}/${restaurantId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get restaurant error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Check availability for a specific date and restaurant
   */
  async checkAvailability(
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<AvailabilityResponse> {
    try {
      const queryParams = new URLSearchParams({
        restaurantId,
        date,
        partySize: partySize.toString(),
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
        date,
        error: error instanceof Error ? error.message : 'Availability service unavailable',
      };
    }
  }

  /**
   * Create a new reservation
   */
  async createReservation(request: ReservationRequest): Promise<ReservationResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.reservations}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create reservation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string): Promise<ReservationResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.reservations}/${reservationId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get reservation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Get user's reservations
   */
  async getMyReservations(): Promise<{ success: boolean; reservations?: Reservation[]; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.reservations}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get my reservations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string): Promise<ReservationResponse> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.reservations}/${reservationId}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cancel reservation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservations service unavailable',
      };
    }
  }

  /**
   * Join waitlist for a fully booked time slot
   */
  async joinWaitlist(request: {
    restaurantId: string;
    date: string;
    time: string;
    partySize: number;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
  }): Promise<{ success: boolean; position?: number; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}${endpoints.waitlist}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Join waitlist error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Waitlist service unavailable',
      };
    }
  }
}

export const reservationsApi = new ReservationsAPI();
export default reservationsApi;
