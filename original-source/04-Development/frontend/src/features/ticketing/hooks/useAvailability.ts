/**
 * useAvailability Hook
 *
 * Custom hook for checking ticket availability using React Query
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { availabilityApi } from '@/lib/api';
import type { AvailabilityResponse, ErrorResponse } from '@/lib/api';

interface CheckAvailabilityParams {
  poiId: number;
  date: string;
  quantity: number;
  timeslot?: string;
}

/**
 * Hook to check availability for a specific date/time/quantity
 */
export const useCheckAvailability = () => {
  return useMutation<AvailabilityResponse, ErrorResponse, CheckAvailabilityParams>({
    mutationFn: async (params) => {
      const response = await availabilityApi.checkAvailability(params);
      return response.data;
    },
  });
};

/**
 * Hook to get availability for a single date
 */
export const useGetAvailability = (
  poiId: number,
  date?: string,
  timeslot?: string,
  enabled = false
) => {
  return useQuery({
    queryKey: ['availability', poiId, date, timeslot],
    queryFn: async () => {
      if (!date) throw new Error('Date is required');

      const response = await availabilityApi.getAvailability(
        poiId,
        { date, timeslot }
      );
      return response.data;
    },
    enabled: enabled && !!date,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
};

/**
 * Hook to get availability range for multiple dates
 */
export const useGetAvailabilityRange = (
  poiId: number,
  from?: string,
  to?: string,
  enabled = false
) => {
  return useQuery({
    queryKey: ['availability-range', poiId, from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range is required');

      const response = await availabilityApi.getAvailabilityRange(
        poiId,
        { from, to }
      );
      return response.data;
    },
    enabled: enabled && !!from && !!to,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
