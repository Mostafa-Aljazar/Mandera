-- Phase 1–8 permissions foundation:
-- 1) Migrate profiles.role: company_super_admin/company_employee → manager/administrator/sales_agent
-- 2) Rewrite RLS for the three company roles
-- 3) Property approval workflow, change requests, notifications, identity audit,
--    classification, record locks

-- ---------------------------------------------------------------------------
-- 1. Role migration
-- ---------------------------------------------------------------------------

-- Drop role check so we can rewrite values, then re-add.
alter table profiles drop constraint if exists profiles_role_check;

-- Map legacy roles using employees.job_title when available.
update profiles p
set role = case
  when p.role = 'master_admin' then 'master_admin'
  when p.role = 'company_super_admin' then 'manager'
  when p.role = 'company_employee' then coalesce(
    (
      select case e.job_title
        when 'manager' then 'manager'
        when 'admin' then 'administrator'
        else 'sales_agent'
      end
      from employees e
      where e.id = p.employee_id
    ),
    'sales_agent'
  )
  when p.role in ('sales_agent', 'administrator', 'manager') then p.role
  else 'sales_agent'
end
where p.role is distinct from 'master_admin'
   or p.role in ('company_super_admin', 'company_employee');

-- Catch any remaining legacy values
update profiles
set role = 'sales_agent'
where role in ('company_employee', 'company_super_admin');

alter table profiles
  add constraint profiles_role_check
  check (role in ('master_admin', 'sales_agent', 'administrator', 'manager'));

-- ---------------------------------------------------------------------------
-- 2. Helper predicates (SQL)
-- ---------------------------------------------------------------------------

create or replace function is_company_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth_role() in ('sales_agent', 'administrator', 'manager');
$$;

create or replace function is_manager_role()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth_role() = 'manager' or auth_role() = 'master_admin';
$$;

create or replace function is_admin_or_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth_role() in ('administrator', 'manager') or auth_role() = 'master_admin';
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS rewrite — replace company_super_admin / company_employee
-- ---------------------------------------------------------------------------

-- profiles: managers can update teammate profiles
drop policy if exists profiles_update_company_admin on profiles;
create policy profiles_update_company_admin on profiles for update
  using (
    auth_role() = 'manager'
    and auth_company_id() is not null
    and auth_company_id() = profiles.company_id
  )
  with check (
    auth_role() = 'manager'
    and auth_company_id() is not null
    and auth_company_id() = profiles.company_id
  );

-- employees: manager write
drop policy if exists employees_write on employees;
create policy employees_write on employees for all
  using (auth_role() = 'master_admin' or (auth_company_id() = employees.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = employees.company_id and auth_role() = 'manager'));

-- lookup tables: manager write
drop policy if exists property_types_write on property_types;
create policy property_types_write on property_types for all
  using (auth_role() = 'master_admin' or (auth_company_id() = property_types.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = property_types.company_id and auth_role() = 'manager'));

drop policy if exists client_statuses_write on client_statuses;
create policy client_statuses_write on client_statuses for all
  using (auth_role() = 'master_admin' or (auth_company_id() = client_statuses.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = client_statuses.company_id and auth_role() = 'manager'));

drop policy if exists owner_statuses_write on owner_statuses;
create policy owner_statuses_write on owner_statuses for all
  using (auth_role() = 'master_admin' or (auth_company_id() = owner_statuses.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = owner_statuses.company_id and auth_role() = 'manager'));

drop policy if exists marketing_channels_write on marketing_channels;
create policy marketing_channels_write on marketing_channels for all
  using (auth_role() = 'master_admin' or (auth_company_id() = marketing_channels.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = marketing_channels.company_id and auth_role() = 'manager'));

drop policy if exists areas_districts_write on areas_districts;
create policy areas_districts_write on areas_districts for all
  using (auth_role() = 'master_admin' or (auth_company_id() = areas_districts.company_id and auth_role() = 'manager'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = areas_districts.company_id and auth_role() = 'manager'));

-- clients: agents see assigned only; all company roles can write (actions enforce identity lock / delete bans)
drop policy if exists clients_select on clients;
create policy clients_select on clients for select
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = clients.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or (auth_role() = 'sales_agent' and clients.employee_id = auth.uid())
      )
    )
  );

drop policy if exists clients_write on clients;
create policy clients_write on clients for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = clients.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
      and (
        auth_role() in ('administrator', 'manager')
        or clients.employee_id = auth.uid()
      )
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = clients.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- owners: agents see assigned only
drop policy if exists owners_select on owners;
create policy owners_select on owners for select
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = owners.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or (auth_role() = 'sales_agent' and owners.assigned_employee_id = auth.uid())
      )
    )
  );

drop policy if exists owners_write on owners;
create policy owners_write on owners for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = owners.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
      and (
        auth_role() in ('administrator', 'manager')
        or owners.assigned_employee_id = auth.uid()
        or owners.assigned_employee_id is null
      )
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = owners.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- properties: company-wide select for members (masking done in actions);
-- write for all company roles (approval/change-request enforced in actions)
drop policy if exists properties_select on properties;
create policy properties_select on properties for select
  using (auth_role() = 'master_admin' or auth_company_id() = properties.company_id);

