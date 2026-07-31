"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canViewInsights, companyRolesFilter } from "@/lib/permissions";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface LeaderboardEmployee {
  id: string;
  name: string;
  clientsCount: number;
  propertiesCount: number;
  /** Clients created and assigned to this employee in the last 30 days. */
  clientsAddedCount: number;
  /** Distinct assigned clients with status-history activity in the last 30 days. */
  clientsFollowedUpCount: number;
  /** Properties created and assigned to this employee in the last 30 days. */
  propertiesAddedCount: number;
  statusCounts: Record<string, number>;
}

export async function getEmployeeLeaderboard(
  companyId: string,
): Promise<ActionResult<LeaderboardEmployee[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canViewInsights(access.data.role)) {
    return { error: "Access denied" };
  }

  const supabase = await getServerSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("company_id", companyId)
    .in("role", companyRolesFilter());

  if (profilesError) return { error: profilesError.message };

  const results: LeaderboardEmployee[] = await Promise.all(
    (profiles ?? []).map(async (emp) => {
      const [
        { data: clients },
        { count: propertiesCount },
        { count: clientsAddedCount },
        { count: propertiesAddedCount },
      ] = await Promise.all([
        supabase.from("clients").select("id").eq("employee_id", emp.id),
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", emp.id),
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", emp.id)
          .gte("created_at", cutoffIso),
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", emp.id)
          .gte("created_at", cutoffIso),
      ]);

      const clientIds = (clients ?? []).map((c) => c.id);
      const statusCounts: Record<string, number> = {};
      let clientsFollowedUpCount = 0;

      if (clientIds.length > 0) {
        const { data: histories } = await supabase
          .from("client_status_history")
          .select("client_id, created_at, status:client_statuses(name_en, name_ar)")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false });

        const clientCurrentStatus: Record<string, string> = {};
        const followedUp = new Set<string>();
        (histories ?? []).forEach((h: any) => {
          if (!clientCurrentStatus[h.client_id]) {
            const status = Array.isArray(h.status) ? h.status[0] : h.status;
            clientCurrentStatus[h.client_id] =
              status?.name_en || status?.name_ar || "Unknown";
          }
          if (h.created_at >= cutoffIso) {
            followedUp.add(h.client_id);
          }
        });
        clientsFollowedUpCount = followedUp.size;

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
        clientsAddedCount: clientsAddedCount ?? 0,
        clientsFollowedUpCount,
        propertiesAddedCount: propertiesAddedCount ?? 0,
        statusCounts,
      };
    }),
  );

  results.sort(
    (a, b) =>
      b.clientsAddedCount + b.clientsFollowedUpCount + b.propertiesAddedCount -
      (a.clientsAddedCount + a.clientsFollowedUpCount + a.propertiesAddedCount) ||
      b.clientsCount - a.clientsCount,
  );

  return { data: results };
}
