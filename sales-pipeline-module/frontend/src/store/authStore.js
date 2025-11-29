/**
 * Auth Store - Authentication state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      is2FARequired: false,
      tempToken: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login({ email, password });

          if (data.data.requires2FA) {
            set({
              is2FARequired: true,
              tempToken: data.data.tempToken,
              isLoading: false
            });
            return { requires2FA: true };
          }

          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);

          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            is2FARequired: false,
            tempToken: null
          });

          toast.success('Welcome back!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Login failed';
          toast.error(message);
          return { error: message };
        }
      },

      verify2FA: async (code) => {
        const { tempToken } = get();
        set({ isLoading: true });
        try {
          const { data } = await authAPI.verify2FA({ code, tempToken });

          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);

          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            is2FARequired: false,
            tempToken: null
          });

          toast.success('Welcome back!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Invalid code';
          toast.error(message);
          return { error: message };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          // Continue with logout even if API fails
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        set({
          user: null,
          isAuthenticated: false,
          is2FARequired: false,
          tempToken: null
        });

        toast.info('You have been logged out');
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.register(userData);

          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);

          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false
          });

          toast.success('Account created successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Registration failed';
          toast.error(message);
          return { error: message };
        }
      },

      fetchProfile: async () => {
        try {
          const { data } = await authAPI.getProfile();
          set({ user: data.data });
          return data.data;
        } catch (error) {
          if (error.response?.status === 401) {
            get().logout();
          }
          return null;
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.updateProfile(profileData);
          set({ user: data.data, isLoading: false });
          toast.success('Profile updated');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Update failed';
          toast.error(message);
          return { error: message };
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          await authAPI.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
          toast.success('Password changed successfully');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Password change failed';
          toast.error(message);
          return { error: message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          await authAPI.forgotPassword(email);
          set({ isLoading: false });
          toast.success('Password reset email sent');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Request failed';
          toast.error(message);
          return { error: message };
        }
      },

      resetPassword: async (token, password) => {
        set({ isLoading: true });
        try {
          await authAPI.resetPassword(token, password);
          set({ isLoading: false });
          toast.success('Password reset successfully');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Reset failed';
          toast.error(message);
          return { error: message };
        }
      },

      setup2FA: async () => {
        try {
          const { data } = await authAPI.setup2FA();
          return data.data;
        } catch (error) {
          const message = error.response?.data?.error || '2FA setup failed';
          toast.error(message);
          return null;
        }
      },

      enable2FA: async (code) => {
        try {
          await authAPI.enable2FA(code);
          const user = get().user;
          set({ user: { ...user, twoFactorEnabled: true } });
          toast.success('Two-factor authentication enabled');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error || 'Enable failed';
          toast.error(message);
          return { error: message };
        }
      },

      disable2FA: async (code) => {
        try {
          await authAPI.disable2FA(code);
          const user = get().user;
          set({ user: { ...user, twoFactorEnabled: false } });
          toast.success('Two-factor authentication disabled');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error || 'Disable failed';
          toast.error(message);
          return { error: message };
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        try {
          const { data } = await authAPI.getProfile();
          set({ user: data.data, isAuthenticated: true });
          return true;
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ isAuthenticated: false, user: null });
          return false;
        }
      },

      // Selectors
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permission) || false;
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
