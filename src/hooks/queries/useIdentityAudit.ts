"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  correctIdentityField,
  findIdentityEntity,
  listIdentityFieldAudit,
  type CorrectIdentityFieldInput,
} from "@/actions/identityAudit";

export function useIdentityFieldAudit(companyId: string | undefined) {
  return useQuery({
    queryKey: ["identity-field-audit", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const result = await listIdentityFieldAudit({
        companyId: companyId!,
        limit: 25,
      });
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });
}

export function useFindIdentityEntity() {
  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      entityType: "client" | "owner";
      query: string;
    }) => {
      const result = await findIdentityEntity(input);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });
}

export function useCorrectIdentityField(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CorrectIdentityFieldInput) => {
      const result = await correctIdentityField(input);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      if (companyId) {
        void queryClient.invalidateQueries({
          queryKey: ["identity-field-audit", companyId],
        });
      }
    },
  });
}
