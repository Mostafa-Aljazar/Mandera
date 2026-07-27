"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Client,
  ClientWithRelations,
  ClientStatus,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const CLIENTS_SELECT = "*, employee:profiles!clients_employee_id_fkey(id, name)";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

async function uploadClientAvatar(
  companyId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Client photo must be less than 2MB." };
  }

  const admin = getSupabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${companyId}/clients/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

export interface ClientFilters {
  employeeId?: string;
  statusId?: string;
  marketingChannel?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export async function getClient(
  clientId: string,
  companyId: string,
): Promise<ActionResult<ClientWithRelations>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENTS_SELECT)
    .eq("id", clientId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Client not found" };
  return { data: data as unknown as ClientWithRelations };
}

export async function getClients(
  companyId: string,
  filters: ClientFilters = {},
): Promise<ActionResult<ClientWithRelations[]>> {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("clients")
    .select(CLIENTS_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.marketingChannel) query = query.eq("marketing_channel", filters.marketingChannel);
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);
  if (filters.updatedFrom) query = query.gte("updated_at", filters.updatedFrom);
  if (filters.updatedTo) query = query.lte("updated_at", filters.updatedTo);

  let { data, error } = await query;
  if (error) return { error: error.message };
  let clients = (data ?? []) as unknown as ClientWithRelations[];

  if (filters.statusId) {
    const { data: histMatches, error: histError } = await supabase
      .from("client_status_history")
      .select("client_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (histError) return { error: histError.message };

    const latestStatusMap = new Map<string, string | null>();
    (histMatches ?? []).forEach((h: any) => {
      if (!latestStatusMap.has(h.client_id)) {
        latestStatusMap.set(h.client_id, h.status_id);
      }
    });

    clients = clients.filter((c) => latestStatusMap.get(c.id) === filters.statusId);
  }

  return { data: clients };
}

export async function getClientStatusesForCompany(
  companyId: string,
): Promise<ActionResult<ClientStatus[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .select("*")
    .eq("company_id", companyId)
    .order("priority_order", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export interface CreateClientInput {
  companyId: string;
  name_en: string;
  name_ar: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties?: string[];
  employee_id: string;
  marketing_channel?: string | null;
  avatar?: File | null;
}

export async function createClient(
  input: CreateClientInput,
): Promise<ActionResult<Client>> {
  const supabase = await getServerSupabase();
  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  let avatarUrl: string | null = null;
  if (input.avatar) {
    const upload = await uploadClientAvatar(input.companyId, input.avatar);
    if (upload.error) return { error: upload.error };
    avatarUrl = upload.url ?? null;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: nameEn,
      name_en: nameEn,
      name_ar: nameAr,
      phone: input.phone,
      country_code: input.country_code,
      interest_type: input.interest_type,
      interested_properties: input.interested_properties ?? [],
      employee_id: input.employee_id,
      marketing_channel: input.marketing_channel || null,
      company_id: input.companyId,
      avatar_url: avatarUrl,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Client };
}

export interface UpdateClientInput {
  id: string;
  companyId?: string;
  name_en: string;
  name_ar: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties?: string[];
  employee_id: string;
  marketing_channel?: string | null;
  avatar?: File | null;
  removeAvatar?: boolean;
}

export async function updateClient(
  input: UpdateClientInput,
): Promise<ActionResult<Client>> {
  const supabase = await getServerSupabase();
  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  const patch: Record<string, unknown> = {
    name: nameEn,
    name_en: nameEn,
    name_ar: nameAr,
    phone: input.phone,
    country_code: input.country_code,
    interest_type: input.interest_type,
    interested_properties: input.interested_properties ?? [],
    employee_id: input.employee_id,
    marketing_channel: input.marketing_channel || null,
  };

  if (input.avatar && input.companyId) {
    const upload = await uploadClientAvatar(input.companyId, input.avatar);
    if (upload.error) return { error: upload.error };
    patch.avatar_url = upload.url;
  } else if (input.removeAvatar) {
    patch.avatar_url = null;
  }

  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", input.id)
    .select()
    .single();

  if (error) return { error: error.message };
  // TODO: send assignment-change notification email if employee_id changed
  // (deferred per user decision — see project_supabase_migration memory).
  return { data: data as Client };
}

export async function updateClientFollowUp(
  id: string,
  followUpDate: string | null,
  followUpTime: string | null,
): Promise<ActionResult<Client>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update({ follow_up_date: followUpDate, follow_up_time: followUpTime })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Client };
}

export interface BulkAssignInput {
  clientIds: string[];
  employeeId: string;
  statusId?: string | null;
  companyId: string;
  createdByUserId: string;
  createdByName: string;
}

