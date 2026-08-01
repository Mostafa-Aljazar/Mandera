"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { isAdministratorOrAbove, companyRolesFilter } from "@/lib/permissions";
import {
  bilingualNotifyToken,
  enrichNotificationBodyWithActors,
  enrichNotificationBodyWithProperty,
  normalizeActorLookupKey,
} from "@/lib/notificationCopy";
import type { AppNotification } from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/** Bilingual actor label for notification bodies ([[en|||ar]]). */
export async function bilingualActorNotifyLabel(
  userId: string | null | undefined,
  fallback?: string | null,
): Promise<string> {
  const fallbackTrim = (fallback ?? "").trim();
  if (!userId) return bilingualNotifyToken(fallbackTrim, null) || fallbackTrim;

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select(
      "name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!data) return bilingualNotifyToken(fallbackTrim, null) || fallbackTrim;

  const empRaw = (data as { employee?: unknown }).employee;
  const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;
  const empRec = emp as {
    first_name_en?: string | null;
    first_name_ar?: string | null;
    last_name_en?: string | null;
    last_name_ar?: string | null;
  } | null;
  const en =
    [empRec?.first_name_en, empRec?.last_name_en].filter(Boolean).join(" ").trim() ||
    (data.name_en || "").trim() ||
    (data.name || "").trim() ||
    fallbackTrim;
  const ar =
    [empRec?.first_name_ar, empRec?.last_name_ar].filter(Boolean).join(" ").trim() ||
    (data.name_ar || "").trim();

  return bilingualNotifyToken(en, ar) || fallbackTrim;
}

function propertyIdFromNotification(n: AppNotification): string | null {
  if (n.entity_type === "property" && n.entity_id) return n.entity_id;
  const fromLink = n.link?.match(
    /\/company\/properties\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return fromLink?.[1] ?? null;
}

function registerActorNames(
  map: Map<string, string>,
  en: string,
  ar: string,
) {
  const token = bilingualNotifyToken(en, ar);
  if (!token) return;
  if (en) map.set(normalizeActorLookupKey(en), token);
  if (ar) map.set(normalizeActorLookupKey(ar), token);
}

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

  const rows = (data ?? []) as AppNotification[];
  const propertyIds = [
    ...new Set(
      rows.map(propertyIdFromNotification).filter(Boolean) as string[],
    ),
  ];
  const companyIds = [
    ...new Set(rows.map((n) => n.company_id).filter(Boolean)),
  ];

  const [{ data: properties }, { data: profiles }] = await Promise.all([
    propertyIds.length > 0
      ? supabase
          .from("properties")
          .select("id, code, title, title_ar")
          .in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; code: string | null; title: string | null; title_ar: string | null }[] }),
    companyIds.length > 0
      ? supabase
          .from("profiles")
          .select(
            "company_id, name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(first_name_en, first_name_ar, last_name_en, last_name_ar)",
          )
          .in("company_id", companyIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const byId = new Map(
    (properties ?? []).map((p) => [
      p.id as string,
      {
        code: p.code as string | null,
        title: p.title as string | null,
        title_ar: (p as { title_ar?: string | null }).title_ar ?? null,
      },
    ]),
  );

  const actorsByName = new Map<string, string>();
  for (const row of profiles ?? []) {
    const profile = row as {
      name?: string | null;
      name_en?: string | null;
      name_ar?: string | null;
      employee?:
        | {
            first_name_en?: string | null;
            first_name_ar?: string | null;
            last_name_en?: string | null;
            last_name_ar?: string | null;
          }
        | Array<{
            first_name_en?: string | null;
            first_name_ar?: string | null;
            last_name_en?: string | null;
            last_name_ar?: string | null;
          }>
        | null;
    };
    const empRaw = profile.employee;
    const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw;
    const en =
      [emp?.first_name_en, emp?.last_name_en].filter(Boolean).join(" ").trim() ||
      (profile.name_en || "").trim() ||
      (profile.name || "").trim();
    const ar =
      [emp?.first_name_ar, emp?.last_name_ar].filter(Boolean).join(" ").trim() ||
      (profile.name_ar || "").trim();
    registerActorNames(actorsByName, en, ar);
    if (profile.name) registerActorNames(actorsByName, profile.name, ar || en);
  }

  return {
    data: rows.map((n) => {
      const propertyId = propertyIdFromNotification(n);
      const property = propertyId ? byId.get(propertyId) ?? null : null;
      let body = enrichNotificationBodyWithProperty(n.body, property);
      body = enrichNotificationBodyWithActors(body, actorsByName);
      return body === n.body ? n : { ...n, body };
    }),
  };
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
    drafts: number;
    staleDrafts: number;
    changeRequests: number;
    statusChanges: number;
  }>
> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!isAdministratorOrAbove(access.data.role)) {
    return {
      data: {
        total: 0,
        newListings: 0,
        drafts: 0,
        staleDrafts: 0,
        changeRequests: 0,
        statusChanges: 0,
      },
    };
  }

  const supabase = await getServerSupabase();

  // Stale-draft window from company notification_settings (default 3 days).
  const { data: company } = await supabase
    .from("companies")
    .select("notification_settings")
    .eq("id", companyId)
    .maybeSingle();
  const settings =
    (company?.notification_settings as Record<string, unknown> | null) ?? {};
  const configuredDays = Number(settings.draft_stale_days);
  const staleDays =
    Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 3;
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - staleDays);

  const [
    { count: pendingProps },
    { count: draftProps },
    { count: staleDraftProps },
    { count: pendingChanges },
    { count: pendingStatuses },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("approval_status", "pending_review"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("approval_status", "draft"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("approval_status", "draft")
      .lt("updated_at", staleCutoff.toISOString()),
    supabase
      .from("property_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["pending", "changes_requested"]),
    supabase
      .from("property_status_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending"),
  ]);

  const newListings = pendingProps ?? 0;
  const drafts = draftProps ?? 0;
  const staleDrafts = staleDraftProps ?? 0;
  const changeRequests = pendingChanges ?? 0;
  const statusChanges = pendingStatuses ?? 0;

  return {
    data: {
      total: newListings + drafts + changeRequests + statusChanges,
      newListings,
      drafts,
      staleDrafts,
      changeRequests,
      statusChanges,
    },
  };
}

/** Keep companyRolesFilter import used for type-consistency in this module. */
void companyRolesFilter;
