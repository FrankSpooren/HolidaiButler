import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('adminToken'),
  refreshToken: localStorage.getItem('adminRefreshToken'),
  isAuthenticated: !!localStorage.getItem('adminToken'),
  isLoading: false,
  error: null,

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { user, accessToken, refreshToken } = response.data;

      // Save to localStorage
      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('adminRefreshToken', refreshToken);
      localStorage.setItem('adminUser', JSON.stringify(user));

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Logout
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear storage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');

      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  // Load user from localStorage
  loadUser: async () => {
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true
        });

        // Fetch fresh user data
        const response = await authAPI.getMe();
        const freshUser = response.data.user;

        localStorage.setItem('adminUser', JSON.stringify(freshUser));
        set({ user: freshUser });
      } catch (error) {
        console.error('Load user error:', error);
        get().logout();
      }
    }
  },

  // Update profile
  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.user;

      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      set({
        user: updatedUser,
        isLoading: false,
        error: null
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Update failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      set({ isLoading: false, error: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Check if user has permission
  hasPermission: (resource, action) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'platform_admin') return true;

    const parts = resource.split('.');
    let perm = user.permissions;

    for (const part of parts) {
      perm = perm?.[part];
      if (perm === undefined) return false;
    }

    if (typeof perm === 'object' && action) {
      return perm[action] === true;
    }

    return perm === true;
  },

  // Check if user can manage specific POI
  canManagePOI: (poiId) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'platform_admin' || user.role === 'editor') return true;
    if (user.role === 'poi_owner') {
      return user.ownedPOIs?.some(id => id === poiId);
    }
    return false;
  }
}));

export default useAuthStore;
