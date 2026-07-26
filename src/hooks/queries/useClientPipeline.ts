"use client";

import { useQuery } from "@tanstack/react-query";
import { getClientPipeline } from "@/actions/clientPipeline";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export function useClientPipeline(companyId?: string) {
  const query = useQuery({
    queryKey: ["client_pipeline", companyId],
    queryFn: async () => {
      const result = await getClientPipeline(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });

  const filter = companyId ? `company_id=eq.${companyId}` : undefined;
  useRealtimeInvalidate("client_statuses", ["client_pipeline", companyId], filter);
  useRealtimeInvalidate("client_status_history", ["client_pipeline", companyId], filter);
  useRealtimeInvalidate("clients", ["client_pipeline", companyId], filter);

  return query;
}
