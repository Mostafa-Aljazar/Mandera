// TypeScript record shapes for the PocketBase collections this app talks to.
// Derived from apps/pocketbase/pb_migrations — kept intentionally loose (no
// generic Record<Expand> ceremony) since the app never relies on PocketBase's
// `expand` option beyond a few call sites, which type it locally instead.

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

export const MARKETING_CHANNELS = [
  'Google',
  'Facebook',
  'Instagram',
  'TikTok',
  'Snapchat',
  'X',
  'LinkedIn',
  'Property Finder',
  'Bayut',
  'Dubizzle',
  'Marjan',
  'OpenSouk',
  'Website',
] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export type EmployeeJobTitle = 'وكيل مبيعات' | 'مسؤول' | 'مدير';

export type UserRole = 'master_admin' | 'company_super_admin' | string;

export interface Company extends BaseRecord {
  companyCode: string;
  companyName: string;
  email: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  maxEmployeeCount: number;
  isActive?: boolean;
  is_frozen?: boolean;
}

export interface MasterAdmin extends BaseRecord {
  email: string;
  name?: string;
  role?: UserRole;
  verified?: boolean;
  collectionName?: 'master_admins';
}

export interface CompanySuperAdmin extends BaseRecord {
  email: string;
  name?: string;
  companyId: string;
  companyCode: string;
  role?: UserRole;
  verified?: boolean;
  collectionName?: 'company_super_admins';
}

export interface Employee extends BaseRecord {
  firstName: string;
  lastName: string;
  email: string;
  companyId: string;
  disabled?: boolean;
  phone: string;
  job_title: EmployeeJobTitle;
}

export interface CompanyEmployee extends BaseRecord {
  email: string;
  name?: string;
  companyId: string;
  employeeId: string;
  role: UserRole;
  verified?: boolean;
  collectionName?: 'company_employees';
  expand?: {
    employeeId?: Employee;
  };
}

/** Union of the possible `pb.authStore.model` shapes across the three auth collections. */
export type AuthUser = (MasterAdmin | CompanySuperAdmin | CompanyEmployee) & {
  [key: string]: unknown;
};

export interface PropertyType extends BaseRecord {
  name: string;
  company_id: string;
}

export interface ClientStatus extends BaseRecord {
  name: string;
  company_id: string;
  priority_order: number;
}

export interface OwnerStatus extends BaseRecord {
  name: string;
  company_id: string;
}

export interface Owner extends BaseRecord {
  name: string;
  phone: string;
  country: string;
  company_id: string;
  marketing_channel?: MarketingChannel;
  assigned_employee_id?: string;
}

export interface Property extends BaseRecord {
  code: string;
  type: string;
  land_area?: number;
  building_area?: number;
  emirate?: string;
  area?: string;
  owner_id: string;
  price: number;
  commission_percentage?: number;
  employee_id: string;
  title: string;
  description?: string;
  images?: string[];
  listing_type: string;
  company_id: string;
  status?: string;
  advertising_permit_number?: string;
}

export interface Client extends BaseRecord {
  name: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties?: string[];
  employee_id: string;
  company_id: string;
  marketing_channel?: MarketingChannel;
  follow_up_date?: string;
  follow_up_time?: string;
  expand?: {
    employee_id?: CompanyEmployee;
    interested_properties?: Property[];
  };
}

export interface ClientStatusHistory extends BaseRecord {
  client_id: string;
  status_id: string;
  note?: string;
  created_by: string;
  created_by_name: string;
  company_id: string;
  transferred_from_employee?: string;
  transferred_to_employee?: string;
  employee_id?: string;
  status?: string;
  follow_up_date?: string;
}

export interface OwnerStatusHistory extends BaseRecord {
  owner_id: string;
  status_id: string;
  note?: string;
  created_by: string;
  created_by_name: string;
  company_id: string;
}

export interface PropertyStatusHistory extends BaseRecord {
  property_id: string;
  status: string;
  note?: string;
  created_by: string;
  created_by_name: string;
  company_id: string;
}

export interface MarketingChannelRecord extends BaseRecord {
  name: string;
  company_id: string;
}

export interface Revenue extends BaseRecord {
  property_code: string;
  emirate: string;
  area_district?: string;
  commission_value?: number;
  employee_id?: string;
  employee_name: string;
  deal_completion_date: string;
  client_id: string;
  client_name: string;
  owner_name: string;
  company_id: string;
}

export type LegalPageType = 'privacy_policy' | 'terms_of_service';

export interface LegalPage extends BaseRecord {
  page_type: LegalPageType;
  title: string;
  content: string;
  updated_by?: string;
}
