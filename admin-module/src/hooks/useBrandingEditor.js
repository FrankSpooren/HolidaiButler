import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandingService } from '../api/brandingService.js';

export function useBrandingDestinations() {
  return useQuery({
    queryKey: ['branding-destinations'],
    queryFn: () => brandingService.getDestinations(),
    staleTime: 60 * 1000
  });
}

export function useUpdateDestinationBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ destinationId, data }) => brandingService.updateBranding(destinationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    }
  });
}

export function useUploadBrandingLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ destination, file }) => brandingService.uploadLogo(destination, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    }
  });
}
