/**
 * Agenda API Client
 * Integration with Agenda Module (port :3007)
 * Events & Calendar for Costa Blanca region
 */

import { API_CONFIG } from '../config/apiConfig';

const { baseUrl, endpoints } = API_CONFIG.agenda;

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  address?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  tags?: string[];
  image?: string;
  price?: number;
  currency?: string;
  isFree?: boolean;
  isAllDay?: boolean;
  isFeatured?: boolean;
  organizer?: string;
  website?: string;
  ticketUrl?: string;
  translations?: Record<string, {
    title: string;
    description?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponse {
  success: boolean;
  events?: AgendaEvent[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export interface EventFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  lang?: string;
}

class AgendaAPI {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all events with optional filtering
   */
  async getEvents(filters?: EventFilters): Promise<EventsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.isFree !== undefined) queryParams.append('isFree', filters.isFree.toString());
        if (filters.isFeatured !== undefined) queryParams.append('isFeatured', filters.isFeatured.toString());
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.limit) queryParams.append('limit', filters.limit.toString());
        if (filters.offset) queryParams.append('offset', filters.offset.toString());
        if (filters.lang) queryParams.append('lang', filters.lang);
      }

      const url = `${baseUrl}${endpoints.events}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get events error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agenda service unavailable',
      };
    }
  }

  /**
   * Get upcoming events (next 7 days by default)
   */
  async getUpcomingEvents(limit: number = 10, lang?: string): Promise<EventsResponse> {
    try {
      const queryParams = new URLSearchParams({ limit: limit.toString() });
      if (lang) queryParams.append('lang', lang);

      const response = await fetch(`${baseUrl}${endpoints.upcoming}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get upcoming events error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agenda service unavailable',
      };
    }
  }

  /**
   * Get featured events
   */
  async getFeaturedEvents(limit: number = 5, lang?: string): Promise<EventsResponse> {
    try {
      const queryParams = new URLSearchParams({ limit: limit.toString() });
      if (lang) queryParams.append('lang', lang);

      const response = await fetch(`${baseUrl}${endpoints.featured}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get featured events error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agenda service unavailable',
      };
    }
  }

  /**
   * Get events for a specific date
   */
  async getEventsByDate(date: string, lang?: string): Promise<EventsResponse> {
    try {
      const queryParams = new URLSearchParams({ date });
      if (lang) queryParams.append('lang', lang);

      const response = await fetch(`${baseUrl}${endpoints.byDate}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get events by date error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agenda service unavailable',
      };
    }
  }

  /**
   * Get single event by ID
   */
  async getEvent(eventId: string, lang?: string): Promise<{ success: boolean; event?: AgendaEvent; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (lang) queryParams.append('lang', lang);

      const url = `${baseUrl}${endpoints.events}/${eventId}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get event error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agenda service unavailable',
      };
    }
  }

  /**
   * Get events for a date range (calendar view)
   */
  async getEventsForCalendar(
    startDate: string,
    endDate: string,
    lang?: string
  ): Promise<EventsResponse> {
    return this.getEvents({
      startDate,
      endDate,
      limit: 100, // Get all events in range
      lang,
    });
  }

  /**
   * Search events by text
   */
  async searchEvents(query: string, lang?: string): Promise<EventsResponse> {
    return this.getEvents({
      search: query,
      limit: 20,
      lang,
    });
  }
}

export const agendaApi = new AgendaAPI();
export default agendaApi;
