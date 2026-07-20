"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClient,
  getClients,
  getClientStatusesForCompany,
  createClient,
  updateClient,
  updateClientFollowUp,
  bulkAssignClients,
  getClientsExportData,
  getClientsBySource,
  getUpcomingFollowUps,
  getClientStatusHistory,
  addClientStatus,
  type ClientFilters,
  type CreateClientInput,
  type UpdateClientInput,
  type BulkAssignInput,
  type ClientsBySourceFilters,
  type AddClientStatusInput,
} from "@/actions/clients";

export function useClient(clientId?: string, companyId?: string) {
  return useQuery({
    queryKey: ["clients", "detail", clientId, companyId],
    queryFn: async () => {
      const result = await getClient(clientId!, companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!clientId && !!companyId,
  });
}

export function useClients(companyId?: string, filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ["clients", companyId, filters],
    queryFn: async () => {
      const result = await getClients(companyId!, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useClientStatuses(companyId?: string) {
  return useQuery({
    queryKey: ["client_statuses", companyId],
    queryFn: async () => {
      const result = await getClientStatusesForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useClientsBySource(companyId?: string, filters?: ClientsBySourceFilters) {
  return useQuery({
    queryKey: ["clients", "by_source", companyId, filters],
    queryFn: async () => {
      const result = await getClientsBySource(companyId!, filters!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId && !!filters,
  });
}

export function useUpcomingFollowUps(companyId?: string, restrictToEmployeeId?: string) {
  return useQuery({
    queryKey: ["clients", "follow_ups", companyId, restrictToEmployeeId],
    queryFn: async () => {
      const result = await getUpcomingFollowUps(companyId!, restrictToEmployeeId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useClientStatusHistory(clientId?: string) {
  return useQuery({
    queryKey: ["clients", "status_history", clientId],
    queryFn: async () => {
      const result = await getClientStatusHistory(clientId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["clients", variables.companyId] });
      if (result.data?.id) {
        queryClient.invalidateQueries({
          queryKey: ["clients", "detail", result.data.id],
        });
      }
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => updateClient(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({
        queryKey: ["clients", "detail", variables.id],
      });
    },
  });
}

export function useUpdateClientFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      followUpDate,
      followUpTime,
    }: {
      id: string;
      followUpDate: string | null;
      followUpTime: string | null;
    }) => updateClientFollowUp(id, followUpDate, followUpTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useBulkAssignClients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAssignInput) => bulkAssignClients(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useAddClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddClientStatusInput) => addClientStatus(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({
        queryKey: ["clients", "status_history", variables.clientId],
      });
    },
  });
}

export { getClientsExportData };
