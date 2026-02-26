import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgentStatus, fetchAgentConfigs, updateAgentConfig, fetchAgentResults } from '../api/agentService';

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
    staleTime: 5 * 1000
  });
};

export const useAgentResults = (agentKey) => {
  return useQuery({
    queryKey: ['agent-results', agentKey],
    queryFn: () => fetchAgentResults(agentKey),
    enabled: !!agentKey,
    staleTime: 30 * 1000,
    retry: 1,
    select: (response) => response.data?.data || response.data
  });
};

export const useUpdateAgentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }) => updateAgentConfig(key, data),
    onSuccess: (_response, { key, data }) => {
      // Optimistic cache update: immediately reflect saved data in cache
      queryClient.setQueryData(['agent-configs'], (old) => {
        if (!old?.data?.configs) return old;
        const exists = old.data.configs.some(c => c.agent_key === key);
        let configs;
        if (exists) {
          configs = old.data.configs.map(c =>
            c.agent_key === key ? { ...c, ...data, source: 'mongodb' } : c
          );
        } else {
          // First-time save: add new entry to cache
          configs = [...old.data.configs, { agent_key: key, ...data, source: 'mongodb' }];
        }
        return { ...old, data: { ...old.data, configs } };
      });
      // Force immediate refetch to replace optimistic data with server truth
      queryClient.invalidateQueries({ queryKey: ['agent-configs'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['agent-status'], refetchType: 'all' });
    }
  });
};
