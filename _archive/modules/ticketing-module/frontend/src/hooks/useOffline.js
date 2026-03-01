/**
 * useOffline Hook
 * Manages offline state and synchronization for the ticketing app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initOfflineStorage,
  saveTicketsOffline,
  getOfflineTickets,
  saveBookingsOffline,
  getOfflineBookings,
  getPendingSyncActions,
  markSyncCompleted,
  saveSetting,
  getSetting,
  getOfflineStats,
  isOfflineStorageSupported,
} from '../utils/offlineStorage';
import ticketingService from '../services/ticketingService';

/**
 * Hook to manage offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Main offline management hook
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [offlineStats, setOfflineStats] = useState(null);
  const [error, setError] = useState(null);
  const syncIntervalRef = useRef(null);

  // Initialize offline storage
  useEffect(() => {
    if (isOfflineStorageSupported()) {
      initOfflineStorage()
        .then(() => loadOfflineStats())
        .catch(setError);
    }
  }, []);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Sync when coming back online
      await syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker sync messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          loadOfflineStats();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Auto-sync interval when online
  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        syncData();
      }, 5 * 60 * 1000); // Sync every 5 minutes
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline]);

  // Load offline stats
  const loadOfflineStats = useCallback(async () => {
    try {
      const stats = await getOfflineStats();
      setOfflineStats(stats);

      const lastSync = await getSetting('lastSyncTimestamp');
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (err) {
      console.error('Failed to load offline stats:', err);
    }
  }, []);

  // Sync data with server
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const lastSync = await getSetting('lastSyncTimestamp');

      // Fetch updated data from server
      const response = await ticketingService.syncOfflineTickets({
        lastSyncTimestamp: lastSync,
      });

      if (response.success) {
        const { tickets, bookings, syncTimestamp } = response.data;

        // Save to offline storage
        if (tickets?.length > 0) {
          await saveTicketsOffline(tickets);
        }
        if (bookings?.length > 0) {
          await saveBookingsOffline(bookings);
        }

        // Process pending sync actions
        await processPendingActions();

        // Update last sync time
        await saveSetting('lastSyncTimestamp', syncTimestamp);
        setLastSyncTime(new Date(syncTimestamp));
      }

      await loadOfflineStats();
    } catch (err) {
      console.error('Sync failed:', err);
      setError(err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, loadOfflineStats]);

  // Process pending offline actions
  const processPendingActions = useCallback(async () => {
    const pendingActions = await getPendingSyncActions();

    for (const action of pendingActions) {
      try {
        // Process based on action type
        switch (action.type) {
          case 'CANCEL_BOOKING':
            await ticketingService.cancelBooking(action.bookingId, action.data);
            break;
          case 'TRANSFER_TICKET':
            await ticketingService.transferTicket(action.ticketId, action.data);
            break;
          default:
            console.warn('Unknown action type:', action.type);
        }

        // Mark as completed
        await markSyncCompleted(action.id);
      } catch (err) {
        console.error('Failed to process action:', action, err);
      }
    }
  }, []);

  // Download tickets for offline access
  const downloadForOffline = useCallback(async () => {
    if (!isOnline) {
      setError(new Error('Cannot download while offline'));
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/ticketing/offline-bundle', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          await saveTicketsOffline(data.data.tickets);
          await saveBookingsOffline(data.data.bookings);
          await saveSetting('lastSyncTimestamp', data.data.generatedAt);
          await loadOfflineStats();
        }
      }
    } catch (err) {
      console.error('Failed to download offline bundle:', err);
      setError(err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, loadOfflineStats]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service Worker registered:', registration.scope);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        return registration;
      } catch (err) {
        console.error('Service Worker registration failed:', err);
        throw err;
      }
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    offlineStats,
    error,
    syncData,
    downloadForOffline,
    registerServiceWorker,
    isSupported: isOfflineStorageSupported(),
  };
}

/**
 * Hook to get offline tickets
 */
export function useOfflineTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isOnline = useOnlineStatus();

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Try to fetch from server first
        try {
          const response = await ticketingService.getTicketsByUser();
          if (response.success) {
            const serverTickets = response.data;
            setTickets(serverTickets);
            // Save for offline use
            await saveTicketsOffline(serverTickets);
            return;
          }
        } catch (e) {
          console.log('Server fetch failed, using offline data');
        }
      }

      // Fall back to offline data
      const offlineTickets = await getOfflineTickets();
      setTickets(offlineTickets);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return {
    tickets,
    loading,
    error,
    reload: loadTickets,
    isOfflineData: !isOnline,
  };
}

/**
 * Hook to get offline bookings
 */
export function useOfflineBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isOnline = useOnlineStatus();

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        try {
          const response = await ticketingService.getBookingsByUser();
          if (response.success) {
            const serverBookings = response.data;
            setBookings(serverBookings);
            await saveBookingsOffline(serverBookings);
            return;
          }
        } catch (e) {
          console.log('Server fetch failed, using offline data');
        }
      }

      const offlineBookings = await getOfflineBookings();
      setBookings(offlineBookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return {
    bookings,
    loading,
    error,
    reload: loadBookings,
    isOfflineData: !isOnline,
  };
}

export default useOffline;
