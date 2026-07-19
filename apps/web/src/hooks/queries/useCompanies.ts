"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanies,
  getCompany,
  getCompanyDashboardStats,
  createCompany,
  updateCompany,
  renewCompanySubscription,
  toggleCompanyFreeze,
  deleteCompanyCascade,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@/actions/companies";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const result = await getCompanies();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCompany(id?: string) {
  return useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: async () => {
      const result = await getCompany(id!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCompanyDashboardStats() {
  return useQuery({
    queryKey: ["companies", "dashboard_stats"],
    queryFn: async () => {
      const result = await getCompanyDashboardStats();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => updateCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useRenewCompanySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newEndDate }: { id: string; newEndDate: string }) =>
      renewCompanySubscription(id, newEndDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useToggleCompanyFreeze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFrozen }: { id: string; isFrozen: boolean }) =>
      toggleCompanyFreeze(id, isFrozen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompanyCascade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => deleteCompanyCascade(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
