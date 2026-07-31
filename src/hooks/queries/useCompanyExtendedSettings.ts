"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCompanyBranch,
  deleteCompanyTeam,
  deleteMessageTemplate,
  getCompanyBranches,
  getCompanyJsonSettings,
  getCompanyTeams,
  getMessageTemplates,
  updateCompanyJsonSettings,
  upsertCompanyBranch,
  upsertCompanyTeam,
  upsertMessageTemplate,
} from "@/actions/companyExtendedSettings";

function unwrap<T>(result: { data?: T; error?: string }): T {
  if (result.error) throw new Error(result.error);
  return result.data as T;
}

export function useCompanyTeams(companyId?: string) {
  return useQuery({
    queryKey: ["company-teams", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => unwrap(await getCompanyTeams(companyId!)),
  });
}

export function useUpsertCompanyTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertCompanyTeam,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["company-teams"] }),
  });
}

export function useDeleteCompanyTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      deleteCompanyTeam(id, companyId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["company-teams"] }),
  });
}

export function useCompanyBranches(companyId?: string) {
  return useQuery({
    queryKey: ["company-branches", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => unwrap(await getCompanyBranches(companyId!)),
  });
}

export function useUpsertCompanyBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertCompanyBranch,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["company-branches"] }),
  });
}

export function useDeleteCompanyBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      deleteCompanyBranch(id, companyId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["company-branches"] }),
  });
}

export function useMessageTemplates(companyId?: string) {
  return useQuery({
    queryKey: ["message-templates", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => unwrap(await getMessageTemplates(companyId!)),
  });
}

export function useUpsertMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertMessageTemplate,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["message-templates"] }),
  });
}

export function useDeleteMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      deleteMessageTemplate(id, companyId),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["message-templates"] }),
  });
}

export function useCompanyJsonSettings(companyId?: string) {
  return useQuery({
    queryKey: ["company-json-settings", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => unwrap(await getCompanyJsonSettings(companyId!)),
  });
}

export function useUpdateCompanyJsonSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      patch,
    }: {
      companyId: string;
      patch: Parameters<typeof updateCompanyJsonSettings>[1];
    }) => updateCompanyJsonSettings(companyId, patch),
    onSuccess: (_, variables) =>
      void qc.invalidateQueries({
        queryKey: ["company-json-settings", variables.companyId],
      }),
  });
}
