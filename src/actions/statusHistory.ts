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

export interface EmployeeActivityRecord extends HistoryRecord {
  entity_type: HistoryEntityType;
  entity_id: string | null;
  entity_label: string | null;
}

/** Status updates authored by this employee (profile id) across owners, clients, and properties. */
export async function getEmployeeActivity(
  profileId: string,
  companyId: string,
): Promise<ActionResult<EmployeeActivityRecord[]>> {
  const supabase = await getServerSupabase();

  const [ownersRes, clientsRes, propertiesRes] = await Promise.all([
    supabase
      .from("owner_status_history")
      .select("*, status_ref:owner_statuses(name), owner:owners(id, name)")
      .eq("company_id", companyId)
      .eq("created_by", profileId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("client_status_history")
      .select("*, status_ref:client_statuses(name), client:clients(id, name)")
      .eq("company_id", companyId)
      .or(`created_by.eq.${profileId},employee_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("property_status_history")
      .select("*, property:properties(id, code, title)")
      .eq("company_id", companyId)
      .eq("created_by", profileId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (ownersRes.error) return { error: ownersRes.error.message };
  if (clientsRes.error) return { error: clientsRes.error.message };
  if (propertiesRes.error) return { error: propertiesRes.error.message };

  const fromOwners: EmployeeActivityRecord[] = (ownersRes.data ?? []).map(
    (h: any) => ({
      id: h.id,
      created_at: h.created_at,
      created_by: h.created_by,
      created_by_name: h.created_by_name,
      note: h.note,
      status: h.status,
      status_name: h.status_ref?.name ?? null,
      follow_up_date: h.follow_up_date ?? null,
      entity_type: "owner" as const,
      entity_id: h.owner_id ?? h.owner?.id ?? null,
      entity_label: h.owner?.name ?? null,
    }),
  );

  const fromClients: EmployeeActivityRecord[] = (clientsRes.data ?? []).map(
    (h: any) => ({
      id: h.id,
      created_at: h.created_at,
      created_by: h.created_by,
      created_by_name: h.created_by_name,
      note: h.note,
      status: h.status,
      status_name: h.status_ref?.name ?? null,
      follow_up_date: h.follow_up_date ?? null,
      entity_type: "client" as const,
      entity_id: h.client_id ?? h.client?.id ?? null,
      entity_label: h.client?.name ?? null,
    }),
  );

  const fromProperties: EmployeeActivityRecord[] = (
    propertiesRes.data ?? []
  ).map((h: any) => ({
    id: h.id,
    created_at: h.created_at,
    created_by: h.created_by,
    created_by_name: h.created_by_name,
    note: h.note,
    status: h.status,
    status_name: h.status ?? null,
    follow_up_date: null,
    entity_type: "property" as const,
    entity_id: h.property_id ?? h.property?.id ?? null,
    entity_label:
      h.property?.title || h.property?.code || h.property_code || null,
  }));

  const merged = [...fromOwners, ...fromClients, ...fromProperties].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { data: merged.slice(0, 60) };
}
