"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  EmployeeRecord,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

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
  if (!access.ok) return { error: access.error };

  // Admin client: profiles RLS previously blocked listing teammates.
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select(COMPANY_EMPLOYEE_SELECT)
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"])
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
  if (!access.ok) return { error: access.error };

  const admin = getSupabaseAdmin();

  const byProfile = await admin
    .from("profiles")
    .select(COMPANY_EMPLOYEE_SELECT)
    .eq("id", profileId)
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"])
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
      .in("role", ["company_super_admin", "company_employee"])
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
  if (!access.ok) return { error: access.error };

  const admin = getSupabaseAdmin();
  // Seat usage includes the company admin + employees (profiles), not only
  // rows in `employees` — admin is provisioned without an employees record.
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("role", ["company_super_admin", "company_employee"]);

  if (error) return { error: error.message };
  return { data: count ?? 0 };
}

export interface CreateEmployeeInput {
  companyId: string;
  first_name_en: string;
  first_name_ar: string;
  last_name_en: string;
  last_name_ar: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
  password: string;
  avatar?: File | null;
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
    })
    .select()
    .single();

  if (employeeError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: employeeError.message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: input.role || "company_employee",
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

export interface UpdateEmployeeInput {
  profileId: string;
  employeeId: string | null;
  first_name_en: string;
  first_name_ar: string;
  last_name_en: string;
  last_name_ar: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
  companyId?: string;
  avatar?: File | null;
  /** When true and no new file is provided, clear the existing photo. */
  removeAvatar?: boolean;
}

export async function updateEmployee(
  input: UpdateEmployeeInput,
): Promise<ActionResult<null>> {
  if (!input.companyId) return { error: "Company is required." };

  const access = await assertCompanyAccess(input.companyId);
  if (!access.ok) return { error: access.error };

  const canManageOthers =
    access.role === "company_super_admin" || access.role === "master_admin";
  if (!canManageOthers && access.userId !== input.profileId) {
    return { error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();
  const nameEn = `${input.first_name_en} ${input.last_name_en}`.trim();

  let employeeId = input.employeeId;

  // Company admins are often provisioned without an `employees` row.
  // Create one so bilingual names + avatar can be stored.
  if (!employeeId && input.companyId) {
    const { data: created, error: createError } = await admin
      .from("employees")
      .insert({
        first_name_en: input.first_name_en,
        first_name_ar: input.first_name_ar || input.first_name_en,
        last_name_en: input.last_name_en,
        last_name_ar: input.last_name_ar || input.last_name_en,
        email: input.email,
        phone: input.phone || "N/A",
        job_title: input.job_title || "admin",
        company_id: input.companyId,
        disabled: false,
      })
      .select("id")
      .single();
    if (createError) return { error: createError.message };
    employeeId = created.id;

    const { error: linkError } = await admin
      .from("profiles")
      .update({
        name: nameEn,
        role: input.role,
        employee_id: employeeId,
      })
      .eq("id", input.profileId);
    if (linkError) return { error: linkError.message };
  } else {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ name: nameEn, role: input.role })
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
      job_title: input.job_title || "admin",
    };

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
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("employees")
    .update({ disabled })
    .eq("id", employeeId);
  if (error) return { error: error.message };
  return { data: null };
}

export async function getBaseEmployee(id: string): Promise<ActionResult<EmployeeRecord>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).single();
  if (error) return { error: error.message };
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
  const { error } = await supabase.from("employees").update(input).eq("id", id);
  if (error) return { error: error.message };
  return { data: null };
}

export interface EmployeeToDelete {
  profileId: string;
  employeeId?: string | null;
  isBaseOnly?: boolean;
}

export interface ReassignmentTargets {
  reassignOwnersTo: string;
  reassignClientsTo: string;
  reassignPropertiesTo: string;
}

export async function deleteEmployeeWorkflow(
  employeeToDelete: EmployeeToDelete,
  targets: ReassignmentTargets,
): Promise<ActionResult<null>> {
  const admin = getSupabaseAdmin();
  const targetId = employeeToDelete.profileId;
  const baseEmployeeId = employeeToDelete.employeeId;

  if (employeeToDelete.isBaseOnly) {
    if (baseEmployeeId) {
      const { error } = await admin.from("employees").delete().eq("id", baseEmployeeId);
      if (error) return { error: error.message };
    }
    return { data: null };
  }

  const { error: ownersError } = await admin
    .from("owners")
    .update({ assigned_employee_id: targets.reassignOwnersTo })
    .eq("assigned_employee_id", targetId);
  if (ownersError) return { error: ownersError.message };

  const { error: clientsError } = await admin
    .from("clients")
    .update({ employee_id: targets.reassignClientsTo })
    .eq("employee_id", targetId);
  if (clientsError) return { error: clientsError.message };

  const { error: propertiesError } = await admin
    .from("properties")
    .update({ employee_id: targets.reassignPropertiesTo })
    .eq("employee_id", targetId);
  if (propertiesError) return { error: propertiesError.message };

  // Historical records (revenues, client_status_history, owner_status_history)
  // are intentionally NOT reassigned/deleted, to preserve historical data integrity.

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
