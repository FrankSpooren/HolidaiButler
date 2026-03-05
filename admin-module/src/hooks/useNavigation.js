import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { navigationService } from '../api/navigationService.js';

export function useNavigationDestinations() {
  return useQuery({
    queryKey: ['navigation-destinations'],
    queryFn: () => navigationService.getDestinations(),
    staleTime: 60 * 1000
  });
}

export function useNavigationUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ destinationId, navItems }) => navigationService.update(destinationId, navItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation-destinations'] });
    }
  });
}
