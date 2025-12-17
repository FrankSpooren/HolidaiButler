/**
 * Profile Service
 * Handles profile-related API calls
 */

import apiClient from '@/shared/utils/api';
import type { User } from '@/features/auth/types/auth.types';
import { useAuthStore } from '@/features/auth/stores/authStore';

export interface ProfileUpdateData {
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface ProfileResponse {
  success: boolean;
  data?: User;
  message?: string;
}

export const profileService = {
  /**
   * Get current user profile from API
   */
  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<{ success: boolean; data: User }>('/auth/me');

    if (!data.success) {
      throw new Error('Failed to load profile');
    }

    // Update user in auth store
    const { setUser } = useAuthStore.getState();
    setUser(data.data);

    return data.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: ProfileUpdateData): Promise<User> {
    const { data } = await apiClient.put<ProfileResponse>('/auth/profile', updates);

    if (!data.success) {
      throw new Error(data.message || 'Failed to update profile');
    }

    // Update user in auth store
    if (data.data) {
      const { setUser } = useAuthStore.getState();
      setUser(data.data);
    }

    return data.data!;
  },

  /**
   * Upload avatar image
   * @param file - Image file to upload
   * @returns URL of the uploaded avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', file);

    const { data } = await apiClient.post<{ success: boolean; data: { avatarUrl: string } }>(
      '/auth/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!data.success) {
      throw new Error('Failed to upload avatar');
    }

    // Update avatar in auth store
    const { user, setUser } = useAuthStore.getState();
    if (user) {
      setUser({ ...user, avatarUrl: data.data.avatarUrl });
    }

    return data.data.avatarUrl;
  },

  /**
   * Format registration date for display
   */
  formatRegistrationDate(dateString: string | undefined, locale = 'nl-NL'): string {
    if (!dateString) {
      return 'Onbekend';
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  },
};

export default profileService;
