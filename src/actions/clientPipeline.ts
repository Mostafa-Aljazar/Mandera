"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface PipelineStatus {
  id: string;
  name_en: string;
  name_ar: string;
  priority_order: number | null;
  count: number;
}

/**
 * Dashboard pipeline counts via indexed HEAD counts — never downloads client rows.
 */
export async function getClientPipeline(
  companyId: string,
): Promise<ActionResult<{ statuses: PipelineStatus[]; totalClients: number }>> {
  const supabase = await getServerSupabase();

  const { data: statusesData, error: statusesError } = await supabase
    .from("client_statuses")
    .select("id, name_en, name_ar, priority_order")
    .eq("company_id", companyId)
    .order("priority_order");

  if (statusesError) return { error: statusesError.message };

  const statusesRows = statusesData ?? [];

  const [totalRes, ...perStatus] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    ...statusesRows.map((status) =>
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status_id", status.id),
    ),
  ]);

  if (totalRes.error) return { error: totalRes.error.message };
  for (const res of perStatus) {
    if (res.error) return { error: res.error.message };
  }

  const statuses: PipelineStatus[] = statusesRows.map((status, index) => ({
    id: status.id,
    name_en: status.name_en,
    name_ar: status.name_ar,
    priority_order: status.priority_order,
    count: perStatus[index]?.count ?? 0,
  }));

  return {
    data: {
      statuses,
      totalClients: totalRes.count ?? 0,
    },
  };
}
