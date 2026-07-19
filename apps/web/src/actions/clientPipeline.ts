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

  (clientsData ?? []).forEach((client) => {
    if (!client.status_id) return;
    statusCounts.set(client.status_id, (statusCounts.get(client.status_id) ?? 0) + 1);
    totalClients++;
  });

  // Legacy fallback for rows created before status_id was synced on clients.
  const clientsMissingStatus = (clientsData ?? []).filter((client) => !client.status_id);
  if (clientsMissingStatus.length > 0) {
    const { data: historyData, error: historyError } = await supabase
      .from("client_status_history")
      .select("client_id, status_id")
      .eq("company_id", companyId)
      .in(
        "client_id",
        clientsMissingStatus.map((client) => client.id),
      )
      .order("created_at", { ascending: false });

    if (historyError) return { error: historyError.message };

    const latestStatusMap = new Map<string, string | null>();
    (historyData ?? []).forEach((history) => {
      if (!latestStatusMap.has(history.client_id)) {
        latestStatusMap.set(history.client_id, history.status_id);
      }
    });

    clientsMissingStatus.forEach((client) => {
      const statusId = latestStatusMap.get(client.id);
      if (!statusId) return;
      statusCounts.set(statusId, (statusCounts.get(statusId) ?? 0) + 1);
      totalClients++;
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
