"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import {
  canManageEmployees,
  companyRolesFilter,
  jobTitleForRole,
  type CompanyRole,
} from "@/lib/permissions";
import type {
  EmployeeRecord,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeToDelete,
  ReassignmentTargets,
} from "@/actions/employee-types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/**
 * Force-logout an auth user: ban (or unban) + best-effort wipe of all
 * refresh-token sessions so they cannot keep using the app after disable/delete.
 */
async function syncAuthAccessForEmployee(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  mode: "ban" | "unban" | "revoke",
): Promise<void> {
  if (mode === "unban") {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (error) {
      console.warn("[employees] unban auth user:", error.message);
    }
    return;
  }

  if (mode === "ban") {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      // ~100 years — blocks new logins until explicitly unbanned on re-enable.
      ban_duration: "876000h",
    });
    if (error) {
      console.warn("[employees] ban auth user:", error.message);
    }
  }

  // Wipe sessions so refresh tokens die immediately (JWT access tokens still
  // expire naturally — GoTrue cannot revoke a JWT mid-lifetime).
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return;
    const res = await fetch(`${url}/auth/v1/admin/users/${userId}/sessions`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    });
    if (!res.ok && res.status !== 404) {
      console.warn(
        "[employees] revoke sessions:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.warn("[employees] revoke sessions failed:", err);
  }
}

const COMPANY_EMPLOYEE_SELECT = "*, employee:employees!profiles_employee_id_fkey(*)";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * Ensures the current session may access this company. Uses the admin client
 * to read the caller's profile (profiles RLS historically only allowed
 * selecting your own row).
 */
async function assertCompanyAccess(
  companyId: string,
): Promise<
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string }
> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const admin = getSupabaseAdmin();
  const { data: me, error } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!me) return { ok: false, error: "Unauthorized" };
  if (me.role === "master_admin") {
    return { ok: true, userId: user.id, role: me.role };
  }
  if (!me.company_id || me.company_id !== companyId) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, userId: user.id, role: me.role };
}

async function uploadEmployeeAvatar(
  companyId: string,
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Employee photo must be less than 2MB." };
  }

  const admin = getSupabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${companyId}/employees/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("company-files").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("company-files").getPublicUrl(path);
  return { url: data.publicUrl };
}

async function withAuthEmails(
  rows: CompanyEmployeeWithDetails[],
): Promise<CompanyEmployeeWithDetails[]> {
  const admin = getSupabaseAdmin();
  return Promise.all(
    rows.map(async (row) => {
      const fromEmployee = row.employee?.email;
      if (fromEmployee) {
        return { ...row, email: fromEmployee };
      }
      try {
        const { data } = await admin.auth.admin.getUserById(row.id);
        return { ...row, email: data.user?.email ?? undefined };
      } catch {
        return row;
      }
    }),
  );
}

export async function getCompanyEmployees(
  companyId: string,
): Promise<ActionResult<CompanyEmployeeWithDetails[]>> {
  const access = await assertCompanyAccess(companyId);
  if (access.ok !== true) return { error: access.error };
  if (!canManageEmployees(access.role)) {
    return { error: "Only managers can manage employees." };
  }

  // Admin client: profiles RLS previously blocked listing teammates.
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select(COMPANY_EMPLOYEE_SELECT)
    .eq("company_id", companyId)
    .in("role", companyRolesFilter())
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  const rows = (data ?? []) as unknown as CompanyEmployeeWithDetails[];
  return { data: await withAuthEmails(rows) };
}

