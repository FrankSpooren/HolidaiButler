import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgentStatus, fetchAgentConfigs, updateAgentConfig } from '../api/agentService';

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

export const useAgentConfigs = () => {
  return useQuery({
    queryKey: ['agent-configs'],
    queryFn: fetchAgentConfigs,
    staleTime: 60 * 1000
  });
};

export const useUpdateAgentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }) => updateAgentConfig(key, data),
    onSuccess: (_response, { key, data }) => {
      // Optimistic cache update: immediately reflect saved data in cache
      // This prevents stale data when dialog is closed and reopened before refetch completes
      queryClient.setQueryData(['agent-configs'], (old) => {
        if (!old?.data?.configs) return old;
        const configs = old.data.configs.map(c =>
          c.agent_key === key ? { ...c, ...data, source: 'mongodb' } : c
        );
        return { ...old, data: { ...old.data, configs } };
      });
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    }
  });
};
