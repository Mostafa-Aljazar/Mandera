"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Owner,
  OwnerStatus,
  OwnerStatusHistory,
  MarketingChannelRecord,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

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

  if (filters.assignedEmployeeId) {
    query = query.eq("assigned_employee_id", filters.assignedEmployeeId);
  }
  if (filters.marketingChannel) {
    query = query.eq("marketing_channel", filters.marketingChannel);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);

  if (filters.statusId) {
    const { data: histMatches, error: histError } = await supabase
      .from("owner_status_history")
      .select("owner_id")
      .eq("company_id", companyId)
      .eq("status_id", filters.statusId);

    if (histError) return { error: histError.message };

    const matchedOwnerIds = [...new Set((histMatches ?? []).map((h) => h.owner_id))];
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
    .eq("company_id", companyId);
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
    .select("*, status:owner_statuses(id, name)")
    .eq("owner_id", ownerId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return { error: error.message };
  return { data: (data && data[0]) || null };
}

export interface CreateOwnerInput {
  companyId: string;
  name: string;
  phone: string;
  country: string;
  marketing_channel?: string | null;
  assigned_employee_id?: string | null;
}

export async function createOwner(
  input: CreateOwnerInput,
): Promise<ActionResult<Owner>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .insert({
      name: input.name,
      phone: input.phone,
      country: input.country,
      marketing_channel: input.marketing_channel || null,
      assigned_employee_id: input.assigned_employee_id || null,
      company_id: input.companyId,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Owner };
}

export interface UpdateOwnerInput {
  id: string;
  name: string;
  phone: string;
  country: string;
  marketing_channel?: string | null;
  assigned_employee_id?: string | null;
}

export async function updateOwner(
  input: UpdateOwnerInput,
): Promise<ActionResult<Owner>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owners")
    .update({
      name: input.name,
      phone: input.phone,
      country: input.country,
      marketing_channel: input.marketing_channel || null,
      assigned_employee_id: input.assigned_employee_id || null,
    })
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

export interface OwnerExportRow {
  id: string;
  name: string;
  phone: string;
  assigned_employee_name: string | null;
  marketing_channel: string | null;
  status_name: string | null;
  properties_count: number;
  last_status_date: string | null;
  created_at: string;
}

export async function getOwnersExportData(
  companyId: string,
): Promise<ActionResult<OwnerExportRow[]>> {
  const supabase = await getServerSupabase();

  const [{ data: owners, error: ownersError }, { data: histories, error: histError }, { data: props, error: propsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("owners").select("*").eq("company_id", companyId),
      supabase
        .from("owner_status_history")
        .select("*, status:owner_statuses(id, name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("properties").select("id, owner_id").eq("company_id", companyId),
      supabase.from("profiles").select("id, name").eq("company_id", companyId),
    ]);

  if (ownersError) return { error: ownersError.message };
  if (histError) return { error: histError.message };
  if (propsError) return { error: propsError.message };
  if (profilesError) return { error: profilesError.message };

  const statusMap = new Map<string, { name: string; created_at: string }>();
  (histories ?? []).forEach((h: any) => {
    if (!statusMap.has(h.owner_id)) {
      statusMap.set(h.owner_id, { name: h.status?.name ?? "", created_at: h.created_at });
    }
  });

  const propsCountMap = new Map<string, number>();
  (props ?? []).forEach((p) => {
    propsCountMap.set(p.owner_id, (propsCountMap.get(p.owner_id) ?? 0) + 1);
  });

  const profileNameMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => profileNameMap.set(p.id, p.name ?? ""));

  const rows: OwnerExportRow[] = (owners ?? []).map((o) => {
    const status = statusMap.get(o.id);
    return {
      id: o.id,
      name: o.name,
      phone: o.phone,
      assigned_employee_name: o.assigned_employee_id
        ? profileNameMap.get(o.assigned_employee_id) ?? null
        : null,
      marketing_channel: o.marketing_channel,
      status_name: status?.name ?? null,
      properties_count: propsCountMap.get(o.id) ?? 0,
      last_status_date: status?.created_at ?? null,
      created_at: o.created_at,
    };
  });

  return { data: rows };
}
