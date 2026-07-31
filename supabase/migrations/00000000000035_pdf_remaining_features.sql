-- Phase 8 remaining PDF features: editing locks, revenue workflow, teams,
-- branches, message templates, company settings JSON.

-- ---------------------------------------------------------------------------
-- Record editing lock (separate from identity freeze semantics)
-- ---------------------------------------------------------------------------
alter table clients
  add column if not exists editing_locked boolean not null default false;

alter table owners
  add column if not exists editing_locked boolean not null default false;

-- ---------------------------------------------------------------------------
-- Revenue lifecycle
-- ---------------------------------------------------------------------------
alter table revenues
  add column if not exists approval_status text not null default 'approved',
  add column if not exists commission_paid boolean not null default false,
  add column if not exists commission_paid_at timestamptz,
  add column if not exists notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'revenues_approval_status_check'
  ) then
    alter table revenues
      add constraint revenues_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists revenue_change_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  revenue_id uuid not null references revenues (id) on delete cascade,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references profiles (id) on delete set null,
  changed_by_name text,
  note text,
  created_at timestamptz not null default now()
);

alter table revenue_change_log enable row level security;

drop policy if exists revenue_change_log_all on revenue_change_log;
create policy revenue_change_log_all on revenue_change_log for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = revenue_change_log.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = revenue_change_log.company_id and auth_role() = 'manager')
  );

-- ---------------------------------------------------------------------------
-- Teams + direct manager on employees
-- ---------------------------------------------------------------------------
create table if not exists company_teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company_teams enable row level security;

drop policy if exists company_teams_all on company_teams;
create policy company_teams_all on company_teams for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_teams.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_teams.company_id and auth_role() = 'manager')
  );

alter table employees
  add column if not exists team_id uuid references company_teams (id) on delete set null,
  add column if not exists reports_to_employee_id uuid references employees (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------
create table if not exists company_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  address text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company_branches enable row level security;

drop policy if exists company_branches_all on company_branches;
create policy company_branches_all on company_branches for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_branches.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = company_branches.company_id and auth_role() = 'manager')
  );

-- ---------------------------------------------------------------------------
-- Message templates
-- ---------------------------------------------------------------------------
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp',
  body_en text not null default '',
  body_ar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table message_templates enable row level security;

drop policy if exists message_templates_all on message_templates;
create policy message_templates_all on message_templates for all
  using (
    auth_role() = 'master_admin'
    or (auth_company_id() = message_templates.company_id and auth_role() = 'manager')
  )
  with check (
    auth_role() = 'master_admin'
    or (auth_company_id() = message_templates.company_id and auth_role() = 'manager')
  );

-- ---------------------------------------------------------------------------
-- Company settings JSON bags
-- ---------------------------------------------------------------------------
alter table companies
  add column if not exists whatsapp_settings jsonb not null default '{}'::jsonb,
  add column if not exists notification_settings jsonb not null default '{}'::jsonb,
  add column if not exists publish_settings jsonb not null default '{}'::jsonb;
