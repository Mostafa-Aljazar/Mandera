"use server";

import { assertCompanyMember } from "@/actions/_access";
import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { canAccessManagerModules } from "@/lib/permissions";

type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export interface CompanyTeam {
  id: string;
  company_id: string;
  name_en: string;
  name_ar: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyBranch extends CompanyTeam {
  address: string | null;
  phone: string | null;
}

export interface MessageTemplate {
  id: string;
  company_id: string;
  name: string;
  channel: string;
  body_en: string;
  body_ar: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyJsonSettings {
  whatsapp_settings: Record<string, unknown>;
  notification_settings: Record<string, unknown>;
  publish_settings: Record<string, unknown>;
}

async function assertManager(companyId: string): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canAccessManagerModules(access.data.role)) {
    return { error: "Only managers can manage company settings" };
  }
  return { data: null };
}

export async function getCompanyTeams(
  companyId: string,
): Promise<ActionResult<CompanyTeam[]>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("company_teams")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) return { error: error.message };
  return { data: (data ?? []) as CompanyTeam[] };
}

export async function upsertCompanyTeam(input: {
  id?: string;
  companyId: string;
  name_en: string;
  name_ar: string;
}): Promise<ActionResult<CompanyTeam>> {
  const access = await assertManager(input.companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const payload = {
    company_id: input.companyId,
    name_en: input.name_en.trim(),
    name_ar: input.name_ar.trim(),
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase
        .from("company_teams")
        .update(payload)
        .eq("id", input.id)
        .eq("company_id", input.companyId)
    : supabase.from("company_teams").insert(payload);
  const { data, error } = await query.select().single();
  if (error) return { error: error.message };
  return { data: data as CompanyTeam };
}

export async function deleteCompanyTeam(
  id: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("company_teams")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: null };
}

export async function getCompanyBranches(
  companyId: string,
): Promise<ActionResult<CompanyBranch[]>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("company_branches")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) return { error: error.message };
  return { data: (data ?? []) as CompanyBranch[] };
}

export async function upsertCompanyBranch(input: {
  id?: string;
  companyId: string;
  name_en: string;
  name_ar: string;
  address?: string;
  phone?: string;
}): Promise<ActionResult<CompanyBranch>> {
  const access = await assertManager(input.companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const payload = {
    company_id: input.companyId,
    name_en: input.name_en.trim(),
    name_ar: input.name_ar.trim(),
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase
        .from("company_branches")
        .update(payload)
        .eq("id", input.id)
        .eq("company_id", input.companyId)
    : supabase.from("company_branches").insert(payload);
  const { data, error } = await query.select().single();
  if (error) return { error: error.message };
  return { data: data as CompanyBranch };
}

export async function deleteCompanyBranch(
  id: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("company_branches")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: null };
}

export async function getMessageTemplates(
  companyId: string,
): Promise<ActionResult<MessageTemplate[]>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) return { error: error.message };
  return { data: (data ?? []) as MessageTemplate[] };
}

export async function upsertMessageTemplate(input: {
  id?: string;
  companyId: string;
  name: string;
  channel?: string;
  body_en: string;
  body_ar: string;
}): Promise<ActionResult<MessageTemplate>> {
  const access = await assertManager(input.companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const payload = {
    company_id: input.companyId,
    name: input.name.trim(),
    channel: input.channel?.trim() || "whatsapp",
    body_en: input.body_en.trim(),
    body_ar: input.body_ar.trim(),
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase
        .from("message_templates")
        .update(payload)
        .eq("id", input.id)
        .eq("company_id", input.companyId)
    : supabase.from("message_templates").insert(payload);
  const { data, error } = await query.select().single();
  if (error) return { error: error.message };
  return { data: data as MessageTemplate };
}

export async function deleteMessageTemplate(
  id: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: null };
}

export async function getCompanyJsonSettings(
  companyId: string,
): Promise<ActionResult<CompanyJsonSettings>> {
  const access = await assertCompanyMember(companyId);
  if (access.error) return { error: access.error };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select("whatsapp_settings, notification_settings, publish_settings")
    .eq("id", companyId)
    .single();
  if (error) return { error: error.message };
  return {
    data: {
      whatsapp_settings: data.whatsapp_settings ?? {},
      notification_settings: data.notification_settings ?? {},
      publish_settings: data.publish_settings ?? {},
    } as CompanyJsonSettings,
  };
}

export async function updateCompanyJsonSettings(
  companyId: string,
  patch: Partial<CompanyJsonSettings>,
): Promise<ActionResult<CompanyJsonSettings>> {
  const access = await assertManager(companyId);
  if (access.error) return { error: access.error };

  const allowedPatch: Partial<CompanyJsonSettings> = {};
  if (patch.whatsapp_settings) {
    allowedPatch.whatsapp_settings = patch.whatsapp_settings;
  }
  if (patch.notification_settings) {
    allowedPatch.notification_settings = patch.notification_settings;
  }
  if (patch.publish_settings) {
    allowedPatch.publish_settings = patch.publish_settings;
  }
  if (Object.keys(allowedPatch).length === 0) {
    return getCompanyJsonSettings(companyId);
  }

  // Company writes are manager-authorized above, then use the admin client
  // because companies RLS only permits platform-level writes.
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("companies")
    .update(allowedPatch)
    .eq("id", companyId)
    .select("whatsapp_settings, notification_settings, publish_settings")
    .single();
  if (error) return { error: error.message };
  return { data: data as CompanyJsonSettings };
}
