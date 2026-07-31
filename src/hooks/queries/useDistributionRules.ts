"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClientDistributionRules,
  upsertClientDistributionRule,
  deleteClientDistributionRule,
} from "@/actions/distributionRules";

export function useClientDistributionRules(companyId?: string) {
  return useQuery({
    queryKey: ["client_distribution_rules", companyId],
    queryFn: async () => {
      const result = await getClientDistributionRules(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useUpsertClientDistributionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertClientDistributionRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_distribution_rules"] });
    },
  });
}

export function useDeleteClientDistributionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      deleteClientDistributionRule(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_distribution_rules"] });
    },
  });
}
