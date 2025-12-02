/* eslint-disable */
/* tslint:disable */
/**
 * Events API Client
 *
 * Client for the NEW Ticketing Module Events endpoints
 * Backend: ticketing-module (port 3004)
 * Gateway: platform-core (port 3001) -> /api/v1/ticketing/events
 */

import { HttpClient, ContentType, RequestParams } from './http-client';
import type { EventsResponse, EventResponse, Event, TicketType, ErrorResponse } from './data-contracts';

export class Events<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Get all active events with optional filters
   * @tags Events
   * @name GetEvents
   * @summary List all events
   * @request GET:/events
   */
  getEvents = (
    query?: {
      status?: 'draft' | 'active' | 'cancelled' | 'completed';
      category?: string;
      search?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    params: RequestParams = {}
  ) =>
    this.request<EventsResponse, ErrorResponse>({
      path: `/events`,
      method: 'GET',
      query,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Get a single event by ID with ticket types
   * @tags Events
   * @name GetEvent
   * @summary Get event details
   * @request GET:/events/{eventId}
   */
  getEvent = (eventId: number, params: RequestParams = {}) =>
    this.request<EventResponse, ErrorResponse>({
      path: `/events/${eventId}`,
      method: 'GET',
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Get ticket types for an event
   * @tags Events
   * @name GetTicketTypes
   * @summary Get event ticket types
   * @request GET:/events/{eventId}/ticket-types
   */
  getTicketTypes = (eventId: number, params: RequestParams = {}) =>
    this.request<{ success: boolean; data: TicketType[] }, ErrorResponse>({
      path: `/events/${eventId}/ticket-types`,
      method: 'GET',
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * @description Get availability for an event
   * @tags Events
   * @name GetEventAvailability
   * @summary Get event availability
   * @request GET:/events/{eventId}/availability
   */
  getEventAvailability = (eventId: number, params: RequestParams = {}) =>
    this.request<
      {
        success: boolean;
        data: {
          eventId: number;
          available: boolean;
          totalCapacity: number;
          availableTickets: number;
          ticketTypes: Array<{
            id: number;
            name: string;
            available: number;
            price: number;
          }>;
        };
      },
      ErrorResponse
    >({
      path: `/events/${eventId}/availability`,
      method: 'GET',
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
}
