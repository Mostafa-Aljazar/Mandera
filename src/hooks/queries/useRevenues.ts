"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRevenues,
  completeDeal,
  updateRevenue,
  approveRevenue,
  rejectRevenue,
  markCommissionPaid,
  getRevenueChangeLog,
  type RevenueFilters,
  type CompleteDealInput,
  type UpdateRevenueInput,
} from "@/actions/revenues";

export function useRevenues(companyId?: string, filters: RevenueFilters = {}) {
  return useQuery({
    queryKey: ["revenues", companyId, filters],
    queryFn: async () => {
      const result = await getRevenues(companyId!, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCompleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteDealInput) => completeDeal(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["revenues", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

function useRevenueMutation<TVariables>(
  mutationFn: (variables: TVariables) => ReturnType<typeof approveRevenue>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_change_log"] });
    },
  });
}

export function useUpdateRevenue() {
  return useRevenueMutation(
    (variables: { id: string; companyId: string; input: UpdateRevenueInput }) =>
      updateRevenue(variables.id, variables.companyId, variables.input),
  );
}

export function useApproveRevenue() {
  return useRevenueMutation((variables: { id: string; companyId: string }) =>
    approveRevenue(variables.id, variables.companyId),
  );
}

export function useRejectRevenue() {
  return useRevenueMutation(
    (variables: { id: string; companyId: string; note: string }) =>
      rejectRevenue(variables.id, variables.companyId, variables.note),
  );
}

export function useMarkCommissionPaid() {
  return useRevenueMutation(
    (variables: { id: string; companyId: string; paid: boolean }) =>
      markCommissionPaid(variables.id, variables.companyId, variables.paid),
  );
}

export function useRevenueChangeLog(companyId?: string, revenueId?: string) {
  return useQuery({
    queryKey: ["revenue_change_log", companyId, revenueId],
    queryFn: async () => {
      const result = await getRevenueChangeLog(companyId!, revenueId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}
