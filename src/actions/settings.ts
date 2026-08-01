"use server";

import { assertCompanyMember } from "@/actions/_access";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  canViewCompanySettings,
  companyRolesFilter,
} from "@/lib/permissions";
import type {
  PropertyType,
  ClientStatus,
  OwnerStatus,
  MarketingChannelRecord,
  AreaDistrict,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function assertSettingsManager(
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can manage company settings" };
  }
  return { data: null };
}

async function assertSettingsManagerByRow(
  table:
    | "property_types"
    | "client_statuses"
    | "owner_statuses"
    | "marketing_channels"
    | "areas_districts",
  id: string,
): Promise<ActionResult<{ companyId: string }>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data?.company_id) return { error: "Not found" };
  const access = await assertSettingsManager(data.company_id);
  if (access.error) return { error: access.error };
  return { data: { companyId: data.company_id } };
}

// --- Property Types ---

export async function createPropertyType(
  companyId: string,
  nameEn: string,
  nameAr: string,
): Promise<ActionResult<PropertyType>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .insert({
      name_en: nameEn,
      name_ar: nameAr,
      company_id: companyId,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updatePropertyType(
  id: string,
  nameEn: string,
  nameAr: string,
): Promise<ActionResult<PropertyType>> {
  const access = await assertSettingsManagerByRow("property_types", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .update({
      name_en: nameEn,
      name_ar: nameAr,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deletePropertyType(id: string): Promise<ActionResult<null>> {
  const access = await assertSettingsManagerByRow("property_types", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("property_types").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Client Statuses ---

export async function createClientStatus(
  companyId: string,
  nameEn: string,
  nameAr: string,
  priorityOrder: number,
): Promise<ActionResult<ClientStatus>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .insert({
      name_en: nameEn,
      name_ar: nameAr,
      company_id: companyId,
      priority_order: priorityOrder,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateClientStatus(
  id: string,
  nameEn: string,
  nameAr: string,
  priorityOrder: number,
): Promise<ActionResult<ClientStatus>> {
  const access = await assertSettingsManagerByRow("client_statuses", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .update({
      name_en: nameEn,
      name_ar: nameAr,
      priority_order: priorityOrder,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateClientStatusPriority(
  id: string,
  priorityOrder: number,
): Promise<ActionResult<ClientStatus>> {
  const access = await assertSettingsManagerByRow("client_statuses", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .update({ priority_order: priorityOrder })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteClientStatus(id: string): Promise<ActionResult<null>> {
  const access = await assertSettingsManagerByRow("client_statuses", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("client_statuses").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Owner Statuses ---

export async function createOwnerStatus(
  companyId: string,
  nameEn: string,
  nameAr: string,
): Promise<ActionResult<OwnerStatus>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_statuses")
    .insert({
      name_en: nameEn,
      name_ar: nameAr,
      company_id: companyId,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateOwnerStatus(
  id: string,
  nameEn: string,
  nameAr: string,
): Promise<ActionResult<OwnerStatus>> {
  const access = await assertSettingsManagerByRow("owner_statuses", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_statuses")
    .update({
      name_en: nameEn,
      name_ar: nameAr,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteOwnerStatus(id: string): Promise<ActionResult<null>> {
  const access = await assertSettingsManagerByRow("owner_statuses", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("owner_statuses").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Marketing Channels ---

export async function getMarketingChannels(
  companyId: string,
): Promise<ActionResult<MarketingChannelRecord[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("marketing_channels")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function createMarketingChannel(
  companyId: string,
  name: string,
): Promise<ActionResult<MarketingChannelRecord>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("marketing_channels")
    .insert({ name, company_id: companyId })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateMarketingChannel(
  id: string,
  name: string,
): Promise<ActionResult<MarketingChannelRecord>> {
  const access = await assertSettingsManagerByRow("marketing_channels", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("marketing_channels")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteMarketingChannel(id: string): Promise<ActionResult<null>> {
  const access = await assertSettingsManagerByRow("marketing_channels", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("marketing_channels").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Areas & Districts ---

export async function createAreaDistrict(
  companyId: string,
  emirate: string,
  name: string,
  description?: string,
): Promise<ActionResult<AreaDistrict>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("areas_districts")
    .insert({ name, emirate, description: description || null, company_id: companyId })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateAreaDistrict(
  id: string,
  name: string,
  description?: string,
): Promise<ActionResult<AreaDistrict>> {
  const access = await assertSettingsManagerByRow("areas_districts", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("areas_districts")
    .update({ name, description: description || null })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteAreaDistrict(id: string): Promise<ActionResult<null>> {
  const access = await assertSettingsManagerByRow("areas_districts", id);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("areas_districts").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Employees list (read-only, for the Settings "Employees" tab) ---

export async function getCompanyEmployeesWithDetails(
  companyId: string,
): Promise<ActionResult<CompanyEmployeeWithDetails[]>> {
  const access = await assertSettingsManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, company_id, employee_id, name, employee:employees!profiles_employee_id_fkey(*)")
    .eq("company_id", companyId)
    .in("role", companyRolesFilter());
  if (error) return { error: error.message };
  return { data: (data ?? []) as unknown as CompanyEmployeeWithDetails[] };
}
