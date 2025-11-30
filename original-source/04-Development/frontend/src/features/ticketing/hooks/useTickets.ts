/**
 * useTickets Hook
 *
 * Custom hook for managing tickets using React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import type { ErrorResponse } from '@/lib/api';

/**
 * Hook to get user's tickets
 */
export const useGetUserTickets = (
  userId?: number,
  params?: {
    status?: 'active' | 'used' | 'expired' | 'cancelled';
    from?: string;
    to?: string;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ['tickets', 'user', userId, params],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const response = await ticketsApi.getUserTickets(userId, params);
      return response.data;
    },
    enabled: enabled && !!userId,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });
};

/**
 * Hook to get a single ticket by ID
 */
export const useGetTicket = (ticketId?: number, enabled = false) => {
  return useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) throw new Error('Ticket ID is required');

      const response = await ticketsApi.getTicket(ticketId);
      return response.data;
    },
    enabled: enabled && !!ticketId,
  });
};

/**
 * Hook to resend ticket email
 */
export const useResendTicket = () => {
  return useMutation<any, ErrorResponse, number>({
    mutationFn: async (ticketId) => {
      const response = await ticketsApi.resendTicket(ticketId);
      return response.data;
    },
  });
};

/**
 * Hook to add ticket to wallet (Apple/Google)
 */
export const useAddToWallet = () => {
  return useMutation<
    any,
    ErrorResponse,
    { ticketId: number; walletType: 'apple' | 'google' }
  >({
    mutationFn: async ({ ticketId, walletType }) => {
      const response = await ticketsApi.addToWallet(ticketId, { walletType });
      return response.data;
    },
  });
};

/**
 * Hook to validate a ticket (for POI staff)
 */
export const useValidateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ErrorResponse,
    { qrCodeData: string; poiId: number }
  >({
    mutationFn: async ({ qrCodeData, poiId }) => {
      const response = await ticketsApi.validateTicket({ qrCodeData, poiId });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate tickets cache
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

/**
 * Export all hooks as a single object for convenience
 */
export const useTickets = {
  getUserTickets: useGetUserTickets,
  getTicket: useGetTicket,
  resend: useResendTicket,
  addToWallet: useAddToWallet,
  validate: useValidateTicket,
};
