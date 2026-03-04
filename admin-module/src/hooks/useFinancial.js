import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialService } from '../api/financialService.js';

export function useFinancialDashboard(destinationId, from, to) {
  return useQuery({
    queryKey: ['financial-dashboard', destinationId, from, to],
    queryFn: () => financialService.getDashboard(destinationId, from, to),
    enabled: !!destinationId,
    staleTime: 60 * 1000
  });
}

export function useFinancialMonthlyReport(destinationId, year) {
  return useQuery({
    queryKey: ['financial-monthly', destinationId, year],
    queryFn: () => financialService.getMonthlyReport(destinationId, year),
    enabled: !!destinationId,
    staleTime: 60 * 1000
  });
}

export function useSettlementList(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['settlements', destinationId, filters],
    queryFn: () => financialService.getSettlements(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useSettlementDetail(id, destinationId) {
  return useQuery({
    queryKey: ['settlement-detail', id, destinationId],
    queryFn: () => financialService.getSettlementById(id, destinationId),
    enabled: !!id && !!destinationId,
    staleTime: 30 * 1000
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => financialService.createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useApproveSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => financialService.approveSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-detail'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useCancelSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => financialService.cancelSettlement(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-detail'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function usePayoutList(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['payouts', destinationId, filters],
    queryFn: () => financialService.getPayouts(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidReference }) => financialService.markPayoutPaid(id, paidReference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-detail'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useMarkPayoutFailed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, failureReason }) => financialService.markPayoutFailed(id, failureReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useCreditNoteList(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['credit-notes', destinationId, filters],
    queryFn: () => financialService.getCreditNotes(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => financialService.createCreditNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useFinalizeCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => financialService.finalizeCreditNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
    }
  });
}

export function useFinancialAuditLog(destinationId, filters = {}) {
  return useQuery({
    queryKey: ['financial-audit', destinationId, filters],
    queryFn: () => financialService.getAuditLog(destinationId, filters),
    enabled: !!destinationId,
    staleTime: 30 * 1000,
    keepPreviousData: true
  });
}
