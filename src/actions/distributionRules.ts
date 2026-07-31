"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canAccessManagerModules, canAssignRecords } from "@/lib/permissions";
import type { ClientDistributionRule } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export async function getClientDistributionRules(
  companyId: string,
): Promise<ActionResult<ClientDistributionRule[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canAccessManagerModules(access.data.role)) {
    return { error: "Only managers can view distribution rules" };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_distribution_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as ClientDistributionRule[] };
}

export async function upsertClientDistributionRule(input: {
  id?: string;
  companyId: string;
  name: string;
  rules: Record<string, unknown>;
  isActive?: boolean;
}): Promise<ActionResult<ClientDistributionRule>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canAccessManagerModules(access.data.role)) {
    return { error: "Only managers can manage distribution rules" };
  }

  const supabase = await getServerSupabase();
  const payload = {
    company_id: input.companyId,
    name: input.name.trim(),
    rules: input.rules,
    is_active: input.isActive ?? true,
    created_by: access.data.userId,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("client_distribution_rules")
      .update({
        name: payload.name,
        rules: payload.rules,
        is_active: payload.is_active,
      })
      .eq("id", input.id)
      .eq("company_id", input.companyId)
      .select()
      .single();
    if (error) return { error: error.message };
    return { data: data as ClientDistributionRule };
  }

  const { data, error } = await supabase
    .from("client_distribution_rules")
    .insert(payload)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as ClientDistributionRule };
}

export async function deleteClientDistributionRule(
  id: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canAccessManagerModules(access.data.role)) {
    return { error: "Only managers can manage distribution rules" };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("client_distribution_rules")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: null };
}

export async function pickEmployeeByDistributionRules(
  companyId: string,
): Promise<ActionResult<string | null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canAssignRecords(access.data.role)) {
    return { error: "Only administrators and managers can auto-assign clients" };
  }

  // Administrators may create clients but distribution-rule RLS is manager-only,
  // so use the admin client only after the company/role check above.
  const admin = getSupabaseAdmin();
  const { data: rules, error: rulesError } = await admin
    .from("client_distribution_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (rulesError) return { error: rulesError.message };
  if (!rules?.length) return { data: null };

  const firstRule = rules[0];
  const currentRules = (firstRule.rules ?? {}) as Record<string, unknown>;
  if (currentRules.strategy === "manual") {
    return { data: null };
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, created_at, employee:employees!profiles_employee_id_fkey!inner(disabled)",
    )
    .eq("company_id", companyId)
    .in("role", ["sales_agent", "administrator", "manager"])
    .eq("employee.disabled", false)
    .order("created_at", { ascending: true });
  if (profilesError) return { error: profilesError.message };
  if (!profiles?.length) return { data: null };

  const lastAssigned =
    typeof currentRules.lastAssignedEmployeeId === "string"
      ? currentRules.lastAssignedEmployeeId
      : null;
  const lastIndex = profiles.findIndex((profile) => profile.id === lastAssigned);
  const nextProfile = profiles[(lastIndex + 1) % profiles.length];

  const { error: updateError } = await admin
    .from("client_distribution_rules")
    .update({
      rules: {
        ...currentRules,
        strategy: "round_robin",
        lastAssignedEmployeeId: nextProfile.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", firstRule.id)
    .eq("company_id", companyId);
  if (updateError) return { error: updateError.message };

  return { data: nextProfile.id };
}
