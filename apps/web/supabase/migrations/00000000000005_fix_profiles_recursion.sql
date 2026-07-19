-- Fixes "infinite recursion detected in policy for relation profiles" (42P17).
-- Every RLS policy across the schema checks the caller's role/company_id by
-- querying `profiles` from *within* a policy -- fine on every other table,
-- but on `profiles` itself this makes evaluating the policy re-trigger RLS
-- on profiles, recursively. A SECURITY DEFINER function reads the caller's
-- own profile bypassing RLS (safe: it only ever returns the row for
-- auth.uid(), never an arbitrary id), breaking the cycle.

create or replace function auth_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

-- Replace every policy that referenced `profiles` recursively.

drop policy if exists profiles_select_own on profiles;
drop policy if exists profiles_select_master on profiles;
drop policy if exists profiles_update_own on profiles;
drop policy if exists profiles_insert_own on profiles;

create policy profiles_select_own on profiles for select
  using (id = auth.uid());
create policy profiles_select_master on profiles for select
  using (auth_role() = 'master_admin');
create policy profiles_update_own on profiles for update
  using (id = auth.uid());
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid());

drop policy if exists companies_all_master on companies;
drop policy if exists companies_select_own on companies;
create policy companies_all_master on companies for all
  using (auth_role() = 'master_admin')
  with check (auth_role() = 'master_admin');
create policy companies_select_own on companies for select
  using (auth_company_id() = companies.id);

drop policy if exists employees_select on employees;
drop policy if exists employees_write on employees;
create policy employees_select on employees for select
  using (auth_role() = 'master_admin' or auth_company_id() = employees.company_id);
create policy employees_write on employees for all
  using (auth_role() = 'master_admin' or (auth_company_id() = employees.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = employees.company_id and auth_role() = 'company_super_admin'));

drop policy if exists property_types_select on property_types;
drop policy if exists property_types_write on property_types;
create policy property_types_select on property_types for select
  using (auth_role() = 'master_admin' or auth_company_id() = property_types.company_id);
create policy property_types_write on property_types for all
  using (auth_role() = 'master_admin' or (auth_company_id() = property_types.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = property_types.company_id and auth_role() = 'company_super_admin'));

drop policy if exists client_statuses_select on client_statuses;
drop policy if exists client_statuses_write on client_statuses;
create policy client_statuses_select on client_statuses for select
  using (auth_role() = 'master_admin' or auth_company_id() = client_statuses.company_id);
create policy client_statuses_write on client_statuses for all
  using (auth_role() = 'master_admin' or (auth_company_id() = client_statuses.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = client_statuses.company_id and auth_role() = 'company_super_admin'));

drop policy if exists owner_statuses_select on owner_statuses;
drop policy if exists owner_statuses_write on owner_statuses;
create policy owner_statuses_select on owner_statuses for select
  using (auth_role() = 'master_admin' or auth_company_id() = owner_statuses.company_id);
create policy owner_statuses_write on owner_statuses for all
  using (auth_role() = 'master_admin' or (auth_company_id() = owner_statuses.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = owner_statuses.company_id and auth_role() = 'company_super_admin'));

drop policy if exists marketing_channels_select on marketing_channels;
drop policy if exists marketing_channels_write on marketing_channels;
create policy marketing_channels_select on marketing_channels for select
  using (auth_role() = 'master_admin' or auth_company_id() = marketing_channels.company_id);
create policy marketing_channels_write on marketing_channels for all
  using (auth_role() = 'master_admin' or (auth_company_id() = marketing_channels.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = marketing_channels.company_id and auth_role() = 'company_super_admin'));

drop policy if exists areas_districts_select on areas_districts;
drop policy if exists areas_districts_write on areas_districts;
create policy areas_districts_select on areas_districts for select
  using (auth_role() = 'master_admin' or auth_company_id() = areas_districts.company_id);
create policy areas_districts_write on areas_districts for all
  using (auth_role() = 'master_admin' or (auth_company_id() = areas_districts.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = areas_districts.company_id and auth_role() = 'company_super_admin'));

drop policy if exists owners_select on owners;
drop policy if exists owners_write on owners;
create policy owners_select on owners for select
  using (auth_role() = 'master_admin' or auth_company_id() = owners.company_id);
create policy owners_write on owners for all
  using (auth_role() = 'master_admin' or (auth_company_id() = owners.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = owners.company_id and auth_role() = 'company_super_admin'));

drop policy if exists properties_select on properties;
drop policy if exists properties_write on properties;
create policy properties_select on properties for select
  using (auth_role() = 'master_admin' or auth_company_id() = properties.company_id);
create policy properties_write on properties for all
  using (auth_role() = 'master_admin' or (auth_company_id() = properties.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = properties.company_id and auth_role() = 'company_super_admin'));

drop policy if exists clients_select on clients;
drop policy if exists clients_write on clients;
create policy clients_select on clients for select
  using (auth_role() = 'master_admin' or auth_company_id() = clients.company_id);
create policy clients_write on clients for all
  using (auth_role() = 'master_admin' or (auth_company_id() = clients.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = clients.company_id and auth_role() = 'company_super_admin'));

drop policy if exists client_status_history_select on client_status_history;
drop policy if exists client_status_history_write on client_status_history;
create policy client_status_history_select on client_status_history for select
  using (auth_role() = 'master_admin' or auth_company_id() = client_status_history.company_id);
create policy client_status_history_write on client_status_history for all
  using (auth_role() = 'master_admin' or auth_company_id() = client_status_history.company_id)
  with check (auth_role() = 'master_admin' or auth_company_id() = client_status_history.company_id);

drop policy if exists owner_status_history_select on owner_status_history;
drop policy if exists owner_status_history_write on owner_status_history;
create policy owner_status_history_select on owner_status_history for select
  using (auth_role() = 'master_admin' or auth_company_id() = owner_status_history.company_id);
create policy owner_status_history_write on owner_status_history for all
  using (auth_role() = 'master_admin' or auth_company_id() = owner_status_history.company_id)
  with check (auth_role() = 'master_admin' or auth_company_id() = owner_status_history.company_id);

drop policy if exists property_status_history_select on property_status_history;
drop policy if exists property_status_history_write on property_status_history;
create policy property_status_history_select on property_status_history for select
  using (auth_role() = 'master_admin' or auth_company_id() = property_status_history.company_id);
create policy property_status_history_write on property_status_history for all
  using (auth_role() = 'master_admin' or auth_company_id() = property_status_history.company_id)
  with check (auth_role() = 'master_admin' or auth_company_id() = property_status_history.company_id);

drop policy if exists revenues_select on revenues;
drop policy if exists revenues_write on revenues;
create policy revenues_select on revenues for select
  using (auth_role() = 'master_admin' or auth_company_id() = revenues.company_id);
create policy revenues_write on revenues for all
  using (auth_role() = 'master_admin' or (auth_company_id() = revenues.company_id and auth_role() = 'company_super_admin'))
  with check (auth_role() = 'master_admin' or (auth_company_id() = revenues.company_id and auth_role() = 'company_super_admin'));

drop policy if exists legal_pages_write_master on legal_pages;
create policy legal_pages_write_master on legal_pages for all
  using (auth_role() = 'master_admin')
  with check (auth_role() = 'master_admin');
-- legal_pages_select_public is unchanged (using (true), no recursion risk).
