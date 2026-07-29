"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { employeeDisplayName } from "@/lib/bilingualLabel";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export type HistoryEntityType = "owner" | "property" | "client";

export interface HistoryRecord {
  id: string;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  /** Locale-aware display name (prefer live employee record over snapshot). */
  created_by_name_en: string | null;
  created_by_name_ar: string | null;
  note: string | null;
  status: string | null;
  status_name?: string | null;
  status_name_en?: string | null;
  status_name_ar?: string | null;
  follow_up_date?: string | null;
}

type CreatorProfile = {
  id: string;
  name: string | null;
  employee:
    | {
        first_name_en?: string | null;
        first_name_ar?: string | null;
        last_name_en?: string | null;
        last_name_ar?: string | null;
      }
    | null;
};

async function loadCreatorNames(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  creatorIds: string[],
): Promise<
  Map<string, { name_en: string; name_ar: string; fallback: string | null }>
> {
  const map = new Map<
    string,
    { name_en: string; name_ar: string; fallback: string | null }
  >();
  if (creatorIds.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
    )
    .in("id", creatorIds);

  for (const row of (data ?? []) as CreatorProfile[]) {
    const emp = row.employee;
    map.set(row.id, {
      name_en: employeeDisplayName(emp, "en", row.name) || row.name || "",
      name_ar: employeeDisplayName(emp, "ar", row.name) || row.name || "",
      fallback: row.name,
    });
  }

  return map;
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
      ? "*, status_ref:owner_statuses(name_en, name_ar)"
      : entityType === "client"
        ? "*, status_ref:client_statuses(name_en, name_ar)"
        : "*";

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("company_id", companyId)
    .eq(entityIdField, entityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };

  const historyRows = (data ?? []) as unknown as Array<{
    created_by?: string | null;
    [key: string]: unknown;
  }>;

  const creatorIds = [
    ...new Set(
      historyRows
        .map((h) => h.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const creators = await loadCreatorNames(supabase, creatorIds);

  const rows: HistoryRecord[] = historyRows.map((h: any) => {
    const creator = h.created_by ? creators.get(h.created_by) : undefined;
    return {
      id: h.id,
      created_at: h.created_at,
      created_by: h.created_by,
      created_by_name: h.created_by_name,
      created_by_name_en:
        creator?.name_en || h.created_by_name || null,
      created_by_name_ar:
        creator?.name_ar || h.created_by_name || null,
      note: h.note,
      status: h.status,
      status_name:
        h.status_ref?.name_en ??
        h.status_ref?.name_ar ??
        h.status_ref?.name ??
        null,
      status_name_en: h.status_ref?.name_en ?? null,
      status_name_ar: h.status_ref?.name_ar ?? null,
      follow_up_date: h.follow_up_date ?? null,
    };
  });

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
      .select("*, status_ref:owner_statuses(name_en, name_ar), owner:owners(id, name)")
      .eq("company_id", companyId)
      .eq("created_by", profileId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("client_status_history")
      .select("*, status_ref:client_statuses(name_en, name_ar), client:clients(id, name)")
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

  const creators = await loadCreatorNames(supabase, [profileId]);
  const creator = creators.get(profileId);

  const withCreatorNames = (
    h: any,
    extras: Omit<EmployeeActivityRecord, keyof HistoryRecord>,
  ): EmployeeActivityRecord => ({
    id: h.id,
    created_at: h.created_at,
    created_by: h.created_by,
    created_by_name: h.created_by_name,
    created_by_name_en: creator?.name_en || h.created_by_name || null,
    created_by_name_ar: creator?.name_ar || h.created_by_name || null,
    note: h.note,
    status: h.status,
    status_name: extras.entity_type === "property"
      ? (h.status ?? null)
      : (h.status_ref?.name_en ?? h.status_ref?.name_ar ?? null),
    status_name_en:
      extras.entity_type === "property" ? null : (h.status_ref?.name_en ?? null),
    status_name_ar:
      extras.entity_type === "property" ? null : (h.status_ref?.name_ar ?? null),
    follow_up_date: h.follow_up_date ?? null,
    ...extras,
  });

  const fromOwners: EmployeeActivityRecord[] = (ownersRes.data ?? []).map(
    (h: any) =>
      withCreatorNames(h, {
        entity_type: "owner",
        entity_id: h.owner_id ?? h.owner?.id ?? null,
        entity_label: h.owner?.name ?? null,
      }),
  );

  const fromClients: EmployeeActivityRecord[] = (clientsRes.data ?? []).map(
    (h: any) =>
      withCreatorNames(h, {
        entity_type: "client",
        entity_id: h.client_id ?? h.client?.id ?? null,
        entity_label: h.client?.name ?? null,
      }),
  );

  const fromProperties: EmployeeActivityRecord[] = (
    propertiesRes.data ?? []
  ).map((h: any) =>
    withCreatorNames(h, {
      entity_type: "property",
      entity_id: h.property_id ?? h.property?.id ?? null,
      entity_label:
        h.property?.title || h.property?.code || h.property_code || null,
    }),
  );

  const merged = [...fromOwners, ...fromClients, ...fromProperties].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { data: merged.slice(0, 60) };
}
