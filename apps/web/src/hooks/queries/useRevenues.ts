"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRevenues,
  completeDeal,
  type RevenueFilters,
  type CompleteDealInput,
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
