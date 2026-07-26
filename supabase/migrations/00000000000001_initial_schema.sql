-- Initial schema: full replacement for apps/pocketbase's 19 collections.
-- See C:\Users\2024\.claude\plans\zany-jumping-tiger.md (PocketBase -> Supabase
-- Full Migration) for the design rationale behind every choice below.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper (infra, not business logic -- kept in the DB)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- profiles: bridges auth.users to role/company/employee. Replaces PocketBase's
-- three separate auth collections (master_admins, company_super_admins,
-- company_employees).
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('master_admin', 'company_super_admin', 'company_employee')),
  company_id uuid, -- FK added after companies exists (below)
  employee_id uuid, -- FK added after employees exists (below)
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- companies (master-admin owned; no company_id scoping -- gated on role only)
-- ---------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  company_code text not null,
  company_name text not null,
  email text not null,
  subscription_start_date date not null,
  subscription_end_date date not null,
  max_employee_count numeric not null check (max_employee_count >= 1),
  is_active boolean default true,
  is_frozen boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_companies_updated_at before update on companies
  for each row execute function set_updated_at();

alter table profiles add constraint profiles_company_id_fkey
  foreign key (company_id) references companies(id) on delete set null;

-- ---------------------------------------------------------------------------
-- employees (base employee record; profiles.employee_id points here)
-- ---------------------------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  company_id uuid not null references companies(id) on delete cascade,
  disabled boolean default false,
  phone text not null,
  job_title text not null check (job_title in ('وكيل مبيعات', 'مسؤول', 'مدير')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_employees_updated_at before update on employees
  for each row execute function set_updated_at();

alter table profiles add constraint profiles_employee_id_fkey
  foreign key (employee_id) references employees(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Settings-entity tables (company-scoped lookup lists)
-- ---------------------------------------------------------------------------
create table property_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_property_types_updated_at before update on property_types
  for each row execute function set_updated_at();

create table client_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid not null references companies(id) on delete cascade,
  priority_order numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_client_statuses_updated_at before update on client_statuses
  for each row execute function set_updated_at();

create table owner_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_owner_statuses_updated_at before update on owner_statuses
  for each row execute function set_updated_at();

create table marketing_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_marketing_channels_updated_at before update on marketing_channels
  for each row execute function set_updated_at();

create table areas_districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emirate text,
  description text default '',
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_areas_districts_updated_at before update on areas_districts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- owners
-- ---------------------------------------------------------------------------
create table owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  country text not null,
  company_id uuid not null references companies(id) on delete cascade,
  marketing_channel text,
  assigned_employee_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_owners_updated_at before update on owners
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type uuid not null references property_types(id),
  land_area numeric,
  building_area numeric,
  emirate text,
  area text,
  owner_id uuid not null references owners(id),
  price numeric not null,
  commission_percentage numeric,
  employee_id uuid not null references profiles(id),
  title text not null,
  description text default '',
  images text[] default '{}',
  listing_type text not null,
  company_id uuid not null references companies(id) on delete cascade,
  status text,
  advertising_permit_number text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_properties_updated_at before update on properties
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  country_code text not null,
  interest_type text not null,
  interested_properties uuid[] default '{}',
  employee_id uuid not null references profiles(id),
  company_id uuid not null references companies(id) on delete cascade,
  marketing_channel text,
  follow_up_date date,
  follow_up_time text,
  status_id uuid references client_statuses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- History tables
-- ---------------------------------------------------------------------------
create table client_status_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  status_id uuid references client_statuses(id),
  note text,
  created_by uuid references profiles(id),
  created_by_name text,
  company_id uuid not null references companies(id) on delete cascade,
  transferred_from_employee uuid references profiles(id),
  transferred_to_employee uuid references profiles(id),
  employee_id uuid references profiles(id),
  status text,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create table owner_status_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  status_id uuid references owner_statuses(id),
  note text,
  created_by uuid references profiles(id),
  created_by_name text,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table property_status_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references profiles(id),
  created_by_name text,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- revenues
-- ---------------------------------------------------------------------------
create table revenues (
  id uuid primary key default gen_random_uuid(),
  property_code text not null,
  emirate text not null,
  area_district text,
  commission_value numeric,
  employee_id uuid references profiles(id),
  employee_name text not null,
  deal_completion_date timestamptz not null,
  client_id uuid not null references clients(id),
  client_name text not null,
  owner_name text not null,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- legal_pages (master-admin owned, publicly readable)
-- ---------------------------------------------------------------------------
create table legal_pages (
  id uuid primary key default gen_random_uuid(),
  page_type text not null check (page_type in ('privacy_policy', 'terms_of_service')),
  title text not null,
  content text not null,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_legal_pages_updated_at before update on legal_pages
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table companies enable row level security;
alter table employees enable row level security;
alter table property_types enable row level security;
alter table client_statuses enable row level security;
alter table owner_statuses enable row level security;
alter table marketing_channels enable row level security;
alter table areas_districts enable row level security;
alter table owners enable row level security;
alter table properties enable row level security;
alter table clients enable row level security;
alter table client_status_history enable row level security;
alter table owner_status_history enable row level security;
alter table property_status_history enable row level security;
alter table revenues enable row level security;
alter table legal_pages enable row level security;

-- profiles: a user can read/update their own row; master_admin can read all.
create policy profiles_select_own on profiles for select
  using (id = auth.uid());
create policy profiles_select_master on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'));
create policy profiles_update_own on profiles for update
  using (id = auth.uid());
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid());

-- companies: master_admin only, in every direction.
create policy companies_all_master on companies for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'));
-- company_super_admin/company_employee can read their own company row
-- (needed for the frozen/isActive/subscriptionEndDate checks on login).
create policy companies_select_own on companies for select
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.company_id = companies.id
  ));

-- Generic company-scoped policy pattern, applied per table below:
--   select: caller's profile.company_id matches the row's company_id
--   insert/update/delete: same, plus caller's role = 'company_super_admin'
-- master_admin bypasses company scoping entirely on every table.

create policy employees_select on employees for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = employees.company_id)));
create policy employees_write on employees for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = employees.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = employees.company_id and p.role = 'company_super_admin'))));