export async function bulkAssignClients(
  input: BulkAssignInput,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();

  const { data: clientsToAssign, error: fetchError } = await supabase
    .from("clients")
    .select("id, employee_id")
    .in("id", input.clientIds);

  if (fetchError) return { error: fetchError.message };

  for (const client of clientsToAssign ?? []) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({ employee_id: input.employeeId })
      .eq("id", client.id);
    if (updateError) return { error: updateError.message };

    let resolvedStatusId = input.statusId;
    if (!resolvedStatusId) {
      const { data: latestHistory } = await supabase
        .from("client_status_history")
        .select("status_id")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1);
      resolvedStatusId = latestHistory?.[0]?.status_id ?? null;
    }

    if (resolvedStatusId) {
      await supabase.from("client_status_history").insert({
        client_id: client.id,
        status_id: resolvedStatusId,
        note: `Bulk reassigned to a new employee`,
        created_by: input.createdByUserId,
        created_by_name: input.createdByName,
        company_id: input.companyId,
        transferred_from_employee: client.employee_id,
        transferred_to_employee: input.employeeId,
      });
    }
  }

  return { data: null };
}

export interface ClientExportRow {
  id: string;
  name: string;
  phone: string;
  employee_name: string | null;
  marketing_channel: string | null;
  status_name: string | null;
  created_at: string;
}

export async function getClientsExportData(
  companyId: string,
): Promise<ActionResult<ClientExportRow[]>> {
  const supabase = await getServerSupabase();

  const [{ data: clients, error: clientsError }, { data: histories, error: histError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("company_id", companyId),
      supabase
        .from("client_status_history")
        .select("*, status:client_statuses(id, name_en, name_ar)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name").eq("company_id", companyId),
    ]);

  if (clientsError) return { error: clientsError.message };
  if (histError) return { error: histError.message };
  if (profilesError) return { error: profilesError.message };

  const statusMap = new Map<string, string>();
  (histories ?? []).forEach((h: any) => {
    if (!statusMap.has(h.client_id)) {
      statusMap.set(
        h.client_id,
        h.status?.name_en ?? h.status?.name_ar ?? "",
      );
    }
  });

  const profileNameMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => profileNameMap.set(p.id, p.name ?? ""));

  const rows: ClientExportRow[] = (clients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    employee_name: c.employee_id ? profileNameMap.get(c.employee_id) ?? null : null,
    marketing_channel: c.marketing_channel,
    status_name: statusMap.get(c.id) ?? null,
    created_at: c.created_at,
  }));

  return { data: rows };
}

export interface ClientsBySourceFilters {
  createdFrom: string;
  createdTo: string;
}

export async function getClientsBySource(
  companyId: string,
  filters: ClientsBySourceFilters,
): Promise<ActionResult<{ name: string; count: number }[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("marketing_channel")
    .eq("company_id", companyId)
    .gte("created_at", filters.createdFrom)
    .lte("created_at", filters.createdTo);

  if (error) return { error: error.message };

  const counts = new Map<string, number>();
  (data ?? []).forEach((c) => {
    const channel = c.marketing_channel || "Other";
    counts.set(channel, (counts.get(channel) ?? 0) + 1);
  });

  const result = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { data: result };
}

export interface FollowUpClient extends ClientWithRelations {
  latest_status_name: string | null;
}

export async function getUpcomingFollowUps(
  companyId: string,
  restrictToEmployeeId?: string,
): Promise<ActionResult<FollowUpClient[]>> {
  const supabase = await getServerSupabase();

  let clientQuery = supabase
    .from("clients")
    .select(`${CLIENTS_SELECT}, status:client_statuses(id, name_en, name_ar)`)
    .eq("company_id", companyId)
    .not("follow_up_date", "is", null)
    .order("follow_up_date", { ascending: true });

  if (restrictToEmployeeId) {
    clientQuery = clientQuery.eq("employee_id", restrictToEmployeeId);
  }

  const { data: clients, error: clientsError } = await clientQuery;

  if (clientsError) return { error: clientsError.message };

  const results: FollowUpClient[] = (clients ?? []).map((client: any) => ({
    ...(client as ClientWithRelations),
    latest_status_name:
      client.status?.name_en ?? client.status?.name_ar ?? null,
  }));

  return { data: results };
}

export async function getClientStatusHistory(
  clientId: string,
): Promise<ActionResult<any[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_status_history")
    .select("*, status:client_statuses(id, name_en, name_ar)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export interface AddClientStatusInput {
  clientId: string;
  companyId: string;
  statusId: string;
  note?: string;
  followUpDate?: string | null;
  createdByUserId: string;
  employeeId?: string;
}

export async function addClientStatus(
  input: AddClientStatusInput,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();

  const { error: historyError } = await supabase.from("client_status_history").insert({
    client_id: input.clientId,
    status_id: input.statusId,
    note: input.note || "",
    created_by: input.createdByUserId,
    company_id: input.companyId,
    follow_up_date: input.followUpDate || null,
    employee_id: input.employeeId,
  });
  if (historyError) return { error: historyError.message };

  const clientUpdate: Record<string, unknown> = { status_id: input.statusId };
  if (input.followUpDate) {
    clientUpdate.follow_up_date = input.followUpDate;
  }

  const { error: clientError } = await supabase
    .from("clients")
    .update(clientUpdate)
    .eq("id", input.clientId);
  if (clientError) return { error: clientError.message };

  return { data: null };
}
