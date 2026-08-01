"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canViewRevenue } from "@/lib/permissions";
import type {
  Revenue,
  RevenueChangeLog,
  RevenueWithRelations,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

type ApprovalStatus = "pending" | "approved" | "rejected";

const REVENUES_SELECT = `
  *,
  client:clients!revenues_client_id_fkey(id, name, name_en, name_ar, avatar_url),
  employee_profile:profiles!revenues_employee_id_fkey(
    id,
    name,
    name_en,
    name_ar,
    employee:employees!profiles_employee_id_fkey(
      first_name_en,
      first_name_ar,
      last_name_en,
      last_name_ar,
      avatar_url
    )
  )
`;

export interface RevenueFilters {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

async function assertRevenueManager(companyId: string) {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" } as const;
  }
  if (!canViewRevenue(access.data.role)) {
    return { error: "Only managers can manage revenue." } as const;
  }
  return { data: access.data } as const;
}

async function getActorName(userId: string): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  return data?.name ?? null;
}

async function writeRevenueLog(input: {
  companyId: string;
  revenueId: string;
  action: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedBy: string;
  note?: string | null;
}): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("revenue_change_log").insert({
    company_id: input.companyId,
    revenue_id: input.revenueId,
    action: input.action,
    old_data: input.oldData ?? null,
    new_data: input.newData ?? null,
    changed_by: input.changedBy,
    changed_by_name: await getActorName(input.changedBy),
    note: input.note ?? null,
  });
  if (error) return { error: error.message };
  return { data: null };
}

type RevenueOwnerJoin = NonNullable<RevenueWithRelations["owner"]>;

/** Attach bilingual owner rows via property_code (revenues have no owner_id). */
async function attachOwnersToRevenues(
  revenues: RevenueWithRelations[],
  companyId: string,
): Promise<RevenueWithRelations[]> {
  if (revenues.length === 0) return revenues;

  const codes = [
    ...new Set(revenues.map((r) => r.property_code).filter(Boolean)),
  ];
  if (codes.length === 0) return revenues;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("code, owner:owners(id, name, name_en, name_ar)")
    .eq("company_id", companyId)
    .in("code", codes);

  if (error || !data) return revenues;

  const ownerByCode = new Map<string, RevenueOwnerJoin>();
  for (const row of data) {
    const owner = row.owner as RevenueOwnerJoin | RevenueOwnerJoin[] | null;
    const resolved = Array.isArray(owner) ? owner[0] : owner;
    if (row.code && resolved) ownerByCode.set(row.code, resolved);
  }

  return revenues.map((revenue) => ({
    ...revenue,
    owner: ownerByCode.get(revenue.property_code) ?? null,
  }));
}

