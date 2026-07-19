"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export type HistoryEntityType = "owner" | "property" | "client";

export interface HistoryRecord {
  id: string;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  note: string | null;
  status: string | null;
  status_name?: string | null;
  follow_up_date?: string | null;
}

export async function getStatusHistory(
  entityType: HistoryEntityType,
  entityId: string,
  companyId: string,
): Promise<ActionResult<HistoryRecord[]>> {
  const supabase = await getServerSupabase();
  const table = `${entityType}_status_history`;
  const entityIdField =
    entityType === "owner" ? "owner_id" : entityType === "client" ? "client_id" : "property_id";

  const select =
    entityType === "owner"
      ? "*, status_ref:owner_statuses(name)"
      : entityType === "client"
        ? "*, status_ref:client_statuses(name)"
        : "*";

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("company_id", companyId)
    .eq(entityIdField, entityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };

  const rows: HistoryRecord[] = (data ?? []).map((h: any) => ({
    id: h.id,
    created_at: h.created_at,
    created_by: h.created_by,
    created_by_name: h.created_by_name,
    note: h.note,
    status: h.status,
    status_name: h.status_ref?.name,
    follow_up_date: h.follow_up_date ?? null,
  }));

  return { data: rows };
}

export async function deleteStatusHistoryRecord(
  entityType: HistoryEntityType,
  recordId: string,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const table = `${entityType}_status_history`;
  const { error } = await supabase.from(table).delete().eq("id", recordId);
  if (error) return { error: error.message };
  return { data: null };
}