drop policy if exists properties_write on properties;
create policy properties_write on properties for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = properties.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = properties.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- revenues: manager only
drop policy if exists revenues_select on revenues;
create policy revenues_select on revenues for select
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = revenues.company_id and auth_role() = 'manager')
  );

drop policy if exists revenues_write on revenues;
create policy revenues_write on revenues for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = revenues.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = revenues.company_id and auth_role() = 'manager')
  );

-- portal credentials: manager write
drop policy if exists company_portal_credentials_write on company_portal_credentials;
create policy company_portal_credentials_write on company_portal_credentials for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_portal_credentials.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_portal_credentials.company_id and auth_role() = 'manager')
  );

-- ---------------------------------------------------------------------------
-- 4. Property approval + classification + lock
-- ---------------------------------------------------------------------------

alter table properties
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('draft', 'pending_review', 'approved', 'rejected')),
  add column if not exists approval_note text,
  add column if not exists classification text
    check (classification is null or classification in ('A', 'B', 'C')),
  add column if not exists classification_reason text,
  add column if not exists is_locked boolean not null default false,
  add column if not exists paused_at timestamptz,
  add column if not exists pause_reason text;

-- Existing inventory treated as approved so agents can see it.
update properties set approval_status = 'approved' where approval_status is null or approval_status = 'approved';

alter table clients
  add column if not exists is_locked boolean not null default false;

alter table owners
  add column if not exists is_locked boolean not null default false;

-- ---------------------------------------------------------------------------
-- 5. Identity field audit (Master Admin corrections)
-- ---------------------------------------------------------------------------

create table if not exists identity_field_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  entity_type text not null check (entity_type in ('client', 'owner')),
  entity_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  requested_by uuid references profiles(id) on delete set null,
  performed_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table identity_field_audit enable row level security;

drop policy if exists identity_field_audit_select on identity_field_audit;
create policy identity_field_audit_select on identity_field_audit for select
  using (auth_role() = 'master_admin' or (auth_company_id() = identity_field_audit.company_id and auth_role() = 'manager'));

drop policy if exists identity_field_audit_insert on identity_field_audit;
create policy identity_field_audit_insert on identity_field_audit for insert
  with check (auth_role() = 'master_admin');

-- ---------------------------------------------------------------------------
-- 6. Property change requests
-- ---------------------------------------------------------------------------

create table if not exists property_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'cancelled')),
  current_data jsonb not null default '{}'::jsonb,
  proposed_data jsonb not null default '{}'::jsonb,
  changed_fields text[] not null default '{}',
  images_added text[] not null default '{}',
  images_removed text[] not null default '{}',
  reviewer_id uuid references profiles(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_change_requests_property_id_idx
  on property_change_requests (property_id);
create index if not exists property_change_requests_company_status_idx
  on property_change_requests (company_id, status);

-- Only one pending request per property
create unique index if not exists property_change_requests_one_pending_idx
  on property_change_requests (property_id)
  where status = 'pending';

drop trigger if exists trg_property_change_requests_updated_at on property_change_requests;
create trigger trg_property_change_requests_updated_at
  before update on property_change_requests
  for each row execute function set_updated_at();

alter table property_change_requests enable row level security;

drop policy if exists property_change_requests_select on property_change_requests;
create policy property_change_requests_select on property_change_requests for select
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_change_requests.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or requested_by = auth.uid()
      )
    )
  );

drop policy if exists property_change_requests_write on property_change_requests;
create policy property_change_requests_write on property_change_requests for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_change_requests.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_change_requests.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Final-status change requests (Sold/Rented/etc needing approval)
-- ---------------------------------------------------------------------------

create table if not exists property_status_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text,
  reviewer_id uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table property_status_change_requests enable row level security;

drop policy if exists property_status_change_requests_select on property_status_change_requests;
create policy property_status_change_requests_select on property_status_change_requests for select
  using (
    auth_role() = 'master_admin'
    or auth_company_id() = property_status_change_requests.company_id
  );

drop policy if exists property_status_change_requests_write on property_status_change_requests;
create policy property_status_change_requests_write on property_status_change_requests for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_status_change_requests.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_status_change_requests.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 8. In-app notifications
-- ---------------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on notifications (recipient_id, created_at desc)
  where read_at is null;

alter table notifications enable row level security;

drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select
  using (auth_role() = 'master_admin' or recipient_id = auth.uid());

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists notifications_insert on notifications;
create policy notifications_insert on notifications for insert
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = notifications.company_id
      and auth_role() in ('sales_agent', 'administrator', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Client distribution rules (Manager)
-- ---------------------------------------------------------------------------

create table if not exists client_distribution_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_distribution_rules enable row level security;

drop policy if exists client_distribution_rules_all on client_distribution_rules;
create policy client_distribution_rules_all on client_distribution_rules for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = client_distribution_rules.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = client_distribution_rules.company_id and auth_role() = 'manager')
  );
