/**
 * Offline Storage Utility
 * Uses IndexedDB for persistent offline ticket storage
 */

const DB_NAME = 'HolidaiButlerTickets';
const DB_VERSION = 1;
const STORES = {
  TICKETS: 'tickets',
  BOOKINGS: 'bookings',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings',
};

let db = null;

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineStorage() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Tickets store
      if (!database.objectStoreNames.contains(STORES.TICKETS)) {
        const ticketStore = database.createObjectStore(STORES.TICKETS, { keyPath: 'id' });
        ticketStore.createIndex('userId', 'userId', { unique: false });
        ticketStore.createIndex('status', 'status', { unique: false });
        ticketStore.createIndex('validUntil', 'validUntil', { unique: false });
      }

      // Bookings store
      if (!database.objectStoreNames.contains(STORES.BOOKINGS)) {
        const bookingStore = database.createObjectStore(STORES.BOOKINGS, { keyPath: 'id' });
        bookingStore.createIndex('userId', 'userId', { unique: false });
        bookingStore.createIndex('status', 'status', { unique: false });
        bookingStore.createIndex('bookingDate', 'bookingDate', { unique: false });
      }

      // Sync queue for offline actions
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get database connection
 */
async function getDB() {
  if (!db) {
    await initOfflineStorage();
  }
  return db;
}

// ========== TICKETS ==========

/**
 * Save tickets to offline storage
 */
export async function saveTicketsOffline(tickets) {
  const database = await getDB();
  const transaction = database.transaction(STORES.TICKETS, 'readwrite');
  const store = transaction.objectStore(STORES.TICKETS);

  const promises = tickets.map((ticket) => {
    return new Promise((resolve, reject) => {
      const request = store.put({
        ...ticket,
        _savedAt: new Date().toISOString(),
        _offline: true,
      });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
  console.log(`Saved ${tickets.length} tickets offline`);

  // Also notify service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_TICKETS',
      tickets,
    });
  }
}

/**
 * Get all offline tickets
 */
export async function getOfflineTickets() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.TICKETS, 'readonly');
    const store = transaction.objectStore(STORES.TICKETS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single offline ticket
 */
export async function getOfflineTicket(ticketId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.TICKETS, 'readonly');
    const store = transaction.objectStore(STORES.TICKETS);
    const request = store.get(ticketId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an offline ticket
 */
export async function deleteOfflineTicket(ticketId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.TICKETS, 'readwrite');
    const store = transaction.objectStore(STORES.TICKETS);
    const request = store.delete(ticketId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ========== BOOKINGS ==========

/**
 * Save bookings to offline storage
 */
export async function saveBookingsOffline(bookings) {
  const database = await getDB();
  const transaction = database.transaction(STORES.BOOKINGS, 'readwrite');
  const store = transaction.objectStore(STORES.BOOKINGS);

  const promises = bookings.map((booking) => {
    return new Promise((resolve, reject) => {
      const request = store.put({
        ...booking,
        _savedAt: new Date().toISOString(),
        _offline: true,
      });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
  console.log(`Saved ${bookings.length} bookings offline`);
}

/**
 * Get all offline bookings
 */
export async function getOfflineBookings() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.BOOKINGS, 'readonly');
    const store = transaction.objectStore(STORES.BOOKINGS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single offline booking
 */
export async function getOfflineBooking(bookingId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.BOOKINGS, 'readonly');
    const store = transaction.objectStore(STORES.BOOKINGS);
    const request = store.get(bookingId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== SYNC QUEUE ==========

/**
 * Add an action to the sync queue (for offline actions)
 */
export async function addToSyncQueue(action) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.add({
      ...action,
      timestamp: new Date().toISOString(),
      synced: false,
    });

    request.onsuccess = () => {
      console.log('Action added to sync queue:', action.type);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending sync actions
 */
export async function getPendingSyncActions() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      const actions = (request.result || []).filter((a) => !a.synced);
      resolve(actions);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark sync action as completed
 */
export async function markSyncCompleted(actionId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(actionId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ========== SETTINGS ==========

/**
 * Save a setting
 */
export async function saveSetting(key, value) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a setting
 */
export async function getSetting(key) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

// ========== UTILITIES ==========

/**
 * Clear all offline data
 */
export async function clearOfflineData() {
  const database = await getDB();
  const stores = [STORES.TICKETS, STORES.BOOKINGS, STORES.SYNC_QUEUE];

  const promises = stores.map((storeName) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);

  // Also clear service worker caches
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }

  console.log('All offline data cleared');
}

/**
 * Get offline storage statistics
 */
export async function getOfflineStats() {
  const [tickets, bookings, pendingActions] = await Promise.all([
    getOfflineTickets(),
    getOfflineBookings(),
    getPendingSyncActions(),
  ]);

  return {
    ticketsCount: tickets.length,
    bookingsCount: bookings.length,
    pendingActionsCount: pendingActions.length,
    lastSync: await getSetting('lastSyncTimestamp'),
  };
}

/**
 * Check if IndexedDB is supported
 */
export function isOfflineStorageSupported() {
  return 'indexedDB' in window;
}

// Initialize on module load
if (isOfflineStorageSupported()) {
  initOfflineStorage().catch(console.error);
}

export default {
  initOfflineStorage,
  saveTicketsOffline,
  getOfflineTickets,
  getOfflineTicket,
  deleteOfflineTicket,
  saveBookingsOffline,
  getOfflineBookings,
  getOfflineBooking,
  addToSyncQueue,
  getPendingSyncActions,
  markSyncCompleted,
  saveSetting,
  getSetting,
  clearOfflineData,
  getOfflineStats,
  isOfflineStorageSupported,
};
