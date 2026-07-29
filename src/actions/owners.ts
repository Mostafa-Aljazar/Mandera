"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Owner,
  OwnerStatus,
  OwnerStatusHistory,
  MarketingChannelRecord,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

async function uploadOwnerAvatar(
  companyId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Owner photo must be less than 2MB." };
  }

  const admin = getSupabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${companyId}/owners/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

export interface OwnerFilters {
  assignedEmployeeId?: string;
  statusId?: string;
  marketingChannel?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export async function getOwner(
  ownerId: string,
  companyId: string,
): Promise<ActionResult<Owner>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .select("*")
    .eq("id", ownerId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Owner not found" };
  return { data: data as Owner };
}

export async function getOwners(
  companyId: string,
  filters: OwnerFilters = {},
): Promise<ActionResult<Owner[]>> {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("owners")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.assignedEmployeeId === "unassigned") {
    query = query.is("assigned_employee_id", null);
  } else if (filters.assignedEmployeeId) {
    query = query.eq("assigned_employee_id", filters.assignedEmployeeId);
  }
  if (filters.marketingChannel) {
    query = query.eq("marketing_channel", filters.marketingChannel);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);

  // Current status = latest owner_status_history row only (not any past status).
  if (filters.statusId) {
    const { data: histMatches, error: histError } = await supabase
      .from("owner_status_history")
      .select("owner_id, status_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (histError) return { error: histError.message };

    const latestStatusMap = new Map<string, string | null>();
    (histMatches ?? []).forEach(
      (h: { owner_id: string; status_id: string | null }) => {
        if (!latestStatusMap.has(h.owner_id)) {
          latestStatusMap.set(h.owner_id, h.status_id);
        }
      },
    );

    const matchedOwnerIds = [...latestStatusMap.entries()]
      .filter(([, statusId]) => statusId === filters.statusId)
      .map(([ownerId]) => ownerId);

    if (matchedOwnerIds.length === 0) return { data: [] };
    query = query.in("id", matchedOwnerIds);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getOwnerStatusesForCompany(
  companyId: string,
): Promise<ActionResult<OwnerStatus[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_statuses")
    .select("*")
    .eq("company_id", companyId)
    .order("name_en", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getMarketingChannelsForCompany(
  companyId: string,
): Promise<ActionResult<MarketingChannelRecord[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("marketing_channels")
    .select("*")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getOwnerPropertyCount(
  ownerId: string,
): Promise<ActionResult<number>> {
  const supabase = await getServerSupabase();
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  if (error) return { error: error.message };
  return { data: count ?? 0 };
}

export async function getOwnerLatestStatus(
  ownerId: string,
  companyId: string,
): Promise<ActionResult<OwnerStatusHistory | null>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_status_history")
    .select("*, status:owner_statuses(id, name_en, name_ar)")
    .eq("owner_id", ownerId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return { error: error.message };
  return { data: (data && data[0]) || null };
}

export interface CreateOwnerInput {
  companyId: string;
  name_en: string;
  name_ar: string;
  phone: string;
  country: string;
  marketing_channel?: string | null;
  assigned_employee_id?: string | null;
  /** Optional profile photo. */
  avatar?: File | null;
}

export async function createOwner(
  input: CreateOwnerInput,
): Promise<ActionResult<Owner>> {
  const supabase = await getServerSupabase();
  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  let avatarUrl: string | null = null;
  if (input.avatar) {
    const upload = await uploadOwnerAvatar(input.companyId, input.avatar);
    if (upload.error) return { error: upload.error };
    avatarUrl = upload.url ?? null;
  }

  const { data, error } = await supabase
    .from("owners")
    .insert({
      name: nameEn,
      name_en: nameEn,
      name_ar: nameAr,
      phone: input.phone,
      country: input.country,
      marketing_channel: input.marketing_channel || null,
      assigned_employee_id: input.assigned_employee_id || null,
      company_id: input.companyId,
      avatar_url: avatarUrl,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Owner };
}

export interface UpdateOwnerInput {
  id: string;
  companyId?: string;
  name_en: string;
  name_ar: string;
  phone: string;
  country: string;
  marketing_channel?: string | null;
  assigned_employee_id?: string | null;
  /** Optional new profile photo. */
  avatar?: File | null;
  /** When true and no new file is provided, clear the existing photo. */
  removeAvatar?: boolean;
}

export async function updateOwner(
  input: UpdateOwnerInput,
): Promise<ActionResult<Owner>> {
  const supabase = await getServerSupabase();
  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  const patch: Record<string, unknown> = {
    name: nameEn,
    name_en: nameEn,
    name_ar: nameAr,
    phone: input.phone,
    country: input.country,
    marketing_channel: input.marketing_channel || null,
    assigned_employee_id: input.assigned_employee_id || null,
  };

  if (input.avatar && input.companyId) {
    const upload = await uploadOwnerAvatar(input.companyId, input.avatar);
    if (upload.error) return { error: upload.error };
    patch.avatar_url = upload.url;
  } else if (input.removeAvatar) {
    patch.avatar_url = null;
  }

  const { data, error } = await supabase
    .from("owners")
    .update(patch)
    .eq("id", input.id)
    .select()
    .single();

  if (error) return { error: error.message };
  // TODO: send assignment-change notification email if assigned_employee_id
  // changed (deferred per user decision — see project_supabase_migration memory).
  return { data: data as Owner };
}

export async function deleteOwner(id: string): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("owners").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function bulkDeleteOwners(
  ownerIds: string[],
  companyId: string,
): Promise<ActionResult<{ deleted: number }>> {
  if (ownerIds.length === 0) return { error: "No owners to delete." };
  const supabase = await getServerSupabase();
  const { error, count } = await supabase
    .from("owners")
    .delete({ count: "exact" })
    .in("id", ownerIds)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: { deleted: count ?? ownerIds.length } };
}

export async function bulkReassignOwners(
  ownerIds: string[],
  targetEmployeeId: string,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("owners")
    .update({ assigned_employee_id: targetEmployeeId })
    .in("id", ownerIds);
  if (error) return { error: error.message };
  return { data: null };
}

const MAX_BULK_IMPORT_ROWS = 1000;

/** Returns which of the given phone numbers already belong to an existing owner. */
export async function checkExistingOwnerPhones(
  companyId: string,
  phones: string[],
): Promise<ActionResult<string[]>> {
  if (phones.length === 0) return { data: [] };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .select("phone")
    .eq("company_id", companyId)
    .in("phone", phones);
  if (error) return { error: error.message };
  return { data: (data ?? []).map((row) => row.phone) };
}

export interface BulkCreateOwnerRow {
  name_en: string;
  name_ar: string;
  phone: string;
  country: string;
  assigned_employee_id: string | null;
  marketing_channel: string | null;
  /** Existing property ids to attach (properties.owner_id) once the owner is created. */
  property_ids: string[];
}

export async function bulkCreateOwners(
  companyId: string,
  rows: BulkCreateOwnerRow[],
): Promise<ActionResult<{ inserted: number }>> {
  if (rows.length === 0) return { error: "No rows to import." };
  if (rows.length > MAX_BULK_IMPORT_ROWS) {
    return { error: `Cannot import more than ${MAX_BULK_IMPORT_ROWS} rows at once.` };
  }

  const supabase = await getServerSupabase();
  const payload = rows.map((row) => {
    const nameEn = row.name_en.trim();
    return {
      name: nameEn,
      name_en: nameEn,
      name_ar: row.name_ar.trim(),
      phone: row.phone,
      country: row.country,
      marketing_channel: row.marketing_channel || null,
      assigned_employee_id: row.assigned_employee_id || null,
      company_id: companyId,
      avatar_url: null,
    };
  });

  const { data, error } = await supabase.from("owners").insert(payload).select("id, phone");
  if (error) return { error: error.message };

  // Link each row's resolved existing properties to its newly-created owner.
  // Matched by phone (guaranteed unique within the batch by the import parser).
  const ownerIdByPhone = new Map((data ?? []).map((o) => [o.phone, o.id]));
  for (const row of rows) {
    if (row.property_ids.length === 0) continue;
    const ownerId = ownerIdByPhone.get(row.phone);
    if (!ownerId) continue;
    const { error: linkError } = await supabase
      .from("properties")
      .update({ owner_id: ownerId })
      .in("id", row.property_ids);
    if (linkError) return { error: linkError.message };
  }

  return { data: { inserted: data?.length ?? 0 } };
}

export interface OwnerStatusCountRow {
  owner_id: string;
  status_name_en: string | null;
  status_name_ar: string | null;
  properties_count: number;
}

/**
 * Latest status + property count per owner — owners don't carry a status
 * column directly (unlike clients), so the configurable export UI fetches
 * this supplemental map to merge with the already-loaded owner rows.
 */
export async function getOwnerStatusAndCounts(
  companyId: string,
): Promise<ActionResult<OwnerStatusCountRow[]>> {
  const supabase = await getServerSupabase();

  const [
    { data: owners, error: ownersError },
    { data: histories, error: histError },
    { data: props, error: propsError },
  ] = await Promise.all([
    supabase.from("owners").select("id").eq("company_id", companyId),
    supabase
      .from("owner_status_history")
      .select("owner_id, status:owner_statuses(name_en, name_ar)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("id, owner_id").eq("company_id", companyId),
  ]);

  if (ownersError) return { error: ownersError.message };
  if (histError) return { error: histError.message };
  if (propsError) return { error: propsError.message };

  const statusMap = new Map<string, { name_en: string | null; name_ar: string | null }>();
  (histories ?? []).forEach((h: any) => {
    if (!statusMap.has(h.owner_id)) {
      statusMap.set(h.owner_id, {
        name_en: h.status?.name_en ?? null,
        name_ar: h.status?.name_ar ?? null,
      });
    }
  });

  const countMap = new Map<string, number>();
  (props ?? []).forEach((p) => {
    countMap.set(p.owner_id, (countMap.get(p.owner_id) ?? 0) + 1);
  });

  const rows: OwnerStatusCountRow[] = (owners ?? []).map((o) => {
    const status = statusMap.get(o.id);
    return {
      owner_id: o.id,
      status_name_en: status?.name_en ?? null,
      status_name_ar: status?.name_ar ?? null,
      properties_count: countMap.get(o.id) ?? 0,
    };
  });

  return { data: rows };
}
