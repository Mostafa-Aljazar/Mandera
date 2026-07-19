"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyEmployees,
  getBaseEmployees,
  getBaseEmployee,
  getEmployeeCount,
  createEmployee,
  updateEmployee,
  updateEmployeeDisabled,
  updateBaseEmployee,
  deleteEmployeeWorkflow,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type EmployeeToDelete,
  type ReassignmentTargets,
} from "@/actions/employees";

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
    mutationFn: ({ employeeId, disabled }: { employeeId: string; disabled: boolean }) =>
      updateEmployeeDisabled(employeeId, disabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
    },
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
      input: { first_name: string; last_name: string; email: string };
    }) => updateBaseEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["base_employees"] });
    },
  });
}

export function useDeleteEmployeeWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeToDelete,
      targets,
    }: {
      employeeToDelete: EmployeeToDelete;
      targets: ReassignmentTargets;
    }) => deleteEmployeeWorkflow(employeeToDelete, targets),
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
