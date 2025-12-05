/**
 * Events Service with Fallback Data
 * Wraps the Events API with fallback test data for development
 */

import { eventsApi } from './index';
import type { Event, TicketType, EventsResponse, EventResponse } from './data-contracts';

// Fallback test events for development
const FALLBACK_EVENTS: Event[] = [
  {
    id: 1,
    name: 'Fiesta de la Virgen de las Nieves',
    description: 'Traditioneel festival ter ere van de beschermheilige van Calpe met processies, vuurwerk en live muziek.',
    startDate: '2025-08-05T20:00:00Z',
    endDate: '2025-08-05T23:59:00Z',
    location: 'Plaza de la Villa, Calpe',
    category: 'festivals',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    availableTickets: 500,
    totalCapacity: 1000,
    ticketTypes: [
      { id: 1, name: 'General Admission', description: 'Access to all public areas', price: 0, currency: 'EUR', available: 500, maxPerOrder: 10 },
      { id: 2, name: 'VIP', description: 'Reserved seating + drinks', price: 25, currency: 'EUR', available: 50, maxPerOrder: 4 },
    ],
  },
  {
    id: 2,
    name: 'Summer Concert Series - La Fossa Beach',
    description: 'Live muziek op het strand met lokale en internationale artiesten. Elke vrijdagavond in juli en augustus.',
    startDate: '2025-07-18T21:00:00Z',
    endDate: '2025-07-18T23:30:00Z',
    location: 'Playa La Fossa, Calpe',
    category: 'music',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    availableTickets: 150,
    totalCapacity: 300,
    ticketTypes: [
      { id: 3, name: 'Standing', description: 'General admission standing', price: 15, currency: 'EUR', available: 100, maxPerOrder: 6 },
      { id: 4, name: 'Beach Lounge', description: 'Lounge chair on the beach', price: 35, currency: 'EUR', available: 50, maxPerOrder: 4 },
    ],
  },
  {
    id: 3,
    name: 'Calpe Wine & Tapas Festival',
    description: 'Proef de beste lokale wijnen en tapas van meer dan 20 restaurants in het historische centrum.',
    startDate: '2025-06-28T18:00:00Z',
    endDate: '2025-06-28T23:00:00Z',
    location: 'Casco Antiguo, Calpe',
    category: 'food-drink',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800',
    availableTickets: 80,
    totalCapacity: 200,
    ticketTypes: [
      { id: 5, name: 'Tasting Pass', description: '10 tapas + 5 wine tastings', price: 35, currency: 'EUR', available: 80, maxPerOrder: 6 },
      { id: 6, name: 'Premium Pass', description: '15 tapas + unlimited wine', price: 55, currency: 'EUR', available: 40, maxPerOrder: 4 },
    ],
  },
  {
    id: 4,
    name: 'Kayak Tour - Hidden Coves of Calpe',
    description: 'Verken de verborgen baaien en grotten langs de spectaculaire kustlijn van Calpe per kajak.',
    startDate: '2025-07-12T09:00:00Z',
    endDate: '2025-07-12T13:00:00Z',
    location: 'Puerto de Calpe',
    category: 'active-sports',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    availableTickets: 12,
    totalCapacity: 16,
    ticketTypes: [
      { id: 7, name: 'Single Kayak', description: 'Solo kayak with guide', price: 45, currency: 'EUR', available: 8, maxPerOrder: 2 },
      { id: 8, name: 'Double Kayak', description: 'Tandem kayak for 2', price: 75, currency: 'EUR', available: 4, maxPerOrder: 2 },
    ],
  },
  {
    id: 5,
    name: 'Flamenco Night at Casa de Cultura',
    description: 'Authentieke flamenco voorstelling met de beste dansers en muzikanten uit Andalusië.',
    startDate: '2025-07-05T21:00:00Z',
    endDate: '2025-07-05T23:00:00Z',
    location: 'Casa de Cultura, Calpe',
    category: 'culture',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
    availableTickets: 45,
    totalCapacity: 120,
    ticketTypes: [
      { id: 9, name: 'Standard', description: 'Theater seating', price: 25, currency: 'EUR', available: 45, maxPerOrder: 6 },
      { id: 10, name: 'Front Row', description: 'First 2 rows + meet artists', price: 45, currency: 'EUR', available: 10, maxPerOrder: 4 },
    ],
  },
  {
    id: 6,
    name: 'Sunrise Yoga at Peñón de Ifach',
    description: 'Start de dag met een rustgevende yogasessie bij zonsopgang met uitzicht op de Middellandse Zee.',
    startDate: '2025-07-08T06:30:00Z',
    endDate: '2025-07-08T08:00:00Z',
    location: 'Peñón de Ifach Natural Park',
    category: 'relaxation',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    availableTickets: 20,
    totalCapacity: 25,
    ticketTypes: [
      { id: 11, name: 'Yoga Session', description: 'Mat included', price: 20, currency: 'EUR', available: 20, maxPerOrder: 4 },
    ],
  },
  {
    id: 7,
    name: 'Medieval Market Festival',
    description: 'Stap terug in de tijd met dit middeleeuwse marktfestival met ambachtslieden, jongleurs en riddergevechten.',
    startDate: '2025-08-15T10:00:00Z',
    endDate: '2025-08-17T22:00:00Z',
    location: 'Casco Antiguo, Calpe',
    category: 'festivals',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
    availableTickets: 0,
    totalCapacity: 5000,
    ticketTypes: [
      { id: 12, name: 'Free Entry', description: 'Open to all visitors', price: 0, currency: 'EUR', available: 5000, maxPerOrder: 10 },
    ],
  },
  {
    id: 8,
    name: 'Diving Experience - Costa Blanca',
    description: 'Ontdek de onderwaterwereld met een begeleid duikavontuur, geschikt voor beginners.',
    startDate: '2025-07-20T10:00:00Z',
    endDate: '2025-07-20T14:00:00Z',
    location: 'Club Náutico, Calpe',
    category: 'active-sports',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    availableTickets: 6,
    totalCapacity: 8,
    ticketTypes: [
      { id: 13, name: 'Discovery Dive', description: 'Intro dive for beginners', price: 75, currency: 'EUR', available: 6, maxPerOrder: 2 },
      { id: 14, name: 'Certified Diver', description: '2-tank dive for certified', price: 95, currency: 'EUR', available: 4, maxPerOrder: 2 },
    ],
  },
];

