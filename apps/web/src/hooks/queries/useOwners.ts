"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOwners,
  getOwnerStatusesForCompany,
  getMarketingChannelsForCompany,
  getOwnerPropertyCount,
  getOwnerLatestStatus,
  createOwner,
  updateOwner,
  deleteOwner,
  bulkReassignOwners,
  getOwnersExportData,
  type OwnerFilters,
  type CreateOwnerInput,
  type UpdateOwnerInput,
} from "@/actions/owners";

export function useOwners(companyId?: string, filters: OwnerFilters = {}) {
  return useQuery({
    queryKey: ["owners", companyId, filters],
    queryFn: async () => {
      const result = await getOwners(companyId!, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useOwnerStatuses(companyId?: string) {
  return useQuery({
    queryKey: ["owner_statuses", companyId],
    queryFn: async () => {
      const result = await getOwnerStatusesForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useMarketingChannels(companyId?: string) {
  return useQuery({
    queryKey: ["marketing_channels", companyId],
    queryFn: async () => {
      const result = await getMarketingChannelsForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useOwnerPropertyCount(ownerId?: string) {
  return useQuery({
    queryKey: ["owners", "property_count", ownerId],
    queryFn: async () => {
      const result = await getOwnerPropertyCount(ownerId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!ownerId,
  });
}

export function useOwnerLatestStatus(ownerId?: string, companyId?: string) {
  return useQuery({
    queryKey: ["owners", "latest_status", ownerId, companyId],
    queryFn: async () => {
      const result = await getOwnerLatestStatus(ownerId!, companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!ownerId && !!companyId,
  });
}

export function useOwnersExport(companyId?: string) {
  return useQuery({
    queryKey: ["owners", "export", companyId],
    queryFn: async () => {
      const result = await getOwnersExportData(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: false,
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOwnerInput) => createOwner(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["owners", variables.companyId] });
    },
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOwnerInput) => updateOwner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOwner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}

export function useBulkReassignOwners() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ownerIds,
      targetEmployeeId,
    }: {
      ownerIds: string[];
      targetEmployeeId: string;
    }) => bulkReassignOwners(ownerIds, targetEmployeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
    },
  });
}
