"use server";

import { assertCompanyMember } from "@/actions/_access";
import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import {
  canViewRevenue,
  isAdministratorOrAbove,
  isMasterAdmin,
} from "@/lib/permissions";
type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export interface DuplicateGroup<T> {
  key: string;
  reason: "phone" | "title_area" | "permit";
  records: T[];
}

/**
 * The duplicate scans have no WHERE beyond company_id, so they read every row
 * the company owns. Select only what the review panel renders and groups on —
 * `select("*")` here pulls descriptions, image arrays and every portal column
 * across the whole table.
 */
export interface DuplicatePersonRecord {
  id: string;
  name: string;
  name_en: string;
  name_ar: string;
  phone: string;
}

export interface DuplicatePropertyRecord {
  id: string;
  code: string;
  title: string;
  advertising_permit_number: string | null;
  area_district: string | null;
  area: string | null;
}

const DUPLICATE_PERSON_SELECT = "id, name, name_en, name_ar, phone";
const DUPLICATE_PROPERTY_SELECT =
  "id, code, title, advertising_permit_number, area_district, area";

async function assertDuplicateAccess(companyId: string) {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" } as const;
  }
  if (
    !isAdministratorOrAbove(access.data.role) &&
    !isMasterAdmin(access.data.role)
  ) {
    return {
      error: "Only administrators and managers can review duplicates.",
    } as const;
  }
  return { data: access.data } as const;
}

function normalizedPhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "").replace(/^0+/, "");
}

function groupBy<T>(
  rows: T[],
  getKey: (row: T) => string,
  reason: DuplicateGroup<T>["reason"],
): DuplicateGroup<T>[] {
  const groups = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => ({ key, reason, records }));
}