export async function getCompanyEmployee(
  profileId: string,
  companyId: string,
): Promise<ActionResult<CompanyEmployeeWithDetails>> {
  const access = await assertCompanyAccess(companyId);
  if (access.ok !== true) return { error: access.error };
  if (!canManageEmployees(access.role)) {
    return { error: "Only managers can manage employees." };
  }

  const admin = getSupabaseAdmin();

  const byProfile = await admin
    .from("profiles")
    .select(COMPANY_EMPLOYEE_SELECT)
    .eq("id", profileId)
    .eq("company_id", companyId)
    .in("role", companyRolesFilter())
    .maybeSingle();

  if (byProfile.error) return { error: byProfile.error.message };

  let row = byProfile.data as unknown as CompanyEmployeeWithDetails | null;

  // Legacy links used the `employees.id` instead of the profile id.
  if (!row) {
    const byEmployee = await admin
      .from("profiles")
      .select(COMPANY_EMPLOYEE_SELECT)
      .eq("employee_id", profileId)
      .eq("company_id", companyId)
      .in("role", companyRolesFilter())
      .maybeSingle();

    if (byEmployee.error) return { error: byEmployee.error.message };
    row = byEmployee.data as unknown as CompanyEmployeeWithDetails | null;
  }

  if (!row) return { error: "Employee not found" };
  const [enriched] = await withAuthEmails([row]);
  return { data: enriched };
}