create policy property_types_select on property_types for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = property_types.company_id)));
create policy property_types_write on property_types for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = property_types.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = property_types.company_id and p.role = 'company_super_admin'))));

create policy client_statuses_select on client_statuses for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = client_statuses.company_id)));
create policy client_statuses_write on client_statuses for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = client_statuses.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = client_statuses.company_id and p.role = 'company_super_admin'))));

create policy owner_statuses_select on owner_statuses for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = owner_statuses.company_id)));
create policy owner_statuses_write on owner_statuses for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = owner_statuses.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = owner_statuses.company_id and p.role = 'company_super_admin'))));

create policy marketing_channels_select on marketing_channels for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = marketing_channels.company_id)));
create policy marketing_channels_write on marketing_channels for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = marketing_channels.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = marketing_channels.company_id and p.role = 'company_super_admin'))));

create policy areas_districts_select on areas_districts for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = areas_districts.company_id)));
create policy areas_districts_write on areas_districts for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = areas_districts.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = areas_districts.company_id and p.role = 'company_super_admin'))));

create policy owners_select on owners for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = owners.company_id)));
create policy owners_write on owners for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = owners.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = owners.company_id and p.role = 'company_super_admin'))));

create policy properties_select on properties for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = properties.company_id)));
create policy properties_write on properties for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = properties.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = properties.company_id and p.role = 'company_super_admin'))));

create policy clients_select on clients for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = clients.company_id)));
create policy clients_write on clients for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = clients.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = clients.company_id and p.role = 'company_super_admin'))));

create policy client_status_history_select on client_status_history for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = client_status_history.company_id)));
create policy client_status_history_write on client_status_history for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = client_status_history.company_id)))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = client_status_history.company_id)));

create policy owner_status_history_select on owner_status_history for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = owner_status_history.company_id)));
create policy owner_status_history_write on owner_status_history for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = owner_status_history.company_id)))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = owner_status_history.company_id)));

create policy property_status_history_select on property_status_history for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = property_status_history.company_id)));
create policy property_status_history_write on property_status_history for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = property_status_history.company_id)))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = property_status_history.company_id)));

create policy revenues_select on revenues for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = revenues.company_id)));
create policy revenues_write on revenues for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = revenues.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = revenues.company_id and p.role = 'company_super_admin'))));

-- legal_pages: publicly readable (matches PocketBase's empty listRule/viewRule
-- for public terms/privacy pages), master_admin-only to write.
create policy legal_pages_select_public on legal_pages for select
  using (true);
create policy legal_pages_write_master on legal_pages for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'));

-- ---------------------------------------------------------------------------
-- Realtime: only the tables ClientPipelineWidget subscribes to today.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table clients, client_statuses, client_status_history;
