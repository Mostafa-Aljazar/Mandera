"use client";

import { useQuery } from "@tanstack/react-query";
import { getClientPipeline } from "@/actions/clientPipeline";

export function useClientPipeline(companyId?: string) {
  return useQuery({
    queryKey: ["client_pipeline", companyId],
    queryFn: async () => {
      const result = await getClientPipeline(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
