/**
 * useBooking Hook
 *
 * Custom hook for managing bookings using React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api';
import type { CreateBookingRequest, BookingResponse, ErrorResponse } from '@/lib/api';

/**
 * Hook to create a new booking
 */
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<BookingResponse, ErrorResponse, CreateBookingRequest>({
    mutationFn: async (bookingData) => {
      const response = await bookingsApi.createBooking(bookingData);
      if (!response.data.data) throw new Error('No booking data returned');
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
};

/**
 * Hook to get a single booking by ID
 */
export const useGetBooking = (bookingId?: number, enabled = false) => {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');

      const response = await bookingsApi.getBooking(bookingId);
      return response.data;
    },
    enabled: enabled && !!bookingId,
  });
};

/**
 * Hook to get user's bookings
 */
export const useGetUserBookings = (
  userId?: number,
  params?: {
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    from?: string;
    to?: string;
    limit?: number;
  },
  enabled = false
) => {
  return useQuery({
    queryKey: ['bookings', 'user', userId, params],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const response = await bookingsApi.getUserBookings(userId, params);
      return response.data;
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to confirm a booking (after payment)
 */
export const useConfirmBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BookingResponse,
    ErrorResponse,
    { bookingId: number; paymentTransactionId: string }
  >({
    mutationFn: async ({ bookingId, paymentTransactionId }) => {
      const response = await bookingsApi.confirmBooking(bookingId, {
        paymentTransactionId,
      });
      if (!response.data.data) throw new Error('No booking data returned');
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

/**
 * Hook to cancel a booking
 */
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BookingResponse,
    ErrorResponse,
    { bookingId: number; reason?: string }
  >({
    mutationFn: async ({ bookingId, reason }) => {
      const response = await bookingsApi.cancelBooking(bookingId, { reason: reason || '' });
      if (!response.data.data) throw new Error('No booking data returned');
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
};
