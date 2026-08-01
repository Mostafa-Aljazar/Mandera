"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAccessContext } from "@/actions/_access";
import { isMasterAdmin } from "@/lib/permissions";
import type { IdentityFieldAudit } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const CLIENT_CORRECTABLE_FIELDS = new Set([
  "name",
  "name_en",
  "name_ar",
  "phone",
  "country_code",
]);

const OWNER_CORRECTABLE_FIELDS = new Set([
  "name",
  "name_en",
  "name_ar",
  "phone",
  "country",
]);

export type IdentityEntitySummary = {
  id: string;
  entityType: "client" | "owner";
  name_en: string;
  name_ar: string;
  phone: string;
  countryOrCode: string;
  company_id: string;
};

export interface CorrectIdentityFieldInput {
  entityType: "client" | "owner";
  entityId: string;
  fieldName: string;
  newValue: string;
  reason: string;
  /** Required free-text: who asked for the correction (PDF: طالب التعديل). */
  requesterName: string;
  /** Optional profile UUID of the requester when known. */
  requestedBy?: string | null;
  companyId?: string | null;
}

async function requireMasterAdmin(): Promise<
  ActionResult<{ userId: string }>
> {
  const access = await getAccessContext();
  if (access.error || !access.data) {
    return { error: access.error || "Not authenticated" };
  }
  if (!isMasterAdmin(access.data.role)) {
    return { error: "Only Master Admin can access identity corrections." };
  }
  return { data: { userId: access.data.userId } };
}

/**
 * Master Admin — find a client or owner in a company by UUID or phone.
 */
export async function findIdentityEntity(input: {
  companyId: string;
  entityType: "client" | "owner";
  query: string;
}): Promise<ActionResult<IdentityEntitySummary[]>> {
  const auth = await requireMasterAdmin();
  if (auth.error || !auth.data) return { error: auth.error || "Access denied" };

  const query = input.query.trim();
  if (!query) return { error: "Enter an ID or phone number to search." };
  if (!input.companyId) return { error: "Company is required." };

  const admin = getSupabaseAdmin();

  const toSummary = (
    row: {
      id: string;
      name_en: string | null;
      name_ar: string | null;
      phone: string | null;
      company_id: string;
      country_code?: string | null;
      country?: string | null;
    },
  ): IdentityEntitySummary => ({
    id: row.id,
    entityType: input.entityType,
    name_en: row.name_en ?? "",
    name_ar: row.name_ar ?? "",
    phone: row.phone ?? "",
    countryOrCode:
      input.entityType === "client"
        ? (row.country_code ?? "")
        : (row.country ?? ""),
    company_id: row.company_id,
  });

  if (input.entityType === "client") {
    const { data: byId, error: idError } = await admin
      .from("clients")
      .select("id, name_en, name_ar, phone, country_code, company_id")
      .eq("company_id", input.companyId)
      .eq("id", query)
      .maybeSingle();
    if (idError) return { error: idError.message };
    if (byId) return { data: [toSummary(byId)] };

    const { data: byPhone, error: phoneError } = await admin
      .from("clients")
      .select("id, name_en, name_ar, phone, country_code, company_id")
      .eq("company_id", input.companyId)
      .ilike("phone", `%${query}%`)
      .limit(20);
    if (phoneError) return { error: phoneError.message };
    return { data: (byPhone ?? []).map(toSummary) };
  }

  const { data: byId, error: idError } = await admin
    .from("owners")
    .select("id, name_en, name_ar, phone, country, company_id")
    .eq("company_id", input.companyId)
    .eq("id", query)
    .maybeSingle();
  if (idError) return { error: idError.message };
  if (byId) return { data: [toSummary(byId)] };

  const { data: byPhone, error: phoneError } = await admin
    .from("owners")
    .select("id, name_en, name_ar, phone, country, company_id")
    .eq("company_id", input.companyId)
    .ilike("phone", `%${query}%`)
    .limit(20);
  if (phoneError) return { error: phoneError.message };
  return { data: (byPhone ?? []).map(toSummary) };
}

export async function listIdentityFieldAudit(input: {
  companyId: string;
  limit?: number;
}): Promise<
  ActionResult<
    (IdentityFieldAudit & {
      performer_name?: string | null;
    })[]
  >
> {
  const auth = await requireMasterAdmin();
  if (auth.error || !auth.data) return { error: auth.error || "Access denied" };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("identity_field_audit")
    .select("*")
    .eq("company_id", input.companyId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 25);

  if (error) return { error: error.message };

  const rows = (data ?? []) as IdentityFieldAudit[];
  const performerIds = [
    ...new Set(rows.map((r) => r.performed_by).filter(Boolean)),
  ];
  const nameById = new Map<string, string>();
  if (performerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name")
      .in("id", performerIds);
    for (const p of profiles ?? []) {
      nameById.set(p.id, p.name || p.id);
    }
  }

  return {
    data: rows.map((row) => ({
      ...row,
      performer_name: nameById.get(row.performed_by) ?? row.performed_by,
    })),
  };
}

/**
 * Master Admin only — correct a locked identity field on a client or owner
 * and write an identity_field_audit row (via DB RPC so the immutability
 * trigger allows the write inside one transaction).
 */
export async function correctIdentityField(
  input: CorrectIdentityFieldInput,
): Promise<ActionResult<{ entity: Record<string, unknown>; audit: IdentityFieldAudit }>> {
  const access = await getAccessContext();
  if (access.error || !access.data) return { error: access.error || "Not authenticated" };
  if (!isMasterAdmin(access.data.role)) {
    return { error: "Only Master Admin can correct identity fields." };
  }

  const reason = input.reason.trim();
  if (!reason) return { error: "A reason is required for identity corrections." };
  const requesterName = input.requesterName.trim();
  if (!requesterName) {
    return { error: "Requester name is required for identity corrections." };
  }

  const allowed =
    input.entityType === "client"
      ? CLIENT_CORRECTABLE_FIELDS
      : OWNER_CORRECTABLE_FIELDS;
  if (!allowed.has(input.fieldName)) {
    return { error: `Field "${input.fieldName}" cannot be corrected.` };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("master_correct_identity_field", {
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_field_name: input.fieldName,
    p_new_value: input.newValue.trim(),
    p_reason: reason,
    p_requester_name: requesterName,
    p_performed_by: access.data.userId,
    p_requested_by: input.requestedBy ?? null,
    p_company_id: input.companyId ?? null,
  });

  if (error) return { error: error.message };

  const payload = data as {
    entity?: Record<string, unknown>;
    audit?: IdentityFieldAudit;
  } | null;

  if (!payload?.entity || !payload?.audit) {
    return { error: "Identity correction failed." };
  }

  return {
    data: {
      entity: payload.entity,
      audit: payload.audit,
    },
  };
}
