"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPropertyTypesForCompany } from "@/actions/properties";
import { getOwnerStatusesForCompany } from "@/actions/owners";
import { getClientStatusesForCompany } from "@/actions/clients";
import {
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
  createClientStatus,
  updateClientStatus,
  updateClientStatusPriority,
  deleteClientStatus,
  createOwnerStatus,
  updateOwnerStatus,
  deleteOwnerStatus,
  getMarketingChannels,
  createMarketingChannel,
  updateMarketingChannel,
  deleteMarketingChannel,
  createAreaDistrict,
  updateAreaDistrict,
  deleteAreaDistrict,
  getCompanyEmployeesWithDetails,
} from "@/actions/settings";
import { getAreasDistrictsForCompany } from "@/actions/properties";

// --- Property Types ---

export function usePropertyTypes(companyId?: string) {
  return useQuery({
    queryKey: ["property_types", companyId],
    queryFn: async () => {
      const result = await getPropertyTypesForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCreatePropertyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, name }: { companyId: string; name: string }) =>
      createPropertyType(companyId, name),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["property_types", variables.companyId] });
    },
  });
}

export function useUpdatePropertyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updatePropertyType(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_types"] });
    },
  });
}

export function useDeletePropertyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePropertyType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_types"] });
    },
  });
}

// --- Client Statuses ---

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

export function useCreateClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      name,
      priorityOrder,
    }: {
      companyId: string;
      name: string;
      priorityOrder: number;
    }) => createClientStatus(companyId, name, priorityOrder),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_statuses", variables.companyId] });
    },
  });
}

export function useUpdateClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      priorityOrder,
    }: {
      id: string;
      name: string;
      priorityOrder: number;
    }) => updateClientStatus(id, name, priorityOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_statuses"] });
    },
  });
}

export function useUpdateClientStatusPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priorityOrder }: { id: string; priorityOrder: number }) =>
      updateClientStatusPriority(id, priorityOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_statuses"] });
    },
  });
}

export function useDeleteClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClientStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_statuses"] });
    },
  });
}

// --- Owner Statuses ---

export function useOwnerStatusesSettings(companyId?: string) {
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

export function useCreateOwnerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, name }: { companyId: string; name: string }) =>
      createOwnerStatus(companyId, name),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner_statuses", variables.companyId] });
    },
  });
}

export function useUpdateOwnerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateOwnerStatus(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner_statuses"] });
    },
  });
}

export function useDeleteOwnerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOwnerStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner_statuses"] });
    },
  });
}

// --- Marketing Channels ---

export function useMarketingChannelsSettings(companyId?: string) {
  return useQuery({
    queryKey: ["marketing_channels", companyId],
    queryFn: async () => {
      const result = await getMarketingChannels(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCreateMarketingChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, name }: { companyId: string; name: string }) =>
      createMarketingChannel(companyId, name),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["marketing_channels", variables.companyId] });
    },
  });
}

export function useUpdateMarketingChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateMarketingChannel(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_channels"] });
    },
  });
}

export function useDeleteMarketingChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMarketingChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_channels"] });
    },
  });
}

// --- Areas & Districts ---

export function useAreasDistricts(companyId?: string, emirate?: string) {
  return useQuery({
    queryKey: ["areas_districts", companyId, emirate],
    queryFn: async () => {
      const result = await getAreasDistrictsForCompany(companyId!, emirate);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId && !!emirate,
  });
}

export function useCreateAreaDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      emirate,
      name,
      description,
    }: {
      companyId: string;
      emirate: string;
      name: string;
      description?: string;
    }) => createAreaDistrict(companyId, emirate, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas_districts"] });
    },
  });
}

export function useUpdateAreaDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description?: string }) =>
      updateAreaDistrict(id, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas_districts"] });
    },
  });
}

export function useDeleteAreaDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAreaDistrict(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas_districts"] });
    },
  });
}

// --- Employees (read-only, Settings "Employees" tab) ---

export function useSettingsEmployees(companyId?: string) {
  return useQuery({
    queryKey: ["employees", "settings", companyId],
    queryFn: async () => {
      const result = await getCompanyEmployeesWithDetails(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}
