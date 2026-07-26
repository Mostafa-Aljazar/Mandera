"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  EmployeeRecord,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const COMPANY_EMPLOYEE_SELECT = "*, employee:employees!profiles_employee_id_fkey(*)";

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
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
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
  const supabase = await getServerSupabase();

  const byProfile = await supabase
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
    const byEmployee = await supabase
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
  const supabase = await getServerSupabase();
  // Seat usage includes the company admin + employees (profiles), not only
  // rows in `employees` — admin is provisioned without an employees record.
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["company_super_admin", "company_employee"]);
  if (companyId) query = query.eq("company_id", companyId);
  const { count, error } = await query;
  if (error) return { error: error.message };
  return { data: count ?? 0 };
}

export interface CreateEmployeeInput {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
  password: string;
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<ActionResult<null>> {
  const admin = getSupabaseAdmin();

  const [firstName, ...lastNames] = input.name.split(" ");

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to create employee account" };
  }

  const { data: employeeRecord, error: employeeError } = await admin
    .from("employees")
    .insert({
      first_name: firstName || "",
      last_name: lastNames.join(" ") || "",
      email: input.email,
      phone: input.phone,
      job_title: input.job_title,
      company_id: input.companyId,
      disabled: false,
    })
    .select()
    .single();

  if (employeeError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: employeeError.message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: input.role,
    company_id: input.companyId,
    employee_id: employeeRecord.id,
    name: input.name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { data: null };
}

export interface UpdateEmployeeInput {
  profileId: string;
  employeeId: string | null;
  name: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
}

export async function updateEmployee(
  input: UpdateEmployeeInput,
): Promise<ActionResult<null>> {
  const supabase = await getServerSupabase();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name: input.name, role: input.role })
    .eq("id", input.profileId);
  if (profileError) return { error: profileError.message };

  if (input.employeeId) {
    const [firstName, ...lastNames] = input.name.split(" ");
    const { error: employeeError } = await supabase
      .from("employees")
      .update({
        first_name: firstName || "",
        last_name: lastNames.join(" ") || "",
        email: input.email,
        phone: input.phone,
        job_title: input.job_title,
      })
      .eq("id", input.employeeId);
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
  input: { first_name: string; last_name: string; email: string },
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
