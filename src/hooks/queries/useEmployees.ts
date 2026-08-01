"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyEmployees,
  getCompanyEmployee,
  getBaseEmployees,
  getBaseEmployee,
  getEmployeeCount,
  createEmployee,
  updateEmployee,
  updateEmployeeDisabled,
  updateBaseEmployee,
  deleteEmployeeWorkflow,
  resetEmployeePassword,
  getEmployeeAssignmentCounts,
} from "@/actions/employees";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeToDelete,
  ReassignmentTargets,
} from "@/actions/employee-types";

export function useCompanyEmployees(companyId?: string) {
  return useQuery({
    queryKey: ["company_employees", companyId],
    queryFn: async () => {
      const result = await getCompanyEmployees(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCompanyEmployee(profileId?: string, companyId?: string) {
  return useQuery({
    queryKey: ["company_employees", "detail", profileId, companyId],
    queryFn: async () => {
      const result = await getCompanyEmployee(profileId!, companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!profileId && !!companyId,
  });
}

export function useBaseEmployees(companyId?: string) {
  return useQuery({
    queryKey: ["base_employees", companyId],
    queryFn: async () => {
      const result = await getBaseEmployees(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useBaseEmployee(id?: string) {
  return useQuery({
    queryKey: ["base_employees", "detail", id],
    queryFn: async () => {
      const result = await getBaseEmployee(id!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useEmployeeCount(companyId?: string) {
  return useQuery({
    queryKey: ["employee_count", companyId],
    queryFn: async () => {
      const result = await getEmployeeCount(companyId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["company_employees", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["base_employees", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["employee_count", variables.companyId] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => updateEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_employees"] });
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
    },
  });
}

export function useUpdateEmployeeDisabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      disabled,
      companyId,
      targets,
    }: {
      employeeId: string;
      disabled: boolean;
      companyId?: string;
      targets?: ReassignmentTargets;
    }) => updateEmployeeDisabled(employeeId, disabled, companyId, targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
      queryClient.invalidateQueries({ queryKey: ["company_employees"] });
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useResetEmployeePassword() {
  return useMutation({
    mutationFn: ({
      profileId,
      companyId,
      newPassword,
    }: {
      profileId: string;
      companyId: string;
      newPassword: string;
    }) => resetEmployeePassword(profileId, companyId, newPassword),
  });
}

export function useUpdateBaseEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        first_name_en: string;
        first_name_ar: string;
        last_name_en: string;
        last_name_ar: string;
        email: string;
      };
    }) => updateBaseEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
      queryClient.invalidateQueries({ queryKey: ["company_employees"] });
    },
  });
}

export function useDeleteEmployeeWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeToDelete,
      targets,
      companyId,
    }: {
      employeeToDelete: EmployeeToDelete;
      targets: ReassignmentTargets;
      companyId: string;
    }) => deleteEmployeeWorkflow(employeeToDelete, targets, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_employees"] });
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee_count"] });
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useEmployeeAssignmentCounts(
  profileId?: string,
  companyId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["employee_assignment_counts", profileId, companyId],
    queryFn: async () => {
      const result = await getEmployeeAssignmentCounts(profileId!, companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!profileId && !!companyId,
  });
}
