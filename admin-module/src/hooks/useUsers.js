import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../api/userService.js';

export function useUserList(filters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.list(filters),
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useUserDetail(id) {
  return useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => userService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000
  });
}

export function useUserCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

export function useUserUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => userService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', variables.id] });
    }
  });
}

export function useUserDeactivate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => userService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

export function useUserDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => userService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

export function useUserResetPassword() {
  return useMutation({
    mutationFn: (id) => userService.resetPassword(id)
  });
}
