import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issueService } from '../api/issueService';

export const useIssuesList = (filters = {}) => {
  return useQuery({
    queryKey: ['issues-list', filters],
    queryFn: () => issueService.list(filters),
    staleTime: 30 * 1000,
    retry: 2,
    select: (response) => response.data || response
  });
};

export const useIssuesStats = () => {
  return useQuery({
    queryKey: ['issues-stats'],
    queryFn: () => issueService.stats(),
    staleTime: 60 * 1000,
    retry: 2,
    select: (response) => response.data || response
  });
};

export const useIssueDetail = (issueId) => {
  return useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => issueService.getById(issueId),
    enabled: !!issueId,
    select: (response) => response.data || response
  });
};

export const useUpdateIssueStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, status, resolution }) =>
      issueService.updateStatus(issueId, { status, resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues-list'] });
      queryClient.invalidateQueries({ queryKey: ['issues-stats'] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail'] });
    }
  });
};
