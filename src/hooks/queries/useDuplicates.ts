"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  findDuplicateClients,
  findDuplicateOwners,
  findDuplicateProperties,
  mergeClients,
  mergeOwners,
  mergeProperties,
  type MergeDuplicatesInput,
} from "@/actions/duplicates";

type DuplicateType = "clients" | "owners" | "properties";

/**
 * Full-table scan per call — pass `enabled` so only the tab actually on screen
 * runs, and keep the result fresh for a while so tab-switching doesn't rescan.
 */
export function useDuplicates(
  type: DuplicateType,
  companyId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["duplicates", type, companyId],
    queryFn: async () => {
      const result =
        type === "clients"
          ? await findDuplicateClients(companyId!)
          : type === "owners"
            ? await findDuplicateOwners(companyId!)
            : await findDuplicateProperties(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!companyId,
    staleTime: 5 * 60_000,
  });
}

function useMergeDuplicates(
  mutationFn: (input: MergeDuplicatesInput) => ReturnType<typeof mergeClients>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["owners", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["properties", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["revenues", variables.companyId] });
    },
  });
}

export function useMergeClients() {
  return useMergeDuplicates(mergeClients);
}

export function useMergeOwners() {
  return useMergeDuplicates(mergeOwners);
}

export function useMergeProperties() {
  return useMergeDuplicates(mergeProperties);
}
