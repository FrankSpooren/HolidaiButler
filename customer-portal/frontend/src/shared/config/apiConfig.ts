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

// Helper to detect environment
const isLocalhost = (): boolean => {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

// Helper to detect GitHub Codespaces
const isCodespaces = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('.app.github.dev');
};

// Helper to detect and construct Codespaces URL
const getCodespacesUrl = (port: number): string | null => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if running in GitHub Codespaces
    if (hostname.includes('.app.github.dev')) {
      // Extract the codespace name (everything before the port in the hostname)
      // Format: <codespace-name>-<port>.app.github.dev
      const match = hostname.match(/^(.+)-\d+\.app\.github\.dev$/);
      if (match) {
        return `https://${match[1]}-${port}.app.github.dev`;
      }
    }
  }
  return null;
};

// Get API URL for a specific port, with environment-aware fallbacks
const getApiUrl = (envVar: string | undefined, port: number): string => {
  // First check environment variable
  if (envVar) {
    return envVar;
  }

  // Check for Codespaces environment
  const codespacesUrl = getCodespacesUrl(port);
  if (codespacesUrl) {
    return `${codespacesUrl}/api/v1`;
  }

  // In production (not localhost, not Codespaces), use relative URL
  // This makes API calls to the same origin, handled by nginx/reverse proxy
  if (!isLocalhost() && !isCodespaces()) {
    return '/api/v1';
  }

  // Default to localhost for local development
  return `http://localhost:${port}/api/v1`;
};

export const API_CONFIG = {
  // Platform Core - Uses Admin Backend for Auth (port 3003)
  platformCore: {
    baseUrl: getApiUrl(import.meta.env.VITE_API_URL, 3003),
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
    baseUrl: import.meta.env.VITE_WIDGET_API_URL || getApiUrl(import.meta.env.VITE_API_URL, 3003),
    endpoints: {
      chat: '/chat',
      message: '/chat/message',
      session: '/chat/session',
      dailyTip: '/holibot/daily-tip',
    }
  },

  // Admin Module
  admin: {
    baseUrl: getApiUrl(import.meta.env.VITE_ADMIN_API_URL, 3003),
    endpoints: {
      pois: '/admin/pois',
      users: '/admin/users',
      analytics: '/admin/analytics',
    }
  },

  // Ticketing Module - Ticket bookings & management
  ticketing: {
    baseUrl: getApiUrl(import.meta.env.VITE_TICKETING_API_URL, 3004),
    endpoints: {
      bookings: '/bookings',
      tickets: '/tickets',
      availability: '/availability',
      validate: '/validate',
    }
  },

  // Payment Module - Adyen integration (PCI-DSS compliant)
  payment: {
    baseUrl: getApiUrl(import.meta.env.VITE_PAYMENT_API_URL, 3005),
    endpoints: {
      payments: '/payments',
      checkout: '/payments/checkout',
      webhook: '/payments/webhook',
      refund: '/payments/refund',
    }
  },

  // Reservations Module - Restaurant bookings
  reservations: {
    baseUrl: getApiUrl(import.meta.env.VITE_RESERVATIONS_API_URL, 3006),
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
    baseUrl: getApiUrl(import.meta.env.VITE_AGENDA_API_URL, 3007),
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
