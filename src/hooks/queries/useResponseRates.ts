"use client";

import { useQuery } from "@tanstack/react-query";
import { getEmployeeResponseRates } from "@/actions/responseRates";

export function useEmployeeResponseRates(companyId?: string) {
  return useQuery({
    queryKey: ["employee-response-rates", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const result = await getEmployeeResponseRates(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });
}
