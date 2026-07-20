// Hand-written record shapes for the Supabase schema (apps/web/supabase/migrations).
// Filled in module-by-module as each PocketBase collection is migrated; see
// C:\Users\2024\.claude\plans\zany-jumping-tiger.md for the full table list.

export type UserRole = 'master_admin' | 'company_super_admin' | 'company_employee';

export interface Profile {
  id: string;
  role: UserRole;
  company_id: string | null;
  employee_id: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  company_code: string;
  company_name: string;
  email: string;
  phone: string | null;
  admin_name: string | null;
  notes: string | null;
  subscription_start_date: string;
  subscription_end_date: string;
  max_employee_count: number;
  is_active: boolean | null;
  is_frozen: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  title: string;
  note: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_mime: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Combines the Supabase Auth user's session identity with their `profiles` row. */
export type AuthUser = Profile & {
  email?: string;
};

export interface PropertyType {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  country: string;
  company_id: string;
  marketing_channel: string | null;
  assigned_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AreaDistrict {
  id: string;
  name: string;
  emirate: string | null;
  description: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
}

/** A `profiles` row scoped to `role IN ('company_super_admin','company_employee')`. */
export interface CompanyEmployee {
  id: string;
  role: UserRole;
  company_id: string;
  employee_id: string | null;
  name: string | null;
  email?: string;
}

export interface Property {
  id: string;
  code: string;
  type: string;
  land_area: number | null;
  building_area: number | null;
  emirate: string | null;
  area: string | null;
  owner_id: string;
  price: number;
  commission_percentage: number | null;
  employee_id: string;
  title: string;
  description: string | null;
  images: string[] | null;
  listing_type: string;
  company_id: string;
  status: string | null;
  advertising_permit_number: string | null;
  area_district: string | null;
  created_at: string;
  updated_at: string;
}

/** `properties` joined to its relations, as returned by getProperties(). */
export interface PropertyWithRelations extends Property {
  property_type?: { id: string; name: string } | null;
  employee?: {
    id: string;
    name: string | null;
    employee_record?: { phone?: string; email?: string } | null;
  } | null;
  owner?: { id: string; name: string; phone: string } | null;
  area_district_ref?: { id: string; name: string } | null;
}

export interface PropertyStatusHistory {
  id: string;
  property_id: string;
  status: string;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  company_id: string;
  created_at: string;
}

export interface OwnerStatus {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerStatusHistory {
  id: string;
  owner_id: string;
  status_id: string | null;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  company_id: string;
  created_at: string;
}

export interface MarketingChannelRecord {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

/** `owners` joined to its relations, as returned by getOwners(). */
export interface OwnerWithRelations extends Owner {
  latest_status?: { id: string; name: string; created_at: string } | null;
}

export interface ClientStatus {
  id: string;
  name: string;
  company_id: string;
  priority_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClientStatusHistory {
  id: string;
  client_id: string;
  status_id: string | null;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  company_id: string;
  transferred_from_employee: string | null;
  transferred_to_employee: string | null;
  employee_id: string | null;
  status: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties: string[] | null;
  employee_id: string;
  company_id: string;
  marketing_channel: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  status_id: string | null;
  created_at: string;
  updated_at: string;
}

/** `clients` joined to its relations, as returned by getClients(). */
export interface ClientWithRelations extends Client {
  employee?: { id: string; name: string | null } | null;
}

export type EmployeeJobTitle = 'sales_agent' | 'admin' | 'manager';

export interface EmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
  disabled: boolean | null;
  phone: string;
  job_title: EmployeeJobTitle;
  created_at: string;
  updated_at: string;
}

/** A `profiles` row (the login/company_employees equivalent) joined to its `employees` detail row. */
export interface CompanyEmployeeWithDetails {
  id: string;
  role: UserRole;
  company_id: string;
  employee_id: string | null;
  name: string | null;
  /** Auth or employees.email — enriched in getCompanyEmployees. */
  email?: string;
  employee?: EmployeeRecord | null;
}

export type LegalPageType = 'privacy_policy' | 'terms_of_service';

export interface LegalPage {
  id: string;
  page_type: LegalPageType;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Revenue {
  id: string;
  property_code: string;
  emirate: string;
  area_district: string | null;
  commission_value: number | null;
  employee_id: string | null;
  employee_name: string;
  deal_completion_date: string;
  client_id: string;
  client_name: string;
  owner_name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}
