/**
 * Notification Store - Notification state management
 */

import { create } from 'zustand';
import { notificationsAPI } from '../services/api';

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: null,

  // Actions
  fetchNotifications: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await notificationsAPI.getAll(params);
      set({
        notifications: data.data.notifications || data.data,
        isLoading: false
      });
      return data.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationsAPI.getUnreadCount();
      set({ unreadCount: data.data.count });
      return data.data.count;
    } catch (error) {
      return 0;
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      const notifications = get().notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      );
      set({
        notifications,
        unreadCount: Math.max(0, get().unreadCount - 1)
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsAPI.markAllAsRead();
      const notifications = get().notifications.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString()
      }));
      set({ notifications, unreadCount: 0 });
      return true;
    } catch (error) {
      return false;
    }
  },

  fetchPreferences: async () => {
    try {
      const { data } = await notificationsAPI.getPreferences();
      set({ preferences: data.data });
      return data.data;
    } catch (error) {
      return null;
    }
  },

  updatePreferences: async (preferences) => {
    try {
      const { data } = await notificationsAPI.updatePreferences(preferences);
      set({ preferences: data.data });
      return data.data;
    } catch (error) {
      return null;
    }
  },

  // Add notification (for real-time updates)
  addNotification: (notification) => {
    const notifications = [notification, ...get().notifications];
    set({
      notifications,
      unreadCount: get().unreadCount + 1
    });
  },

  // Clear state
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));

export default useNotificationStore;
