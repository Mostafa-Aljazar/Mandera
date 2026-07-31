"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPropertyPublications,
  getPortalCredentials,
  getPortalPublicConfig,
  upsertPortalCredentials,
  regenerateFeedToken,
  setPortalPublication,
  testPfConnection,
  type UpsertPortalCredentialsInput,
} from "@/actions/portalPublishing";
import type { Portal } from "@/types/supabase-entities.types";

export function usePropertyPublications(propertyId?: string) {
  return useQuery({
    queryKey: ["property_publications", propertyId],
    queryFn: async () => {
      const result = await getPropertyPublications(propertyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!propertyId,
  });
}

/** Full credentials incl. secrets, for this company's Settings screen
 *  (RLS-enforced: same company, any role can read; manager can write). */
export function usePortalCredentials(companyId?: string) {
  return useQuery({
    queryKey: ["portal_credentials", companyId],
    queryFn: async () => {
      const result = await getPortalCredentials(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

/** Non-secret per-platform config for this company's publish UI. */
export function usePortalPublicConfig(companyId?: string) {
  return useQuery({
    queryKey: ["portal_public_config", companyId],
    queryFn: async () => {
      const result = await getPortalPublicConfig(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useSetPortalPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      portal,
      enabled,
    }: {
      propertyId: string;
      portal: Portal;
      enabled: boolean;
    }) => setPortalPublication(propertyId, portal, enabled),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({
        queryKey: ["property_publications", variables.propertyId],
      });
    },
  });
}

export function useUpsertPortalCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertPortalCredentialsInput) => upsertPortalCredentials(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["portal_credentials", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["portal_public_config", variables.companyId] });
    },
  });
}

export function useRegenerateFeedToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => regenerateFeedToken(companyId),
    onSuccess: (result, companyId) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ["portal_credentials", companyId] });
    },
  });
}

export function useTestPfConnection() {
  return useMutation({
    mutationFn: (companyId: string) => testPfConnection(companyId),
  });
}
