/** Shared input/result types for employee server actions (not a "use server" module). */

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
  team_id?: string | null;
  reports_to_employee_id?: string | null;
  branch_id?: string | null;
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
  team_id?: string | null;
  reports_to_employee_id?: string | null;
  branch_id?: string | null;
  /** When true and no new file is provided, clear the existing photo. */
  removeAvatar?: boolean;
}

export interface EmployeeToDelete {
  profileId: string;
  employeeId?: string | null;
  isBaseOnly?: boolean;
}

/** Single replacement profile id for owners, clients, and properties. */
export interface ReassignmentTargets {
  reassignTo: string;
}
