import { API_CONFIG } from '@/shared/config/apiConfig';

/**
 * Agenda API Service
 * Handles all API calls to the Agenda backend module
 */

export interface AgendaEvent {
  _id: string;
  id?: string;
  title: Record<string, string> | string;
  description: Record<string, string> | string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  primaryCategory: string;
  categories?: string[];
  images?: Array<{
    url: string;
    isPrimary?: boolean;
    caption?: string;
  }>;
  pricing?: {
    isFree: boolean;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
  };
  targetAudience?: string[];
  timeOfDay?: string;
  featured?: boolean;
  status?: string;
  slug?: string;
}

export interface AgendaPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AgendaResponse {
  success: boolean;
  data: AgendaEvent[];
  pagination: AgendaPagination;
}

export interface SingleEventResponse {
  success: boolean;
  data: AgendaEvent;
}

// Fallback mock events for development
const FALLBACK_EVENTS: AgendaEvent[] = [
  {
    _id: 'event-1',
    title: { nl: 'Fiesta de la Virgen de las Nieves', en: 'Festival of Our Lady of the Snows' },
    description: { nl: 'Traditioneel festival ter ere van de beschermheilige van Calpe', en: 'Traditional festival honoring the patron saint of Calpe' },
    startDate: '2025-08-05T20:00:00Z',
    endDate: '2025-08-05T23:59:00Z',
    location: { name: 'Plaza de la Villa, Calpe' },
    primaryCategory: 'festivals',
    pricing: { isFree: true },
    featured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', isPrimary: true }],
  },
  {
    _id: 'event-2',
    title: { nl: 'Mercado Medieval', en: 'Medieval Market' },
    description: { nl: 'Middeleeuwse markt met lokale ambachten, eten en entertainment', en: 'Medieval market with local crafts, food, and entertainment' },
    startDate: '2025-07-15T10:00:00Z',
    endDate: '2025-07-15T22:00:00Z',
    location: { name: 'Casco Antiguo, Calpe' },
    primaryCategory: 'markets',
    pricing: { isFree: true },
    featured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800', isPrimary: true }],
  },
  {
    _id: 'event-3',
    title: { nl: 'Zomerconcert aan Zee', en: 'Summer Concert by the Sea' },
    description: { nl: 'Zomerconcertreeks op de boulevard', en: 'Summer concert series at the beach promenade' },
    startDate: '2025-07-20T21:30:00Z',
    endDate: '2025-07-20T23:30:00Z',
    location: { name: 'Paseo Marítimo, Calpe' },
    primaryCategory: 'music',
    pricing: { isFree: false, minPrice: 15, currency: 'EUR' },
    featured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800', isPrimary: true }],
  },
  {
    _id: 'event-4',
    title: { nl: 'Tapasroute Calpe', en: 'Calpe Tapas Route' },
    description: { nl: 'Tapasroute langs de beste restaurants in Calpe', en: 'Tapas route through the best restaurants in Calpe' },
    startDate: '2025-06-10T19:00:00Z',
    endDate: '2025-06-10T23:00:00Z',
    location: { name: 'Diverse locaties, Calpe' },
    primaryCategory: 'food-drink',
    pricing: { isFree: false, minPrice: 3, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800', isPrimary: true }],
  },
  {
    _id: 'event-5',
    title: { nl: 'Yoga bij Zonsopgang', en: 'Yoga at Sunrise' },
    description: { nl: 'Ochtend yogasessie met uitzicht op de Middellandse Zee bij de Peñón de Ifach', en: 'Morning yoga session with Mediterranean views at Peñón de Ifach' },
    startDate: '2025-06-15T07:00:00Z',
    endDate: '2025-06-15T08:30:00Z',
    location: { name: 'Peñón de Ifach, Calpe' },
    primaryCategory: 'relaxation',
    pricing: { isFree: false, minPrice: 20, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800', isPrimary: true }],
  },
  {
    _id: 'event-6',
    title: { nl: 'Kayak Tour - Verborgen Baaien', en: 'Kayak Tour - Hidden Coves' },
    description: { nl: 'Ontdek de verborgen baaien en grotten langs de kust', en: 'Explore the hidden coves and caves along the coast' },
    startDate: '2025-06-20T09:00:00Z',
    endDate: '2025-06-20T13:00:00Z',
    location: { name: 'Puerto de Calpe' },
    primaryCategory: 'active-sports',
    pricing: { isFree: false, minPrice: 45, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', isPrimary: true }],
  },
  {
    _id: 'event-7',
    title: { nl: 'Flamenco Avond', en: 'Flamenco Night' },
    description: { nl: 'Authentieke flamenco voorstelling met live muziek', en: 'Authentic flamenco show with live music' },
    startDate: '2025-06-25T21:00:00Z',
    endDate: '2025-06-25T23:30:00Z',
    location: { name: 'Casa de Cultura, Calpe' },
    primaryCategory: 'culture',
    pricing: { isFree: false, minPrice: 25, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800', isPrimary: true }],
  },
  {
    _id: 'event-8',
    title: { nl: 'Strandfeest La Fossa', en: 'La Fossa Beach Party' },
    description: { nl: 'Zomers strandfeest met DJ en cocktails', en: 'Summer beach party with DJ and cocktails' },
    startDate: '2025-07-05T18:00:00Z',
    endDate: '2025-07-06T02:00:00Z',
    location: { name: 'Playa La Fossa, Calpe' },
    primaryCategory: 'entertainment',
    pricing: { isFree: true },
    featured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', isPrimary: true }],
  },
  {
    _id: 'event-9',
    title: { nl: 'Wijnproeverij Costa Blanca', en: 'Costa Blanca Wine Tasting' },
    description: { nl: 'Proef lokale wijnen uit de Costa Blanca regio', en: 'Taste local wines from the Costa Blanca region' },
    startDate: '2025-06-28T19:00:00Z',
    endDate: '2025-06-28T22:00:00Z',
    location: { name: 'Bodega Local, Calpe' },
    primaryCategory: 'food-drink',
    pricing: { isFree: false, minPrice: 35, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', isPrimary: true }],
  },
  {
    _id: 'event-10',
    title: { nl: 'Duikervaring voor Beginners', en: 'Diving Experience for Beginners' },
    description: { nl: 'Introductieduik in de helderblauwe wateren van Calpe', en: 'Introductory dive in the crystal clear waters of Calpe' },
    startDate: '2025-07-10T10:00:00Z',
    endDate: '2025-07-10T14:00:00Z',
    location: { name: 'Club Náutico, Calpe' },
    primaryCategory: 'active-sports',
    pricing: { isFree: false, minPrice: 75, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', isPrimary: true }],
  },
  {
    _id: 'event-11',
    title: { nl: 'Kindertheater', en: "Children's Theater" },
    description: { nl: 'Interactieve theatervoorstelling voor kinderen', en: 'Interactive theater show for children' },
    startDate: '2025-07-12T11:00:00Z',
    endDate: '2025-07-12T12:30:00Z',
    location: { name: 'Auditorio Municipal, Calpe' },
    primaryCategory: 'family',
    pricing: { isFree: false, minPrice: 8, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800', isPrimary: true }],
  },
  {
    _id: 'event-12',
    title: { nl: 'Zondagsmarkt', en: 'Sunday Market' },
    description: { nl: 'Wekelijkse markt met verse producten en ambachten', en: 'Weekly market with fresh produce and crafts' },
    startDate: '2025-06-22T08:00:00Z',
    endDate: '2025-06-22T14:00:00Z',
    allDay: false,
    location: { name: 'Avenida de los Ejércitos Españoles, Calpe' },
    primaryCategory: 'markets',
    pricing: { isFree: true },
    images: [{ url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800', isPrimary: true }],
  },
];

const getApiUrl = (): string => {
  return API_CONFIG.agenda.baseUrl;
};

/**
 * Agenda API Service
 */
export const agendaService = {
  /**
   * Get events with filtering and pagination
   */
  getEvents: async (filters: Record<string, unknown> = {}): Promise<AgendaResponse> => {
    try {
      const url = new URL(`${getApiUrl()}/events`);

      // Add filters as query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Using fallback events data:', error);
      // Filter fallback data based on filters
      let filteredEvents = [...FALLBACK_EVENTS];

      if (filters.categories) {
        const cats = String(filters.categories).split(',');
        filteredEvents = filteredEvents.filter(e => cats.includes(e.primaryCategory));
      }

      if (filters.search) {
        const search = String(filters.search).toLowerCase();
        filteredEvents = filteredEvents.filter(e => {
          const title = typeof e.title === 'string' ? e.title : (e.title.nl || e.title.en || '');
          return title.toLowerCase().includes(search);
        });
      }

      if (filters.isFree === true || filters.isFree === 'true') {
        filteredEvents = filteredEvents.filter(e => e.pricing?.isFree);
      }

      const page = Number(filters.page) || 1;
      const limit = Number(filters.limit) || 24;
      const start = (page - 1) * limit;
      const paginatedEvents = filteredEvents.slice(start, start + limit);

      return {
        success: true,
        data: paginatedEvents,
        pagination: {
          page,
          limit,
          total: filteredEvents.length,
          pages: Math.ceil(filteredEvents.length / limit),
        },
      };
    }
  },

  /**
   * Get featured events
   */
  getFeaturedEvents: async (limit = 6): Promise<AgendaResponse> => {
    try {
      const response = await fetch(`${getApiUrl()}/events/featured?limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Using fallback featured events:', error);
      const featuredEvents = FALLBACK_EVENTS.filter(e => e.featured).slice(0, limit);
      return {
        success: true,
        data: featuredEvents,
        pagination: {
          page: 1,
          limit,
          total: featuredEvents.length,
          pages: 1,
        },
      };
    }
  },

  /**
   * Get single event by ID
   */
  getEventById: async (eventId: string): Promise<SingleEventResponse> => {
    try {
      const response = await fetch(`${getApiUrl()}/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Using fallback event data:', error);
      const event = FALLBACK_EVENTS.find(e => e._id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      return {
        success: true,
        data: event,
      };
    }
  },
};

export default agendaService;
