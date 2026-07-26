"use client";

import { useQuery } from "@tanstack/react-query";
import { getEmployeeLeaderboard } from "@/actions/employeeLeaderboard";

export function useEmployeeLeaderboard(companyId?: string) {
  return useQuery({
    queryKey: ["employee_leaderboard", companyId],
    queryFn: async () => {
      const result = await getEmployeeLeaderboard(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}
