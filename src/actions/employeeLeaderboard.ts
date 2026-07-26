"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface LeaderboardEmployee {
  id: string;
  name: string;
  clientsCount: number;
  propertiesCount: number;
  statusCounts: Record<string, number>;
}

export async function getEmployeeLeaderboard(
  companyId: string,
): Promise<ActionResult<LeaderboardEmployee[]>> {
  const supabase = await getServerSupabase();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"]);

  if (profilesError) return { error: profilesError.message };

  const results: LeaderboardEmployee[] = await Promise.all(
    (profiles ?? []).map(async (emp) => {
      const [{ data: clients }, { count: propertiesCount }] = await Promise.all([
        supabase.from("clients").select("id").eq("employee_id", emp.id),
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", emp.id),
      ]);

      const clientIds = (clients ?? []).map((c) => c.id);
      const statusCounts: Record<string, number> = {};

      if (clientIds.length > 0) {
        const { data: histories } = await supabase
          .from("client_status_history")
          .select("client_id, status:client_statuses(name)")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false });

        const clientCurrentStatus: Record<string, string> = {};
        (histories ?? []).forEach((h: any) => {
          if (!clientCurrentStatus[h.client_id]) {
            clientCurrentStatus[h.client_id] = h.status?.name || "Unknown";
          }
        });

        Object.values(clientCurrentStatus).forEach((status) => {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const clientsWithHistory = Object.keys(clientCurrentStatus).length;
        if (clientsWithHistory < clientIds.length) {
          statusCounts["__NEW__"] =
            (statusCounts["__NEW__"] || 0) + (clientIds.length - clientsWithHistory);
        }
      }

      return {
        id: emp.id,
        name: emp.name || emp.id,
        clientsCount: clientIds.length,
        propertiesCount: propertiesCount ?? 0,
        statusCounts,
      };
    }),
  );

  results.sort((a, b) => b.clientsCount - a.clientsCount);

  return { data: results };
}
