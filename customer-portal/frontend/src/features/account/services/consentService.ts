/**
 * Consent Service - GDPR-compliant consent management
 * Handles user privacy preferences and consent tracking
 */

import apiClient from '@/shared/utils/api';

export interface ConsentData {
  essential: boolean;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt?: string;
}

export interface ConsentHistoryItem {
  consentType: 'essential' | 'analytics' | 'personalization' | 'marketing';
  oldValue: boolean | null;
  newValue: boolean;
  source: 'registration' | 'settings' | 'cookie_banner' | 'api' | 'admin';
  changedAt: string;
}

export const consentService = {
  /**
   * Get current user's consent preferences
   */
  async getConsent(): Promise<ConsentData> {
    const { data } = await apiClient.get<{ success: boolean; data: ConsentData }>('/consent');

    if (!data.success) {
      throw new Error('Failed to get consent');
    }

    return data.data;
  },

  /**
   * Update user's consent preferences
   */
  async updateConsent(consent: Partial<Omit<ConsentData, 'essential' | 'updatedAt'>>): Promise<ConsentData> {
    const { data } = await apiClient.put<{ success: boolean; data: ConsentData; message: string }>('/consent', consent);

    if (!data.success) {
      throw new Error('Failed to update consent');
    }

    return data.data;
  },

  /**
   * Get user's consent change history (GDPR compliance)
   */
  async getConsentHistory(): Promise<ConsentHistoryItem[]> {
    const { data } = await apiClient.get<{ success: boolean; data: ConsentHistoryItem[] }>('/consent/history');

    if (!data.success) {
      throw new Error('Failed to get consent history');
    }

    return data.data;
  },

  /**
   * Check if user has given specific consent
   */
  async checkConsent(type: 'essential' | 'analytics' | 'personalization' | 'marketing'): Promise<boolean> {
    const { data } = await apiClient.post<{ success: boolean; data: { type: string; hasConsent: boolean } }>('/consent/check', { type });

    if (!data.success) {
      throw new Error('Failed to check consent');
    }

    return data.data.hasConsent;
  }
};

export default consentService;
