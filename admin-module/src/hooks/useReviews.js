import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '../api/reviewService.js';

export function useReviewList(filters = {}) {
  return useQuery({
    queryKey: ['reviews', filters],
    queryFn: () => reviewService.list(filters),
    staleTime: 60 * 1000,
    keepPreviousData: true
  });
}

export function useReviewDetail(id) {
  return useQuery({
    queryKey: ['review-detail', id],
    queryFn: () => reviewService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000
  });
}

export function useReviewUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => reviewService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    }
  });
}
