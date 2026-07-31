"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getPendingApprovalsCount,
} from "@/actions/notifications";
import { notifyStaleDraftProperties } from "@/actions/propertyApprovals";

export function useMyNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "mine"],
    queryFn: async () => {
      const result = await getMyNotifications();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const result = await getUnreadNotificationCount();
      if (result.error) throw new Error(result.error);
      return result.data ?? 0;
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function usePendingApprovalsCount(companyId?: string, enabled = true) {
  return useQuery({
    queryKey: ["notifications", "pending-approvals", companyId],
    queryFn: async () => {
      const result = await getPendingApprovalsCount(companyId!);
      if (result.error) throw new Error(result.error);
      return (
        result.data ?? {
          total: 0,
          newListings: 0,
          changeRequests: 0,
          statusChanges: 0,
        }
      );
    },
    enabled: !!companyId && enabled,
    refetchInterval: 30_000,
  });
}

/** Run once per company session for Admin/Manager — notifies about stale drafts. */
export function useStaleDraftNotificationCheck(
  companyId: string | undefined,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !enabled) return;
    if (ranFor.current === companyId) return;
    ranFor.current = companyId;

    void (async () => {
      const result = await notifyStaleDraftProperties(companyId);
      if (!result.error && (result.data?.notified ?? 0) > 0) {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    })();
  }, [companyId, enabled, queryClient]);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markNotificationRead(notificationId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsRead();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
