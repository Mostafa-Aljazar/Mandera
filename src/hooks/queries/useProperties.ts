"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProperties,
  getPropertiesPage,
  getProperty,
  getPropertiesForOwner,
  createProperty,
  updateProperty,
  updatePropertyDocuments,
  deleteProperty,
  updatePropertyStatus,
  getPropertyTypesForCompany,
  getOwnersForCompany,
  getCompanyEmployeesForCompany,
  getAreasDistrictsForCompany,
  getCompanyOperationsStats,
  type PropertyFilters,
  type CreatePropertyInput,
  type UpdatePropertyInput,
} from "@/actions/properties";

export function useProperties(companyId?: string, filters: PropertyFilters = {}) {
  return useQuery({
    queryKey: ["properties", companyId, filters],
    queryFn: async () => {
      const result = await getProperties(companyId!, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

/** Server-paginated list for the Properties page only. */
export function usePropertiesPage(
  companyId?: string,
  filters: PropertyFilters = {},
) {
  return useQuery({
    queryKey: ["properties", "page", companyId, filters],
    queryFn: async () => {
      const result = await getPropertiesPage(companyId!, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useProperty(id?: string) {
  return useQuery({
    queryKey: ["properties", "detail", id],
    queryFn: async () => {
      const result = await getProperty(id!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useOwnerProperties(ownerId?: string) {
  return useQuery({
    queryKey: ["properties", "by_owner", ownerId],
    queryFn: async () => {
      const result = await getPropertiesForOwner(ownerId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!ownerId,
  });
}

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

export function useOwnersLookup(companyId?: string) {
  return useQuery({
    queryKey: ["owners", "lookup", companyId],
    queryFn: async () => {
      const result = await getOwnersForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCompanyEmployeesLookup(companyId?: string) {
  return useQuery({
    queryKey: ["company_employees", "lookup", companyId],
    queryFn: async () => {
      const result = await getCompanyEmployeesForCompany(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCompanyOperationsStats(companyId?: string) {
  return useQuery({
    queryKey: ["company_operations_stats", companyId],
    queryFn: async () => {
      const result = await getCompanyOperationsStats(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useAreasDistrictsLookup(companyId?: string, emirate?: string) {
  return useQuery({
    queryKey: ["areas_districts", "lookup", companyId, emirate],
    queryFn: async () => {
      const result = await getAreasDistrictsForCompany(companyId!, emirate);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePropertyInput) => createProperty(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["properties", variables.companyId] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "pending-approvals", variables.companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pending-property-approvals", variables.companyId],
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePropertyInput) => updateProperty(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["properties", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["properties", "detail", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "pending-approvals", variables.companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pending-property-approvals", variables.companyId],
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdatePropertyDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      companyId,
      keepUrls,
      newFiles,
    }: {
      propertyId: string;
      companyId: string;
      keepUrls: string[];
      newFiles?: File[];
    }) => updatePropertyDocuments(propertyId, companyId, keepUrls, newFiles ?? []),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({
        queryKey: ["properties", "detail", variables.propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["properties", variables.companyId],
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdatePropertyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      companyId,
      newStatus,
      createdByUserId,
      createdByName,
      note,
    }: {
      propertyId: string;
      companyId: string;
      newStatus: string;
      createdByUserId: string;
      createdByName: string;
      note?: string;
    }) =>
      updatePropertyStatus(
        propertyId,
        companyId,
        newStatus,
        createdByUserId,
        createdByName,
        note,
      ),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["properties", variables.companyId] });
    },
  });
}
