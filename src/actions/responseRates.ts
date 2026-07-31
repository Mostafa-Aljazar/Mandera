"use server";

import { assertCompanyMember } from "@/actions/_access";
import { getServerSupabase } from "@/lib/supabase/server";
import { canViewInsights } from "@/lib/permissions";

type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export interface EmployeeResponseRate {
  employee_id: string;
  name: string | null;
  first_name_en: string | null;
  first_name_ar: string | null;
  last_name_en: string | null;
  last_name_ar: string | null;
  total_assigned: number;
  responded: number;
  rate: number;
}

export async function getEmployeeResponseRates(
  companyId: string,
): Promise<ActionResult<EmployeeResponseRate[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewInsights(access.data.role)) return { error: "Access denied" };

  const supabase = await getServerSupabase();
  const [profilesResult, clientsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
      )
      .eq("company_id", companyId)
      .in("role", ["sales_agent", "administrator", "manager"])
      .order("name"),
    supabase
      .from("clients")
      .select("id, employee_id")
      .eq("company_id", companyId),
  ]);
  if (profilesResult.error) return { error: profilesResult.error.message };
  if (clientsResult.error) return { error: clientsResult.error.message };

  const clientIds = (clientsResult.data ?? []).map((client) => client.id);
  const respondedIds = new Set<string>();
  if (clientIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const { data, error } = await supabase
      .from("client_status_history")
      .select("client_id")
      .eq("company_id", companyId)
      .gte("created_at", cutoff.toISOString())
      .in("client_id", clientIds);
    if (error) return { error: error.message };
    for (const row of data ?? []) respondedIds.add(row.client_id);
  }

  const clientsByEmployee = new Map<string, string[]>();
  for (const client of clientsResult.data ?? []) {
    if (!client.employee_id) continue;
    const assigned = clientsByEmployee.get(client.employee_id) ?? [];
    assigned.push(client.id);
    clientsByEmployee.set(client.employee_id, assigned);
  }

  const rates = (profilesResult.data ?? []).map((profile) => {
    const assigned = clientsByEmployee.get(profile.id) ?? [];
    const responded = assigned.filter((id) => respondedIds.has(id)).length;
    const employee = Array.isArray(profile.employee)
      ? profile.employee[0]
      : profile.employee;
    return {
      employee_id: profile.id,
      name: profile.name,
      first_name_en: employee?.first_name_en ?? null,
      first_name_ar: employee?.first_name_ar ?? null,
      last_name_en: employee?.last_name_en ?? null,
      last_name_ar: employee?.last_name_ar ?? null,
      total_assigned: assigned.length,
      responded,
      rate: assigned.length === 0 ? 0 : Math.round((responded / assigned.length) * 100),
    };
  });

  return { data: rates.sort((a, b) => b.rate - a.rate) };
}