// Fallback ticket types by event
const FALLBACK_TICKET_TYPES: Record<number, TicketType[]> = {
  1: FALLBACK_EVENTS[0].ticketTypes || [],
  2: FALLBACK_EVENTS[1].ticketTypes || [],
  3: FALLBACK_EVENTS[2].ticketTypes || [],
  4: FALLBACK_EVENTS[3].ticketTypes || [],
  5: FALLBACK_EVENTS[4].ticketTypes || [],
  6: FALLBACK_EVENTS[5].ticketTypes || [],
  7: FALLBACK_EVENTS[6].ticketTypes || [],
  8: FALLBACK_EVENTS[7].ticketTypes || [],
};

/**
 * Events Service with fallback data
 */
export const eventsService = {
  /**
   * Get all events with optional filters
   */
  getEvents: async (query?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<EventsResponse> => {
    try {
      const response = await eventsApi.getEvents(query as Parameters<typeof eventsApi.getEvents>[0]);
      return response;
    } catch (error) {
      console.warn('Using fallback events data:', error);

      // Filter events based on query
      let filteredEvents = [...FALLBACK_EVENTS];

      if (query?.status && query.status !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.status === query.status);
      }

      if (query?.category) {
        filteredEvents = filteredEvents.filter(e => e.category === query.category);
      }

      if (query?.search) {
        const searchLower = query.search.toLowerCase();
        filteredEvents = filteredEvents.filter(e =>
          e.name.toLowerCase().includes(searchLower) ||
          e.location?.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
        );
      }

      return {
        data: {
          success: true,
          data: filteredEvents,
          pagination: {
            page: 1,
            limit: 20,
            total: filteredEvents.length,
            pages: 1,
          },
        },
      } as EventsResponse;
    }
  },

  /**
   * Get single event by ID
   */
  getEvent: async (eventId: number): Promise<EventResponse> => {
    try {
      const response = await eventsApi.getEvent(eventId);
      return response;
    } catch (error) {
      console.warn('Using fallback event data:', error);

      const event = FALLBACK_EVENTS.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      return {
        data: {
          success: true,
          data: event,
        },
      } as EventResponse;
    }
  },

  /**
   * Get ticket types for an event
   */
  getTicketTypes: async (eventId: number): Promise<{ data: { success: boolean; data: TicketType[] } }> => {
    try {
      const response = await eventsApi.getTicketTypes(eventId);
      return response;
    } catch (error) {
      console.warn('Using fallback ticket types:', error);

      const ticketTypes = FALLBACK_TICKET_TYPES[eventId] || [];

      return {
        data: {
          success: true,
          data: ticketTypes,
        },
      };
    }
  },
};

export default eventsService;
