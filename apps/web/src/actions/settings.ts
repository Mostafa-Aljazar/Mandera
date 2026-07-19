"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type {
  PropertyType,
  ClientStatus,
  OwnerStatus,
  MarketingChannelRecord,
  AreaDistrict,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

// --- Property Types ---

export async function createPropertyType(
  companyId: string,
  name: string,
): Promise<ActionResult<PropertyType>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .insert({ name, company_id: companyId })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updatePropertyType(
  id: string,
  name: string,
): Promise<ActionResult<PropertyType>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_types")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deletePropertyType(id: string): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("property_types").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Client Statuses ---

export async function createClientStatus(
  companyId: string,
  name: string,
  priorityOrder: number,
): Promise<ActionResult<ClientStatus>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .insert({ name, company_id: companyId, priority_order: priorityOrder })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateClientStatus(
  id: string,
  name: string,
  priorityOrder: number,
): Promise<ActionResult<ClientStatus>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("client_statuses")
    .update({ name, priority_order: priorityOrder })
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
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("client_statuses").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Owner Statuses ---

export async function createOwnerStatus(
  companyId: string,
  name: string,
): Promise<ActionResult<OwnerStatus>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_statuses")
    .insert({ name, company_id: companyId })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateOwnerStatus(
  id: string,
  name: string,
): Promise<ActionResult<OwnerStatus>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("owner_statuses")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteOwnerStatus(id: string): Promise<ActionResult<null>> {
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
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("areas_districts").delete().eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

// --- Employees list (read-only, for the Settings "Employees" tab) ---

export async function getCompanyEmployeesWithDetails(
  companyId: string,
): Promise<ActionResult<CompanyEmployeeWithDetails[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, company_id, employee_id, name, employee:employees!profiles_employee_id_fkey(*)")
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"]);
  if (error) return { error: error.message };
  return { data: (data ?? []) as unknown as CompanyEmployeeWithDetails[] };
}