export async function findDuplicateClients(
  companyId: string,
): Promise<ActionResult<DuplicateGroup<DuplicatePersonRecord>[]>> {
  const access = await assertDuplicateAccess(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select(DUPLICATE_PERSON_SELECT)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return {
    data: groupBy(
      (data ?? []) as DuplicatePersonRecord[],
      (row) => normalizedPhone(row.phone),
      "phone",
    ),
  };
}

export async function findDuplicateOwners(
  companyId: string,
): Promise<ActionResult<DuplicateGroup<DuplicatePersonRecord>[]>> {
  const access = await assertDuplicateAccess(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .select(DUPLICATE_PERSON_SELECT)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return {
    data: groupBy(
      (data ?? []) as DuplicatePersonRecord[],
      (row) => normalizedPhone(row.phone),
      "phone",
    ),
  };
}

export async function findDuplicateProperties(
  companyId: string,
): Promise<ActionResult<DuplicateGroup<DuplicatePropertyRecord>[]>> {
  const access = await assertDuplicateAccess(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select(DUPLICATE_PROPERTY_SELECT)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  const rows = (data ?? []) as DuplicatePropertyRecord[];
  const permitGroups = groupBy(
    rows,
    (row) => row.advertising_permit_number?.trim().toLowerCase() ?? "",
    "permit",
  );
  const titleAreaGroups = groupBy(
    rows,
    (row) => {
      const title = row.title?.trim().toLowerCase();
      const area = (row.area_district || row.area)?.trim().toLowerCase();
      return title && area ? `${title}|${area}` : "";
    },
    "title_area",
  );

  const seen = new Set<string>();
  return {
    data: [...permitGroups, ...titleAreaGroups].filter((group) => {
      const signature = group.records
        .map((record) => record.id)
        .sort()
        .join("|");
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    }),
  };
}

export interface MergeDuplicatesInput {
  companyId: string;
  keepId: string;
  mergeIds: string[];
}

function validMergeIds(keepId: string, mergeIds: string[]) {
  return [...new Set(mergeIds.filter((id) => id && id !== keepId))];
}

export async function mergeClients(
  input: MergeDuplicatesInput,
): Promise<ActionResult<null>> {
  const access = await assertDuplicateAccess(input.companyId);
  if (access.error) return { error: access.error };
  const mergeIds = validMergeIds(input.keepId, input.mergeIds);
  if (mergeIds.length === 0) return { error: "Select at least one duplicate to merge." };

  const admin = getSupabaseAdmin();
  const { data: clients, error: fetchError } = await admin
    .from("clients")
    .select("id, interested_properties")
    .eq("company_id", input.companyId)
    .in("id", [input.keepId, ...mergeIds]);
  if (fetchError) return { error: fetchError.message };
  if ((clients ?? []).length !== mergeIds.length + 1) {
    return { error: "One or more clients do not belong to this company." };
  }

  const interests = [
    ...new Set(
      (clients ?? []).flatMap((client) => client.interested_properties ?? []),
    ),
  ];
  const { error: keepError } = await admin
    .from("clients")
    .update({ interested_properties: interests })
    .eq("id", input.keepId)
    .eq("company_id", input.companyId);
  if (keepError) return { error: keepError.message };

  const { error: historyError } = await admin
    .from("client_status_history")
    .update({ client_id: input.keepId })
    .eq("company_id", input.companyId)
    .in("client_id", mergeIds);
  if (historyError) return { error: historyError.message };

  const { count: revenueCount, error: revenueCountError } = await admin
    .from("revenues")
    .select("id", { count: "exact", head: true })
    .eq("company_id", input.companyId)
    .in("client_id", mergeIds);
  if (revenueCountError) return { error: revenueCountError.message };

  if ((revenueCount ?? 0) > 0) {
    if (!canViewRevenue(access.data?.role)) {
      return {
        error: "Unable to merge these clients. Please contact a manager.",
      };
    }
    const { error: revenueError } = await admin
      .from("revenues")
      .update({ client_id: input.keepId })
      .eq("company_id", input.companyId)
      .in("client_id", mergeIds);
    if (revenueError) return { error: revenueError.message };
  }

  const { error: deleteError } = await admin
    .from("clients")
    .delete()
    .eq("company_id", input.companyId)
    .in("id", mergeIds);
  if (deleteError) return { error: deleteError.message };
  return { data: null };
}

export async function mergeOwners(
  input: MergeDuplicatesInput,
): Promise<ActionResult<null>> {
  const access = await assertDuplicateAccess(input.companyId);
  if (access.error) return { error: access.error };
  const mergeIds = validMergeIds(input.keepId, input.mergeIds);
  if (mergeIds.length === 0) return { error: "Select at least one duplicate to merge." };

  const admin = getSupabaseAdmin();
  const { data: owners, error: fetchError } = await admin
    .from("owners")
    .select("id")
    .eq("company_id", input.companyId)
    .in("id", [input.keepId, ...mergeIds]);
  if (fetchError) return { error: fetchError.message };
  if ((owners ?? []).length !== mergeIds.length + 1) {
    return { error: "One or more owners do not belong to this company." };
  }

  const { error: propertiesError } = await admin
    .from("properties")
    .update({ owner_id: input.keepId })
    .eq("company_id", input.companyId)
    .in("owner_id", mergeIds);
  if (propertiesError) return { error: propertiesError.message };

  const { error: historyError } = await admin
    .from("owner_status_history")
    .update({ owner_id: input.keepId })
    .eq("company_id", input.companyId)
    .in("owner_id", mergeIds);
  if (historyError) return { error: historyError.message };

  const { error: deleteError } = await admin
    .from("owners")
    .delete()
    .eq("company_id", input.companyId)
    .in("id", mergeIds);
  if (deleteError) return { error: deleteError.message };
  return { data: null };
}

export async function mergeProperties(
  input: MergeDuplicatesInput,
): Promise<ActionResult<null>> {
  const access = await assertDuplicateAccess(input.companyId);
  if (access.error) return { error: access.error };
  const mergeIds = validMergeIds(input.keepId, input.mergeIds);
  if (mergeIds.length === 0) {
    return { error: "Select at least one duplicate to merge." };
  }

  const admin = getSupabaseAdmin();
  const { data: properties, error: fetchError } = await admin
    .from("properties")
    .select("id")
    .eq("company_id", input.companyId)
    .in("id", [input.keepId, ...mergeIds]);
  if (fetchError) return { error: fetchError.message };
  if ((properties ?? []).length !== mergeIds.length + 1) {
    return { error: "One or more properties do not belong to this company." };
  }

  const { error: historyError } = await admin
    .from("property_status_history")
    .update({ property_id: input.keepId })
    .eq("company_id", input.companyId)
    .in("property_id", mergeIds);
  if (historyError) return { error: historyError.message };

  const { data: clients, error: clientsError } = await admin
    .from("clients")
    .select("id, interested_properties")
    .eq("company_id", input.companyId);
  if (clientsError) return { error: clientsError.message };

  const mergeSet = new Set(mergeIds);
  for (const client of clients ?? []) {
    const interests = client.interested_properties ?? [];
    if (!interests.some((id: string) => mergeSet.has(id))) continue;
    const next = [
      ...new Set(
        interests.map((id: string) => (mergeSet.has(id) ? input.keepId : id)),
      ),
    ];
    const { error: updateError } = await admin
      .from("clients")
      .update({ interested_properties: next })
      .eq("id", client.id)
      .eq("company_id", input.companyId);
    if (updateError) return { error: updateError.message };
  }

  const { error: appointmentsError } = await admin
    .from("client_appointments")
    .update({ property_id: input.keepId })
    .eq("company_id", input.companyId)
    .in("property_id", mergeIds);
  if (appointmentsError) return { error: appointmentsError.message };

  const { error: deleteError } = await admin
    .from("properties")
    .delete()
    .eq("company_id", input.companyId)
    .in("id", mergeIds);
  if (deleteError) return { error: deleteError.message };
  return { data: null };
}
