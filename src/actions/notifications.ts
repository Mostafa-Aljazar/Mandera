"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { isAdministratorOrAbove, companyRolesFilter } from "@/lib/permissions";
import type { AppNotification } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export async function getMyNotifications(
  limit = 50,
): Promise<ActionResult<AppNotification[]>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };
  return { data: (data ?? []) as AppNotification[] };
}

export async function getUnreadNotificationCount(): Promise<ActionResult<number>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { data: count ?? 0 };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult<{ ok: true }>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) return { error: error.message };
  return { data: { ok: true } };
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ ok: true }>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { data: { ok: true } };
}

export async function notifyCompanyAdministrators(input: {
  companyId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** Also notify managers (default true for critical property events). */
  includeManagers?: boolean;
}): Promise<ActionResult<{ sent: number }>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };

  const admin = getSupabaseAdmin();

  // Honour company notification_settings toggles (missing key = enabled).
  const { data: company } = await admin
    .from("companies")
    .select("notification_settings")
    .eq("id", input.companyId)
    .maybeSingle();
  const settings =
    (company?.notification_settings as Record<string, unknown> | null) ?? {};
  if (settings[input.type] === false) {
    return { data: { sent: 0 } };
  }

  const roles = input.includeManagers === false
    ? (["administrator"] as const)
    : (["administrator", "manager"] as const);

  const { data: recipients, error } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", input.companyId)
    .in("role", [...roles]);

  if (error) return { error: error.message };
  if (!recipients?.length) return { data: { sent: 0 } };

  const rows = recipients.map((r) => ({
    company_id: input.companyId,
    recipient_id: r.id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  }));

  const { error: insertError } = await admin.from("notifications").insert(rows);
  if (insertError) return { error: insertError.message };
  return { data: { sent: rows.length } };
}

export async function notifyUser(input: {
  companyId: string;
  recipientId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}): Promise<ActionResult<{ ok: true }>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error) return { error: access.error };

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("notifications").insert({
    company_id: input.companyId,
    recipient_id: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });

  if (error) return { error: error.message };
  return { data: { ok: true } };
}

export async function getPendingApprovalsCount(
  companyId: string,
): Promise<
  ActionResult<{
    total: number;
    newListings: number;
    changeRequests: number;
    statusChanges: number;
  }>
> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isAdministratorOrAbove(access.data.role)) {
    return { data: { total: 0, newListings: 0, changeRequests: 0, statusChanges: 0 } };
  }

  const supabase = await getServerSupabase();
  const [{ count: pendingProps }, { count: pendingChanges }, { count: pendingStatuses }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("approval_status", "pending_review"),
      supabase
        .from("property_change_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "pending"),
      supabase
        .from("property_status_change_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "pending"),
    ]);

  const newListings = pendingProps ?? 0;
  const changeRequests = pendingChanges ?? 0;
  const statusChanges = pendingStatuses ?? 0;

  return {
    data: {
      total: newListings + changeRequests + statusChanges,
      newListings,
      changeRequests,
      statusChanges,
    },
  };
}

/** Keep companyRolesFilter import used for type-consistency in this module. */
void companyRolesFilter;
