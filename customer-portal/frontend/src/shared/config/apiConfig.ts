/**
 * HolidaiButler API Configuration
 * Centralized configuration for all backend module endpoints
 *
 * Port Mapping:
 * - Admin Module (Auth + API):   3003
 * - Ticketing Module:            3004
 * - Payment Module:              3005
 * - Reservations Module:         3006
 * - Agenda Module:               3007
 */

export const API_CONFIG = {
  // Platform Core - Uses Admin Backend for Auth (port 3003)
  platformCore: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3003/api/v1',
    endpoints: {
      pois: '/pois',
      auth: '/auth',
      users: '/users',
      chat: '/chat',
      holibot: '/holibot',
    }
  },

  // Widget API - HoliBot AI Chat (uses Admin Backend)
  widgetApi: {
    baseUrl: import.meta.env.VITE_WIDGET_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3003/api/v1',
    endpoints: {
      chat: '/chat',
      message: '/chat/message',
      session: '/chat/session',
      dailyTip: '/holibot/daily-tip',
    }
  },

  // Admin Module
  admin: {
    baseUrl: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3003/api/v1',
    endpoints: {
      pois: '/admin/pois',
      users: '/admin/users',
      analytics: '/admin/analytics',
    }
  },

  // Ticketing Module - Ticket bookings & management
  ticketing: {
    baseUrl: import.meta.env.VITE_TICKETING_API_URL || 'http://localhost:3004/api/v1',
    endpoints: {
      bookings: '/bookings',
      tickets: '/tickets',
      availability: '/availability',
      validate: '/validate',
    }
  },

  // Payment Module - Adyen integration (PCI-DSS compliant)
  payment: {
    baseUrl: import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:3005/api/v1',
    endpoints: {
      payments: '/payments',
      checkout: '/payments/checkout',
      webhook: '/payments/webhook',
      refund: '/payments/refund',
    }
  },

  // Reservations Module - Restaurant bookings
  reservations: {
    baseUrl: import.meta.env.VITE_RESERVATIONS_API_URL || 'http://localhost:3006/api/v1',
    endpoints: {
      reservations: '/reservations',
      restaurants: '/restaurants',
      availability: '/availability',
      guests: '/guests',
      tables: '/tables',
      waitlist: '/waitlist',
    }
  },

  // Agenda Module - Events & Calendar
  agenda: {
    baseUrl: import.meta.env.VITE_AGENDA_API_URL || 'http://localhost:3007/api/v1',
    endpoints: {
      events: '/events',
      upcoming: '/events/upcoming',
      featured: '/events/featured',
      byDate: '/events/date',
    }
  },

} as const;

// Feature flags
export const FEATURES = {
  ticketing: import.meta.env.VITE_ENABLE_TICKETING === 'true',
  payments: import.meta.env.VITE_ENABLE_PAYMENTS === 'true',
  reservations: import.meta.env.VITE_ENABLE_RESERVATIONS === 'true',
  agenda: import.meta.env.VITE_ENABLE_AGENDA === 'true',
  holibot: import.meta.env.VITE_ENABLE_HOLIBOT === 'true',
} as const;

// Map defaults for Calpe, Costa Blanca
export const MAP_CONFIG = {
  defaultLat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT || '38.6447'),
  defaultLng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG || '0.0410'),
  defaultZoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM || '14'),
} as const;

export default API_CONFIG;
