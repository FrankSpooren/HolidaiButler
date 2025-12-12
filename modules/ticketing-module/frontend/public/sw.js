/**
 * HolidaiButler Ticketing Module - Service Worker
 * Provides offline access to tickets and essential app functionality
 */

const CACHE_NAME = 'holidaibutler-tickets-v1';
const OFFLINE_CACHE = 'holidaibutler-offline-v1';
const TICKET_CACHE = 'holidaibutler-ticket-data-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache for offline access
const API_CACHE_PATTERNS = [
  /\/api\/ticketing\/tickets\//,
  /\/api\/ticketing\/bookings\//,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('undefined')));
    }).then(() => {
      // Activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('holidaibutler-') &&
                   name !== CACHE_NAME &&
                   name !== OFFLINE_CACHE &&
                   name !== TICKET_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with network-first, cache fallback
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this is a cacheable API endpoint
  const isCacheable = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful GET responses for ticket/booking data
    if (response.ok && isCacheable) {
      const cache = await caches.open(TICKET_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', url.pathname);

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', url.pathname);
      return cachedResponse;
    }

    // Return offline JSON response for API
    return new Response(
      JSON.stringify({
        success: false,
        error: 'You are offline',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle navigation requests with network-first, offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);

    // Cache the page for offline use
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, trying cache');

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    // Final fallback - return basic offline response
    return new Response(
      '<html><body><h1>Je bent offline</h1><p>Deze pagina is niet beschikbaar offline.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Static request failed:', request.url);
    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-tickets') {
    event.waitUntil(syncTickets());
  }
});

/**
 * Sync cached ticket data when back online
 */
async function syncTickets() {
  try {
    // Get all clients and notify them to sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'HolidaiButler',
    body: 'Je hebt een nieuw bericht',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'Bekijk' },
      { action: 'dismiss', title: 'Sluiten' },
    ],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if a window is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_TICKETS') {
    cacheTicketData(event.data.tickets);
  }

  if (event.data.type === 'CLEAR_CACHE') {
    clearAllCaches();
  }
});

/**
 * Cache ticket data for offline access
 */
async function cacheTicketData(tickets) {
  try {
    const cache = await caches.open(TICKET_CACHE);

    for (const ticket of tickets) {
      const url = `/api/ticketing/tickets/${ticket.id}`;
      const response = new Response(JSON.stringify({
        success: true,
        data: ticket,
        cached: true,
        cachedAt: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      await cache.put(url, response);
    }

    console.log('[SW] Cached', tickets.length, 'tickets');
  } catch (error) {
    console.error('[SW] Failed to cache tickets:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('holidaibutler-'))
      .map((name) => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}
