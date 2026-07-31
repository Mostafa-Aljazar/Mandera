-- Sales Agent PDF completeness: client budget/area, owner email/follow-up,
-- client appointments (viewings/meetings).

alter table clients
  add column if not exists budget numeric,
  add column if not exists preferred_area text;

alter table owners
  add column if not exists email text,
  add column if not exists follow_up_date date,
  add column if not exists follow_up_time text;

create table if not exists client_appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  property_id uuid references properties (id) on delete set null,
  kind text not null default 'appointment'
    check (kind in ('appointment', 'viewing')),
  title text not null default '',
  scheduled_at timestamptz not null,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_appointments_client_idx
  on client_appointments (client_id, scheduled_at desc);

alter table client_appointments enable row level security;

drop policy if exists client_appointments_select on client_appointments;
create policy client_appointments_select on client_appointments for select
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = client_appointments.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or exists (
          select 1 from clients c
          where c.id = client_appointments.client_id
            and c.employee_id = auth.uid()
        )
      )
    )
  );

drop policy if exists client_appointments_write on client_appointments;
create policy client_appointments_write on client_appointments for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = client_appointments.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or exists (
          select 1 from clients c
          where c.id = client_appointments.client_id
            and c.employee_id = auth.uid()
        )
      )
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = client_appointments.company_id
      and (
        auth_role() in ('administrator', 'manager')
        or exists (
          select 1 from clients c
          where c.id = client_appointments.client_id
            and c.employee_id = auth.uid()
        )
      )
    )
  );