export async function getBaseEmployees(
  companyId: string,
): Promise<ActionResult<EmployeeRecord[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can list employees." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getEmployeeCount(companyId?: string): Promise<ActionResult<number>> {
  if (!companyId) return { data: 0 };

  const access = await assertCompanyAccess(companyId);
  if (access.ok !== true) return { error: access.error };

  const admin = getSupabaseAdmin();
  // Seat usage includes the company admin + employees (profiles), not only
  // rows in `employees` — admin is provisioned without an employees record.
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("role", companyRolesFilter());

  if (error) return { error: error.message };
  return { data: count ?? 0 };
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<ActionResult<null>> {
  if (!input.companyId) {
    return { error: "Company is required." };
  }
  if (!input.email?.trim() || !input.password) {
    return { error: "Email and password are required." };
  }

  const access = await assertCompanyAccess(input.companyId);
  if (access.ok !== true) return { error: access.error };
  if (!canManageEmployees(access.role)) {
    return { error: "Only managers can create employees." };
  }

  const admin = getSupabaseAdmin();

  let avatarUrl: string | null = null;
  if (input.avatar instanceof File) {
    const upload = await uploadEmployeeAvatar(input.companyId, input.avatar);
    if (upload.error) return { error: upload.error };
    avatarUrl = upload.url ?? null;
  }

  const firstNameEn = input.first_name_en.trim();
  const firstNameAr = input.first_name_ar.trim();
  const lastNameEn = input.last_name_en.trim();
  const lastNameAr = input.last_name_ar.trim();
  const email = input.email.trim().toLowerCase();
  const nameEn = `${firstNameEn} ${lastNameEn}`.trim();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    const msg = authError?.message || "Failed to create employee account";
    if (/already.*(registered|exists|been)/i.test(msg)) {
      return {
        error:
          "An account with this email already exists. Use a different email.",
      };
    }
    return { error: msg };
  }

  const { data: employeeRecord, error: employeeError } = await admin
    .from("employees")
    .insert({
      first_name_en: firstNameEn,
      first_name_ar: firstNameAr,
      last_name_en: lastNameEn,
      last_name_ar: lastNameAr,
      email,
      phone: input.phone,
      job_title: input.job_title,
      company_id: input.companyId,
      disabled: false,
      avatar_url: avatarUrl,
      team_id: input.team_id ?? null,
      reports_to_employee_id: input.reports_to_employee_id ?? null,
      branch_id: input.branch_id ?? null,
    })
    .select()
    .single();

  if (employeeError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: employeeError.message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: input.role || "sales_agent",
    company_id: input.companyId,
    employee_id: employeeRecord.id,
    name: nameEn,
  });

  if (profileError) {
    await admin.from("employees").delete().eq("id", employeeRecord.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { data: null };
}

export async function updateEmployee(
  input: UpdateEmployeeInput,
): Promise<ActionResult<null>> {
  if (!input.companyId) return { error: "Company is required." };

  const access = await assertCompanyAccess(input.companyId);
  if (access.ok !== true) return { error: access.error };

  const canManageOthers = canManageEmployees(access.role);
  if (!canManageOthers && access.userId !== input.profileId) {
    return { error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();
  const nameEn = `${input.first_name_en} ${input.last_name_en}`.trim();
  // Non-managers cannot escalate or change their own role.
  const nextRole = canManageOthers ? input.role : undefined;

  let employeeId = input.employeeId;

  // Company admins are often provisioned without an `employees` row.
  // Create one so bilingual names + avatar can be stored.
  if (!employeeId && input.companyId) {
    if (!canManageOthers) {
      return { error: "Unauthorized" };
    }
    const { data: created, error: createError } = await admin
      .from("employees")
      .insert({
        first_name_en: input.first_name_en,
        first_name_ar: input.first_name_ar || input.first_name_en,
        last_name_en: input.last_name_en,
        last_name_ar: input.last_name_ar || input.last_name_en,
        email: input.email,
        phone: input.phone || "N/A",
        job_title: input.job_title || "administrator",
        company_id: input.companyId,
        disabled: false,
        team_id: input.team_id ?? null,
        reports_to_employee_id: input.reports_to_employee_id ?? null,
        branch_id: input.branch_id ?? null,
      })
      .select("id")
      .single();
    if (createError) return { error: createError.message };
    employeeId = created.id;

    const { error: linkError } = await admin
      .from("profiles")
      .update({
        name: nameEn,
        role: nextRole || input.role,
        employee_id: employeeId,
      })
      .eq("id", input.profileId);
    if (linkError) return { error: linkError.message };
  } else {
    const profilePatch: Record<string, unknown> = { name: nameEn };
    if (nextRole) profilePatch.role = nextRole;
    const { error: profileError } = await admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", input.profileId);
    if (profileError) return { error: profileError.message };
  }

  if (employeeId) {
    const patch: Record<string, unknown> = {
      first_name_en: input.first_name_en,
      first_name_ar: input.first_name_ar || input.first_name_en,
      last_name_en: input.last_name_en,
      last_name_ar: input.last_name_ar || input.last_name_en,
      email: input.email,
      phone: input.phone || "N/A",
    };

    if (canManageOthers) {
      const syncedJobTitle =
        nextRole &&
        (nextRole === "sales_agent" ||
          nextRole === "administrator" ||
          nextRole === "manager")
          ? jobTitleForRole(nextRole as CompanyRole)
          : input.job_title || "sales_agent";
      patch.job_title = syncedJobTitle;
      if (input.team_id !== undefined) patch.team_id = input.team_id;
      if (input.reports_to_employee_id !== undefined) {
        patch.reports_to_employee_id = input.reports_to_employee_id;
      }
      if (input.branch_id !== undefined) patch.branch_id = input.branch_id;
    }

    if (input.avatar instanceof File && input.companyId) {
      const upload = await uploadEmployeeAvatar(input.companyId, input.avatar);
      if (upload.error) return { error: upload.error };
      patch.avatar_url = upload.url;
    } else if (input.removeAvatar) {
      patch.avatar_url = null;
    }

    const { error: employeeError } = await admin
      .from("employees")
      .update(patch)
      .eq("id", employeeId);
    if (employeeError) return { error: employeeError.message };
  }

  return { data: null };
}

export async function updateEmployeeDisabled(
  employeeId: string,
  disabled: boolean,
  companyId?: string,
  targets?: ReassignmentTargets,
): Promise<ActionResult<null>> {
  const admin = getSupabaseAdmin();

  const { data: employee, error: fetchError } = await admin
    .from("employees")
    .select("id, company_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!employee) return { error: "Employee not found" };

  const resolvedCompanyId = companyId || employee.company_id;
  if (!resolvedCompanyId) return { error: "Company is required." };

  const access = await assertCompanyMember(resolvedCompanyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can enable or disable employees." };
  }

  if (disabled) {
    const { data: linkedProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("employee_id", employeeId)
      .eq("role", "manager")
      .maybeSingle();
    if (profileError) return { error: profileError.message };
    if (linkedProfile) {
      return { error: "Company managers cannot be disabled." };
    }

    const { data: profile, error: linkedProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("company_id", resolvedCompanyId)
      .maybeSingle();
    if (linkedProfileError) return { error: linkedProfileError.message };
    if (!profile) return { error: "Employee profile not found." };

    const [owners, clients, properties] = await Promise.all([
      admin
        .from("owners")
        .select("id", { count: "exact", head: true })
        .eq("company_id", resolvedCompanyId)
        .eq("assigned_employee_id", profile.id),
      admin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("company_id", resolvedCompanyId)
        .eq("employee_id", profile.id),
      admin
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("company_id", resolvedCompanyId)
        .eq("employee_id", profile.id),
    ]);
    const countError = owners.error || clients.error || properties.error;
    if (countError) return { error: countError.message };
    const hasAssignments =
      (owners.count ?? 0) + (clients.count ?? 0) + (properties.count ?? 0) > 0;
    if (hasAssignments && !targets) {
      return {
        error: "Reassignment targets are required before disabling this employee.",
      };
    }

    if (targets) {
      const reassignTo = targets.reassignTo;
      if (!reassignTo || reassignTo === profile.id) {
        return { error: "Choose a valid reassignment target." };
      }
      const { data: targetProfile, error: targetsError } = await admin
        .from("profiles")
        .select("id")
        .eq("company_id", resolvedCompanyId)
        .eq("id", reassignTo)
        .maybeSingle();
      if (targetsError) return { error: targetsError.message };
      if (!targetProfile) {
        return { error: "A reassignment target does not belong to this company." };
      }

      const { error: ownersError } = await admin
        .from("owners")
        .update({ assigned_employee_id: reassignTo })
        .eq("company_id", resolvedCompanyId)
        .eq("assigned_employee_id", profile.id);
      if (ownersError) return { error: ownersError.message };
      const { error: clientsError } = await admin
        .from("clients")
        .update({ employee_id: reassignTo })
        .eq("company_id", resolvedCompanyId)
        .eq("employee_id", profile.id);
      if (clientsError) return { error: clientsError.message };
      const { error: propertiesError } = await admin
        .from("properties")
        .update({ employee_id: reassignTo })
        .eq("company_id", resolvedCompanyId)
        .eq("employee_id", profile.id);
      if (propertiesError) return { error: propertiesError.message };
    }

    const { error } = await admin
      .from("employees")
      .update({ disabled: true })
      .eq("id", employeeId);
    if (error) return { error: error.message };

    await syncAuthAccessForEmployee(admin, profile.id, "ban");
    return { data: null };
  }

  // Re-enable: lift ban so they can sign in again.
  const { data: profile, error: linkedProfileError } = await admin
    .from("profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("company_id", resolvedCompanyId)
    .maybeSingle();
  if (linkedProfileError) return { error: linkedProfileError.message };

  const { error } = await admin
    .from("employees")
    .update({ disabled: false })
    .eq("id", employeeId);
  if (error) return { error: error.message };

  if (profile?.id) {
    await syncAuthAccessForEmployee(admin, profile.id, "unban");
  }
  return { data: null };
}

export async function resetEmployeePassword(
  profileId: string,
  companyId: string,
  newPassword: string,
): Promise<ActionResult<null>> {
  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can reset employee passwords." };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Employee not found." };

  const { error } = await admin.auth.admin.updateUserById(profileId, {
    password: newPassword,
  });
  if (error) return { error: error.message };
  await syncAuthAccessForEmployee(admin, profileId, "revoke");
  return { data: null };
}

export async function getEmployeeAssignmentCounts(
  profileId: string,
  companyId: string,
): Promise<
  ActionResult<{ owners: number; clients: number; properties: number; total: number }>
> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can view assignment counts." };
  }

  const admin = getSupabaseAdmin();
  const [owners, clients, properties] = await Promise.all([
    admin
      .from("owners")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("assigned_employee_id", profileId),
    admin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("employee_id", profileId),
    admin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("employee_id", profileId),
  ]);
  const countError = owners.error || clients.error || properties.error;
  if (countError) return { error: countError.message };

  const ownersCount = owners.count ?? 0;
  const clientsCount = clients.count ?? 0;
  const propertiesCount = properties.count ?? 0;
  return {
    data: {
      owners: ownersCount,
      clients: clientsCount,
      properties: propertiesCount,
      total: ownersCount + clientsCount + propertiesCount,
    },
  };
}

export async function getBaseEmployee(id: string): Promise<ActionResult<EmployeeRecord>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).single();
  if (error) return { error: error.message };
  if (!data) return { error: "Employee not found." };

  const access = await assertCompanyMember(data.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can view employees." };
  }
  return { data: data as EmployeeRecord };
}

export async function updateBaseEmployee(
  id: string,
  input: {
    first_name_en: string;
    first_name_ar: string;
    last_name_en: string;
    last_name_ar: string;
    email: string;
  },
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Employee not found." };

  const access = await assertCompanyMember(existing.company_id);
  if (access.error || !access.data) return { error: access.error || "Access denied" };
  if (!canManageEmployees(access.data.role)) {
    return { error: "Only managers can update employees." };
  }

  const { error } = await supabase.from("employees").update(input).eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export async function deleteEmployeeWorkflow(
  employeeToDelete: EmployeeToDelete,
  targets: ReassignmentTargets,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertCompanyAccess(companyId);
  if (access.ok !== true) return { error: access.error };
  if (!canManageEmployees(access.role)) {
    return { error: "Only managers can delete employees." };
  }

  const admin = getSupabaseAdmin();
  const targetId = employeeToDelete.profileId;
  const baseEmployeeId = employeeToDelete.employeeId;
  const reassignTo = targets.reassignTo;

  if (employeeToDelete.isBaseOnly) {
    if (baseEmployeeId) {
      const { error } = await admin.from("employees").delete().eq("id", baseEmployeeId);
      if (error) return { error: error.message };
    }
    return { data: null };
  }

  if (!reassignTo || reassignTo === targetId) {
    return { error: "Choose a valid reassignment target." };
  }

  const { error: ownersError } = await admin
    .from("owners")
    .update({ assigned_employee_id: reassignTo })
    .eq("assigned_employee_id", targetId);
  if (ownersError) return { error: ownersError.message };

  const { error: clientsError } = await admin
    .from("clients")
    .update({ employee_id: reassignTo })
    .eq("employee_id", targetId);
  if (clientsError) return { error: clientsError.message };

  const { error: propertiesError } = await admin
    .from("properties")
    .update({ employee_id: reassignTo })
    .eq("employee_id", targetId);
  if (propertiesError) return { error: propertiesError.message };

  // Historical records (revenues, client_status_history, owner_status_history)
  // are intentionally NOT reassigned/deleted, to preserve historical data integrity.

  // Kick active sessions before tearing down the auth user.
  await syncAuthAccessForEmployee(admin, targetId, "revoke");

  const { error: profileError } = await admin.from("profiles").delete().eq("id", targetId);
  if (profileError) return { error: profileError.message };

  if (baseEmployeeId) {
    const { error: employeeError } = await admin.from("employees").delete().eq("id", baseEmployeeId);
    if (employeeError) {
      // Non-fatal — matches the original PocketBase-era behavior of warning
      // rather than failing if the base record is referenced elsewhere.
      console.warn("Could not delete base employee record:", employeeError.message);
    }
  }

  const { error: authError } = await admin.auth.admin.deleteUser(targetId);
  if (authError) {
    console.warn("Could not delete auth user:", authError.message);
  }

  return { data: null };
}
