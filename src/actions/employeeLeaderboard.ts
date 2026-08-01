"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canViewInsights, companyRolesFilter } from "@/lib/permissions";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface LeaderboardStatusCount {
  /** Stable key for React lists; `__NEW__` = clients with no status history. */
  key: string;
  name_en: string;
  name_ar: string;
  count: number;
}

export interface LeaderboardEmployee {
  id: string;
  /** Legacy profile.name fallback */
  name: string;
  name_en: string | null;
  name_ar: string | null;
  first_name_en: string | null;
  first_name_ar: string | null;
  last_name_en: string | null;
  last_name_ar: string | null;
  clientsCount: number;
  propertiesCount: number;
  /** Clients created and assigned to this employee in the last 30 days. */
  clientsAddedCount: number;
  /** Distinct assigned clients with status-history activity in the last 30 days. */
  clientsFollowedUpCount: number;
  /** Properties created and assigned to this employee in the last 30 days. */
  propertiesAddedCount: number;
  statusCounts: LeaderboardStatusCount[];
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
    .select(
      "id, name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
    )
    .eq("company_id", companyId)
    .in("role", companyRolesFilter());

  if (profilesError) return { error: profilesError.message };

  const results: LeaderboardEmployee[] = await Promise.all(
    (profiles ?? []).map(async (emp) => {
      const employeeRel = Array.isArray(emp.employee)
        ? emp.employee[0]
        : emp.employee;
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
      const statusByKey = new Map<
        string,
        { name_en: string; name_ar: string; count: number }
      >();
      let clientsFollowedUpCount = 0;

      if (clientIds.length > 0) {
        const { data: histories } = await supabase
          .from("client_status_history")
          .select(
            "client_id, created_at, status:client_statuses(id, name_en, name_ar)",
          )
          .in("client_id", clientIds)
          .order("created_at", { ascending: false });

        const clientCurrentStatus = new Map<
          string,
          { key: string; name_en: string; name_ar: string }
        >();
        const followedUp = new Set<string>();

        for (const h of histories ?? []) {
          const row = h as {
            client_id: string;
            created_at: string;
            status:
              | { id?: string; name_en?: string; name_ar?: string }
              | { id?: string; name_en?: string; name_ar?: string }[]
              | null;
          };
          if (!clientCurrentStatus.has(row.client_id)) {
            const status = Array.isArray(row.status) ? row.status[0] : row.status;
            const nameEn = status?.name_en?.trim() || status?.name_ar?.trim() || "";
            const nameAr = status?.name_ar?.trim() || status?.name_en?.trim() || "";
            const key = status?.id || `en:${nameEn || "unknown"}`;
            clientCurrentStatus.set(row.client_id, {
              key,
              name_en: nameEn,
              name_ar: nameAr,
            });
          }
          if (row.created_at >= cutoffIso) {
            followedUp.add(row.client_id);
          }
        }
        clientsFollowedUpCount = followedUp.size;

        for (const status of clientCurrentStatus.values()) {
          const existing = statusByKey.get(status.key);
          if (existing) {
            existing.count += 1;
          } else {
            statusByKey.set(status.key, {
              name_en: status.name_en,
              name_ar: status.name_ar,
              count: 1,
            });
          }
        }

        const clientsWithHistory = clientCurrentStatus.size;
        if (clientsWithHistory < clientIds.length) {
          statusByKey.set("__NEW__", {
            name_en: "New",
            name_ar: "جديد",
            count: clientIds.length - clientsWithHistory,
          });
        }
      }

      const statusCounts: LeaderboardStatusCount[] = [...statusByKey.entries()]
        .map(([key, value]) => ({
          key,
          name_en: value.name_en,
          name_ar: value.name_ar,
          count: value.count,
        }))
        .sort((a, b) => b.count - a.count || a.name_en.localeCompare(b.name_en));

      return {
        id: emp.id,
        name: emp.name || emp.id,
        name_en: emp.name_en ?? null,
        name_ar: emp.name_ar ?? null,
        first_name_en: employeeRel?.first_name_en ?? null,
        first_name_ar: employeeRel?.first_name_ar ?? null,
        last_name_en: employeeRel?.last_name_en ?? null,
        last_name_ar: employeeRel?.last_name_ar ?? null,
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
      b.clientsAddedCount +
        b.clientsFollowedUpCount +
        b.propertiesAddedCount -
        (a.clientsAddedCount +
          a.clientsFollowedUpCount +
          a.propertiesAddedCount) || b.clientsCount - a.clientsCount,
  );

  return { data: results };
}
