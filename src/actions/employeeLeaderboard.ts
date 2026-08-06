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

  // Company-wide, batched fetch (4 queries total, independent of employee
  // count) instead of a per-employee round trip. `clients.status_id` is kept
  // in sync on every status change (see statusUpdate.ts), so "current status"
  // can be read straight off the client row — no need to replay
  // client_status_history to derive it.
  const [
    { data: profiles, error: profilesError },
    { data: clients, error: clientsError },
    { data: properties, error: propertiesError },
    { data: recentHistory, error: historyError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
      )
      .eq("company_id", companyId)
      .in("role", companyRolesFilter()),
    supabase
      .from("clients")
      .select(
        "id, employee_id, created_at, status:client_statuses(id, name_en, name_ar)",
      )
      .eq("company_id", companyId),
    supabase
      .from("properties")
      .select("id, employee_id, created_at")
      .eq("company_id", companyId),
    // Only need to know *which* clients had activity in the last 30 days.
    supabase
      .from("client_status_history")
      .select("client_id")
      .eq("company_id", companyId)
      .gte("created_at", cutoffIso),
  ]);

  if (profilesError) return { error: profilesError.message };
  if (clientsError) return { error: clientsError.message };
  if (propertiesError) return { error: propertiesError.message };
  if (historyError) return { error: historyError.message };

  const clientEmployeeMap = new Map<string, string | null>();
  for (const c of clients ?? []) clientEmployeeMap.set(c.id, c.employee_id);

  const followedUpByEmployee = new Map<string, Set<string>>();
  for (const row of recentHistory ?? []) {
    const employeeId = clientEmployeeMap.get(row.client_id);
    if (!employeeId) continue;
    const set = followedUpByEmployee.get(employeeId) ?? new Set<string>();
    set.add(row.client_id);
    followedUpByEmployee.set(employeeId, set);
  }

  interface ClientAgg {
    count: number;
    addedCount: number;
    statusByKey: Map<string, { name_en: string; name_ar: string; count: number }>;
  }
  const clientsByEmployee = new Map<string, ClientAgg>();
  for (const c of clients ?? []) {
    if (!c.employee_id) continue;
    const agg =
      clientsByEmployee.get(c.employee_id) ??
      { count: 0, addedCount: 0, statusByKey: new Map() };
    agg.count += 1;
    if (c.created_at >= cutoffIso) agg.addedCount += 1;

    const status = Array.isArray(c.status) ? c.status[0] : c.status;
    const isNew = !status;
    const key = isNew ? "__NEW__" : status?.id || "__NEW__";
    const nameEn = isNew
      ? "New"
      : status?.name_en?.trim() || status?.name_ar?.trim() || "";
    const nameAr = isNew
      ? "جديد"
      : status?.name_ar?.trim() || status?.name_en?.trim() || "";
    const existing = agg.statusByKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      agg.statusByKey.set(key, { name_en: nameEn, name_ar: nameAr, count: 1 });
    }

    clientsByEmployee.set(c.employee_id, agg);
  }

  interface PropertyAgg {
    count: number;
    addedCount: number;
  }
  const propertiesByEmployee = new Map<string, PropertyAgg>();
  for (const p of properties ?? []) {
    if (!p.employee_id) continue;
    const agg = propertiesByEmployee.get(p.employee_id) ?? { count: 0, addedCount: 0 };
    agg.count += 1;
    if (p.created_at >= cutoffIso) agg.addedCount += 1;
    propertiesByEmployee.set(p.employee_id, agg);
  }

  const results: LeaderboardEmployee[] = (profiles ?? []).map((emp) => {
    const employeeRel = Array.isArray(emp.employee)
      ? emp.employee[0]
      : emp.employee;
    const clientAgg = clientsByEmployee.get(emp.id);
    const propertyAgg = propertiesByEmployee.get(emp.id);
    const followedUp = followedUpByEmployee.get(emp.id);

    const statusCounts: LeaderboardStatusCount[] = clientAgg
      ? [...clientAgg.statusByKey.entries()]
          .map(([key, value]) => ({
            key,
            name_en: value.name_en,
            name_ar: value.name_ar,
            count: value.count,
          }))
          .sort((a, b) => b.count - a.count || a.name_en.localeCompare(b.name_en))
      : [];

    return {
      id: emp.id,
      name: emp.name || emp.id,
      name_en: emp.name_en ?? null,
      name_ar: emp.name_ar ?? null,
      first_name_en: employeeRel?.first_name_en ?? null,
      first_name_ar: employeeRel?.first_name_ar ?? null,
      last_name_en: employeeRel?.last_name_en ?? null,
      last_name_ar: employeeRel?.last_name_ar ?? null,
      clientsCount: clientAgg?.count ?? 0,
      propertiesCount: propertyAgg?.count ?? 0,
      clientsAddedCount: clientAgg?.addedCount ?? 0,
      clientsFollowedUpCount: followedUp?.size ?? 0,
      propertiesAddedCount: propertyAgg?.addedCount ?? 0,
      statusCounts,
    };
  });

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
