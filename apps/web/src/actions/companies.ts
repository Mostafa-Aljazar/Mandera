"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type { Company } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export async function getCompanies(): Promise<ActionResult<Company[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getCompany(id: string): Promise<ActionResult<Company>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
  if (error) return { error: error.message };
  return { data: data as Company };
}

export interface CompanyDashboardStats {
  totalCompanies: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
}

export async function getCompanyDashboardStats(): Promise<ActionResult<CompanyDashboardStats>> {
  const supabase = await getServerSupabase();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("is_active, subscription_end_date");
  if (error) return { error: error.message };

  const now = new Date();
  const active = (companies ?? []).filter((c) => {
    const endDate = new Date(c.subscription_end_date);
    return c.is_active && now <= endDate;
  }).length;

  return {
    data: {
      totalCompanies: (companies ?? []).length,
      activeSubscriptions: active,
      inactiveSubscriptions: (companies ?? []).length - active,
    },
  };
}

async function generateCompanyCode(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select("company_code")
    .order("company_code", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return "COMP001";

  const lastCode = data[0].company_code;
  const numPart = parseInt(lastCode.replace("COMP", ""), 10);
  return `COMP${String(numPart + 1).padStart(3, "0")}`;
}

export interface CreateCompanyInput {
  companyName: string;
  email: string;
  password: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  maxEmployeeCount: number;
}

export async function createCompany(
  input: CreateCompanyInput,
): Promise<ActionResult<{ companyCode: string }>> {
  const admin = getSupabaseAdmin();
  const companyCode = await generateCompanyCode();

  const { data: companyRecord, error: companyError } = await admin
    .from("companies")
    .insert({
      company_code: companyCode,
      company_name: input.companyName,
      email: input.email,
      subscription_start_date: input.subscriptionStartDate,
      subscription_end_date: input.subscriptionEndDate,
      max_employee_count: input.maxEmployeeCount,
      is_active: true,
    })
    .select()
    .single();

  if (companyError) return { error: companyError.message };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    await admin.from("companies").delete().eq("id", companyRecord.id);
    return { error: authError?.message || "Failed to create company admin account" };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "company_super_admin",
    company_id: companyRecord.id,
    name: input.companyName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("companies").delete().eq("id", companyRecord.id);
    return { error: profileError.message };
  }

  return { data: { companyCode } };
}

export interface UpdateCompanyInput {
  id: string;
  companyName: string;
  email: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  maxEmployeeCount: number;
}

export async function updateCompany(input: UpdateCompanyInput): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("companies")
    .update({
      company_name: input.companyName,
      email: input.email,
      subscription_start_date: input.subscriptionStartDate,
      subscription_end_date: input.subscriptionEndDate,
      max_employee_count: input.maxEmployeeCount,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function renewCompanySubscription(
  id: string,
  newEndDate: string,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("companies")
    .update({ subscription_end_date: newEndDate })
    .eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function toggleCompanyFreeze(
  id: string,
  isFrozen: boolean,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("companies").update({ is_frozen: isFrozen }).eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function deleteCompanyCascade(companyId: string): Promise<ActionResult<null>> {
  const admin = getSupabaseAdmin();

  const tablesToClear = [
    "client_status_history",
    "owner_status_history",
    "property_status_history",
    "revenues",
    "clients",
    "properties",
    "owners",
    "client_statuses",
    "owner_statuses",
    "property_types",
    "marketing_channels",
    "areas_districts",
    "employees",
  ];

  for (const table of tablesToClear) {
    const { error } = await admin.from(table).delete().eq("company_id", companyId);
    if (error) console.warn(`Could not clear related table ${table}:`, error.message);
  }

  // Delete auth users + profiles for anyone belonging to this company.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", companyId);

  for (const profile of profiles ?? []) {
    await admin.auth.admin.deleteUser(profile.id).catch((e) =>
      console.warn(`Could not delete auth user ${profile.id}:`, e),
    );
  }
  await admin.from("profiles").delete().eq("company_id", companyId);

  const { error: companyError } = await admin.from("companies").delete().eq("id", companyId);
  if (companyError) return { error: companyError.message };

  return { data: null };
}
