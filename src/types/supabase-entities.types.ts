// Hand-written record shapes for the Supabase schema (supabase/migrations).
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
  company_name_en: string;
  company_name_ar: string;
  logo_url: string | null;
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
  name_en: string;
  name_ar: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  name: string;
  name_en: string;
  name_ar: string;
  phone: string;
  country: string;
  company_id: string;
  marketing_channel: string | null;
  assigned_employee_id: string | null;
  avatar_url: string | null;
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
  /** From linked `employees` row when loaded via lookup. */
  avatar_url?: string | null;
  first_name_en?: string | null;
  first_name_ar?: string | null;
  last_name_en?: string | null;
  last_name_ar?: string | null;
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
  // Portal-publishing fields (migration 15) — all optional/nullable.
  title_ar: string | null;
  description_ar: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  furnishing: string | null;
  size_unit: string | null;
  rent_frequency: string | null;
  is_off_plan: boolean | null;
  project_status: string | null;
  amenities: string[] | null;
  permit_type: string | null;
  issuing_license_number: string | null;
  city: string | null;
  locality: string | null;
  sub_locality: string | null;
  tower_name: string | null;
  pf_location_id: number | null;
  // Portal extras (migration 16)
  offplan_sale_type: string | null;
  offplan_dld_waiver: number | null;
  offplan_original_price: number | null;
  offplan_amount_paid: number | null;
  available_from: string | null;
  parking_slots: number | null;
  // Portal extras (migration 28) — Bayut's <Videos>/<Floor_Plans> tags.
  video_urls: string[] | null;
  floor_plan_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

/** `properties` joined to its relations, as returned by getProperties(). */
export interface PropertyWithRelations extends Property {
  property_type?: {
    id: string;
    name_en: string;
    name_ar: string;
  } | null;
  employee?: {
    id: string;
    name: string | null;
    employee_record?: {
      phone?: string;
      email?: string;
      avatar_url?: string | null;
      first_name_en?: string | null;
      first_name_ar?: string | null;
      last_name_en?: string | null;
      last_name_ar?: string | null;
    } | null;
  } | null;
  owner?: {
    id: string;
    name: string;
    name_en?: string | null;
    name_ar?: string | null;
    phone: string;
  } | null;
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

// ---------------------------------------------------------------------------
// Portal publishing (migration 15)
// ---------------------------------------------------------------------------

/** Granular per-property publish target. bayut+dubizzle share one XML feed but
 *  toggle independently; propertyfinder is the REST API. */
export type Portal = 'bayut' | 'dubizzle' | 'propertyfinder';

/** Credential row platform: the two portals sharing one feed collapse to a
 *  single 'bayut_dubizzle' account per company. */
export type PortalCredentialPlatform = 'bayut_dubizzle' | 'propertyfinder';

export type PropertyPublicationStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'failed'
  | 'unpublished';

/** Per-company, per-platform account/keys (`company_portal_credentials`).
 *  One row per company per platform; each company_super_admin manages their
 *  own company's row (RLS-scoped). */
export interface PortalCredentials {
  id: string;
  company_id: string;
  platform: PortalCredentialPlatform;
  enabled: boolean;
  feed_token: string | null;
  api_key: string | null;
  api_secret: string | null;
  pf_public_profile_id: string | null;
  license_number: string | null;
  default_permit_type: string | null;
  cached_access_token: string | null;
  cached_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Non-secret portal config safe to expose to company users (no api keys or
 *  feed token). Drives the publish toggles' "configured / missing fields" UI. */
export interface PortalPublicConfig {
  company_id: string;
  platform: PortalCredentialPlatform;
  enabled: boolean;
  /** propertyfinder: whether api key + secret are both set. */
  has_api_credentials: boolean;
  pf_public_profile_id: string | null;
  license_number: string | null;
}

/** Per-property, per-platform publish state (`property_publications`). */
export interface PropertyPublication {
  id: string;
  property_id: string;
  company_id: string;
  platform: Portal;
  status: PropertyPublicationStatus;
  external_id: string | null;
  last_error: string | null;
  last_synced_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerStatus {
  id: string;
  name_en: string;
  name_ar: string;
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
  name_en: string;
  name_ar: string;
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
  name_en: string;
  name_ar: string;
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
  avatar_url: string | null;
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
  first_name_en: string;
  first_name_ar: string;
  last_name_en: string;
  last_name_ar: string;
  email: string;
  company_id: string;
  disabled: boolean | null;
  phone: string;
  job_title: EmployeeJobTitle;
  avatar_url: string | null;
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
