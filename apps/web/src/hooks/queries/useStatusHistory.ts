"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStatusHistory,
  deleteStatusHistoryRecord,
  type HistoryEntityType,
} from "@/actions/statusHistory";

export function useStatusHistory(
  entityType: HistoryEntityType,
  entityId?: string,
  companyId?: string,
) {
  return useQuery({
    queryKey: ["status_history", entityType, entityId, companyId],
    queryFn: async () => {
      const result = await getStatusHistory(entityType, entityId!, companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!entityId && !!companyId,
  });
}

export function useDeleteStatusHistoryRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      recordId,
    }: {
      entityType: HistoryEntityType;
      recordId: string;
    }) => deleteStatusHistoryRecord(entityType, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["status_history"] });
    },
  });
}
