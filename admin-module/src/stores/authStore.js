import { create } from 'zustand';
import { authService } from '../api/authService.js';

const STORAGE_KEY = 'hb-admin-auth';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const result = await authService.login(email, password);
    const { user, accessToken, refreshToken } = result.data;
    saveToStorage({ accessToken, refreshToken, user });
    set({ user, accessToken, refreshToken, isAuthenticated: true });
    return result;
  },

  logout: async () => {
    try {
      const { refreshToken } = get();
      if (refreshToken) {
        await authService.logout(refreshToken).catch(() => {});
      }
    } finally {
      clearStorage();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) throw new Error('No refresh token');
    const result = await authService.refresh(refreshToken);
    const newToken = result.data.accessToken;
    const stored = loadFromStorage() || {};
    stored.accessToken = newToken;
    saveToStorage(stored);
    set({ accessToken: newToken });
    return newToken;
  },

  initialize: async () => {
    const stored = loadFromStorage();
    if (!stored?.accessToken) {
      set({ isLoading: false });
      return;
    }

    set({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });

    try {
      const result = await authService.getMe();
      set({ user: result.data, isAuthenticated: true, isLoading: false });
    } catch {
      clearStorage();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  }
}));

export default useAuthStore;