export async function getRevenues(
  companyId: string,
  filters: RevenueFilters = {},
): Promise<ActionResult<RevenueWithRelations[]>> {
  const access = await assertRevenueManager(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();

  let query = supabase
    .from("revenues")
    .select(REVENUES_SELECT)
    .eq("company_id", companyId)
    .order("deal_completion_date", { ascending: false });

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.dateFrom) query = query.gte("deal_completion_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("deal_completion_date", filters.dateTo);

  const { data, error } = await query;
  if (error) return { error: error.message };
  const revenues = await attachOwnersToRevenues(
    (data ?? []) as RevenueWithRelations[],
    companyId,
  );
  return { data: revenues };
}

export async function getRevenue(
  id: string,
  companyId: string,
): Promise<ActionResult<RevenueWithRelations>> {
  const access = await assertRevenueManager(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("revenues")
    .select(REVENUES_SELECT)
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Revenue record not found." };
  const [revenue] = await attachOwnersToRevenues(
    [data as RevenueWithRelations],
    companyId,
  );
  return { data: revenue };
}

export interface CompleteDealInput {
  propertyId: string;
  propertyCode: string;
  emirate: string;
  areaDistrict: string | null;
  companyId: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  ownerName: string;
  commissionValue: number;
  createdBy: string | null;
  createdByName: string;
}

export async function completeDeal(
  input: CompleteDealInput,
): Promise<ActionResult<Revenue>> {
  const access = await assertRevenueManager(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();

  const { data: property, error: fetchError } = await supabase
    .from("properties")
    .select("id, listing_type")
    .eq("id", input.propertyId)
    .eq("company_id", input.companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!property) return { error: "Property not found" };

  const finalStatus =
    (property.listing_type || "").toLowerCase() === "rent" ? "Rented" : "Sold";

  const { error: propError } = await supabase
    .from("properties")
    .update({ status: finalStatus })
    .eq("id", input.propertyId);
  if (propError) return { error: propError.message };

  const { data: revenue, error: revError } = await supabase
    .from("revenues")
    .insert({
      property_code: input.propertyCode,
      emirate: input.emirate,
      area_district: input.areaDistrict,
      commission_value: input.commissionValue,
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      deal_completion_date: new Date().toISOString(),
      client_id: input.clientId,
      client_name: input.clientName,
      owner_name: input.ownerName,
      company_id: input.companyId,
      approval_status: "pending",
      commission_approval_status: "pending",
      commission_paid: false,
      commission_paid_at: null,
    })
    .select()
    .single();
  if (revError) return { error: revError.message };

  await supabase.from("property_status_history").insert({
    property_id: input.propertyId,
    status: finalStatus,
    note: `Deal completed with client ${input.clientName}`,
    created_by: input.createdBy,
    created_by_name: input.createdByName,
    company_id: input.companyId,
  });

  const log = await writeRevenueLog({
    companyId: input.companyId,
    revenueId: revenue.id,
    action: "created",
    newData: revenue as Record<string, unknown>,
    changedBy: access.data.userId,
  });
  if (log.error) return { error: log.error };

  return { data: revenue as Revenue };
}

export interface UpdateRevenueInput {
  commission_value?: number;
  notes?: string | null;
  employee_id?: string | null;
  employee_name?: string;
}

export async function updateRevenue(
  id: string,
  companyId: string,
  input: UpdateRevenueInput,
): Promise<ActionResult<Revenue>> {
  const access = await assertRevenueManager(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as UpdateRevenueInput;
  if (Object.keys(patch).length === 0) return { error: "No changes provided." };

  const supabase = await getServerSupabase();
  const { data: current, error: fetchError } = await supabase
    .from("revenues")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Revenue record not found." };

  const updatePayload: Record<string, unknown> = { ...patch };
  if (
    patch.commission_value !== undefined &&
    Number(patch.commission_value) !== Number(current.commission_value)
  ) {
    updatePayload.commission_approval_status = "pending";
    updatePayload.commission_paid = false;
    updatePayload.commission_paid_at = null;
  }

  const { data, error } = await supabase
    .from("revenues")
    .update(updatePayload)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  if (error) return { error: error.message };

  const log = await writeRevenueLog({
    companyId,
    revenueId: id,
    action: "updated",
    oldData: current as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    changedBy: access.data.userId,
  });
  if (log.error) return { error: log.error };
  return { data: data as Revenue };
}

async function setDealApproval(
  id: string,
  companyId: string,
  status: Exclude<ApprovalStatus, "pending">,
  note?: string,
): Promise<ActionResult<Revenue>> {
  const access = await assertRevenueManager(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: current, error: fetchError } = await supabase
    .from("revenues")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Revenue record not found." };

  const updatePayload: Record<string, unknown> = { approval_status: status };
  if (status === "rejected") {
    updatePayload.commission_approval_status = "rejected";
    updatePayload.commission_paid = false;
    updatePayload.commission_paid_at = null;
  }

  const { data, error } = await supabase
    .from("revenues")
    .update(updatePayload)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  if (error) return { error: error.message };

  const log = await writeRevenueLog({
    companyId,
    revenueId: id,
    action: status === "approved" ? "deal_approved" : "deal_rejected",
    oldData: current as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    changedBy: access.data.userId,
    note,
  });
  if (log.error) return { error: log.error };
  return { data: data as Revenue };
}

export async function approveRevenue(
  id: string,
  companyId: string,
): Promise<ActionResult<Revenue>> {
  return setDealApproval(id, companyId, "approved");
}

export async function rejectRevenue(
  id: string,
  companyId: string,
  note: string,
): Promise<ActionResult<Revenue>> {
  if (!note.trim()) return { error: "A rejection note is required." };
  return setDealApproval(id, companyId, "rejected", note.trim());
}

async function setCommissionApproval(
  id: string,
  companyId: string,
  status: Exclude<ApprovalStatus, "pending">,
  note?: string,
): Promise<ActionResult<Revenue>> {
  const access = await assertRevenueManager(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: current, error: fetchError } = await supabase
    .from("revenues")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Revenue record not found." };

  if ((current.approval_status || "pending") !== "approved") {
    return { error: "Approve the deal before approving commission." };
  }

  const updatePayload: Record<string, unknown> = {
    commission_approval_status: status,
  };
  if (status === "rejected") {
    updatePayload.commission_paid = false;
    updatePayload.commission_paid_at = null;
  }

  const { data, error } = await supabase
    .from("revenues")
    .update(updatePayload)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  if (error) return { error: error.message };

  const log = await writeRevenueLog({
    companyId,
    revenueId: id,
    action:
      status === "approved" ? "commission_approved" : "commission_rejected",
    oldData: current as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    changedBy: access.data.userId,
    note,
  });
  if (log.error) return { error: log.error };
  return { data: data as Revenue };
}

export async function approveCommission(
  id: string,
  companyId: string,
): Promise<ActionResult<Revenue>> {
  return setCommissionApproval(id, companyId, "approved");
}

export async function rejectCommission(
  id: string,
  companyId: string,
  note: string,
): Promise<ActionResult<Revenue>> {
  if (!note.trim()) return { error: "A rejection note is required." };
  return setCommissionApproval(id, companyId, "rejected", note.trim());
}

export async function markCommissionPaid(
  id: string,
  companyId: string,
  paid: boolean,
): Promise<ActionResult<Revenue>> {
  const access = await assertRevenueManager(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const supabase = await getServerSupabase();
  const { data: current, error: fetchError } = await supabase
    .from("revenues")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Revenue record not found." };

  if (paid) {
    if ((current.approval_status || "pending") !== "approved") {
      return { error: "Approve the deal before marking commission paid." };
    }
    if ((current.commission_approval_status || "pending") !== "approved") {
      return { error: "Approve the commission before marking it paid." };
    }
  }

  const { data, error } = await supabase
    .from("revenues")
    .update({
      commission_paid: paid,
      commission_paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();
  if (error) return { error: error.message };

  const log = await writeRevenueLog({
    companyId,
    revenueId: id,
    action: paid ? "commission_paid" : "commission_unpaid",
    oldData: current as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    changedBy: access.data.userId,
  });
  if (log.error) return { error: log.error };
  return { data: data as Revenue };
}

export async function getRevenueChangeLog(
  companyId: string,
  revenueId?: string,
): Promise<ActionResult<RevenueChangeLog[]>> {
  const access = await assertRevenueManager(companyId);
  if (access.error) return { error: access.error };

  const supabase = await getServerSupabase();
  let query = supabase
    .from("revenue_change_log")
    .select(
      `
      *,
      changed_by_profile:profiles!revenue_change_log_changed_by_fkey(
        id,
        name,
        name_en,
        name_ar,
        avatar_url,
        employee:employees!profiles_employee_id_fkey(
          first_name_en,
          first_name_ar,
          last_name_en,
          last_name_ar,
          avatar_url
        )
      )
    `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (revenueId) query = query.eq("revenue_id", revenueId);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: (data ?? []) as RevenueChangeLog[] };
}
