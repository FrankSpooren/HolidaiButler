import { useQuery } from '@tanstack/react-query';
import { fetchAgentStatus } from '../api/agentService';

export const useAgentStatus = (filters = {}) => {
  return useQuery({
    queryKey: ['agent-status', filters],
    queryFn: () => fetchAgentStatus(filters),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 2,
    select: (response) => response.data?.data || response.data
  });
};
