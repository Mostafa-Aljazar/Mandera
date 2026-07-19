"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface PipelineStatus {
  id: string;
  name: string;
  priority_order: number | null;
  count: number;
}

export async function getClientPipeline(
  companyId: string,
): Promise<ActionResult<{ statuses: PipelineStatus[]; totalClients: number }>> {
  const supabase = await getServerSupabase();

  const [{ data: statusesData, error: statusesError }, { data: clientsData, error: clientsError }] =
    await Promise.all([
      supabase
        .from("client_statuses")
        .select("id, name, priority_order")
        .eq("company_id", companyId)
        .order("priority_order"),
      supabase.from("clients").select("id, status_id").eq("company_id", companyId),
    ]);

  if (statusesError) return { error: statusesError.message };
  if (clientsError) return { error: clientsError.message };

  const statusCounts = new Map<string, number>();
  let totalClients = 0;

  const clientsWithStatus = (clientsData ?? []).filter((c) => c.status_id);

  if (clientsWithStatus.length > 0) {
    clientsWithStatus.forEach((c) => {
      statusCounts.set(c.status_id!, (statusCounts.get(c.status_id!) ?? 0) + 1);
      totalClients++;
    });
  } else {
    // Fallback: derive each client's latest status from history, matching
    // the original PocketBase-era behavior when status_id isn't set directly.
    const { data: historyData, error: historyError } = await supabase
      .from("client_status_history")
      .select("client_id, status_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (historyError) return { error: historyError.message };

    const latestStatusMap = new Map<string, string | null>();
    (historyData ?? []).forEach((h) => {
      if (!latestStatusMap.has(h.client_id)) latestStatusMap.set(h.client_id, h.status_id);
    });

    (clientsData ?? []).forEach((c) => {
      const statusId = latestStatusMap.get(c.id);
      if (statusId) {
        statusCounts.set(statusId, (statusCounts.get(statusId) ?? 0) + 1);
        totalClients++;
      }
    });
  }

  const statuses: PipelineStatus[] = (statusesData ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    priority_order: s.priority_order,
    count: statusCounts.get(s.id) ?? 0,
  }));

  return { data: { statuses, totalClients } };
}
