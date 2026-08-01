"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Client,
  ClientWithRelations,
  ClientStatus,
} from "@/types/supabase-entities.types";
import {
  assertCompanyMember,
} from "@/actions/_access";
import {
  CLIENT_IDENTITY_FIELDS,
  stripIdentityFields,
} from "@/lib/identity";
import {
  canAssignRecords,
  canDeleteClientOrOwner,
  canImportClientsOrOwners,
  canViewInsights,
  isManager,
  isMasterAdmin,
  isSalesAgent,
} from "@/lib/permissions";
import { pickEmployeeByDistributionRules } from "@/actions/distributionRules";

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
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENTS_SELECT)
    .eq("id", clientId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Client not found" };

  const client = data as unknown as ClientWithRelations;
  if (
    isSalesAgent(access.data.role) &&
    client.employee_id !== access.data.userId
  ) {
    return { error: "Access denied" };
  }

  return { data: client };
}

export async function getClients(
  companyId: string,
  filters: ClientFilters = {},
): Promise<ActionResult<ClientWithRelations[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const effectiveFilters = { ...filters };
  if (isSalesAgent(access.data.role)) {
    effectiveFilters.employeeId = access.data.userId;
  }

  const supabase = await getServerSupabase();

  let query = supabase
    .from("clients")
    .select(CLIENTS_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (effectiveFilters.employeeId) {
    query = query.eq("employee_id", effectiveFilters.employeeId);
  }
  if (effectiveFilters.marketingChannel) {
    query = query.eq("marketing_channel", effectiveFilters.marketingChannel);
  }
  if (effectiveFilters.createdFrom) {
    query = query.gte("created_at", effectiveFilters.createdFrom);
  }
  if (effectiveFilters.createdTo) {
    query = query.lte("created_at", effectiveFilters.createdTo);
  }
  if (effectiveFilters.updatedFrom) {
    query = query.gte("updated_at", effectiveFilters.updatedFrom);
  }
  if (effectiveFilters.updatedTo) {
    query = query.lte("updated_at", effectiveFilters.updatedTo);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  let clients = (data ?? []) as unknown as ClientWithRelations[];

  if (effectiveFilters.statusId) {
    // Prefer the synced clients.status_id column; fall back to latest
    // history entry for legacy rows where status_id was never set.
    const { data: histMatches, error: histError } = await supabase
      .from("client_status_history")
      .select("client_id, status_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (histError) return { error: histError.message };

    const latestFromHistory = new Map<string, string | null>();
    (histMatches ?? []).forEach(
      (h: { client_id: string; status_id: string | null }) => {
        if (!latestFromHistory.has(h.client_id)) {
          latestFromHistory.set(h.client_id, h.status_id);
        }
      },
    );

    clients = clients.filter((c) => {
      const currentStatus = c.status_id ?? latestFromHistory.get(c.id) ?? null;
      return currentStatus === effectiveFilters.statusId;
    });
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
  employee_id?: string;
  marketing_channel?: string | null;
  campaign?: string | null;
  avatar?: File | null;
  budget?: number | null;
  preferred_area?: string | null;
  investment_unit?: string | null;
}

export async function createClient(
  input: CreateClientInput,
): Promise<ActionResult<Client>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  // Sales agents may only create clients assigned to themselves.
  let employeeId = isSalesAgent(access.data.role)
    ? access.data.userId
    : input.employee_id;
  if (!employeeId && canAssignRecords(access.data.role)) {
    const assignment = await pickEmployeeByDistributionRules(input.companyId);
    if (assignment.error) return { error: assignment.error };
    employeeId = assignment.data ?? undefined;
  }
  if (!employeeId) return { error: "Assigned agent is required" };

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
      employee_id: employeeId,
      marketing_channel: input.marketing_channel || null,
      campaign: input.campaign?.trim() || null,
      company_id: input.companyId,
      avatar_url: avatarUrl,
      is_locked: true,
      budget: input.budget ?? null,
      preferred_area: input.preferred_area?.trim() || null,
      investment_unit: input.investment_unit?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Client };
}

/**
 * PDF: Sales Agent may convert an assigned owner into a client when they
 * express buying interest. Copies identity + channel; keeps both records.
 */
export async function convertOwnerToClient(input: {
  ownerId: string;
  companyId: string;
  interest_type?: "Sale" | "Rent";
}): Promise<ActionResult<Client>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select(
      "id, company_id, name, name_en, name_ar, phone, country, marketing_channel, assigned_employee_id, email",
    )
    .eq("id", input.ownerId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (ownerError) return { error: ownerError.message };
  if (!owner) return { error: "Owner not found" };

  if (
    isSalesAgent(access.data.role) &&
    owner.assigned_employee_id !== access.data.userId
  ) {
    return { error: "Access denied" };
  }

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("phone", owner.phone)
    .maybeSingle();

  if (existingClient) {
    return {
      error:
        "A client with this phone number already exists. Open that client instead.",
    };
  }

  const employeeId = isSalesAgent(access.data.role)
    ? access.data.userId
    : owner.assigned_employee_id || access.data.userId;

  const nameEn = (owner.name_en || owner.name || "").trim();
  const nameAr = (owner.name_ar || owner.name || nameEn).trim();
  if (!nameEn || !nameAr) {
    return { error: "Owner name is incomplete and cannot be converted." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: nameEn,
      name_en: nameEn,
      name_ar: nameAr,
      phone: owner.phone,
      country_code: owner.country || "United Arab Emirates",
      interest_type: input.interest_type || "Sale",
      interested_properties: [],
      employee_id: employeeId,
      marketing_channel: owner.marketing_channel || null,
      company_id: input.companyId,
      is_locked: true,
      preferred_area: null,
      budget: null,
      investment_unit: null,
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
  campaign?: string | null;
  avatar?: File | null;
  removeAvatar?: boolean;
  budget?: number | null;
  preferred_area?: string | null;
  investment_unit?: string | null;
}

export async function updateClient(
  input: UpdateClientInput,
): Promise<ActionResult<Client>> {
  const companyId = input.companyId;
  if (!companyId) return { error: "Company is required" };

  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select(
      "id, employee_id, company_id, editing_locked, name, name_en, name_ar, phone, country_code",
    )
    .eq("id", input.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Client not found" };
  if (
    isSalesAgent(access.data.role) &&
    existing.employee_id !== access.data.userId
  ) {
    return { error: "Access denied" };
  }
  if (
    existing.editing_locked &&
    !isManager(access.data.role) &&
    !isMasterAdmin(access.data.role)
  ) {
    return { error: "This record is locked and cannot be edited." };
  }

  const nameEn = input.name_en.trim();
  const nameAr = input.name_ar.trim();

  // PDF: identity locked after create. Never write name/phone/country via this
  // action. Reject only when the caller sends values that differ from DB
  // (DevTools / forged API). Missing/unchanged values are ignored.
  const identityMismatch =
    ((input.name_en ?? "") !== "" &&
      (existing.name_en ?? "") !== nameEn) ||
    ((input.name_ar ?? "") !== "" &&
      (existing.name_ar ?? "") !== nameAr) ||
    ((input.phone ?? "") !== "" &&
      (existing.phone ?? "") !== input.phone) ||
    ((input.country_code ?? "") !== "" &&
      (existing.country_code ?? "") !== input.country_code);

  if (identityMismatch) {
    return {
      error:
        "Identity fields (name, phone, country) are locked after create. Only Master Admin can apply an exceptional correction with a full audit log.",
    };
  }

  let patch: Record<string, unknown> = {
    interest_type: input.interest_type,
    interested_properties: input.interested_properties ?? [],
    employee_id: input.employee_id,
    marketing_channel: input.marketing_channel || null,
    campaign: input.campaign?.trim() || null,
    budget: input.budget ?? null,
    preferred_area: input.preferred_area?.trim() || null,
    investment_unit: input.investment_unit?.trim() || null,
  };

  // Defense in depth: never write identity via this path.
  patch = stripIdentityFields(patch, CLIENT_IDENTITY_FIELDS);

  // Sales agents cannot reassign clients.
  if (!canAssignRecords(access.data.role)) {
    delete patch.employee_id;
  }

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
  return { data: data as Client };
}

export async function updateClientFollowUp(
  id: string,
  followUpDate: string | null,
  followUpTime: string | null,
  companyId?: string,
): Promise<ActionResult<Client>> {
  const supabase = await getServerSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("id, company_id, employee_id, editing_locked")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Client not found" };

  const resolvedCompanyId = companyId || existing.company_id;
  const access = await assertCompanyMember(resolvedCompanyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (
    isSalesAgent(access.data.role) &&
    existing.employee_id !== access.data.userId
  ) {
    return { error: "Access denied" };
  }
  if (
    existing.editing_locked &&
    !isManager(access.data.role) &&
    !isMasterAdmin(access.data.role)
  ) {
    return { error: "This record is locked and cannot be edited." };
  }

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

export async function bulkDeleteClients(
  clientIds: string[],
  companyId: string,
): Promise<ActionResult<{ deleted: number }>> {
  if (clientIds.length === 0) return { error: "No clients to delete." };
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canDeleteClientOrOwner(access.data.role)) {
    return { error: "Deleting clients is not permitted. Contact Master Admin for exceptional corrections." };
  }
  const supabase = await getServerSupabase();
  const { error, count } = await supabase
    .from("clients")
    .delete({ count: "exact" })
    .in("id", clientIds)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: { deleted: count ?? clientIds.length } };
}

export async function bulkAssignClients(
  input: BulkAssignInput,
): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canAssignRecords(access.data.role)) {
    return { error: "Only Administrators and Managers can reassign clients." };
  }

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

const MAX_BULK_IMPORT_ROWS = 1000;

/** Returns which of the given phone numbers already belong to an existing client. */
export async function checkExistingClientPhones(
  companyId: string,
  phones: string[],
): Promise<ActionResult<string[]>> {
  if (phones.length === 0) return { data: [] };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("phone")
    .eq("company_id", companyId)
    .in("phone", phones);
  if (error) return { error: error.message };
  return { data: (data ?? []).map((row) => row.phone) };
}

export interface BulkCreateClientRow {
  name_en: string;
  name_ar: string;
  phone: string;
  country_code: string;
  interest_type: string;
  employee_id: string;
  marketing_channel: string | null;
}

export async function bulkCreateClients(
  companyId: string,
  rows: BulkCreateClientRow[],
): Promise<ActionResult<{ inserted: number }>> {
  if (rows.length === 0) return { error: "No rows to import." };
  if (rows.length > MAX_BULK_IMPORT_ROWS) {
    return { error: `Cannot import more than ${MAX_BULK_IMPORT_ROWS} rows at once.` };
  }

  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canImportClientsOrOwners(access.data.role)) {
    return { error: "Only Managers can import clients." };
  }

  const supabase = await getServerSupabase();
  const payload = rows.map((row) => {
    const nameEn = row.name_en.trim();
    return {
      name: nameEn,
      name_en: nameEn,
      name_ar: row.name_ar.trim(),
      phone: row.phone,
      country_code: row.country_code,
      interest_type: row.interest_type,
      interested_properties: [],
      employee_id: row.employee_id,
      marketing_channel: row.marketing_channel || null,
      company_id: companyId,
      avatar_url: null,
      is_locked: true,
    };
  });

  const { data, error } = await supabase.from("clients").insert(payload).select("id");
  if (error) return { error: error.message };
  return { data: { inserted: data?.length ?? 0 } };
}

export interface ClientsBySourceFilters {
  createdFrom: string;
  createdTo: string;
  groupBy?: "source" | "campaign" | "employee";
}

export async function getClientsBySource(
  companyId: string,
  filters: ClientsBySourceFilters,
): Promise<ActionResult<{ name: string; count: number }[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canViewInsights(access.data.role)) {
    return { error: "Access denied" };
  }

  const groupBy = filters.groupBy ?? "source";
  const supabase = await getServerSupabase();

  if (groupBy === "employee") {
    const { data, error } = await supabase
      .from("clients")
      .select("employee_id, employee:profiles!clients_employee_id_fkey(name)")
      .eq("company_id", companyId)
      .gte("created_at", filters.createdFrom)
      .lte("created_at", filters.createdTo);

    if (error) return { error: error.message };

    const counts = new Map<string, number>();
    (data ?? []).forEach((c) => {
      const emp = Array.isArray(c.employee) ? c.employee[0] : c.employee;
      const label =
        (emp as { name?: string | null } | null)?.name?.trim() ||
        c.employee_id ||
        "Unassigned";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return {
      data: Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  const selectCols =
    groupBy === "campaign" ? "campaign" : "marketing_channel";
  const { data, error } = await supabase
    .from("clients")
    .select(selectCols)
    .eq("company_id", companyId)
    .gte("created_at", filters.createdFrom)
    .lte("created_at", filters.createdTo);

  if (error) return { error: error.message };

  const counts = new Map<string, number>();
  (data ?? []).forEach((c) => {
    const raw =
      groupBy === "campaign"
        ? (c as { campaign?: string | null }).campaign
        : (c as { marketing_channel?: string | null }).marketing_channel;
    const label = raw?.trim() || "Other";
    counts.set(label, (counts.get(label) ?? 0) + 1);
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

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, company_id, employee_id")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError) return { error: clientError.message };
  if (!client) return { error: "Client not found" };

  const access = await assertCompanyMember(client.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (isSalesAgent(access.data.role) && client.employee_id !== access.data.userId) {
    return { error: "Access denied" };
  }

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
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  const { data: client, error: clientFetchError } = await supabase
    .from("clients")
    .select("id, employee_id")
    .eq("id", input.clientId)
    .eq("company_id", input.companyId)
    .maybeSingle();
  if (clientFetchError) return { error: clientFetchError.message };
  if (!client) return { error: "Client not found" };
  if (isSalesAgent(access.data.role) && client.employee_id !== access.data.userId) {
    return { error: "Access denied" };
  }

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
